import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { pkgRoot, repoPath } from './helpers/repo-reads.js';

/**
 * PRD-021 FR-9 / FR-11 — the two weight tables are projections of one authority,
 * and the research pack says what it is.
 *
 * The weight tables are the interesting half. `DEFAULT_CONFIG` decides the
 * weights; two documents DISPLAY them, for readers who are scoring a candidate
 * by hand. That is one authority and two projections, and a projection nobody
 * checks is just a second authority that has not disagreed yet.
 */

const repoRoot = repoPath('.');
const read = (path: string): string => readFileSync(path, 'utf8');

/** The `| DIM — name | meaning | weight |` rows of a triage table, as
 * `[identifier, weight]`. Parsed rather than string-matched so the assertion is
 * about the table's CONTENT, not about one formatting of it. */
function tableWeights(markdown: string): [string, number][] {
  const rows: [string, number][] = [];
  for (const line of markdown.split('\n')) {
    const m = /^\|\s*([A-Z]{2,})\s*—[^|]*\|[^|]*\|\s*([0-9.]+)\s*\|/.exec(line);
    if (m) rows.push([m[1]!, Number(m[2]!)]);
  }
  return rows;
}

describe('the weight tables are projections of DEFAULT_CONFIG (FR-9, FR-10)', () => {
  const expected = DEFAULT_CONFIG.valueScoring.axes.map((axis): [string, number] => [
    axis,
    DEFAULT_CONFIG.valueScoring.weights[axis]!,
  ]);

  it('the root AGENT_BOOTSTRAP triage table equals the configured axes, in order', () => {
    const rows = tableWeights(read(join(repoRoot, 'AGENT_BOOTSTRAP.md')));
    expect(rows).toEqual(expected);
  });

  it('the practices bootstrap template carries the same table', () => {
    // It renders the default inline because nothing substitutes a placeholder
    // there — `gate init --practices` copies pack files verbatim. A
    // wrong-but-visible default would be worse than none, which is why it is
    // pinned here rather than trusted.
    const rows = tableWeights(
      read(join(pkgRoot, 'practices/templates/AGENT_BOOTSTRAP.template.md')),
    );
    expect(rows).toEqual(expected);
  });

  it('the template names the config key an adopter must edit', () => {
    // Without this sentence the table reads as fixed, and an adopter who
    // changes `valueScoring` leaves a document that quietly disagrees with
    // their own gate.
    const text = read(join(pkgRoot, 'practices/templates/AGENT_BOOTSTRAP.template.md'));
    expect(text).toContain('valueScoring');
    expect(text).toMatch(/edit this table to match/i);
  });

  it('no WEIGHT appears in the gate as a literal — the fallback table did not come back', () => {
    // The earlier design kept a fallback table inside the checker and pinned it
    // with a parity test. Two authorities mitigated is worse than one authority
    // projected, so this asserts the fallback did not return.
    //
    // The check is for numeric weight literals, not for axis NAMES: the module
    // discusses `MF` and `mf` in the comment explaining case-insensitive
    // uniqueness, and a name in prose is not a second authority. A number is.
    // Comments are stripped first. The module explains its arithmetic with a
    // worked example — "a weight of 0.25 scaled to 25" — and an assertion that
    // cannot tell an explanation from a table would force the explanation out,
    // which is the wrong trade.
    const gate = read(join(pkgRoot, 'src/core/gates/value-score.ts'))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const weights = new Set(Object.values(DEFAULT_CONFIG.valueScoring.weights).map(String));
    for (const weight of weights) {
      expect(gate, `weight ${weight} hardcoded in the gate`).not.toContain(weight);
    }
  });
});

describe('the research pack declares itself frozen (FR-11)', () => {
  const packRoot = join(repoRoot, 'docs/research/provegate-bootstrap');

  it('the README banner names the extraction boundary and the live canon', () => {
    const text = read(join(packRoot, 'README.md'));
    expect(text).toMatch(/PRD-016/);
    expect(text).toContain('apps/docs/');
    expect(text).toContain('https://provegate.dev/docs');
    // The rule a reader needs when the two disagree, stated rather than implied.
    expect(text.toLowerCase()).toMatch(/published document wins|yayınlanan\s+doküman kazanır/);
  });

  it('the roadmap says its unchecked boxes are history, not a backlog', () => {
    // The boxes were never updated during the extraction, so a reader takes
    // them for remaining work. One sentence at the top is the honest fix;
    // ticking sixty boxes would create a second live tracker to keep correct.
    const text = read(join(packRoot, 'oss-extraction-roadmap-2026-07-22.md'));
    expect(text).toMatch(/2026-07-27/);
    expect(text).toMatch(/PRD-001\.\.016|PRD-016/);
    expect(text).toMatch(/STATUS\.md/);
    expect(text).toMatch(/gate queue/);
  });

  it('the draft whitepaper points at the published v1.0', () => {
    const text = read(join(packRoot, 'whitepaper-gated-autonomy-2026-07-22.md'));
    expect(text).toMatch(/Superseded draft/i);
    expect(text).toContain('v1.0');
    expect(text).toContain('https://provegate.dev/docs');
  });
});

/**
 * PRD-033 FR-4 — the acceptance-authorship rule, in the two SHIPPED statements.
 *
 * Package files only. The repo-root statement in `AGENT_BOOTSTRAP.md` and the
 * store itself are outside this package's turbo cache key, so asserting on them
 * here would pass from cache over a change it never read; `verify:acceptance-rule`
 * covers those, cache-free. The split is by where the file lives, not by what is
 * asserted.
 */
describe('acceptance authorship rule, as shipped (PRD-033)', () => {
  const shipped = ['METHOD.md', 'practices/templates/AGENT_BOOTSTRAP.template.md'] as const;

  // Matched across whitespace, so the assertion is about the CONTENT and not
  // about one line-wrapping of it — a reflowed paragraph is not a rule change.
  const phrase = (words: string): RegExp => new RegExp(words.split(' ').join('\\s+'), 'i');

  it.each(shipped)('%s permits transcription and names the required value', (rel) => {
    const text = read(join(pkgRoot, rel));
    expect(text).toMatch(/agent-transcribed/);
    expect(text).toMatch(phrase('explicit in-session owner direction'));
    // `owner` must keep meaning who DECIDED, or the field records nothing.
    expect(text).toMatch(/who\s+DECIDED/i);
  });

  it.each(shipped)('%s no longer states the prohibition it replaced', (rel) => {
    const text = read(join(pkgRoot, rel));
    // The exact sentences that were false for nine work items. A paraphrase
    // added at a new site is not caught here — that residual is named in the
    // header of `scripts/verify/verify-acceptance-rule.mjs`.
    expect(text).not.toMatch(phrase('an agent never writes'));
    expect(text).not.toMatch(phrase('never write acceptance entries on their own'));
  });

  it('the shipped rule keeps the self-accept prohibition it must not weaken', () => {
    // Deciding and typing are two acts. Loosening the second must not read as
    // loosening the first.
    for (const rel of shipped) {
      expect(read(join(pkgRoot, rel))).toMatch(phrase('never accepts its own work'));
    }
  });
});
