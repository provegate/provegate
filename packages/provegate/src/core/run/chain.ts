import { execFileSync, execSync } from 'node:child_process';
import type { WorkflowConfig } from '../config/index.js';
import type { GatesManifest } from '../gates/manifest.js';
import {
  changelogApproves,
  loadMemoryStore,
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
import { loadAcceptance, operatorGateOk, validAcceptance } from './acceptance.js';
import { declaredArtifacts, durableArtifactsOk } from './durable.js';
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
  if (fromPhase === 'merge') return true;
  return gatePhaseNumber(gate) < fromPhase;
}

/** The PRD exactly as committed on the base ref, or null when it is not there.
 * Never the working copy: the whole point of the comparison is a baseline the
 * editing agent does not control. */
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
  const { config, root, record, prdContent } = options;
  const base = config.branches.base;
  const prdPath = record.artifacts.prd;
  if (!prdPath) {
    return {
      ok: false,
      why: `${record.prd} has no PRD artifact in state — nothing to compare against \`${base}\``,
    };
  }
  const baseline = baselinePrd(root, base, prdPath);
  if (baseline === null) {
    return {
      ok: false,
      why:
        `${record.prd} has no committed copy on \`${base}\`; commit the PRD to the base ` +
        `branch before closing, or reclaim with \`--worktree\``,
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
  if (!validAcceptance(config, loadAcceptance(config, root, record.prd))) {
    return {
      ok: false,
      why:
        `Memory Outputs weakened against \`${base}\`; the Changelog approves it but no valid ` +
        `owner acceptance entry exists for ${record.prd}: ${detail}`,
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
    fn: () => durableArtifactsOk(declaredArtifacts(prdContent), changedFiles),
  });

  // The memory close gates are separate chain entries rather than one composite,
  // so `--dry-run` prints every check it would perform (FR-4) instead of one
  // opaque label. Each still fails closed on its own.
  if (config.memory.enabled) {
    chain.push({
      phase: '7 Learning',
      label: 'memory: declared outputs in Durable Artifacts and the merge diff',
      fn: () => {
        const issues = memoryCloseIssues({
          content: prdContent,
          changedFiles,
          store: loadMemoryStore(root, config.memory),
          durable: declaredArtifacts(prdContent),
        });
        return issues.length === 0 ? { ok: true } : { ok: false, why: issues.join('; ') };
      },
    });
    chain.push({
      phase: '7 Learning',
      label: `memory: no weakening against ${config.branches.base}`,
      fn: () => memoryWeakeningGate({ config, root, record, prdContent }),
    });
  }

  const phase7Cmds = manifest.phases['7'] ?? [];
  if (phase7Cmds.length > 0) chain.push({ phase: '7 Learning', cmds: phase7Cmds.map(checked) });

  // The configured validator runs AFTER capture, never before — a validator that
  // ran first would certify the store as it was, not as the close left it
  // (`verify-check-phase-placement`). It passes the same safety allowlist a §11
  // row does; '' disables it.
  if (config.memory.enabled && config.memory.verifyCommand.trim().length > 0) {
    chain.push({
      phase: '7 Learning',
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
