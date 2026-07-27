import type { WorkflowConfig } from '../config/index.js';

/**
 * The value-triage recompute (PRD-021 FR-2).
 *
 * A work item declares a total and its per-axis dimensions in one header line;
 * this recomputes the total from the configured weights and requires exact
 * equality. Without it the number is prose, and prose rounds up to clear a
 * threshold.
 *
 * Three deliberate divergences from the source snapshot
 * (`verify-prd-ready.mjs`), recorded rather than absorbed:
 *
 * 1. **Exact comparison, not `Math.abs(stated - computed) > 0.005`.** The
 *    tolerance exists there because its weights are unvalidated constants.
 *    FR-1 constrains every weight to two decimals, so every legal total is
 *    exactly representable in integer hundredths and a tolerance band would
 *    only hide arithmetic that is wrong.
 * 2. **Dimensions are `[1-5]`, where the snapshot's groups are `[0-5]`.** The
 *    rubric's range is 1-5; a 0 dimension is a scoring error the snapshot
 *    happens to accept, and accepting it here would let `0/0/0/0/0` recompute
 *    consistently and pass.
 * 3. **The search is scoped to the metadata block and rejects a second
 *    declaration**, where the snapshot runs one `.exec` over the whole
 *    document and takes the first hit. Scoping is what lets a PRD document the
 *    header format without its own example being read as a declaration; once
 *    scoped, a second line inside the block is a real duplicate rather than an
 *    example, because no example is ever written there.
 *
 * The pattern is BUILT from `config.valueScoring.axes` and never written as a
 * literal, so an adopter who renames an axis is told rather than silently
 * falling through to "no header".
 */

export type ValueScoreProblem =
  | { kind: 'absent' }
  | { kind: 'malformed'; why: string }
  | { kind: 'mismatch'; declared: number; computed: number };

export interface ValueScoreResult {
  problem: ValueScoreProblem | null;
}

/** The metadata block: everything before the first `---` line. The header lives
 * there in every template, and no example ever does. */
function metadataBlock(content: string): string {
  const lines = content.split('\n');
  const end = lines.findIndex((line) => /^---\s*$/.test(line));
  return (end === -1 ? lines : lines.slice(0, end)).join('\n');
}

/**
 * The accepted header form, generated from the configured axes.
 *
 * Shape: optional leading `>` and whitespace; `Value` with optional surrounding
 * `**`; a colon that may sit inside or outside the bold run; the total; any
 * non-`(` filler; then `(<axes joined by /> : <dims joined by />)`.
 *
 * Deliberately NOT anchored on the closing paren — trailing prose after the
 * dimensions is legal, as it is in the snapshot.
 *
 * Case-insensitive, following the snapshot's `/i`. That is why FR-1 requires
 * axis identifiers to be unique ignoring case: `MF` and `mf` would otherwise be
 * indistinguishable here while validating as two distinct axes.
 */
function headerPattern(axes: string[]): RegExp {
  const axisSegment = axes.join('\\s*/\\s*');
  const dimSegment = axes.map(() => '([1-5])').join('\\s*/\\s*');
  return new RegExp(
    `^\\s*>?\\s*\\*{0,2}Value\\*{0,2}\\s*:?\\s*\\*{0,2}\\s*:?\\s*([0-9]+(?:\\.[0-9]+)?)[^(]*\\(\\s*${axisSegment}\\s*:\\s*${dimSegment}`,
    'im',
  );
}

/** Every line in the metadata block that opens a `Value` declaration, however
 * malformed. Used to tell "no header" from "a header I could not read" and from
 * "two headers" — three different answers that must not collapse into one. */
function declarationLines(block: string): string[] {
  return block.split('\n').filter((line) => /^\s*>?\s*\*{0,2}Value\*{0,2}\s*:/i.test(line));
}

/**
 * Parse a decimal total into integer hundredths.
 *
 * One or two decimal places, or none. Three decimals, exponent notation, and a
 * form the pattern let through but arithmetic would round are all malformed —
 * stricter than the snapshot's `Number()` parse, and what keeps the comparison
 * exact on both sides rather than only on the computed one.
 */
function totalToHundredths(raw: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return null;
  const [whole, frac = ''] = raw.split('.');
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}

/**
 * Score one work item's body against the configured axes and weights.
 *
 * `problem: null` means the header is present and its arithmetic is exact.
 * `{ kind: 'absent' }` means there is no header at all — whether that is a
 * failure is the CALLER's decision, because it depends on the cutoff and the
 * item's id, which this function deliberately does not know.
 */
export function scoreValueHeader(config: WorkflowConfig, content: string): ValueScoreResult {
  const { axes, weights } = config.valueScoring;
  const block = metadataBlock(content);
  const declarations = declarationLines(block);

  if (declarations.length === 0) return { problem: { kind: 'absent' } };
  if (declarations.length > 1) {
    return {
      problem: {
        kind: 'malformed',
        why: `${declarations.length} value headers in the metadata block — exactly one declares the score`,
      },
    };
  }

  const match = headerPattern(axes).exec(block);
  if (match === null) {
    return {
      problem: {
        kind: 'malformed',
        why: `does not match the configured axes (${axes.join('/')}) with dimensions 1-5`,
      },
    };
  }

  const declared = totalToHundredths(match[1]!);
  if (declared === null) {
    return {
      problem: {
        kind: 'malformed',
        why: `total "${match[1]!}" must be written with at most two decimal places`,
      },
    };
  }

  // Integer hundredths throughout: every weight is at most two decimals (FR-1),
  // so every legal total is exactly representable and no tolerance is needed.
  // Σ (weight in hundredths × dimension) IS the total in hundredths: a weight
  // of 0.25 scaled to 25, times a dimension of 5, is 125 — one and a quarter
  // points, expressed in hundredths. Dividing again would drop the fraction.
  let computed = 0;
  axes.forEach((axis, i) => {
    computed += Math.round(weights[axis]! * 100) * Number(match[i + 2]!);
  });

  if (computed !== declared) {
    return { problem: { kind: 'mismatch', declared: declared / 100, computed: computed / 100 } };
  }
  return { problem: null };
}

/**
 * The readiness-lint issue text for a scored item, or null when it passes.
 *
 * `prdNumber` is absent for every caller that has no id — they omit the
 * argument, so it arrives as `undefined`, not `null`. Both spellings take the
 * same path: **skip the presence requirement, keep the arithmetic**. Guarding
 * on `=== null` instead would enforce presence on every existing call site the
 * moment a repository sets `enforceFrom`, and the first casualty would be the
 * shipped header-less PRD template, which an existing test lints through
 * `lintPrd` and asserts clean.
 */
export function valueScoreIssue(
  config: WorkflowConfig,
  content: string,
  prdNumber?: number | null,
): string | null {
  const { problem } = scoreValueHeader(config, content);
  if (problem === null) return null;

  if (problem.kind === 'absent') {
    const cutoff = config.valueScoring.enforceFrom;
    // No cutoff configured → presence-triggered: an item without a header is
    // not making a claim, so there is nothing to check.
    if (cutoff === undefined) return null;
    // No id → presence is undecidable, so it is not enforced. The arithmetic
    // above already ran and found nothing to check.
    if (prdNumber === undefined || prdNumber === null) return null;
    if (prdNumber < cutoff) return null;
    return `missing the value header — required from id ${cutoff} (${config.valueScoring.axes.join('/')})`;
  }

  if (problem.kind === 'malformed') {
    return `value header is malformed: ${problem.why}`;
  }

  return `value header declares ${problem.declared.toFixed(2)} but its dimensions recompute to ${problem.computed.toFixed(2)}`;
}
