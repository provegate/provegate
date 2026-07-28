import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';
import { scoreValueHeader, valueScoreIssue } from '../src/core/gates/value-score.js';

/**
 * PRD-021 FR-2 / FR-6 — the recompute, its cutoff, and the shapes that must not
 * pass.
 *
 * Every negative here is mutation-checked in the same pass: revert the rule and
 * exactly its own case fails. A reject fixture that survives its own mutation is
 * a defect in the test, not evidence about the code.
 */

const here = dirname(fileURLToPath(import.meta.url));
const manifest = defaultManifest(DEFAULT_CONFIG);

const withScoring = (over: Partial<WorkflowConfig['valueScoring']>): WorkflowConfig => ({
  ...DEFAULT_CONFIG,
  valueScoring: { ...DEFAULT_CONFIG.valueScoring, ...over },
});

/** A metadata block carrying `line`, then a body. The header lives before the
 * first `---` in every template, which is what the gate scopes its search to. */
const prd = (line: string, body = ''): string =>
  ['# PRD-001: Fixture', '>', line, '>', '---', '', body].join('\n');

const VALID = '> **Value**: 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)';

describe('the recompute (FR-2)', () => {
  it('accepts a header whose arithmetic is exact', () => {
    // .25*5 + .25*4 + .20*4 + .15*4 + .15*3 = 4.10
    expect(scoreValueHeader(DEFAULT_CONFIG, prd(VALID)).problem).toBeNull();
  });

  it('names BOTH numbers on a mismatch', () => {
    // A failure that says only "wrong" makes the author recompute by hand to
    // find out which side moved.
    const issue = valueScoreIssue(DEFAULT_CONFIG, prd('> **Value**: 4.15 (MF/UI/TL/AR/RM: 5/4/4/4/3)'));
    expect(issue).toBe('value header declares 4.15 but its dimensions recompute to 4.10');
  });

  it('compares exactly — no tolerance band', () => {
    // The snapshot allows |stated - computed| <= 0.005 because its weights are
    // unvalidated constants. FR-1's two-decimal rule makes every legal total
    // exactly representable, so 4.11 against 4.10 is a mismatch here and would
    // have passed there. Recorded as a divergence, and this is its test.
    expect(
      valueScoreIssue(DEFAULT_CONFIG, prd('> **Value**: 4.11 (MF/UI/TL/AR/RM: 5/4/4/4/3)')),
    ).toMatch(/declares 4\.11 but its dimensions recompute to 4\.10/);
  });

  it('reads the total with one or two decimals, and 4.1 means 4.10', () => {
    expect(scoreValueHeader(DEFAULT_CONFIG, prd('> **Value**: 4.1 (MF/UI/TL/AR/RM: 5/4/4/4/3)')).problem).toBeNull();
  });

  it('rejects a BARE INTEGER total as malformed — the spec requires the decimals', () => {
    // Found by independent review: the pattern accepted `Value: 4 (...)`, which
    // parsed as 4.00 and then failed as a MISMATCH against 4.10. That sends the
    // author to re-derive numbers that were never wrong. It is a malformed
    // declaration and the message must say so.
    const issue = valueScoreIssue(DEFAULT_CONFIG, prd('> **Value**: 4 (MF/UI/TL/AR/RM: 5/4/4/4/3)'));
    expect(issue).toMatch(/malformed: total "4" must be written with one or two decimal places/);
    expect(issue).not.toMatch(/recompute/);
  });

  it('rejects exponent notation — the capture must not truncate the total', () => {
    // Found by self-check during the Phase 6 remediation, and it is a
    // consequence of the fix for the bare-integer case: the total was captured
    // as a NUMBER SHAPE, so `4.1e0` matched as `4.1`, scored 4.10 and passed
    // the gate FR-2 says must reject exponent notation. The capture now takes
    // the whole token up to the first space or paren, and lets the parser
    // judge it — "malformed" has to mean the author's text, not the prefix a
    // regex happened to like.
    for (const total of ['4.1e0', '1e1', '4,10']) {
      const issue = valueScoreIssue(
        DEFAULT_CONFIG,
        prd(`> **Value**: ${total} (MF/UI/TL/AR/RM: 5/4/4/4/3)`),
      );
      expect(issue, total).toMatch(/malformed: total "/);
      expect(issue, total).not.toMatch(/recompute/);
    }
  });

  it('rejects a total with three decimals, as malformed rather than as a mismatch', () => {
    // Two different failures that read differently on purpose: one says the
    // number is unreadable, the other says the arithmetic is wrong.
    const issue = valueScoreIssue(DEFAULT_CONFIG, prd('> **Value**: 4.100 (MF/UI/TL/AR/RM: 5/4/4/4/3)'));
    expect(issue).toMatch(/malformed: total "4\.100" must be written with one or two decimal places/);
    expect(issue).not.toMatch(/recompute/);
  });
});

describe('the header grammar (FR-2)', () => {
  it('accepts the bold-delimited form the templates actually write', () => {
    for (const line of [
      '> **Value**: 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)',
      '**Value**: 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)',
      '> **Value:** 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)',
      '> **Value**: 4.10 — top tier (MF/UI/TL/AR/RM: 5/4/4/4/3)',
    ]) {
      expect(scoreValueHeader(DEFAULT_CONFIG, prd(line)).problem, line).toBeNull();
    }
  });

  it('allows trailing prose after the dimensions', () => {
    // Not anchored on the closing paren, following the snapshot.
    expect(
      scoreValueHeader(DEFAULT_CONFIG, prd(`${VALID} — re-scored at iteration 7`)).problem,
    ).toBeNull();
  });

  it('rejects dimension 0 and dimension 6 as malformed', () => {
    // `[1-5]`, not "a single digit". A 0 would let 0/0/0/0/0 recompute
    // consistently and pass; 6-9 are outside the rubric. Note this is ALSO a
    // divergence from the snapshot, whose groups are [0-5] — it accepts a 0.
    for (const dims of ['0/4/4/4/3', '5/4/4/4/6']) {
      const issue = valueScoreIssue(DEFAULT_CONFIG, prd(`> **Value**: 4.10 (MF/UI/TL/AR/RM: ${dims})`));
      expect(issue, dims).toMatch(/malformed: does not match the configured axes/);
      expect(issue, dims).not.toMatch(/recompute/);
    }
  });

  it('is built from the CONFIGURED axes, not a literal', () => {
    const three = withScoring({ axes: ['A', 'B', 'C'], weights: { A: 0.5, B: 0.3, C: 0.2 } });
    const header = '> **Value**: 4.20 (A/B/C: 5/3/4)'; // .5*5 + .3*3 + .2*4 = 4.20
    expect(scoreValueHeader(three, prd(header)).problem).toBeNull();
    // The same header under the default axes is malformed, not absent: the
    // author renamed an axis and must be told, rather than falling through to
    // "no header" and passing on presence-triggering.
    expect(valueScoreIssue(DEFAULT_CONFIG, prd(header))).toMatch(
      /malformed: does not match the configured axes \(MF\/UI\/TL\/AR\/RM\)/,
    );
  });

  it('rejects the right names in the wrong ORDER', () => {
    // Order is contractual because the dimensions are positional; a reordered
    // header silently scores each dimension against the wrong weight.
    expect(valueScoreIssue(DEFAULT_CONFIG, prd('> **Value**: 4.10 (UI/MF/TL/AR/RM: 4/5/4/4/3)'))).toMatch(
      /malformed: does not match the configured axes/,
    );
  });
});

describe('scoping and duplicates (FR-2)', () => {
  it('ignores a header written in the BODY — that is documentation', () => {
    // A PRD documenting the format carries matching lines in prose and fences.
    // Scoping to the metadata block is what lets it do that; the snapshot has
    // no such problem only because it takes the first hit anywhere.
    const doc = prd(VALID, ['Example:', '', '```', '> **Value**: 9.99 (MF/UI/TL/AR/RM: 5/5/5/5/5)', '```'].join('\n'));
    expect(scoreValueHeader(DEFAULT_CONFIG, doc).problem).toBeNull();
  });

  it('rejects TWO declarations inside the metadata block', () => {
    // Once scoped, a second line in the block is a real duplicate — two totals,
    // with the gate silently scoring the earlier one.
    const two = [
      '# PRD-001: Fixture',
      '>',
      VALID,
      '> **Value**: 3.00 (MF/UI/TL/AR/RM: 3/3/3/3/3)',
      '>',
      '---',
    ].join('\n');
    expect(valueScoreIssue(DEFAULT_CONFIG, two)).toMatch(
      /malformed: 2 value headers in the metadata block/,
    );
  });

  it('an unreadable header is malformed, not absent', () => {
    // The difference decides whether presence-triggering excuses it. "I could
    // not read this" must never become "there was nothing to read".
    const garbled = prd('> **Value**: 4.10 (MF/UI/TL/AR: 5/4/4/4/3)');
    expect(scoreValueHeader(DEFAULT_CONFIG, garbled).problem?.kind).toBe('malformed');
  });
});

describe('the cutoff (FR-2, FR-6)', () => {
  const at17 = withScoring({ enforceFrom: 17 });

  it('with no cutoff configured, a header-less item passes', () => {
    expect(valueScoreIssue(DEFAULT_CONFIG, prd(''))).toBeNull();
  });

  it('with a cutoff, a pre-cutoff item may omit the header and one at it may not', () => {
    expect(valueScoreIssue(at17, prd(''), 16)).toBeNull();
    expect(valueScoreIssue(at17, prd(''), 17)).toMatch(/missing the value header — required from id 17/);
    expect(valueScoreIssue(at17, prd(''), 21)).toMatch(/missing the value header/);
  });

  it('an ABSENT id skips presence in both spellings, and keeps the arithmetic', () => {
    // The residual FR-2 states, and the reason it is guarded on absence rather
    // than on `=== null`: every existing caller omits the argument, so it
    // arrives as `undefined`. A strict null test would enforce presence on all
    // of them the moment a repo sets `enforceFrom`.
    expect(valueScoreIssue(at17, prd(''))).toBeNull();
    expect(valueScoreIssue(at17, prd(''), null)).toBeNull();
    expect(valueScoreIssue(at17, prd(''), undefined)).toBeNull();
    // …but a header that is PRESENT and wrong still fails at any id, because
    // the arithmetic never depended on the id.
    const wrong = prd('> **Value**: 4.15 (MF/UI/TL/AR/RM: 5/4/4/4/3)');
    for (const id of [undefined, null, 1, 99] as (number | null | undefined)[]) {
      expect(valueScoreIssue(at17, wrong, id), String(id)).toMatch(/recompute/);
    }
  });

  it('enforceFrom 0 enforces everywhere', () => {
    expect(valueScoreIssue(withScoring({ enforceFrom: 0 }), prd(''), 1)).toMatch(/missing the value header/);
  });
});

describe('the seam into lintPrd (FR-2)', () => {
  const READY = [
    '# PRD-001: Fixture',
    '>',
    VALID,
    '>',
    '---',
    '',
    '## 4. Functional Requirements',
    '',
    '1. **FR-1**: does a thing',
    '   - **Targets:** `src/x.ts`',
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command / Check | Scope | Notes |',
    '| ---- | --------------- | ----- | ----- |',
    '| FR-1 | `node -e "0"`   |       |       |',
    '',
    // `lintPrd` requires this section, and a fixture that omits it fails for a
    // reason that has nothing to do with the value header — which is how a
    // green here would end up proving something else.
    '## 12. DO NOT (Anti-Patterns)',
    '',
    '- DO NOT ship a fixture that is not a valid work item.',
    '',
    // Same rule for the declaration lint (PRD-026 FR-2): production shape.
    '## Durable Artifacts',
    '',
    '- none — fixture',
    '',
  ].join('\n');

  it('lintPrd surfaces the value issue', () => {
    const wrong = READY.replace('4.10', '4.15');
    expect(lintPrd(DEFAULT_CONFIG, manifest, wrong).issues).toContainEqual(
      'value header declares 4.15 but its dimensions recompute to 4.10',
    );
  });

  it('lintPrd passes a correct one, and the id is the FIFTH argument', () => {
    // Position matters: `root` already occupies the fourth. Passing the number
    // fourth would displace it and silently disable the memory contract's
    // store loading.
    expect(lintPrd(DEFAULT_CONFIG, manifest, READY).issues).toEqual([]);
    expect(lintPrd(DEFAULT_CONFIG, manifest, READY, undefined, 1).issues).toEqual([]);
  });

  it('the SHIPPED PRD template does not accidentally satisfy the generated pattern', () => {
    // `evidence-pattern-satisfied-by-the-template`, applied to this gate. The
    // template emits no value header, which is exactly why presence-triggering
    // is the shipped default — and FR-10 edits templates in the same change, so
    // the fact is pinned rather than assumed.
    const template = readFileSync(resolve(here, '../templates/prd-template.md'), 'utf8');
    expect(scoreValueHeader(DEFAULT_CONFIG, template).problem).toEqual({ kind: 'absent' });
    // …and it therefore lints clean, which an existing test also depends on.
    expect(lintPrd(DEFAULT_CONFIG, manifest, template).issues).not.toContainEqual(
      expect.stringContaining('value header'),
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-6 — the sweep, at the COMMAND
// ─────────────────────────────────────────────────────────────────────────────

describe('gate check --value-score sweeps a corpus (FR-3, FR-6)', () => {
  const CLI_PATH = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  interface Cli {
    code: number;
    stdout: string;
    stderr: string;
  }

  function cli(cwd: string, args: string[]): Cli {
    try {
      const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
        cwd,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      return { code: 0, stdout, stderr: '' };
    } catch (error) {
      const e = error as { status?: number; stdout?: string; stderr?: string };
      return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
    }
  }

  /** A seeded corpus: one correct score, one wrong, one pre-cutoff and
   * header-less. The thing under test is that the COMMAND reports and exits
   * non-zero across a corpus — a function call cannot show that. */
  function corpus(): string {
    const root = mkdtempSync(join(tmpdir(), 'provegate-sweep-'));
    roots.push(root);
    mkdirSync(join(root, '_prds/wip'), { recursive: true });
    mkdirSync(join(root, '_readiness/wip'), { recursive: true });
    writeFileSync(
      join(root, 'workflow.config.json'),
      `${JSON.stringify({ valueScoring: { enforceFrom: 17 } }, null, 2)}\n`,
    );
    const write = (n: number, slug: string, header: string): void => {
      const id = String(n).padStart(3, '0');
      writeFileSync(
        join(root, `_prds/wip/prd-${id}-${slug}.md`),
        [`# PRD-${id}: ${slug}`, '>', '> **Status**: Approved', header, '>', '---', ''].join('\n'),
      );
    };
    write(17, 'correct', '> **Value**: 4.10 (MF/UI/TL/AR/RM: 5/4/4/4/3)');
    write(18, 'wrong', '> **Value**: 4.55 (MF/UI/TL/AR/RM: 5/4/4/4/3)');
    write(9, 'legacy', '>'); // pre-cutoff, no header
    return root;
  }

  it('names the failing item with both numbers, and exits non-zero', () => {
    const result = cli(corpus(), ['check', '--value-score']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('PRD-018');
    expect(result.stderr).toMatch(/declares 4\.55 but its dimensions recompute to 4\.10/);
  });

  it('the correct item is absent from the failures', () => {
    // Assert-absent with an independent cause: PRD-017 carries a header and is
    // past the cutoff, so it IS scored — its absence from the failure list is
    // evidence the recompute passed, not evidence it was skipped. The tally
    // proves the distinction.
    const result = cli(corpus(), ['check', '--value-score']);
    expect(result.stderr).not.toContain('PRD-017');
    expect(result.stderr).toMatch(/1 failure\(s\) — 2 scored, 0 without a header, 1 skipped/);
  });

  it('the pre-cutoff item is reported as skipped WITH its reason, not silently', () => {
    // A sweep that says nothing about what it did not check reads as a sweep
    // that checked it.
    const result = cli(corpus(), ['check', '--value-score']);
    expect(result.stdout).toMatch(
      /skipped PRD-009: no header, and id 9 is before the cutoff of 17/,
    );
  });

  it('a clean corpus exits 0 and the tally separates scored from header-less', () => {
    const root = corpus();
    const wrong = join(root, '_prds/wip/prd-018-wrong.md');
    writeFileSync(wrong, readFileSync(wrong, 'utf8').replace('4.55', '4.10'));
    const result = cli(root, ['check', '--value-score']);
    expect(result.code).toBe(0);
    expect(result.stdout).toMatch(/ok — 2 scored, 0 without a header, 1 skipped by the cutoff/);
  });

  it('without a cutoff, a header-less item is counted apart from a scored one', () => {
    // The case that actually pins the tally's separation. In the cutoff corpus
    // every header-less item is pre-cutoff, so it is skipped before reaching
    // the count and `headerless` is always 0 — a mutation folding the two
    // counters together left that assertion green, which is how this test came
    // to exist. With no cutoff, a header-less item passes and IS counted.
    const root = corpus();
    writeFileSync(join(root, 'workflow.config.json'), '{}\n');
    const result = cli(root, ['check', '--value-score']);
    // PRD-018 still fails on its arithmetic; the tally is what is under test.
    expect(result.stderr + result.stdout).toMatch(
      /2 scored, 1 without a header, 0 skipped by the cutoff/,
    );
  });

  it('refuses an unknown flag rather than sweeping anyway', () => {
    const result = cli(corpus(), ['check', '--value-scores']);
    expect(result.code).toBe(1);
    expect(result.stderr).toMatch(/unknown option --value-scores/);
  });
});
