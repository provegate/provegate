#!/usr/bin/env node
// verify:acceptance-rule — the acceptance-authorship rule holds where it is stated, and
// the store carries the field that makes authorship readable (PRD-033, ADR-0003).
//
// Cache-free on purpose. `AGENT_BOOTSTRAP.md` and `_state/acceptances.json` live OUTSIDE
// the provegate package, so `provegate#test` does not hash them: a package test asserting
// on either can replay a cached pass over a change it never read. The two SHIPPED
// statements are package files and are held by `test/content-canon.test.ts`; this gate
// holds everything else. The split is by where the file lives, not by what is asserted.
//
// Three assertions, and the shape of each is deliberate:
//
//   1. POSITIVE, per named path. Each site must SAY the rule. This is what makes deleting
//      the rule fail as loudly as contradicting it — a negative-only check passes happily
//      on an empty file.
//   2. NEGATIVE, for the exact sentences that were false for nine work items.
//   3. The store's every entry carries a legal `authorship`.
//
// KNOWN RESIDUAL: the negative half matches PHRASES. A prohibition reintroduced at a fifth
// site, or reworded here, passes. Phrase matching cannot be made complete — that is why the
// positive assertions are per-path and are the load-bearing half. Adding a site to the rule
// means adding it to SITES below; there is no discovery step that would find it for you,
// and pretending otherwise would be the false green this gate exists to prevent.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:acceptance-rule');

/** Whitespace-tolerant: a reflowed paragraph is not a rule change. */
const phrase = (words) => new RegExp(words.split(' ').join('\\s+'), 'i');

/** Every LIVE document that states the rule. Completed artifacts record what was true when
 * they were written and are never rewritten, so they are not sites. */
const SITES = [
  'AGENT_BOOTSTRAP.md',
  'packages/provegate/METHOD.md',
  'packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md',
  '_brain/learnings/operator-acceptance-no-self-accept.md',
  'packages/provegate/practices/brain/learnings/operator-acceptance-no-self-accept.md',
];

/** What each site must say. `owner` meaning who DECIDED is the load-bearing half: without
 * it the field records nothing, because both names would mean the same thing. */
const MUST_SAY = [
  { re: /agent-transcribed/, what: 'the value an agent must record' },
  { re: phrase('explicit in-session owner direction'), what: 'the condition on transcription' },
];

/** The sentences this PRD replaced. They were documentation enforced by nothing, and half
 * the store had already gone the other way. */
const MUST_NOT_SAY = [
  phrase('an agent never writes'),
  phrase('never write acceptance entries on their own'),
  phrase('recording a waiver is a deliberate human action'),
];

for (const rel of SITES) {
  const path = join(root, rel);
  // A grep-a-file check must fail when the file is absent, not skip. A site that was
  // renamed or deleted is exactly the case a silent skip would hide.
  if (!existsSync(path)) {
    r.fail(`${rel}: site is missing — the rule cannot be stated in a file that is not there`);
    continue;
  }
  const text = read(path);
  for (const { re, what } of MUST_SAY) {
    if (!re.test(text)) r.fail(`${rel}: does not state ${what} (${re.source})`);
  }
  for (const re of MUST_NOT_SAY) {
    if (re.test(text)) r.fail(`${rel}: still states the replaced prohibition (${re.source})`);
  }
}

// The self-accept prohibition must survive the loosening. Deciding and typing are two acts,
// and relaxing the second must never read as relaxing the first.
for (const rel of SITES) {
  const path = join(root, rel);
  if (!existsSync(path)) continue;
  const text = read(path);
  // A RULE sentence, not the bare token. Matching `/self-accept/` let the record
  // files pass on their own frontmatter `name:` line — the assertion was
  // satisfied by the filename, so the body could have dropped the rule entirely
  // and this check would still have been green.
  const keeps =
    phrase('never accepts its own work').test(text) ||
    phrase('must never self-accept').test(text) ||
    phrase('never self-accept').test(text);
  if (!keeps) r.fail(`${rel}: no longer keeps the self-accept prohibition`);
}

const LEGAL = ['owner-written', 'agent-transcribed'];
const storeRel = '_state/acceptances.json';
const storePath = join(root, storeRel);
if (!existsSync(storePath)) {
  r.note(`${storeRel} absent — no entries to check`);
} else {
  let store;
  try {
    store = JSON.parse(read(storePath));
  } catch {
    r.fail(`${storeRel}: not valid JSON`);
    store = null;
  }
  if (store) {
    const entries = Array.isArray(store.acceptances) ? store.acceptances : [];
    if (entries.length === 0) r.fail(`${storeRel}: no acceptances array to check`);
    entries.forEach((entry, i) => {
      if (!LEGAL.includes(entry?.authorship)) {
        r.fail(
          `${storeRel} acceptances[${i}] (${entry?.prd ?? 'unknown'}): authorship is ` +
            `${JSON.stringify(entry?.authorship)} — must be ${LEGAL.join(' or ')}`,
        );
      }
    });
    console.log(`verify:acceptance-rule: ${entries.length} store entr(ies) checked`);
  }
}

console.log(`verify:acceptance-rule: ${SITES.length} site(s) checked`);
r.done();
