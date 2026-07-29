#!/usr/bin/env node
// verify:review-quorum — ONE review-template authority (PRD-032 FR-8).
// The review gate (packages/provegate/src/core/gates/review.ts) refuses a
// missing Quorum; a template calling it optional teaches authors to omit what
// the gate refuses. This check asserts BOTH copies — the installed root
// template and its packed source — carry the required-Quorum wording and the
// `quorum-is-required` marker, and that the optional/omit wording is absent.
//
// Semantic, not agreement-only: `verify:pack-drift` proves the two copies
// AGREE, which stays green if both regress to optional together
// (two-parsers-wrong-together) — so this runs as a standing verify:workflow
// CHECKS member. A missing file fails loudly (false-green-on-missing-file).
// Repo-class per ADR-0004: reads repository state, never ships.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { targetRoot, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:review-quorum');

const COPIES = [
  '_docs/review-artifact.template.md',
  'packages/provegate/practices/templates/review-artifact.template.md',
];

for (const rel of COPIES) {
  const path = join(root, rel);
  if (!existsSync(path)) {
    r.fail(`${rel}: missing — the authority cannot be asserted on an absent file`);
    continue;
  }
  const text = readFileSync(path, 'utf8');
  if (!text.includes('quorum-is-required'))
    r.fail(`${rel}: the \`quorum-is-required\` marker is absent`);
  if (!/\*\*Quorum:\*\*\s*<required/.test(text))
    r.fail(`${rel}: the Quorum line does not state required`);
  if (/Quorum:[^\n]*optional/i.test(text) || /omit for a single reviewer/i.test(text))
    r.fail(`${rel}: optional/omit wording present — the gate refuses omission`);
}

console.log(`verify:review-quorum: ${COPIES.length} template cop(ies) checked`);
r.done();
