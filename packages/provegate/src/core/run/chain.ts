import { execFileSync, execSync } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { resolve } from 'node:path';
import { CONFIG_FILENAME } from '../config/index.js';
import type { MemoryConfig, WorkflowConfig } from '../config/index.js';
import type { GatesManifest } from '../gates/manifest.js';
import {
  acceptanceCoversPath,
  baselineProblem,
  changelogApproves,
  loadMemoryStore,
  loadMemoryStoreFromBlobs,
  memoryCloseIssues,
  outputWeakenings,
} from '../memory/artifacts.js';
import {
  isSafeCommand,
  parseVerificationCommands,
  type SafetyCheckedCommand,
} from '../gates/safety.js';
import { resolveClassGates, mergeGateCommands } from '../gates/classes.js';
import { validateTasksReviewRow } from '../gates/review.js';
import type { StateRecord } from '../state/build.js';
import { loadAcceptanceChecked, operatorGateOk, validAcceptance } from './acceptance.js';
import { declaredArtifacts, declaredArtifactsStrict, durableArtifactsOk } from './durable.js';
import { appendMetric } from './metrics.js';
import type { GateResultRow } from './cards.js';

/**
 * The deterministic gate chain (phases 4-7 + merge gate). Stochastic agent
 * phases run elsewhere; this verifies machine-checkable artifacts. NEVER
 * pushes. Re-entry is blocked by the PROVEGATE_RUN_ACTIVE sentinel (a §11 row
 * invoking the runner would otherwise recurse); --dry-run is exempt.
 */

export const RUN_ACTIVE_ENV = 'PROVEGATE_RUN_ACTIVE';

export interface FnGateResult {
  ok: boolean;
  why?: string;
  waived?: boolean;
}

export interface ChainGate {
  phase: string;
  label?: string;
  cmds?: SafetyCheckedCommand[];
  fn?: () => FnGateResult;
  /** A required command gate STOPs when empty (the §11 gate); an emptied
   * manifest phase is legal and simply contributes nothing. */
  required?: boolean;
  /**
   * Never skipped, whatever `--from-phase` says.
   *
   * `gate land` is `--from-phase=merge`, which skipped every phase gate. The
   * operator gate was already exempt for exactly this reason, and the memory
   * close gates need the same exemption for a stronger one: they are the checks
   * that bind the merge to the capture. Skippable, they let an operator-gated
   * PRD remove every baseline output, declare `none`, capture nothing, and land.
   */
  nonSkippable?: boolean;
}

export type FromPhase = 4 | 5 | 6 | 7 | 'merge' | null;

export function parseFromPhase(raw: string | null): FromPhase {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered === 'merge') return 'merge';
  const n = Number.parseInt(lowered, 10);
  if (Number.isFinite(n) && n >= 4 && n <= 7) return n as 4 | 5 | 6 | 7;
  throw new Error(`invalid --from-phase=${raw} (use 4, 5, 6, 7, or merge)`);
}

function gatePhaseNumber(gate: ChainGate): number {
  if (gate.phase === 'merge gate') return 8;
  const n = Number.parseInt(gate.phase, 10);
  return Number.isFinite(n) ? n : 0;
}

export function shouldSkipGate(gate: ChainGate, fromPhase: FromPhase): boolean {
  if (!fromPhase) return false;
  // The operator merge gate is NEVER skippable — `gate land` must not become
  // an acceptance bypass (codex P1 finding).
  if (gate.phase === 'merge gate') return false;
  if (gate.nonSkippable === true) return false;
  if (fromPhase === 'merge') return true;
  return gatePhaseNumber(gate) < fromPhase;
}

/**
 * Paths the diff ADDED, MODIFIED, or renamed INTO — never the ones it deleted.
 *
 * `collectDiffFiles` is `git diff --name-only`, which lists deletions too, so
 * membership there is not evidence a record was written: deleting a promised
 * output put its path in the list and read as a capture. Returns null when the
 * status cannot be read, and the caller then falls back to the name list rather
 * than silently treating every output as uncaptured.
 */
