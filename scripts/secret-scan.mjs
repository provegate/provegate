#!/usr/bin/env node
// Pre-commit secret scanner — practice 04 (secrets & env discipline).
// (1) Name-blocks any staged real .env* file (including rename targets).
// (2) Content-scans staged text for key/token/private-key patterns.
import { execSync } from 'node:child_process';

const sh = (cmd) => execSync(cmd, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

const ENV_EXAMPLE = /^\.env\.(example|template|sample)$/;
const ENV_REAL = /^\.env(\..+)?$/;

const CONTENT_PATTERNS = [
  ['private key block', /-----BEGIN (RSA |EC |OPENSSH |PGP |DSA )?PRIVATE KEY/],
  ['AWS access key id', /\bAKIA[0-9A-Z]{16}\b/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b|\bgithub_pat_[A-Za-z0-9_]{22,}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/],
  ['generic assigned secret', /\b(API_KEY|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|PRIVATE_KEY|DATABASE_URL)\s*=\s*['"][^'"\s]{16,}['"]/],
];

const staged = sh('git diff --cached --name-only --diff-filter=ACMR')
  .trim()
  .split('\n')
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
    content = sh(`git show :"${f}"`);
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
