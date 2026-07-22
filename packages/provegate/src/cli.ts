#!/usr/bin/env node
/**
 * provegate / gate — subcommand router.
 *
 * Bootstrap skeleton: every workflow command is a stub that names the roadmap
 * phase that will implement it. The single real behavior is `push`, which
 * refuses — the runner never pushes to a remote. That invariant ships (and is
 * tested) from commit one.
 */
import { createRequire } from 'node:module';

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
  queue: { summary: 'show the PRD queue', phase: 'Phase B' },
  status: { summary: 'show workflow state (active / next / blocked)', phase: 'Phase B' },
};

function usage(): string {
  const lines = Object.entries(STUBS).map(([name, cmd]) => `  ${name.padEnd(8)} ${cmd.summary}`);
  return [
    'ProveGate — prove it, then let it propagate.',
    '',
    'Usage: gate <command> [options]   (also available as: provegate)',
    '',
    'Commands:',
    ...lines,
    '  push     (refuses — push is always yours)',
    '',
    'Options:',
    '  -h, --help     show this help',
    '  -v, --version  print version',
  ].join('\n');
}

export function main(argv: string[]): number {
  const [command] = argv;

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
