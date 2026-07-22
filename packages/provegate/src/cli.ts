#!/usr/bin/env node
/**
 * provegate / gate — subcommand router.
 *
 * Real commands: status, queue (Phase B); run, land, check (Phase C).
 * Remaining stubs name their roadmap phase. `push` refuses — the runner never
 * pushes to a remote. That invariant ships (and is tested) from commit one.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { ConfigError, loadConfig, type WorkflowConfig } from './core/config/index.js';
import {
  buildQueue,
  buildState,
  formatId,
  statusPanelMetrics,
  writeState,
  type StateRecord,
} from './core/state/index.js';
import type { QueueLockInfo } from './core/state/index.js';
import { listLockFiles } from './core/locks/index.js';
import {
  ManifestError,
  auditWiring,
  collectDiffFiles,
  lintPrd,
  loadManifest,
  parsePrdClass,
} from './core/gates/index.js';
import {
  RUN_ACTIVE_ENV,
  archivePrdArtifacts,
  buildGateChain,
  handoffCard,
  mergeToLocalBase,
  parseFromPhase,
  planChain,
  runChain,
  stopCard,
  type FromPhase,
} from './core/run/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

interface StubCommand {
  summary: string;
  phase: string;
}

const STUBS: Record<string, StubCommand> = {
  init: { summary: 'scaffold workflow config + artifact tree in a repo', phase: 'Phase B' },
  new: { summary: 'create a PRD and register it in workflow state', phase: 'Phase B' },
  open: { summary: 'claim a PRD: acquire locks, declare conflict surfaces', phase: 'Phase B' },
};

function usage(): string {
  const stubLines = Object.entries(STUBS).map(
    ([name, cmd]) => `  ${name.padEnd(8)} ${cmd.summary}`,
  );
  return [
    'ProveGate — prove it, then let it propagate.',
    '',
    'Usage: gate <command> [options]   (also available as: provegate)',
    '',
    'Commands:',
    '  status   rebuild workflow state from artifacts and show it',
    '  queue    show the PRD queue (--json for machine output)',
    '  check    lint a PRD for readiness (gate check PRD-XXX | gate check --wiring)',
    '  run      run gated phases 4-7 + local merge (--dry-run, --from-phase=4|5|6|7|merge)',
    '  land     merge step only (alias for run --from-phase=merge)',
    ...stubLines,
    '  push     (refuses — push is always yours)',
    '',
    'Options:',
    '  -h, --help     show this help',
    '  -v, --version  print version',
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

function runStatus(): number {
  const { root, config } = loadConfig();
  const state = buildState(config, root);
  const path = writeState(config, root, state);

  for (const record of state.records) {
    const score = record.readiness.score === null ? '-' : String(record.readiness.score);
    const verdict = record.readiness.verdict ?? '-';
    console.log(
      `${record.prd}  ${record.status}  readiness=${verdict}/${score}  tasks=${record.task.checkedCount}/${record.task.checkedCount + record.task.uncheckedCount}  ${record.slug}`,
    );
  }
  if (state.records.length === 0) {
    console.log('(no workflow artifacts found)');
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
  if (queue.readyOverlaps.length > 0) {
    lines.push('  ! overlap (do not run together):');
    for (const w of queue.readyOverlaps)
      lines.push(`    ${w.a} <-> ${w.b}: ${w.shared.join(', ')}`);
  }
  push(
    'IN-FLIGHT',
    queue.inFlight,
    (r) =>
      `${r.prd}  agent=${r.agent} ${r.phase}${r.stale ? ' [STALE]' : ''}${r.worktree ? ` ${r.worktree}` : ''}`,
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

  console.log(`[run] ${dryRun ? 'DRY-RUN ' : ''}plan for ${id} (${record.slug}) class=${prdClass}`);
  if (fromPhase) console.log(`  resume from: phase ${fromPhase}`);
  console.log(
    `  autonomous close: ${record.autonomousClose ?? '(unset)'} | operator rows: ${record.task.operatorHandoffCount}`,
  );
  for (const line of planChain(chain, fromPhase)) console.log(`  ${line}`);
  console.log('  ── archive wip→completed (pre-merge)');
  console.log(`  ── merge feature → LOCAL ${config.branches.base} (no-ff) + post-merge gates`);
  console.log('  ── handoff card → HUMAN runs `git push` (the runner never pushes)');

  if (dryRun) {
    console.log('[run] dry-run complete — nothing executed, nothing merged, nothing pushed');
    return 0;
  }

  const outcome = runChain({ config, root, id, chain, fromPhase });
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

  try {
    const archived = archivePrdArtifacts(config, root, record);
    if (archived.moved.length > 0) {
      console.log(`[run] archived ${archived.moved.length} artifact(s)`);
      outcome.results.push(['archive: wip→completed', 'passed']);
    }
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

  const merge = mergeToLocalBase({ config, manifest, root, id });
  for (const row of merge.postMergeResults ?? []) outcome.results.push(row);
  if (!merge.ok) {
    console.error(
      stopCard({ id, phase: 'merge', why: merge.why ?? 'merge failed', results: outcome.results }),
    );
    return 1;
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
    }),
  );
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
    console.error('No. Push is yours.');
    return 1;
  }

  try {
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

  const stub = STUBS[command];
  if (stub !== undefined) {
    console.error(`${command}: not implemented yet (roadmap ${stub.phase})`);
    return 1;
  }

  console.error(`unknown command: ${command}\n`);
  console.error(usage());
  return 1;
}

process.exitCode = main(process.argv.slice(2));
