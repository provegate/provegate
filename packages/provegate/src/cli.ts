#!/usr/bin/env node
/**
 * provegate / gate — subcommand router.
 *
 * Real commands: status, queue (Phase B); run, land, check (Phase C).
 * Remaining stubs name their roadmap phase. `push` refuses — the runner never
 * pushes to a remote. That invariant ships (and is tested) from commit one.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { ConfigError, DEFAULT_CONFIG, loadConfig, type WorkflowConfig } from './core/config/index.js';
import {
  buildQueue,
  buildState,
  formatId,
  formatLeaseRemaining,
  statusPanelMetrics,
  writeState,
  type StateRecord,
} from './core/state/index.js';
import type { QueueLockInfo } from './core/state/index.js';
import { listLockFiles, validateLock } from './core/locks/index.js';
import {
  ManifestError,
  auditWiring,
  collectDiffFiles,
  lintPrd,
  loadManifest,
  parsePrdClass,
  scoreValueHeader,
  valueScoreIssue,
} from './core/gates/index.js';
import { existsSync, readdirSync } from 'node:fs';
import { dirname as pathDirname } from 'node:path';
import {
  RUN_ACTIVE_ENV,
  archivePrdArtifacts,
  baseWorktreeReady,
  buildGateChain,
  claimPrd,
  createPrd,
  initWorkspace,
  planPractices,
  planPrompts,
  practicesPackDir,
  promptsConfigBlock,
  promptsPackageDir,
  PromptsError,
  type InitAction,
  mergePreconditions,
  mergeToLocalBase,
  claimMutexPath,
  parseFromPhase,
  planChain,
  leaseHolder,
  releaseLease,
  removeWorktree,
  revalidateControlArtifacts,
  runChain,
  stopCard as buildStopCard,
  withWorkspaceMutex,
  type FromPhase,
} from './core/run/index.js';
import { handoffCard as buildHandoffCard } from './core/run/index.js';
import { colorTier, paint, verdictSlot, statusLine } from './core/ui/theme.js';
import { memoryDoctor, memoryFind } from './core/memory/index.js';

const require = createRequire(import.meta.url);

/** Apply colour to a card at print time (FR-4). Additive only: under NO_COLOR /
 * non-TTY the tier is `none` and every card is returned byte-identical — the
 * builder text never changes. Glyphs carry status; the rule and the push line
 * get the slot colour. */
function colorCard(card: string, kind: 'stop' | 'handoff'): string {
  const tier = colorTier();
  if (tier === 'none') return card;
  const ruleSlot = kind === 'handoff' ? 'green' : 'red';
  return card
    .split('\n')
    .map((line) => {
      if (line.startsWith('┌') || line.startsWith('└')) return paint(ruleSlot, line, tier);
      if (line.includes('READY TO PUSH')) return paint('human', line, tier);
      return line
        .replace('✓', paint('green', '✓', tier))
        .replace('✗', paint('red', '✗', tier))
        .replace('⚠', paint('amber', '⚠', tier));
    })
    .join('\n');
}

const stopCard = (o: Parameters<typeof buildStopCard>[0]): string =>
  colorCard(buildStopCard(o), 'stop');
const handoffCard = (o: Parameters<typeof buildHandoffCard>[0]): string =>
  colorCard(buildHandoffCard(o), 'handoff');
const pkg = require('../package.json') as { version: string };

function usage(): string {
  // FR-8 — the help screen. Wordmark + tagline with the version right-aligned,
  // bare-uppercase section headers, aligned commands. The wordmark is CamelCase
  // `ProveGate` (brand rule: CamelCase in prose; the binary stays lowercase in
  // command examples). No decorative colour: the colour law reserves green for
  // earned pass, so command names are NOT painted.
  const version = `v${pkg.version}`;
  const brand = 'ProveGate · prove it, then let it propagate.';
  const gap = Math.max(2, 66 - brand.length - version.length);
  return [
    `${brand}${' '.repeat(gap)}${version}`,
    '',
    'USAGE',
    '  gate <command> [options]   (also available as: provegate)',
    '',
    'COMMANDS',
    '  init     scaffold the workflow tree + starter configs (--dry-run) (--practices: install the practices pack)',
    '  new      create the next PRD from the shipped template (gate new <slug> [--class=X] [--template=path])',
    '  open     claim a PRD: lease its conflict surface or refuse on overlap ([--steal] [--worktree] [--hours=N])',
    '  renew    extend your lease (idempotent refresh) (gate renew PRD-XXX [--hours=N])',
    '  release  drop a PRD lease under the claim mutex (gate release PRD-XXX [--force])',
    '  status   rebuild workflow state from artifacts and show it',
    '  queue    show the PRD queue (--json for machine output)',
    '  check    lint a PRD for readiness (gate check PRD-XXX | gate check --wiring)',
    '  doctor   diagnose an install, read-only (gate doctor --memory [--json])',
    '  memory   deterministic local recall (gate memory find --query=… | --paths=… | --tag=…)',
    '  run      run gated phases 4-7 + local merge (--dry-run, --from-phase=4|5|6|7|merge)',
    '  land     merge step only (alias for run --from-phase=merge)',
    '  push     (refused — push is always yours)',
    '',
    'OPTIONS',
    '  -h, --help     show this help',
    '  -v, --version  print version',
    '',
    'humans own intent and release · the machine owns the verified middle',
  ].join('\n');
}

function collectLocks(root: string, config: WorkflowConfig): QueueLockInfo[] {
  return listLockFiles(config, root)
    .filter((lock) => lock.data !== undefined)
    .map((lock) => ({
      prd: String(lock.data!['prd'] ?? '?'),
      agent: String(lock.data!['agent'] ?? '?'),
      phase: String(lock.data!['phase'] ?? '?'),
      worktree:
        typeof lock.data!['worktree'] === 'string' ? (lock.data!['worktree'] as string) : null,
      expiresAt: String(lock.data!['expiresAt'] ?? ''),
    }));
}

