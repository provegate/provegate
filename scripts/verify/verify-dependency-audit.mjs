#!/usr/bin/env node
// verify:dependency-audit — dependency vulnerabilities at/above the severity floor fail.
// Allowlist (audit-allowlist.json, advisory GHSA/CVE ids) is shrink-only for accepted
// advisories. CI-wired only (needs registry access) — not part of the local bundle.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { targetRoot, read, makeReporter } from './lib.mjs';

const FLOOR = ['high', 'critical'];

const root = targetRoot();
const r = makeReporter('verify:dependency-audit');

const allowlistPath = join(root, 'scripts', 'verify', 'audit-allowlist.json');
const allowlist = existsSync(allowlistPath) ? JSON.parse(read(allowlistPath)) : [];

let raw;
try {
  raw = execSync('pnpm audit --json', { encoding: 'utf8', cwd: root, maxBuffer: 64 * 1024 * 1024 });
} catch (e) {
  // pnpm audit exits non-zero when vulnerabilities exist — the JSON is still on stdout.
  raw = e.stdout;
  if (!raw) {
    r.fail(`pnpm audit did not produce output: ${e.message}`);
    r.done();
  }
}

let advisories;
try {
  advisories = Object.values(JSON.parse(raw).advisories ?? {});
} catch {
  r.fail('pnpm audit output is not parseable JSON');
  r.done();
}

for (const a of advisories) {
  if (!FLOOR.includes(a.severity)) continue;
  const id = a.github_advisory_id ?? a.cves?.[0] ?? String(a.id);
  if (allowlist.includes(id)) {
    r.note(`${id} (${a.severity}, ${a.module_name}): allowlisted accepted advisory`);
  } else {
    r.fail(
      `${id}: ${a.severity} advisory in ${a.module_name} — fix, or accept it explicitly in audit-allowlist.json`,
    );
  }
}

console.log(
  `verify:dependency-audit: ${advisories.length} advisory(ies) total, floor = ${FLOOR.join('/')}`,
);
r.done();
