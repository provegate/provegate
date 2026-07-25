#!/usr/bin/env node
// verify:pack-drift — the shipped practices pack and this repo's live layer are two
// copies of the same content, and one-sided edits are the failure mode: the pack's
// security hardenings once lived only in the pack, and this repo ran without them.
//
// Byte-parity is NOT the contract. Every pair diverges on purpose — the pack is
// genericized (no repo-of-origin facts, no wave/practice numbering) and carries
// per-repo values as neutral defaults (`PROTECTED`, the allowlist JSONs). Only 12 of the
// 49 pairs are byte-identical today; asserting equality would be a permanent red.
//
// So the contract is RECONCILIATION, not equality: a ledger records the sha256 of both
// sides as they stood when a human last compared them. Either side moving fails the
// check — the mover must open the counterpart, decide whether the change belongs there
// too, and re-reconcile. Drift is caught at the edit, not at the next adopter's install.
//
// This check is repo-only and deliberately NOT packed: an adopter has no pack to
// compare against.
//
// Reconcile after reviewing both sides:  node scripts/verify/verify-pack-drift.mjs --reconcile
import { join, relative, sep } from 'node:path';
import { readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { targetRoot, read, makeReporter, parseFrontmatter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:pack-drift');

const PACK_DIR = join(root, 'packages', 'provegate', 'practices');
const INIT_TS = join(root, 'packages', 'provegate', 'src', 'core', 'run', 'init.ts');
const LEDGER = join(root, 'scripts', 'verify', 'pack-drift-ledger.json');
const LEARNINGS_SRC = join('brain', 'learnings');
const REPO_LEARNINGS = join('_brain', 'learnings');
const SEED_PROVENANCE = 'workflow-seed';

const sha = (path) => createHash('sha256').update(read(path)).digest('hex').slice(0, 16);
const posix = (p) => p.split(sep).join('/');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(PACK_DIR) || !existsSync(INIT_TS)) {
  r.fail(`pack (${relative(root, PACK_DIR)}) or installer (${relative(root, INIT_TS)}) missing`);
  r.done();
}

// The installer's PACK_MAP is the single source of pairing — re-listing it here would
// be a second source of truth that drifts exactly like the content it polices. Parsing
// source is brittle by nature, so an empty parse is a hard failure, never "no pairs to
// check" (a silent zero would report PASS while checking nothing).
const initSource = read(INIT_TS);
const mapStart = initSource.indexOf('const PACK_MAP');
const mapBlock =
  mapStart === -1 ? '' : initSource.slice(mapStart, initSource.indexOf('];', mapStart));
const mapped = [...mapBlock.matchAll(/src:\s*'([^']+)'[\s\S]*?dest:\s*'([^']+)'/g)].map((m) => ({
  src: m[1],
  dest: m[2],
}));
if (mapped.length === 0) {
  r.fail(`could not parse PACK_MAP out of ${relative(root, INIT_TS)} — the pairing is unknowable`);
  r.done();
}

// Seed learnings are installed by directory scan, not by PACK_MAP: pair them by filename.
const packLearnings = existsSync(join(PACK_DIR, LEARNINGS_SRC))
  ? readdirSync(join(PACK_DIR, LEARNINGS_SRC))
      .filter((f) => f.endsWith('.md'))
      .sort()
  : [];
const pairs = [
  ...mapped,
  ...packLearnings.map((f) => ({
    src: posix(join(LEARNINGS_SRC, f)),
    dest: posix(join(REPO_LEARNINGS, f)),
  })),
];

const ledger = existsSync(LEDGER) ? JSON.parse(read(LEDGER)) : { packOnly: [], pairs: {} };
const packOnly = new Set(ledger.packOnly ?? []);
// Human-facing keys survive a reconcile: the ledger is a governance file people open,
// and `--reconcile` rewriting it must not silently delete what they wrote in it.
const readme = ledger._readme;
const recorded = ledger.pairs ?? {};
const reconcile = process.argv.includes('--reconcile');
const next = {};

// 1. Every packed file is accounted for: paired with a live file, or declared pack-only
//    (shims and NEXT_STEPS have no counterpart here — they are adopter-side content).
const pairedSrc = new Set(pairs.map((p) => p.src));
for (const file of walk(PACK_DIR)) {
  const rel = posix(relative(PACK_DIR, file));
  if (pairedSrc.has(rel) || packOnly.has(rel)) continue;
  r.fail(
    `packed file '${rel}' is neither in PACK_MAP nor declared in the ledger's packOnly[] — pair it or declare it`,
  );
}
for (const rel of packOnly) {
  if (!existsSync(join(PACK_DIR, rel)))
    r.fail(`ledger packOnly names '${rel}', absent from the pack`);
}

// 2. Each pair must still be reconciled: both sides at the hashes a human last compared.
for (const { src, dest } of pairs) {
  const packPath = join(PACK_DIR, src);
  const repoPath = join(root, dest);
  if (!existsSync(packPath)) {
    r.fail(`PACK_MAP names '${src}', absent from the pack`);
    continue;
  }
  if (!existsSync(repoPath)) {
    r.fail(`pack ships '${src}' but this repo has no '${dest}' — the live layer lost its copy`);
    continue;
  }
  const now = { pack: sha(packPath), repo: sha(repoPath) };
  next[src] = { dest, ...now, ...(recorded[src]?.note ? { note: recorded[src].note } : {}) };
  if (reconcile) continue;
  const was = recorded[src];
  if (!was) {
    r.fail(`'${src}' ↔ '${dest}' has no ledger entry — review both sides, then --reconcile`);
    continue;
  }
  const moved = [was.pack !== now.pack && 'pack', was.repo !== now.repo && 'repo'].filter(Boolean);
  if (moved.length > 0) {
    r.fail(
      `'${src}' ↔ '${dest}': the ${moved.join(' and ')} side changed since reconciliation — ` +
        `open the counterpart, port what belongs there, then --reconcile`,
    );
  }
}

// 3. A ledger entry whose pair is gone is stale — same discipline as the known-red
//    ledger: an allowlist that outlives its subject silently widens.
if (!reconcile) {
  for (const src of Object.keys(recorded)) {
    if (!pairedSrc.has(src)) r.fail(`ledger entry '${src}' names a pair that no longer exists`);
  }
}

// 4. Reverse direction: a repo learning marked as a seed belongs in the pack. Without
//    this, deleting from the pack (or seeding repo-side and forgetting to ship it)
//    reads as "in sync" — every remaining pair still matches.
if (existsSync(join(root, REPO_LEARNINGS))) {
  for (const f of readdirSync(join(root, REPO_LEARNINGS)).filter((f) => f.endsWith('.md'))) {
    const fm = parseFrontmatter(read(join(root, REPO_LEARNINGS, f)));
    if (fm?.provenance !== SEED_PROVENANCE) continue; // repo-local learning — not pack content
    if (!packLearnings.includes(f)) {
      r.fail(`'${REPO_LEARNINGS}/${f}' is marked provenance: ${SEED_PROVENANCE} but is not packed`);
    }
  }
}

if (reconcile) {
  writeFileSync(
    LEDGER,
    `${JSON.stringify(
      { ...(readme ? { _readme: readme } : {}), packOnly: [...packOnly].sort(), pairs: next },
      null,
      2,
    )}\n`,
  );
  // Name what the reconcile just accepted. A silent "reconciled 49 pairs" would let a
  // one-sided edit be waved through by muscle memory — the point of the ledger is that
  // accepting drift is a decision someone can see they made.
  for (const [src, entry] of Object.entries(next)) {
    const was = recorded[src];
    const moved = !was
      ? 'NEW pair'
      : [was.pack !== entry.pack && 'pack', was.repo !== entry.repo && 'repo']
          .filter(Boolean)
          .join(' + ');
    if (moved) console.log(`verify:pack-drift: accepted ${moved} change — ${src}`);
  }
  console.log(
    `verify:pack-drift: reconciled ${Object.keys(next).length} pair(s) into ${relative(root, LEDGER)}`,
  );
}
console.log(`verify:pack-drift: ${pairs.length} pair(s) checked`);
r.done();