function runInit(args: string[]): number {
  const unknown = unknownOption(args, ['--dry-run', '--practices', '--prompts']);
  if (unknown !== null) {
    console.error(`[init] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const dryRun = args.includes('--dry-run');
  const practices = args.includes('--practices');
  const prompts = args.includes('--prompts');
  // Init must work before any config exists: root at the nearest .git walking
  // up from cwd, else cwd itself.
  let root = process.cwd();
  let probe = root;
  for (;;) {
    if (existsSync(`${probe}/.git`)) {
      root = probe;
      break;
    }
    const parent = pathDirname(probe);
    if (parent === probe) break;
    probe = parent;
  }
  const config = (() => {
    try {
      return loadConfig(root).config;
    } catch (error) {
      // No config yet — that's the point. Scaffold from defaults.
      //
      // But ONLY for a missing file. This catch used to swallow every config
      // error, and PRD-029 made that actively misleading: an invalid
      // `prompts.dir` produced the correct `ConfigIssue`, the catch discarded
      // it, `--prompts` then read `enabled` off the fallback default, and the
      // adopter was told "prompts is not enabled" about a config that enables
      // it. They would edit the wrong thing.
      // The distinction is IN THE DATA: a discovery failure ("no config or .git
      // found") carries no issues, a validation failure carries one per problem.
      // Narrowing on `instanceof ConfigError` alone broke `gate init` in a bare
      // directory, which is the command's whole purpose — the second overshoot
      // in this remediation, and the same shape as the first.
      if (error instanceof ConfigError && error.issues.length > 0) {
        console.error(`[init] ${error.message}`);
        return null;
      }
      return DEFAULT_CONFIG;
    }
  })();
  if (config === null) return 1;

  // The protocol store. Planned BEFORE anything is written so an unresolved
  // value refuses the whole run — no store file, no adapter, no starter config.
  // `--practices` alone installs no store: PACK_MAP is a static table and
  // cannot emit a config-dependent render.
  let promptActions: InitAction[] = [];
  if (prompts) {
    const packageDir = promptsPackageDir();
    const enabled = config.prompts.enabled;
    if (!enabled) {
      console.log('[init] prompts is not enabled in this repository.');
      console.log('       Add the block below to workflow.config.json, then re-run:');
      console.log('');
      console.log(promptsConfigBlock(config, packageDir));
      console.log(
        '[init] an existing config is never edited — this block is the activation path.',
      );
      return 1;
    }
    try {
      promptActions = planPrompts(config, packageDir);
    } catch (error) {
      if (!(error instanceof PromptsError)) throw error;
      console.error(`[init] ${error.message}`);
      console.error('');
      console.error('[init] nothing was written. Supply the values below and re-run:');
      console.error('');
      console.error(promptsConfigBlock(config, packageDir));
      return 1;
    }
  }

  const extra = [...(practices ? planPractices(practicesPackDir()) : []), ...promptActions];
  const report = initWorkspace(config, root, { dryRun, extra, practices });
  console.log(`[init] ${dryRun ? 'DRY-RUN ' : ''}root: ${root}`);
  for (const path of report.created) console.log(`  + ${path}`);
  for (const path of report.skipped) console.log(`  = ${path} (exists, skipped)`);
  console.log(
    `[init] ${report.created.length} created, ${report.skipped.length} skipped — nothing is ever overwritten`,
  );
  if (prompts) {
    // EVERY run prints the complete generated set, written and skipped alike.
    // That set IS the reinstall unit, and two of its three adapter destinations
    // live OUTSIDE the store directory: a "delete the store directory"
    // instruction leaves them at the previous package version with stale
    // banners while the adopter believes they reinstalled.
    console.log('');
    console.log('[init] generated set — this is the reinstall unit:');
    for (const action of promptActions) {
      if (action.kind === 'file') console.log(`    ${action.path}`);
    }
    console.log('');
    console.log(
      '[init] this store installs ONE WAY. To reinstall after a package upgrade,',
    );
    console.log(
      '       delete EVERY path above — not just the store directory — and run this again.',
    );
    console.log('       There is no upgrade path, no reconciliation and no sync in this version.');
  }
  if (practices) {
    // The pack creates files only. Hook wiring, package.json scripts, and shim
    // pastes are deliberate manual steps — print them, never perform them.
    console.log('');
    console.log(readFileSync(join(practicesPackDir(), 'NEXT_STEPS.md'), 'utf8'));
  }
  console.log('[init] next: see QUICKSTART.md (npm home: provegate/QUICKSTART.md)');
  return 0;
}

function runNew(args: string[]): number {
  const unknown = unknownOption(args, ['--class', '--template']);
  if (unknown !== null) {
    console.error(`[new] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const slug = args.find((a) => !a.startsWith('--'));
  if (!slug) {
    console.error('usage: gate new <slug> [--class=X] [--template=path]');
    return 1;
  }
  const cls = args.find((a) => a.startsWith('--class='))?.slice('--class='.length);
  const templatePath = args.find((a) => a.startsWith('--template='))?.slice('--template='.length);
  const { root, config } = loadConfig();
  try {
    const result = createPrd(config, root, { slug, cls, templatePath });
    console.log(`[new] created ${result.relPath} (${result.id})`);
    if (result.retries > 0) {
      console.log(`[new] id allocation raced ${result.retries}x with a concurrent gate new — resolved`);
    }
    if (result.createdParents) {
      console.log('[new] parent directories were missing — run `gate init` for the full workflow tree');
    }
    console.log(`[new] next: fill the template, then \`gate check ${result.id}\``);
    return 0;
  } catch (error) {
    console.error(`[new] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

/** `--hours=N` → a number for `leaseHours`; undefined when the flag is absent.
 * Non-numeric or non-positive values become NaN/≤0 and are rejected downstream
 * by `claimPrd`'s positive-finite guard (mapped to exit 1 by the caller). */
function parseHoursOpt(args: string[]): number | undefined {
  const raw = args.find((a) => a.startsWith('--hours='))?.slice('--hours='.length);
  return raw === undefined ? undefined : Number(raw);
}

function runOpen(args: string[]): number {
  const unknown = unknownOption(args, ['--steal', '--worktree', '--hours', '--agent']);
  if (unknown !== null) {
    console.error(`[open] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const id = args.find((a) => !a.startsWith('--'));
  if (!id) {
    console.error('usage: gate open <PRD-XXX> [--steal] [--worktree] [--hours=N] [--agent=identity]');
    return 1;
  }
  const steal = args.includes('--steal');
  const worktree = args.includes('--worktree');
  const agent = args.find((a) => a.startsWith('--agent='))?.slice('--agent='.length);
  const leaseHours = parseHoursOpt(args);
  const { root, config } = loadConfig();
  try {
    const result = claimPrd(config, root, id, { steal, agent, worktree, leaseHours });
    if (!result.ok) {
      // FR-6 — the refusal reads as a decision: each conflict marked `✗`, the
      // lease holder named (agent · phase · remaining TTL, so no one reads lock
      // files by hand — User Story 2), then a human-blue `→ resolve` hint.
      // Byte-identical text under NO_COLOR.
      const tier = colorTier();
      console.error(`[open] REFUSED — ${result.id} not claimed:`);
      for (const issue of result.issues) console.error(`  ${paint('red', '✗', tier)} ${issue}`);
      for (const b of result.blockers) {
        const expiry = Date.parse(b.expiresAt);
        const seconds = Number.isNaN(expiry) ? null : Math.round((expiry - Date.now()) / 1000);
        const ttl = formatLeaseRemaining(seconds, b.stale);
        const badge = b.stale ? paint('stale', ttl, tier) : ttl;
        console.error(`    lease held by ${b.agent} · ${b.phase} · ${badge}`);
      }
      if (result.blockers.length > 0) {
        const stale = result.blockers.some((b) => b.stale);
        console.error(
          `  ${paint('human', '→', tier)} resolve: narrow ${result.id}'s Conflict Surface${stale ? ', or --steal the stale lease' : ''}`,
        );
      }
      return 1;
    }
    for (const victim of result.stolen) {
      console.log(
        `[open] STOLE stale lease of ${victim.prd} (agent ${victim.agent}, expired ${victim.expiredAt})`,
      );
    }
    console.log(
      `[open] ${result.refreshed ? 'refreshed (already held)' : 'claimed'} ${result.id} — ${result.globs.length} surface glob(s)`,
    );
    console.log(`[open] lease: ${result.leasePath}`);
    if (result.worktree) {
      console.log(
        `[open] worktree: ${result.worktree.relPath} (branch ${result.worktree.branch})`,
      );
    }
    for (const warning of result.issues) console.error(`[open] WARNING: ${warning}`);
    return 0;
  } catch (error) {
    console.error(`[open] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

function runRenew(args: string[]): number {
  const unknown = unknownOption(args, ['--hours', '--agent']);
  if (unknown !== null) {
    console.error(`[renew] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const id = args.find((a) => !a.startsWith('--'));
  if (!id) {
    console.error('usage: gate renew <PRD-XXX> [--hours=N] [--agent=identity]');
    return 1;
  }
  const agent = args.find((a) => a.startsWith('--agent='))?.slice('--agent='.length);
  const leaseHours = parseHoursOpt(args);
  const { root, config } = loadConfig();
  try {
    // Renew IS claimPrd's idempotent refresh path — the surface is re-parsed and
    // re-checked against active leases, so a surface edited since the claim is
    // re-validated, not grandfathered. No new engine code.
    const result = claimPrd(config, root, id, { agent, leaseHours });
    if (!result.ok) {
      console.error(`[renew] REFUSED — ${result.id} not renewed:`);
      for (const issue of result.issues) console.error(`  ✗ ${issue}`);
      return 1;
    }
    console.log(
      `[renew] ${result.refreshed ? 'renewed' : 'claimed (no prior lease)'} ${result.id} — ${result.globs.length} surface glob(s)`,
    );
    console.log(`[renew] lease: ${result.leasePath}`);
    for (const warning of result.issues) console.error(`[renew] WARNING: ${warning}`);
    return 0;
  } catch (error) {
    console.error(`[renew] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

function runRelease(args: string[]): number {
  const unknown = unknownOption(args, ['--force', '--agent']);
  if (unknown !== null) {
    console.error(`[release] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const id = args.find((a) => !a.startsWith('--'));
  if (!id) {
    console.error('usage: gate release <PRD-XXX> [--force] [--agent=identity]');
    return 1;
  }
  const force = args.includes('--force');
  const agent = args.find((a) => a.startsWith('--agent='))?.slice('--agent='.length);
  const { root, config } = loadConfig();
  try {
    const result = releaseLease(config, root, id, { force, agent });
    if (!result.ok) {
      console.error(`[release] REFUSED — ${result.id} not released:`);
      for (const issue of result.issues) console.error(`  ✗ ${issue}`);
      return 1;
    }
    if (result.released.length === 0) {
      // Idempotent: nothing to release is success (exit 0).
      for (const note of result.issues) console.log(`[release] ${note}`);
      return 0;
    }
    for (const lease of result.released) {
      const who = lease.foreign ? ` (FORCED — agent ${lease.agent}, expired ${lease.expiresAt})` : '';
      console.log(`[release] released ${lease.prd}${who}`);
    }
    for (const note of result.issues) console.error(`[release] ${note}`);
    return 0;
  } catch (error) {
    console.error(`[release] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

/** Colour a readiness verdict token inside an already-padded cell — the paint
 * escapes add no visible width, so alignment (computed on plain text) holds. */
function paintReadiness(cell: string, tier: ReturnType<typeof colorTier>): string {
  if (tier === 'none') return cell;
  return cell
    .replace('PASS', paint('green', 'PASS', tier))
    .replace('ITERATE', paint('amber', 'ITERATE', tier))
    .replace('REJECT', paint('red', 'REJECT', tier));
}

function runStatus(args: string[]): number {
  // `status` WRITES `_state/prds.json`, so it is a mutating command and belongs
  // under the same rule as the rest. The first pass at this change listed the
  // obviously-mutating verbs and missed the one whose name sounds read-only.
  // `--json` is NOT accepted here: `runStatus` has no JSON branch, and listing an
  // option the command ignores feeds a human table to automation that asked for
  // machine output. `gate queue --json` is the command that has it.
  const unknown = unknownOption(args, []);
  if (unknown !== null) {
    console.error(`[status] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const { root, config } = loadConfig();
  const state = buildState(config, root);
  const path = writeState(config, root, state);
  const tier = colorTier();

  if (state.records.length === 0) {
    console.log('(no workflow artifacts found)');
  } else {
    // FR-5 — aligned table. Widths are computed on PLAIN text (one record per
    // line, space-padded only — no unicode rules), so `grep PRD-001` still works.
    const cols = ['ID', 'STATE', 'READINESS', 'TASKS', 'SLUG'] as const;
    const rows = state.records.map((r) => {
      const total = r.task.checkedCount + r.task.uncheckedCount;
      const readiness = r.readiness.verdict
        ? r.readiness.score !== null
          ? `${r.readiness.verdict} · ${r.readiness.score}`
          : r.readiness.verdict
        : '—';
      return [
        r.prd,
        r.status,
        readiness,
        total > 0 ? `${r.task.checkedCount}/${total}` : '—',
        r.slug,
      ];
    });
    const width = cols.map((h, i) => Math.max(h.length, ...rows.map((row) => row[i]!.length)));
    const pad = (cells: string[]): string[] => cells.map((c, i) => c.padEnd(width[i]!));
    console.log(pad([...cols]).join('  ').trimEnd());
    for (const row of rows) {
      const padded = pad(row);
      padded[2] = paintReadiness(padded[2]!, tier); // colour the readiness verdict
      console.log(padded.join('  ').trimEnd());
    }
  }
  for (const [label, value] of Object.entries(statusPanelMetrics(config, state.records))) {
    console.log(`${label}: ${value}`);
  }
  console.log(`wrote ${path}`);
  return 0;
}

function runQueue(json: boolean): number {
  const { root, config } = loadConfig();
  const state = buildState(config, root);
  writeState(config, root, state);
  const queue = buildQueue(config, root, state.records, collectLocks(root, config), {
    generatedAt: state.generatedAt,
  });

  if (json) {
    console.log(JSON.stringify(queue, null, 2));
    return 0;
  }

  const lines: string[] = [];
  const push = <T>(title: string, rows: T[], fmt: (row: T) => string): void => {
    lines.push(`${title} (${rows.length})`);
    for (const row of rows) lines.push(`  ${fmt(row)}`);
  };
  push(
    'READY',
    queue.ready,
    (r) =>
      `${r.prd}  ${r.status}/${r.readinessVerdict ?? '-'} score=${r.readinessScore ?? '-'} tasks=${r.uncheckedTasks}${r.resume ? ' [resume]' : ''}  ${r.slug}`,
  );
  const tier = colorTier();
  if (queue.readyOverlaps.length > 0) {
    // FR-6 — overlaps carry the `!` marker in stale-amber (a blocking condition,
    // not a failure); the glyph carries the meaning under NO_COLOR.
    lines.push(`  ${paint('stale', '!', tier)} overlap (do not run together):`);
    for (const w of queue.readyOverlaps)
      lines.push(`    ${w.a} <-> ${w.b}: ${w.shared.join(', ')}`);
  }
  if (queue.surfaceRejections.length > 0) {
    // A token the author wrote and the lock engine never received. Silence here
    // is the worst outcome: they believe a path is protected and it is not.
    lines.push(`  ${paint('stale', '!', tier)} Conflict Surface tokens NOT claimed:`);
    for (const s of queue.surfaceRejections)
      for (const r of s.rejected) lines.push(`    ${s.prd}: \`${r.token}\` — ${r.reason}`);
  }
  push(
    'IN-FLIGHT',
    queue.inFlight,
    (r) => {
      // Stale leases render their countdown in stale-amber; live leases plain.
      const remaining = formatLeaseRemaining(r.expiresInSeconds, r.stale);
      const badge = r.stale ? paint('stale', remaining, tier) : remaining;
      return `${r.prd}  agent=${r.agent} ${r.phase}  ${badge}${r.worktree ? ` ${r.worktree}` : ''}`;
    },
  );
  push(
    'BLOCKED',
    queue.blocked,
    (r) => `${r.prd}  ${r.status}/${r.readinessVerdict ?? '-'}  ${r.slug}`,
  );
  push('IN-REVIEW', queue.inReview, (r) => `${r.prd}  ${r.status}  ${r.slug}`);
  console.log(lines.join('\n'));
  return 0;
}

function findRecord(
  config: WorkflowConfig,
  root: string,
  idArg: string,
): { record: StateRecord; id: string } | null {
  const number = Number.parseInt(idArg.replace(/^\D+-?/, ''), 10);
  if (!Number.isFinite(number)) return null;
  const state = buildState(config, root);
  writeState(config, root, state);
  const record = state.records.find((r) => r.number === number);
  if (!record) return null;
  return { record, id: formatId(config.idPattern, number) };
}

/**
 * `gate doctor` — read-only install diagnosis.
 *
 * Bare `gate doctor` prints usage and exits 1 rather than guessing a mode. That
 * is the house style `gate renew` and `gate release` already set, and it is what
 * keeps the surface defined when a second doctor mode lands: today's bare
 * invocation must not become tomorrow's silent default.
 */
function runDoctor(args: string[]): number {
  const unknown = unknownOption(args, ['--memory', '--json']);
  if (unknown !== null) {
    console.error(`[doctor] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  if (!args.includes('--memory')) {
    console.error('usage: gate doctor --memory [--json]');
    return 1;
  }
  const json = args.includes('--json');
  const { root, config } = loadConfig();
  const manifest = loadManifest(config, root);

  const pkgPath = resolve(root, 'package.json');
  const packageScripts = existsSync(pkgPath)
    ? ((JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> })
        .scripts ?? {})
    : undefined;

  // CI files are READ, never required: their absence warns rather than fails,
  // because a repository may run its gates from anywhere.
  const ciTexts: string[] = [];
  const workflows = resolve(root, '.github/workflows');
  if (existsSync(workflows)) {
    for (const name of readdirSync(workflows)) {
      if (!/\.ya?ml$/.test(name)) continue;
      try {
        ciTexts.push(readFileSync(resolve(workflows, name), 'utf8'));
      } catch {
        /* unreadable CI file — absence warns, it does not fail */
      }
    }
  }

  const report = memoryDoctor({ config, manifest, root, packageScripts, ciTexts });
  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return report.code;
  }

  const tier = colorTier();
  const glyph = { pass: '✓', warn: '⚠', fail: '✗' } as const;
  const slot = { pass: 'green', warn: 'amber', fail: 'red' } as const;
  console.log(`[doctor --memory] ${config.memory.enabled ? 'contract ON' : 'contract OFF'}`);
  for (const check of report.checks) {
    console.log(`  ${paint(slot[check.severity], glyph[check.severity], tier)} ${check.id}: ${check.detail}`);
    if (check.remedy !== undefined) console.log(`      → ${check.remedy}`);
  }
  const fails = report.checks.filter((c) => c.severity === 'fail').length;
  const warns = report.checks.filter((c) => c.severity === 'warn').length;
  console.log(
    report.ok
      ? `[doctor --memory] reachable${warns > 0 ? ` — ${warns} warning(s)` : ''}`
      : `[doctor --memory] ${fails} blocking problem(s)${warns > 0 ? `, ${warns} warning(s)` : ''}`,
  );
  return report.code;
}

/**
 * `gate memory find` — deterministic recall.
 *
 * `memory` is a NOUN with subcommands, so a bare `gate memory` prints usage and
 * exits 1 exactly as bare `gate doctor` does. The surface has to be defined
 * before a second subcommand lands, not after.
 */
function runMemory(args: string[]): number {
  const sub = args.find((a) => !a.startsWith('-'));
  if (sub !== 'find') {
    console.error(
      'usage: gate memory find [--query=<text>] [--paths=<a,b>] [--tag=<slug>] [--limit=N] [--json]',
    );
    return 1;
  }
  const rest = args.filter((a) => a !== 'find');
  const unknown = unknownOption(rest, ['--query', '--paths', '--tag', '--limit', '--json']);
  if (unknown !== null) {
    console.error(`[memory] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const value = (name: string): string | undefined =>
    rest.find((a) => a.startsWith(`${name}=`))?.slice(name.length + 1);
  const rawLimit = value('--limit');
  const selectors = {
    ...(value('--query') === undefined ? {} : { query: value('--query')! }),
    ...(value('--tag') === undefined ? {} : { tag: value('--tag')! }),
    ...(value('--paths') === undefined ? {} : { paths: value('--paths')!.split(',') }),
    // A non-numeric `--limit` becomes NaN, which the bounds check refuses by
    // name rather than silently falling back to the default.
    ...(rawLimit === undefined ? {} : { limit: Number(rawLimit) }),
  };

  const { root, config } = loadConfig();
  const result = memoryFind(config, root, selectors);
  if (rest.includes('--json')) {
    console.log(JSON.stringify(result, null, 2));
    return result.ok ? 0 : 1;
  }
  if (!result.ok) {
    console.error(`[memory find] ${result.problem}`);
    if (result.remedy !== undefined) console.error(`  → ${result.remedy}`);
    return 1;
  }
  if (result.hits.length === 0) {
    console.log(`[memory find] no active record matched (searched ${result.searched})`);
    // Deterministic, not relevant — say so, so an empty result is not read as
    // "there is nothing to know about this".
    console.log('  → ranking is by watch/name/tag/token overlap; read `_brain/INDEX.md` too');
    return 0;
  }
  console.log(`[memory find] ${result.hits.length} of ${result.searched} active record(s)`);
  for (const hit of result.hits) {
    console.log(`  ${hit.slug} (${hit.type}/${hit.scope}) — ${hit.description}`);
    console.log(`      ${hit.path} · matched: ${hit.reasons.join(', ')}`);
    if (hit.matchedPaths.length > 0) console.log(`      watches: ${hit.matchedPaths.join(', ')}`);
  }
  return 0;
}

/**
 * `gate check --value-score` — the corpus sweep.
 *
 * `gate check PRD-NNN` only covers the item in front of it, which cannot catch
 * a score edited AFTER its PRD passed Phase 2. This applies the same decision
 * to every record in state and reports each failure with both numbers.
 *
 * Pre-cutoff skips are printed rather than silent: a sweep that says nothing
 * about the items it did not check reads as a sweep that checked them.
 */
function runValueScoreSweep(config: WorkflowConfig, root: string): number {
  const state = buildState(config, root);
  const failures: string[] = [];
  const skipped: string[] = [];
  // Counted separately on purpose. An item with no header and no cutoff is not
  // "scored and passing" — nothing was recomputed for it — and a summary that
  // folds the two together claims more than the sweep did, which is the exact
  // shape of defect this work item exists to remove.
  let scored = 0;
  let headerless = 0;

  for (const record of state.records) {
    const rel = record.artifacts.prd;
    if (!rel) continue;
    let content: string;
    try {
      content = readFileSync(resolve(root, rel), 'utf8');
    } catch (error) {
      // A record naming a file we cannot read is a finding, not a skip: the
      // state snapshot and the tree disagree.
      failures.push(`${record.prd}: cannot read ${rel} (${error instanceof Error ? error.message : String(error)})`);
      continue;
    }
    const cutoff = config.valueScoring.enforceFrom;
    if (cutoff !== undefined && record.number < cutoff && scoreValueHeader(config, content).problem?.kind === 'absent') {
      skipped.push(`${record.prd}: no header, and id ${record.number} is before the cutoff of ${cutoff}`);
      continue;
    }
    if (scoreValueHeader(config, content).problem?.kind === 'absent') headerless++;
    else scored++;
    const issue = valueScoreIssue(config, content, record.number);
    if (issue !== null) failures.push(`${record.prd}: ${issue}`);
  }

  for (const line of skipped) console.log(`[check --value-score] skipped ${line}`);
  const tally = `${scored} scored, ${headerless} without a header, ${skipped.length} skipped by the cutoff`;
  if (failures.length > 0) {
    console.error(`[check --value-score] ${failures.length} failure(s) — ${tally}:`);
    for (const line of failures) console.error(`  - ${line}`);
    return 1;
  }
  console.log(`[check --value-score] ok — ${tally}`);
  return 0;
}

function runCheck(args: string[]): number {
  const unknown = unknownOption(args, ['--wiring', '--value-score']);
  if (unknown !== null) {
    console.error(`[check] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const { root, config } = loadConfig();
  const manifest = loadManifest(config, root);

  if (args.includes('--wiring')) {
    const report = auditWiring(config, manifest, root);
    // PRD-025: the surface list is the visibility half of the narrow grammar —
    // a surface lost to a non-conforming input shows up here as a missing
    // entry, which is what a maintainer watches. Printed on success AND
    // failure, or the promise in the release note is only programmatic.
    console.log(`[check --wiring] surfaces read: ${report.surfaces.join(', ')}`);
    if (!report.ok) {
      console.error('[check --wiring] wiring issues:');
      for (const issue of report.issues) console.error(`  - ${issue}`);
      return 1;
    }
    console.log('[check --wiring] ok — every gate is wired or excepted');
    return 0;
  }

  if (args.includes('--value-score')) return runValueScoreSweep(config, root);

  const idArg = args.find((a) => !a.startsWith('-'));
  if (!idArg) {
    console.error('usage: gate check PRD-XXX | gate check --wiring');
    return 1;
  }
  const found = findRecord(config, root, idArg);
  if (!found || !found.record.artifacts.prd) {
    console.error(`[check] no PRD artifact in state for ${idArg}`);
    return 1;
  }
  const content = readFileSync(resolve(root, found.record.artifacts.prd), 'utf8');
  const report = lintPrd(config, manifest, content, root, found.record.number);
  if (!report.ok) {
    console.error(`[check] ${found.id} is not ready:`);
    for (const issue of report.issues) console.error(`  - ${issue}`);
    return 1;
  }
  console.log(`[check] ok — ${found.id} passes the readiness lint`);
  return 0;
}

/** This checkout's HEAD commit, or null when unreadable. */
function headSha(root: string): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

/** The branch this checkout is on, or null when detached/unreadable. */
function currentBranch(root: string): string | null {
  try {
    return execFileSync('git', ['symbolic-ref', '--quiet', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  } catch {
    return null;
  }
}

interface WorktreeStamps {
  worktree: string;
  branch: string;
  /** The COMPLETE lease as serialized at snapshot time, plus the file it came
   * from. Cleanup compares this whole document under the claim mutex: any
   * field subset can collide when claimants share the default agent identity
   * and an injected clock, and a rival's refreshed claim must never be torn
   * down (codex r28+r29 P1). */
  identity: string;
  /** Basename, used for identity comparison across a refresh. */
  file: string;
  /** Absolute path, used to unlink. */
  leasePath: string;
  /** The paths this lease claims exclusive write-ownership of. A claim over a
   * control artifact is what AUTHORIZES the checkout to differ from base on it
   * — see the revalidation seam in `runRun`. */
  ownedPaths: string[];
}

/** Worktree/branch stamps from the PRD's lease, when a `--worktree` claim
 * wrote them — the merge guard and post-merge cleanup key off these. When a
 * superseded self lease survived an earlier cleanup warning, several valid
 * files name this PRD; the NEWEST install is the live claim, so filename sort
 * order must not decide which identity cleanup guards (codex r22 P1). */
function worktreeStamps(
  config: WorkflowConfig,
  root: string,
  id: string,
): { stamps: WorktreeStamps | null; malformed: string[] } {
  // Rank ALL of the PRD's leases first, THEN read the winner's stamps: an
  // older stamped lease must not outrank a newer unstamped one (an external
  // worktree claim), or its stale stamps would drive the branch guard and
  // tear down a checkout the live claim never named (codex r24 P1). Leases we
  // cannot reason about FAIL CLOSED exactly as `gate open` does — ranking a
  // malformed object as live would silently drop worktree mode and merge an
  // unrelated branch (codex r25 P1).
  const malformed: string[] = [];
  const candidates = listLockFiles(config, root).filter((lock) => {
    // Unreadable or ownership-less entries cannot be ruled OUT as ours, and
    // silently ignoring them would drop worktree mode and merge an unrelated
    // branch — the same fail-closed rule `gate open` applies (codex r26 P1).
    if (!lock.data) {
      malformed.push(`${lock.name}: ${lock.error ?? 'unreadable'}`);
      return false;
    }
    const owner = lock.data['prd'];
    if (typeof owner !== 'string' || owner.length === 0) {
      malformed.push(`${lock.name}: missing or non-string prd — ownership unknowable`);
      return false;
    }
    if (owner !== id) return false;
    const issues = validateLock(config, lock.data, { now: 0 });
    if (issues.length > 0) {
      malformed.push(`${lock.name}: ${issues.join('; ')}`);
      return false;
    }
    return true;
  });
  if (malformed.length > 0) return { stamps: null, malformed };

  const live = candidates.sort(
    (a, b) =>
      (Date.parse(String(b.data!['startedAt'] ?? '')) || 0) -
      (Date.parse(String(a.data!['startedAt'] ?? '')) || 0),
  )[0];
  if (!live?.data) return { stamps: null, malformed };
  const wt = live.data['worktree'];
  const br = live.data['branch'];
  // Only a lease with NEITHER stamp is a plain claim. One-sided stamps mean
  // the worktree metadata is damaged: treating that as plain mode would skip
  // the branch guard, source pinning, and cleanup (codex r27 P1).
  const hasWt = typeof wt === 'string';
  const hasBr = typeof br === 'string';
  if (hasWt !== hasBr) {
    return {
      stamps: null,
      malformed: [
        ...malformed,
        `${live.name}: only ${hasWt ? 'worktree' : 'branch'} is stamped — worktree metadata is incomplete`,
      ],
    };
  }
  if (!hasWt || !hasBr) return { stamps: null, malformed };
  return {
    stamps: {
      worktree: wt,
      branch: br,
      ownedPaths: Array.isArray(live.data['ownedPaths'])
        ? (live.data['ownedPaths'] as unknown[]).filter((p): p is string => typeof p === 'string')
        : [],
      // Key order is whatever the parse produced; an identical rewrite by the
      // same writer reproduces it, and ANY field change breaks equality.
      identity: JSON.stringify(live.data),
      file: live.name,
      // The ABSOLUTE path, kept apart from `file`. `file` is a basename and is
      // compared for identity; teardown needs something it can unlink, and
      // passing the basename made `unlinkSync` resolve against the process cwd,
      // fail with ENOENT, and report the lease released while it survived.
      leasePath: live.path,
    },
    malformed,
  };
}

/**
 * Refuse an option this command does not know.
 *
 * Flags were detected with `includes`, and anything unrecognized was simply
 * ignored — so `gate run PRD-018 --dry-rnu` read `dryRun` as false and ran the
 * live archive-and-merge. A misspelled SAFETY flag must never be the difference
 * between a plan and a mutation, and silence is the worst possible answer to
 * "did you mean --dry-run?".
 */
function unknownOption(args: string[], known: readonly string[]): string | null {
  for (const arg of args) {
    if (!arg.startsWith('-')) continue;
    const [name, ...rest] = arg.split('=');
    if (!known.includes(name ?? arg)) return arg;
    // A BOOLEAN flag takes no value. `--dry-run=true` passed the name check and
    // then failed the exact-token test that decides dry-run, so the safest
    // spelling a user could reach for ran the live merge. Refusing is the only
    // answer that cannot be misread: `--dry-run=false` must not silently mean
    // "dry run" either.
    if (rest.length > 0 && BOOLEAN_OPTIONS.has(name ?? '')) return arg;
  }
  return null;
}

/** Options that are present-or-absent. Giving one a value is an error, not a
 * value. */
const BOOLEAN_OPTIONS = new Set([
  '--dry-run',
  '--practices',
  '--steal',
  '--worktree',
  '--force',
  '--yes',
]);

function runRun(args: string[], { mergeOnly = false } = {}): number {
  const unknown = unknownOption(args, ['--dry-run', '--from-phase']);
  if (unknown !== null) {
    console.error(`[run] unknown option ${unknown} — refusing rather than guessing what it meant`);
    return 1;
  }
  const dryRun = args.includes('--dry-run');
  if (process.env[RUN_ACTIVE_ENV] && !dryRun) {
    console.error(
      '[run] refusing to nest: a gate run is already active (a §11 row must not invoke the runner)',
    );
    return 1;
  }

  const fromRaw =
    args.find((a) => a.startsWith('--from-phase='))?.slice('--from-phase='.length) ?? null;
  let fromPhase: FromPhase;
  try {
    fromPhase = mergeOnly ? 'merge' : parseFromPhase(fromRaw);
  } catch (error) {
    console.error(`[run] ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }

  const idArg = args.find((a) => !a.startsWith('-'));
  if (!idArg) {
    console.error('usage: gate run [--dry-run] [--from-phase=4|5|6|7|merge] PRD-XXX');
    return 1;
  }

  const { root, config } = loadConfig();
  const manifest = loadManifest(config, root);
  const found = findRecord(config, root, idArg);
  if (!found || !found.record.artifacts.prd) {
    console.error(`[run] no PRD artifact in state for ${idArg} — check gate status`);
    return 1;
  }
  const { record, id } = found;
  const prdContent = readFileSync(resolve(root, record.artifacts.prd), 'utf8');
  const tasksContent = record.artifacts.tasks
    ? readFileSync(resolve(root, record.artifacts.tasks), 'utf8')
    : '';
  const prdClass = parsePrdClass(config, prdContent);
  const changedFiles = collectDiffFiles(root, config.branches.base);

  const chain = buildGateChain({
    config,
    manifest,
    root,
    record,
    prdContent,
    tasksContent,
    changedFiles,
    prdClass,
  });

  // FR-7 — the plan view. The DRY-RUN header is plan-cyan (what WILL run, not a
  // pass/fail); the chain tree follows, then a closing line.
  const planHeader = `[run] ${dryRun ? 'DRY-RUN ' : ''}plan for ${id} (${record.slug}) class=${prdClass}`;
  console.log(dryRun ? paint('plan', planHeader) : planHeader);
  if (fromPhase) console.log(`  resume from: phase ${fromPhase}`);
  console.log(
    `  autonomous close: ${record.autonomousClose ?? '(unset)'} | operator rows: ${record.task.operatorHandoffCount}`,
  );
  for (const line of planChain(chain, fromPhase)) console.log(`  ${line}`);
  console.log('  ── archive wip→completed (pre-merge)');
  console.log(`  ── merge feature → LOCAL ${config.branches.base} (no-ff) + post-merge gates`);
  console.log('  ── handoff card → HUMAN runs `git push` (the runner never pushes)');

  if (dryRun) {
    console.log(paint('plan', 'nothing runs · nothing merges · this is a plan'));
    console.log('[run] dry-run complete — nothing executed, nothing merged, nothing pushed');
    return 0;
  }

  // Lease identity is captured BEFORE the gates run: a rival refresh during a
  // long chain bumps startedAt/expiresAt, and snapshotting afterwards would
  // adopt the new claimant's identity — final revalidation would then "match"
  // and tear down a checkout that now belongs to someone else (codex r21 P1).
  const leaseState = worktreeStamps(config, root, id);
  if (leaseState.malformed.length > 0) {
    console.error(
      stopCard({
        id,
        phase: 'merge',
        why: `malformed lease(s) for ${id} (${leaseState.malformed.join('; ')}) — ownership is unknowable; repair or delete them, then re-run`,
        results: [],
      }),
    );
    return 1;
  }
  const stamps = leaseState.stamps;

  // PRD-022 — the checkout must still carry the control artifacts base carries,
  // BEFORE anything runs. `gate land` is this same function with mergeOnly, so
  // one insertion covers both commands; it precedes every phase command, every
  // chain metric write, `mergePreconditions`, the archive, and the merge.
  //
  // The PRD blob is deliberately NOT passed: a worktree edits its own PRD for
  // its whole life, and including it would refuse every run mid-phase.
  //
  // Third in precedence, and it changes neither refusal above it: the loaders
  // throw on an unparseable control file before this function reaches here, and
  // the malformed-lease refusal fires directly above. The case neither covers is
  // the one this catches — `loadManifest` falls back to `defaultManifest` when
  // the file is merely ABSENT, so a locally deleted manifest still committed on
  // base produces no error at all, just quietly different gates.
  if (stamps !== null) {
    const revalidation = revalidateControlArtifacts({
      root,
      config,
      relPath: stamps.worktree,
      branch: stamps.branch,
    });
    // A difference in a file this lease OWNS is not drift — it is the work.
    //
    // PRD-022's check compares the checkout's control artifacts against base
    // and refuses any difference, which is right for a checkout that has fallen
    // behind. It cannot, on its own, tell that apart from a work item whose
    // declared job is to edit `workflow.config.json` — and PRD-021 is the first
    // such item, refused by the gate at its own close.
    //
    // The lease is the authorization. A `## Conflict Surface` claim means
    // exclusive write-ownership, so a control artifact inside `ownedPaths` is
    // one this branch is entitled to change. Everything else still refuses,
    // including a control artifact the item never claimed.
    const owned = new Set(stamps.ownedPaths);
    const unauthorized = revalidation.drifted.filter((rel) => !owned.has(rel));
    if (revalidation.refusal !== null && unauthorized.length > 0) {
      console.error(
        stopCard({
          id,
          phase: 'merge',
          why:
          `the checkout at ${stamps.worktree} carries workflow artifacts differing from ` +
          `'${config.branches.base}' (${unauthorized.join(', ')}) — merge or rebase ` +
          `${config.branches.base} into ${stamps.branch} first — nothing ran, nothing merged`,
          results: [],
        }),
      );
      return 1;
    }
  }

  // FR-3 — live status line per gate as it resolves. Core stays silent; the CLI
  // supplies the reporter and renders via the shared status-line builder.
  const outcome = runChain({
    config,
    root,
    id,
    fromPhase,
    chain,
    onResult: (phase, label, ok) => {
      const verdict = ok ? 'passed' : 'failed';
      console.error(paint(verdictSlot[verdict], statusLine({ phase, name: label, verdict })));
    },
  });
  if (outcome.stopped) {
    console.error(
      stopCard({
        id,
        phase: outcome.stopped.phase,
        why: outcome.stopped.why,
        results: outcome.results,
      }),
    );
    return 1;
  }

  // Merge preconditions run BEFORE the archive mutates anything: invoking from
  // the base branch or with a dirty checkout must not leave archive commits
  // behind (codex P1 finding).
  const pre = mergePreconditions(config, root);
  if (!pre.ok) {
    console.error(
      stopCard({
        id,
        phase: 'merge',
        why: pre.why ?? 'precondition failed',
        results: outcome.results,
      }),
    );
    return 1;
  }
  // Worktree-mode branch guard: a --worktree lease pins the branch the close
  // must run from — merging a different checkout under a stamped lease is a
  // wrong-tree merge, not a variant.
  if (stamps && pre.branch !== stamps.branch) {
    console.error(
      stopCard({
        id,
        phase: 'merge',
        why: `lease pins branch ${stamps.branch} but the checkout is on ${pre.branch ?? '?'} — run from the claimed worktree`,
        results: outcome.results,
      }),
    );
    return 1;
  }
  // Worktree-mode base invariants, BEFORE the archive mutates anything: the
  // base branch must live in another (clean) checkout, or the merge would
  // refuse — or worse, fall back to merging inside the feature worktree —
  // after archive commits already landed (codex r1 P1).
  let cleanupChdirTarget: string | null = null;
  if (stamps) {
    const baseReady = baseWorktreeReady(config, root);
    if (!baseReady.ok) {
      console.error(
        stopCard({
          id,
          phase: 'merge',
          why: baseReady.why ?? 'base checkout not ready',
          results: outcome.results,
        }),
      );
      return 1;
    }
    cleanupChdirTarget = baseReady.baseDir ?? null;
  }

  let archivedTip: string | null;
  try {
    const archived = archivePrdArtifacts(config, root, record);
    if (archived.moved.length > 0) {
      console.log(`[run] archived ${archived.moved.length} artifact(s)`);
      outcome.results.push(['archive: wip→completed', 'passed']);
    }
    // The commit the archive itself created — read from `git commit`, not a
    // later HEAD lookup a post-commit hook may already have rewritten (codex
    // r23+r24 P1). Nothing archived → nothing to pin.
    archivedTip = archived.commitSha ?? null;
  } catch (error) {
    console.error(
      stopCard({
        id,
        phase: '7 Learning',
        why: `archive failed: ${error instanceof Error ? error.message.split('\n')[0] : String(error)}`,
        results: outcome.results,
      }),
    );
    return 1;
  }

  // Archiving commits, and a post-commit hook can switch this checkout to
  // another branch — merging whatever HEAD now names would land unrelated
  // work and leave the claimed branch (and the archive commit) unmerged.
  // Re-prove the pin immediately before the merge (codex r22 P1).
  let pinnedSource: string | null = null;
  if (stamps) {
    const branchNow = currentBranch(root);
    const tipNow = headSha(root);
    const drift =
      branchNow !== stamps.branch
        ? `the checkout moved to ${branchNow ?? 'a detached HEAD'}; the lease pins ${stamps.branch}`
        : archivedTip !== null && tipNow !== archivedTip
          ? `${stamps.branch} no longer has the archive commit ${archivedTip.slice(0, 7)} at its tip (now ${tipNow?.slice(0, 7) ?? '?'}) — a hook rewrote it`
          : null;
    if (drift !== null) {
      console.error(
        stopCard({ id, phase: 'merge', why: `${drift} — nothing was merged`, results: outcome.results }),
      );
      return 1;
    }
    // A resumed close archives nothing, so there is no archive commit to pin
    // — the tip just verified is the pin instead; never fall back to the
    // mutable branch name (codex r26 P1).
    pinnedSource = archivedTip ?? tipNow;
  }

  // Merge the VERIFIED commit, not the branch name — the name can move
  // between the check above and the merge below (codex r25 P1).
  const merge = mergeToLocalBase({
    config,
    manifest,
    root,
    id,
    ...(pinnedSource !== null ? { sourceSha: pinnedSource } : {}),
  });
  for (const row of merge.postMergeResults ?? []) outcome.results.push(row);
  if (!merge.ok) {
    console.error(
      stopCard({ id, phase: 'merge', why: merge.why ?? 'merge failed', results: outcome.results }),
    );
    return 1;
  }

  // Post-merge cleanup (worktree-stamped leases only). Runs LAST among
  // filesystem work: it may remove the very directory this process runs in.
  // Failures degrade to card warnings — the landed merge is immutable (W3).
  let cleanupWarnings: string[] = [];
  let cleanupDone = false;
  if (stamps) {
    // Windows refuses deleting a process's current directory — step out of
    // the worktree (into the base checkout) before teardown (codex r8 P1).
    if (cleanupChdirTarget !== null) {
      try {
        process.chdir(cleanupChdirTarget);
      } catch {
        /* removal will degrade to a warning if the cwd blocks it */
      }
    }
    // Teardown holds the SAME mutex as claims and revalidates the lease
    // identity first: a rival `gate open --worktree` that refreshed the
    // lease after our stamps snapshot owns the checkout now — deleting it
    // would tear down an active claim (codex r13 P1).
    // The merge has LANDED — nothing past this point may throw the close
    // away. A busy or stale mutex degrades to a cleanup warning on the
    // handoff card, never a crash without one (W3, codex r14 P1).
    try {
      withWorkspaceMutex(claimMutexPath(config, root), () => {
        const fresh = worktreeStamps(config, root, id).stamps;
        if (!fresh || fresh.file !== stamps.file || fresh.identity !== stamps.identity) {
          cleanupWarnings = [
            'worktree cleanup skipped: the lease was refreshed or replaced by another claimant — the checkout stays',
          ];
          return;
        }
        // `stamps.file` is the lease this close owns — identity-revalidated
        // immediately above, inside the same mutex hold. Teardown unlinks it, so
        // the work item stops being IN-FLIGHT the moment its checkout is gone.
        const removal = removeWorktree(config, root, { ...stamps, lease: stamps.leasePath });
        cleanupDone = removal.removed;
        if (removal.removed) {
          outcome.results.push([
            `cleanup: worktree removed${removal.branchDeleted ? ' + branch deleted' : ''}${
              removal.leaseReleased ? ' + lease released' : ''
            }`,
            'passed',
          ]);
        }
        cleanupWarnings = removal.warnings;
      });
    } catch (error) {
      cleanupWarnings = [
        `worktree cleanup skipped (${error instanceof Error ? error.message.split('\n')[0] : String(error)}) — the merge is landed; remove ${stamps.worktree} manually`,
      ];
    }
  } else {
    // A PLAIN `gate open` claims a lease too, and only the worktree path ever
    // released one — so a successful non-worktree close left its own lease
    // blocking every overlapping work item until it expired. The merge has
    // LANDED, so this degrades to a warning rather than a failure (W3), and it
    // holds the same mutex claims do so a rival cannot slip between the read
    // and the removal.
    try {
      // `releaseLease` takes the claim mutex itself and fails closed on an
      // unreadable or foreign lease, which is the behaviour wanted here: a
      // refusal becomes a warning naming what remains, never a silent unlink.
      // As the CLAIMING agent, read from the lease itself. Defaulting to the
      // first configured owner made `gate open --agent=worker` unreleasable:
      // release refused its own close's lease as foreign, and the landed work
      // went on blocking overlapping items until the TTL expired.
      const holder = leaseHolder(config, root, id);
      const release = releaseLease(config, root, id, holder === null ? {} : { agent: holder });
      if (release.released.length > 0) {
        outcome.results.push(['cleanup: lease released', 'passed']);
      } else if (release.issues.length > 0) {
        cleanupWarnings = [
          `lease for ${id} was not released (${release.issues[0]}) — the merge is landed; release it with \`gate release ${id}\``,
        ];
      }
    } catch (error) {
      cleanupWarnings = [
        `lease release skipped (${error instanceof Error ? error.message.split('\n')[0] : String(error)}) — the merge is landed; release it with \`gate release ${id}\``,
      ];
    }
  }

  console.log(
    handoffCard({
      id,
      slug: record.slug,
      branch: merge.branch ?? '?',
      base: config.branches.base,
      diffstat: merge.diffstat ?? '',
      results: outcome.results,
      operatorRows: record.task.operatorHandoffCount,
      autonomousClose: record.autonomousClose,
      metricsHint: `${config.dirs.metricsFile} (local JSONL, yours)`,
      warnings: cleanupWarnings,
    }),
  );
  if (stamps) {
    // Completion is claimed only when removal actually happened — a refused
    // (dirty/busy/foreign-occupied) cleanup must not read as done (codex r4
    // P3); the handoff warnings above name what remains.
    console.log(
      cleanupDone
        ? '[run] worktree cleanup done — if your shell sat in it, cd to the main checkout'
        : '[run] worktree cleanup INCOMPLETE — see handoff warnings; manual cleanup remains',
    );
  }
  console.log(`[run] ${id} merged to local ${config.branches.base}; push is yours`);
  return 0;
}

export function main(argv: string[]): number {
  const [command, ...rest] = argv;

  if (command === undefined || command === '--help' || command === '-h') {
    console.log(usage());
    return 0;
  }

  if (command === '--version' || command === '-v') {
    console.log(pkg.version);
    return 0;
  }

  if (command === 'push') {
    // The refusal reads as a decision (human-authority blue), not a failure.
    // Text is byte-identical under NO_COLOR.
    console.error(paint('human', 'No. Push is yours.'));
    return 1;
  }

  try {
    if (command === 'init') return runInit(rest);
    if (command === 'new') return runNew(rest);
    if (command === 'open') return runOpen(rest);
    if (command === 'renew') return runRenew(rest);
    if (command === 'release') return runRelease(rest);
    if (command === 'status') return runStatus(rest);
    if (command === 'queue') {
      // `queue` writes the state snapshot, and `check` reaches state-writing
      // `findRecord` — both are mutating and both were missed when the rule was
      // written by listing the verbs that sound mutating.
      const unknown = unknownOption(rest, ['--json']);
      if (unknown !== null) {
        console.error(`[queue] unknown option ${unknown} — refusing rather than guessing what it meant`);
        return 1;
      }
      return runQueue(rest.includes('--json'));
    }
    if (command === 'check') return runCheck(rest);
    if (command === 'doctor') return runDoctor(rest);
    if (command === 'memory') return runMemory(rest);
    if (command === 'run') return runRun(rest);
    if (command === 'land') return runRun(rest, { mergeOnly: true });
  } catch (error) {
    if (error instanceof ConfigError || error instanceof ManifestError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  console.error(`unknown command: ${command}\n`);
  console.error(usage());
  return 1;
}

process.exitCode = main(process.argv.slice(2));