function capturedDiffFiles(root: string, base: string): { captured: string[]; touched: string[] } | null {
  try {
    // The LOCAL base, and only the local base. `collectDiffFiles` prefers
    // `origin/<base>`, which is the wrong question here: `mergeToLocalBase`
    // merges into the local branch, and a local base ahead of its remote makes
    // the origin-based range include commits this feature never made — so a
    // record added on unpushed local base counts as this PRD's capture. That
    // fails OPEN, and this repository is in exactly that state today.
    const mergeBase = execFileSync('git', ['merge-base', 'HEAD', base], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    // `-z` because a path with a tab, a newline, or a non-ASCII byte under
    // `core.quotepath` does not survive line-and-tab splitting intact.
    const out = execFileSync('git', ['diff', '--name-status', '-z', `${mergeBase}...HEAD`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const fields = out.split('\0').filter((field) => field.length > 0);
    const captured: string[] = [];
    // Every path the diff TOUCHES, deletions included. A watch is a review
    // trigger, and deleting a watched file is exactly the kind of change it
    // exists to trigger on — so this list, not the capture list, is what the
    // watch gate reads.
    const touched: string[] = [];
    for (let i = 0; i < fields.length; i += 1) {
      const status = fields[i]!;
      if (/^[RC]/.test(status)) {
        // Rename or copy: source then DESTINATION. The destination is what this
        // diff wrote; the source is a deletion.
        const source = fields[i + 1];
        const destination = fields[i + 2];
        if (destination !== undefined) {
          captured.push(destination);
          touched.push(destination);
        }
        if (source !== undefined) touched.push(source);
        i += 2;
        continue;
      }
      const path = fields[i + 1];
      i += 1;
      if (path !== undefined) touched.push(path);
      // A, M, and T are candidates; the regular-file test and the indexed-record
      // check downstream decide whether the object is acceptable. T matters
      // because replacing a placeholder symlink with the real record is a
      // legitimate first capture that git reports as a type change. D and U are
      // never a capture, and an unknown status must not read as one.
      if (/^[AMT]/.test(status) && path !== undefined) captured.push(path);
    }
    return { captured, touched };
  } catch {
    // Fail closed: the caller refuses rather than falling back to the weaker
    // name-only evidence that includes deletions.
    return null;
  }
}

/** The PRD exactly as committed on the base ref, or null when it is not there.
 * Never the working copy: the whole point of the comparison is a baseline the
 * editing agent does not control. */
/**
 * The memory configuration as the BASE ref holds it.
 *
 * Everything about the close that asks "what did the base promise" must ask the
 * base's own configuration — which store, at which index. Falls back to the
 * working configuration when the base has no config file (first adoption) and
 * when its config will not parse, because an unreadable base policy must not
 * read as a weaker one.
 */
function baseMemoryConfig(root: string, config: WorkflowConfig): MemoryConfig {
  const raw = blobAt(root, config.branches.base, CONFIG_FILENAME);
  if (raw === null) return config.memory;
  try {
    const parsed = JSON.parse(raw) as { memory?: Partial<MemoryConfig> };
    if (parsed.memory === undefined) return config.memory;
    return { ...config.memory, ...parsed.memory };
  } catch {
    return config.memory;
  }
}

/** A committed blob at `ref`, or null when the path is not there. */
function blobAt(root: string, ref: string, path: string): string | null {
  try {
    return execFileSync('git', ['show', `${ref}:${path}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

function baselinePrd(root: string, base: string, prdPath: string): string | null {
  try {
    // stderr is swallowed on purpose: "no such path in main" is an EXPECTED
    // outcome this gate reports itself, with a remedy. Letting git's own message
    // through would print a bare error above the sentence written to explain it.
    return execFileSync('git', ['show', `${base}:${prdPath}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return null;
  }
}

/**
 * FR-5. A missing, malformed, or uncommitted baseline fails closed and names the
 * remedy — `gate open --worktree` already refuses while workflow artifacts are
 * uncommitted on the base, so the blob is guaranteed there and a plain
 * `gate open` carries no such promise. Reporting a bare comparison error would
 * send the first non-worktree close hunting for a bug instead of committing a
 * file.
 */
function memoryWeakeningGate(options: {
  config: WorkflowConfig;
  root: string;
  record: StateRecord;
  prdContent: string;
}): FnGateResult {
  const { config, root, record } = options;
  const base = config.branches.base;
  const prdPath = record.artifacts.prd;
  if (!prdPath) {
    return {
      ok: false,
      why: `${record.prd} has no PRD artifact in state — nothing to compare against \`${base}\``,
    };
  }
  // The evidence must be COMMITTED, because the merge lands HEAD and
  // `ensureCheckoutClean` resets tracked coordination paths — `_prds/` among
  // them — on its way there. Reading the working copy let a committed weakening
  // be waived by a Changelog approval that was never committed and was discarded
  // seconds later: the gate passed on text the merge then threw away.
  const committed = blobAt(root, 'HEAD', prdPath);
  if (committed === null) {
    return {
      ok: false,
      why:
        `${record.prd}'s PRD is not committed on this branch, so the weakening check has no ` +
        `evidence the merge will actually carry — commit \`${prdPath}\` and re-run`,
    };
  }
  if (committed !== options.prdContent) {
    return {
      ok: false,
      why:
        `${record.prd}'s working PRD differs from the committed one, and the merge lands the ` +
        `COMMITTED copy — commit \`${prdPath}\` so this gate judges what will land`,
    };
  }
  const prdContent = committed;
  const baseline = baselinePrd(root, base, prdPath);
  if (baseline === null) {
    return {
      ok: false,
      why:
        `${record.prd} has no committed copy on \`${base}\`; commit the PRD to the base ` +
        `branch before closing, or reclaim with \`--worktree\``,
    };
  }
  // A malformed baseline fails closed for the same reason a missing one does:
  // it cannot say what was promised, and "cannot say" must never read as
  // "promised nothing".
  const malformed = baselineProblem(baseline);
  if (malformed !== null) {
    return {
      ok: false,
      why:
        `${record.prd}'s copy on \`${base}\` cannot serve as a baseline — ${malformed}; ` +
        `commit a parseable PRD to the base branch before closing`,
    };
  }

  const weakenings = outputWeakenings(baseline, prdContent);
  if (weakenings.length === 0) return { ok: true };
  const detail = weakenings.map((w) => `${w.kind} — ${w.detail}`).join('; ');

  if (record.autonomousClose !== 'operator-gated') {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\` and ${record.prd} is eligible for ` +
        `autonomous close, which refuses outright: ${detail}`,
    };
  }

  const unapproved = weakenings.filter((w) => !changelogApproves(prdContent, config.owners, w.path));
  if (unapproved.length > 0) {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\` with no owner approval row in the ` +
        `Changelog naming ${unapproved.map((w) => `'${w.path}'`).join(', ')}: ${detail}`,
    };
  }
  const loaded = loadAcceptanceChecked(config, root, record.prd);
  if (loaded.problem !== null) {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\`; the owner acceptance store cannot ` +
        `authorize it — ${loaded.problem}: ${detail}`,
    };
  }
  const acceptance = loaded.entry;
  if (!validAcceptance(config, acceptance)) {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\`; the Changelog approves it but no valid ` +
        `owner acceptance entry exists for ${record.prd}: ${detail}`,
    };
  }
  // The acceptance must cover THIS removal. Accepting any entry recorded for the
  // PRD let an operator-row waiver — signed for something else entirely — also
  // license a broken output promise.
  const uncovered = weakenings.filter((w) => !acceptanceCoversPath(acceptance!.items, w.path));
  if (uncovered.length > 0) {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\`; the owner acceptance for ${record.prd} ` +
        `does not name ${uncovered.map((w) => `'${w.path}'`).join(', ')} in its items: ${detail}`,
    };
  }
  return { ok: true, waived: true, why: `weakening accepted by the owner: ${detail}` };
}

