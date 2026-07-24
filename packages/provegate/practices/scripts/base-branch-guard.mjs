#!/usr/bin/env node
// Base-branch commit guard — practice 02 (protected-branch commit flow).
// Policy SSOT: protected branches are merge-only for source. Docs/coordination
// paths may commit in place. Exemptions: merge commits, ALLOW_BASE_COMMIT=1.
// This script never pushes and must never gain the ability to.
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';

export const PROTECTED = ['main', 'master', 'staging'];

// Paths that may be committed directly on a protected branch (docs + coordination).
export const ALLOWED_DIR_PREFIXES = [
  '_brain/',
  '_docs/',
  '_prds/',
  '_readiness/',
  '_state/',
  '_tasks/',
  'docs/',
  '.cursor/',
];

export const ALLOWED_ROOT_FILES = [
  'AGENT_BOOTSTRAP.md',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'RELEASING.md',
  'STATUS.md',
];

export function isAllowed(path) {
  return ALLOWED_DIR_PREFIXES.some((p) => path.startsWith(p)) || ALLOWED_ROOT_FILES.includes(path);
}

const sh = (cmd) => execSync(cmd, { encoding: 'utf8' }).trim();

const branch = sh('git rev-parse --abbrev-ref HEAD');
if (!PROTECTED.includes(branch)) process.exit(0);

const gitDir = sh('git rev-parse --git-dir');
if (existsSync(`${gitDir}/MERGE_HEAD`)) process.exit(0); // merge commits are exempt

if (process.env.ALLOW_BASE_COMMIT === '1') {
  console.warn(
    `base-branch-guard: ALLOW_BASE_COMMIT=1 — committing source directly to '${branch}' (deliberate one-off).`,
  );
  process.exit(0);
}

const staged = sh('git diff --cached --name-only --diff-filter=ACMR').split('\n').filter(Boolean);
const violations = staged.filter((f) => !isAllowed(f));

if (violations.length === 0) process.exit(0);

console.error(`base-branch-guard: '${branch}' is merge-only for source. Blocked staged files:\n`);
for (const f of violations) console.error(`  ${f}`);
console.error(`
Land source via a feature branch and merge:
  git checkout -b feat/<slug>   # carries the staged index
  git commit                    # commit there, then merge --no-ff into ${branch}
Escape hatch for a deliberate one-off: ALLOW_BASE_COMMIT=1 git commit ...
Docs/coordination paths (${ALLOWED_DIR_PREFIXES.join(' ')} + root docs) commit in place.`);
process.exit(1);
