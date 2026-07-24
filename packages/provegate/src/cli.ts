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
import { resolve } from 'node:path';
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
} from './core/gates/index.js';
import { existsSync } from 'node:fs';
import { dirname as pathDirname } from 'node:path';
import {
  RUN_ACTIVE_ENV,
  archivePrdArtifacts,
  baseWorktreeReady,
  buildGateChain,
  claimPrd,
  createPrd,
  initWorkspace,
  mergePreconditions,
  mergeToLocalBase,
  claimMutexPath,
  parseFromPhase,
  planChain,
  releaseLease,
  removeWorktree,
  runChain,
  stopCard as buildStopCard,
  withWorkspaceMutex,
  type FromPhase,
} from './core/run/index.js';
import { handoffCard as buildHandoffCard } from './core/run/index.js';
import { colorTier, paint, verdictSlot, statusLine } from './core/ui/theme.js';

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
    '  init     scaffold the workflow tree + starter configs (--dry-run)',
    '  new      create the next PRD from the shipped template (gate new <slug> [--class=X])',
    '  open     claim a PRD: lease its conflict surface or refuse on overlap ([--steal] [--worktree] [--hours=N])',
    '  renew    extend your lease (idempotent refresh) (gate renew PRD-XXX [--hours=N])',
    '  release  drop a PRD lease under the claim mutex (gate release PRD-XXX [--force])',
    '  status   rebuild workflow state from artifacts and show it',
    '  queue    show the PRD queue (--json for machine output)',
    '  check    lint a PRD for readiness (gate check PRD-XXX | gate check --wiring)',
    '  run      run gated phases 4-7 + local merge (--dry-run, --from-phase=4|5|6|7|merge)',
    '  land     merge step only (alias for run --from-phase=merge)',
    '  push     refuses — push is always yours',
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
  const dryRun = args.includes('--dry-run');
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
    } catch {
      // No config yet — that's the point. Scaffold from defaults.
      return DEFAULT_CONFIG;
    }
  })();

  const report = initWorkspace(config, root, { dryRun });
  console.log(`[init] ${dryRun ? 'DRY-RUN ' : ''}root: ${root}`);
  for (const path of report.created) console.log(`  + ${path}`);
  for (const path of report.skipped) console.log(`  = ${path} (exists, skipped)`);
  console.log(
    `[init] ${report.created.length} created, ${report.skipped.length} skipped — nothing is ever overwritten`,
  );
  console.log('[init] next: see QUICKSTART.md (npm home: provegate/QUICKSTART.md)');
  return 0;
}

function runNew(args: string[]): number {
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

function runStatus(): number {
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

function runCheck(args: string[]): number {
  const { root, config } = loadConfig();
  const manifest = loadManifest(config, root);

  if (args.includes('--wiring')) {
    const report = auditWiring(config, manifest, root);
    if (!report.ok) {
      console.error('[check --wiring] wiring issues:');
      for (const issue of report.issues) console.error(`  - ${issue}`);
      return 1;
    }
    console.log('[check --wiring] ok — every gate is wired or excepted');
    return 0;
  }

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
  const report = lintPrd(config, manifest, content);
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
  file: string;
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
      // Key order is whatever the parse produced; an identical rewrite by the
      // same writer reproduces it, and ANY field change breaks equality.
      identity: JSON.stringify(live.data),
      file: live.name,
    },
    malformed,
  };
}

function runRun(args: string[], { mergeOnly = false } = {}): number {
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
        const removal = removeWorktree(config, root, stamps);
        cleanupDone = removal.removed;
        if (removal.removed) {
          outcome.results.push([
            `cleanup: worktree removed${removal.branchDeleted ? ' + branch deleted' : ''}`,
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
    if (command === 'status') return runStatus();
    if (command === 'queue') return runQueue(rest.includes('--json'));
    if (command === 'check') return runCheck(rest);
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