export function buildGateChain(options: {
  config: WorkflowConfig;
  manifest: GatesManifest;
  root: string;
  record: StateRecord;
  prdContent: string;
  tasksContent: string;
  changedFiles: string[];
  prdClass: string;
}): ChainGate[] {
  const { config, manifest, root, record, prdContent, tasksContent, changedFiles, prdClass } =
    options;

  // Manifest/config commands get the SAME safety stamp as §11 rows — loadManifest
  // already refuses unsafe ones, this is defense in depth for hand-built manifests.
  const checked = (cmd: string): SafetyCheckedCommand => ({
    cmd,
    safe: isSafeCommand(config, cmd),
  });
  const phase4 = mergeGateCommands(
    manifest.phases['4'] ?? [],
    resolveClassGates(manifest, prdClass, changedFiles),
  );
  const phase5 = parseVerificationCommands(config, prdContent);

  const chain: ChainGate[] = [
    { phase: '4 Implementation', cmds: phase4.map(checked) },
    { phase: '5 Testing', cmds: phase5, required: true },
    {
      phase: '6 Final Auditing',
      label: 'independent-review ledger + schema',
      fn: () => {
        if (!tasksContent) {
          return { ok: false, why: 'no tasks file — independent-review ledger missing' };
        }
        const check = validateTasksReviewRow(config, root, tasksContent, record.number);
        return check.ok ? { ok: true } : { ok: false, why: check.issues.join('; ') };
      },
    },
  ];
  const phase6Cmds = manifest.phases['6'] ?? [];
  if (phase6Cmds.length > 0)
    chain.push({ phase: '6 Final Auditing', cmds: phase6Cmds.map(checked) });

  chain.push({
    phase: '7 Learning',
    label: 'durable artifacts touched in merge diff',
    // The strict reader when memory is on, the legacy one when it is off. The
    // split existed to keep a memory-DISABLED repo byte-identical, but leaving
    // the universal gate on the legacy reader in an ENABLED repo opened a hole
    // of its own: a fenced Durable Artifacts example above the real section
    // hid every path the real section adds, so a promised doc could go
    // untouched and still close.
    fn: () => {
      if (!config.memory.enabled) {
        return durableArtifactsOk(declaredArtifacts(prdContent), changedFiles);
      }
      const strict = declaredArtifactsStrict(prdContent);
      if (strict.ambiguous) {
        return {
          ok: false,
          why: '`## Durable Artifacts` is declared more than once — exactly one section is parseable',
        };
      }
      return durableArtifactsOk(strict.paths, changedFiles);
    },
  });

  // The memory close gates are separate chain entries rather than one composite,
  // so `--dry-run` prints every check it would perform (FR-4) instead of one
  // opaque label. Each still fails closed on its own.
  // Policy is read from the BASE as well as the working tree. Deciding purely
  // from the working configuration let a branch set `memory.enabled: false`,
  // drop every baseline output, omit every watched input, and close with no
  // memory gate built at all — the contract disabled by the very merge it was
  // meant to govern. Turning it OFF is a policy change, and a policy change is
  // judged under the policy in force.
  const memoryInForce = config.memory.enabled || baseMemoryConfig(root, config).enabled;
  if (memoryInForce && !config.memory.enabled) {
    chain.push({
      phase: '7 Learning',
      nonSkippable: true,
      label: `memory: disabling the contract needs an owner acceptance`,
      fn: () => ({
        ok: false,
        why:
          `\`memory.enabled\` is true on \`${config.branches.base}\` and false here — this merge ` +
          `would disable the memory contract for the repository. That is a policy change, not a ` +
          `close: revert it, or land it as its own owner-accepted work item`,
      }),
    });
  }
  if (config.memory.enabled) {
    chain.push({
      phase: '7 Learning',
      nonSkippable: true,
      label: 'memory: declared outputs in Durable Artifacts and the merge diff',
      fn: () => {
        const diff = capturedDiffFiles(root, config.branches.base);
        if (diff === null) {
          // Without the status list there is no way to tell a capture from a
          // deletion, and guessing in the permissive direction is the defect
          // this gate exists to prevent.
          return {
            ok: false,
            why:
              `cannot read the merge diff against \`${config.branches.base}\` — the close ` +
              `cannot tell a captured record from a deleted one, so it refuses`,
          };
        }
        const issues = memoryCloseIssues({
          content: prdContent,
          // The caller's list UNIONED with the local-base diff. `--name-only`
          // reports a rename as the destination alone, so a record watching the
          // SOURCE path never fired on the merge that moved it out from under
          // it; `diff.touched` carries both sides. The union rather than a
          // replacement, because the caller's list is what every other gate in
          // this chain is judged against and the two must not diverge silently.
          changedFiles: [...new Set([...changedFiles, ...diff.touched])],
          store: loadMemoryStore(root, config.memory),
          // The store as the BASE holds it, so deleting a watching record and
          // its pointer together cannot erase the trigger the deletion should
          // have fired.
          baseStore: loadMemoryStoreFromBlobs(
            (path) => blobAt(root, config.branches.base, path),
            // The BASE ref's memory configuration, not this branch's. Loading
            // the base store with the branch's `index` path let a branch RELOCATE
            // the index — build a valid smaller store at the new path, change a
            // file only the old store watched, and omit the input. The base
            // loader then looked for the new index on the base, found nothing,
            // and returned an empty store: every watch erased by one config edit.
            baseMemoryConfig(root, config),
          ),
          durable: declaredArtifactsStrict(prdContent).paths,
          memory: config.memory,
          capturedFiles: diff.captured,
          // lstat, and a regular-file test: a directory named `x.md`, an added
          // submodule (gitlink), or a symlink pointing at an existing record all
          // satisfy `existsSync` without anything having been captured at the
          // declared path.
          exists: (path) => {
            try {
              return lstatSync(resolve(root, path)).isFile();
            } catch {
              return false;
            }
          },
        });
        return issues.length === 0 ? { ok: true } : { ok: false, why: issues.join('; ') };
      },
    });
    chain.push({
      phase: '7 Learning',
      nonSkippable: true,
      label: `memory: no weakening against ${config.branches.base}`,
      fn: () => memoryWeakeningGate({ config, root, record, prdContent }),
    });
  }

  const phase7Cmds = manifest.phases['7'] ?? [];
  if (phase7Cmds.length > 0) {
    chain.push({
      phase: '7 Learning',
      cmds: phase7Cmds.map(checked),
      // With memory enabled these ARE the store validator: the practices pack
      // wires `verify:brain` here and leaves `memory.verifyCommand` empty. The
      // internal gates were made non-skippable and this one was not, so
      // `gate land` could still merge a store defect only `verify:brain` sees.
      nonSkippable: config.memory.enabled,
    });
  }

  // The configured validator runs AFTER capture, never before — a validator that
  // ran first would certify the store as it was, not as the close left it
  // (`verify-check-phase-placement`). It passes the same safety allowlist a §11
  // row does; '' disables it.
  if (config.memory.enabled && config.memory.verifyCommand.trim().length > 0) {
    chain.push({
      phase: '7 Learning',
      nonSkippable: true,
      label: 'memory: configured validator',
      cmds: [checked(config.memory.verifyCommand.trim())],
    });
  }

  chain.push({
    phase: 'merge gate',
    label: 'operator-gated guard + acceptances',
    fn: () => operatorGateOk(config, root, record),
  });

  return chain;
}

