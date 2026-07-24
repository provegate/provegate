#!/usr/bin/env node
// Pre-commit secret scanner — secrets & env discipline.
// (1) Name-blocks any staged real .env* file (including rename targets).
// (2) Content-scans staged text for key/token/private-key patterns.
// Filenames are attacker-influenced input: they are passed to git via
// execFileSync argv (never a shell string) and enumerated NUL-delimited,
// so a filename like `$(cmd)` or one with spaces/newlines cannot inject.
import { execFileSync } from 'node:child_process';

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const ENV_EXAMPLE = /^\.env\.(example|template|sample)$/;
const ENV_REAL = /^\.env(\..+)?$/;

const CONTENT_PATTERNS = [
  ['private key block', /-----BEGIN (RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  [
    'generic assigned secret',
    /\b(API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|PRIVATE_KEY|DATABASE_URL)\s*=\s*['"][^'"\s]{16,}['"]/,
  ],
];

const staged = git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR')
  .split('\0')
  .filter(Boolean);

const problems = [];

for (const f of staged) {
  const base = f.split('/').pop();
  if (ENV_REAL.test(base) && !ENV_EXAMPLE.test(base)) {
    problems.push(`${f}: real .env file staged (name-blocked; commit .env.example instead)`);
    continue;
  }
  let content;
  try {
    // `:./<path>` pathspec form, not `:<path>`: a filename starting with
    // `<digit>:` would otherwise parse as index-stage syntax (`:0:missing.txt`
    // reads stage 0 of missing.txt), silently skipping the real staged file.
    content = git('show', `:./${f}`);
  } catch {
    continue; // unreadable (e.g. deleted between stage and scan) — nothing to scan
  }
  if (content.includes('\0')) continue; // binary
  for (const [label, re] of CONTENT_PATTERNS) {
    if (re.test(content)) problems.push(`${f}: matches ${label} pattern`);
  }
}

if (problems.length) {
  console.error('secret-scan: refusing commit —\n');
  for (const p of problems) console.error(`  ${p}`);
  console.error('\nRemove the secret from the staged content (never commit real values).');
  process.exit(1);
}
process.exit(0);
