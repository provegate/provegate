#!/usr/bin/env node
/**
 * provegate / gate — subcommand router.
 *
 * `status` and `queue` are real (roadmap Phase B); the remaining workflow
 * commands are stubs that name the roadmap phase that will implement them.
 * `push` refuses — the runner never pushes to a remote. That invariant ships
 * (and is tested) from commit one.
 */
import { createRequire } from 'node:module';
import { ConfigError, loadConfig } from './core/config/index.js';
import { buildQueue, buildState, statusPanelMetrics, writeState } from './core/state/index.js';
import type { QueueLockInfo } from './core/state/index.js';
import { listLockFiles } from './core/locks/index.js';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };

interface StubCommand {
  summary: string;
  phase: string;
}

const STUBS: Record<string, StubCommand> = {
  init: { summary: 'scaffold workflow config + artifact tree in a repo', phase: 'Phase B' },
  new: { summary: 'create a PRD and register it in workflow state', phase: 'Phase B' },
  check: { summary: 'run the readiness gate against a PRD', phase: 'Phase C' },
  open: { summary: 'claim a PRD: acquire locks, declare conflict surfaces', phase: 'Phase B' },
  run: { summary: 'run gated phases 4-7 for the active PRD', phase: 'Phase C' },
  land: { summary: 'no-ff local merge with post-merge verification', phase: 'Phase C' },
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
    ...stubLines,
    '  queue    show the PRD queue (--json for machine output)',
    '  status   rebuild workflow state from artifacts and show it',
    '  push     (refuses — push is always yours)',
    '',
    'Options:',
    '  -h, --help     show this help',
    '  -v, --version  print version',
  ].join('\n');
}

function collectLocks(
  root: string,
  config: ReturnType<typeof loadConfig>['config'],
): QueueLockInfo[] {
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
  } catch (error) {
    if (error instanceof ConfigError) {
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