export function planChain(chain: ChainGate[], fromPhase: FromPhase): string[] {
  const lines: string[] = [];
  for (const gate of chain) {
    if (shouldSkipGate(gate, fromPhase)) continue;
    lines.push(`── Phase ${gate.phase}`);
    if (gate.fn) lines.push(`     • gate: ${gate.label}`);
    for (const { cmd, safe } of gate.cmds ?? []) {
      lines.push(`     • ${cmd}${safe ? '' : '  ! UNSAFE — would STOP'}`);
    }
  }
  return lines;
}

export interface ChainOutcome {
  results: GateResultRow[];
  stopped: { phase: string; why: string } | null;
}

/** Execute the chain. First failure stops. Gate commands run through the
 * shell ONLY with safe=true; the child env carries the re-entry sentinel. */
export function runChain(options: {
  config: WorkflowConfig;
  root: string;
  id: string;
  chain: ChainGate[];
  fromPhase: FromPhase;
  /** Optional per-gate reporter, fired as each gate resolves — the CLI supplies
   * it to print a live status line (FR-3). Core stays silent by default; the
   * runner never prints (substrate split). */
  onResult?: (phase: string, label: string, ok: boolean) => void;
}): ChainOutcome {
  const { config, root, id, chain, fromPhase, onResult } = options;
  const results: GateResultRow[] = [];

  const record = (phase: string, label: string, ok: boolean): void => {
    results.push([`${phase}: ${label}`, ok ? 'passed' : 'FAILED']);
    onResult?.(phase, label, ok);
  };

  const stop = (phase: string, why: string): ChainOutcome => {
    appendMetric(config, root, { prd: id, phase, gate: 'handoff', result: 'stopped', why });
    return { results, stopped: { phase, why } };
  };

  for (const gate of chain) {
    if (shouldSkipGate(gate, fromPhase)) continue;

    if (gate.fn) {
      const started = Date.now();
      const r = gate.fn();
      record(gate.phase, gate.label ?? 'gate', r.ok);
      appendMetric(config, root, {
        prd: id,
        phase: gate.phase,
        gate: gate.label ?? 'fn',
        result: r.ok ? 'passed' : 'failed',
        durationMs: Date.now() - started,
        why: r.why ?? null,
      });
      if (!r.ok) return stop(gate.phase, r.why ?? 'gate failed');
      continue;
    }

    if (!gate.cmds || gate.cmds.length === 0) {
      if (gate.required) {
        return stop(gate.phase, 'no runnable §11 FR-row commands parsed — PRD gap');
      }
      continue;
    }
    for (const { cmd, safe } of gate.cmds) {
      if (!safe) {
        return stop(
          gate.phase,
          `unsafe §11 command refused (shell metachar or non-allowlisted segment): ${cmd}`,
        );
      }
      const started = Date.now();
      try {
        execSync(cmd, {
          cwd: root,
          stdio: 'inherit',
          env: { ...process.env, [RUN_ACTIVE_ENV]: '1' },
        });
        record(gate.phase, cmd, true);
        appendMetric(config, root, {
          prd: id,
          phase: gate.phase,
          gate: cmd,
          result: 'passed',
          durationMs: Date.now() - started,
        });
      } catch {
        record(gate.phase, cmd, false);
        appendMetric(config, root, {
          prd: id,
          phase: gate.phase,
          gate: cmd,
          result: 'failed',
          durationMs: Date.now() - started,
        });
        return stop(gate.phase, `command failed: ${cmd}`);
      }
    }
  }

  return { results, stopped: null };
}
