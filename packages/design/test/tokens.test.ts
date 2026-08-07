import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emitColorsCss, emitTheme } from '../scripts/emit.js';
import { hexToRgb, ramps, terminal, tints, VERDICTS, verdictStyles } from '../src/tokens.js';

const read = (rel: string): string => readFileSync(resolve(__dirname, '..', rel), 'utf8');

describe('generated artifacts are byte-identical to the token source', () => {
  it('src/tokens/colors.css matches a fresh generation (FR-3)', () => {
    expect(read('src/tokens/colors.css')).toBe(emitColorsCss());
  });

  it('src/cli/theme.ts matches a fresh generation (FR-3)', () => {
    expect(read('src/cli/theme.ts')).toBe(emitTheme());
  });

  it('a hand-edit of a generated file would be caught (the gate has teeth)', () => {
    // Sanity: the emitters are deterministic, so two calls are equal — the diff
    // above is meaningful, not vacuously true.
    expect(emitColorsCss()).toBe(emitColorsCss());
    expect(emitTheme()).toBe(emitTheme());
  });
});

describe('token source is the single home of every hex', () => {
  it('every ramp + tint hex appears in the generated colors.css exactly', () => {
    const css = read('src/tokens/colors.css');
    for (const steps of Object.values(ramps)) {
      for (const hex of Object.values(steps)) expect(css, hex).toContain(hex);
    }
    // terminal slot hexes present too
    for (const slot of Object.values(terminal)) expect(css, slot.hex).toContain(slot.hex);
  });

  it('no ramp hex is duplicated as a literal tint (no shadow source)', () => {
    const rampHexes = new Set<string>(Object.values(ramps).flatMap((s) => Object.values(s)));
    for (const tint of Object.values(tints)) {
      // #ffffff is legitimately shared; every other tint must be distinct from ramps
      if (tint === '#ffffff') continue;
      expect(rampHexes.has(tint), `${tint} shadows a ramp`).toBe(false);
    }
  });
});

describe('the colour law is a closed, typed set (FR-7)', () => {
  it('exactly six verdicts, each with a glyph and a slot', () => {
    expect(VERDICTS).toEqual(['passed', 'failed', 'partial', 'skipped', 'operator', 'blocked']);
    for (const v of VERDICTS) {
      expect(verdictStyles[v].glyph).toMatch(/^[✓✗⚠=→!]$/u);
      expect(terminal[verdictStyles[v].slot]).toBeDefined();
    }
  });

  it('green is earned: only `passed` maps to the green slot', () => {
    const greenVerdicts = VERDICTS.filter((v) => verdictStyles[v].slot === 'green');
    expect(greenVerdicts).toEqual(['passed']);
  });

  it('a not-earned verdict (skipped) is dim, never green', () => {
    expect(verdictStyles.skipped.slot).toBe('dim');
  });

  it('the colour law is enforced at the type level: a slot is a readonly literal', () => {
    // If `verdictStyles` were declared with an explicit `: Record<…>` annotation,
    // its slots would widen to `TerminalSlotName` and repainting would type-check.
    // With `as const satisfies`, each slot's TYPE is its literal, so:
    type SkippedSlot = typeof verdictStyles.skipped.slot;
    const ok: SkippedSlot = 'dim';
    // @ts-expect-error — 'green' is not assignable to the literal 'dim' (a
    // verdict cannot be repainted). If this line stopped erroring, the guarantee
    // would be broken and check-types would flag this unused expect-error.
    const repaint: SkippedSlot = 'green';
    expect(ok).toBe('dim');
    void repaint;
  });
});

// WCAG relative luminance + contrast ratio, pure functions over the tokens.
function luminance(hex: string): number {
  const chan = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0]! + 0.7152 * chan[1]! + 0.0722 * chan[2]!;
}
function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

describe('contrast meets WCAG AA (W5)', () => {
  it('terminal foreground clears AA (4.5) on the terminal surface', () => {
    expect(contrast(terminal.fg.hex, terminal.bg.hex)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(terminal.dim.hex, terminal.bg.hex)).toBeGreaterThanOrEqual(3.0);
  });

  it('every terminal status hue clears AA for graphics (3.0) on the surface', () => {
    for (const slot of ['green', 'red', 'amber', 'human', 'plan', 'stale'] as const) {
      const ratio = contrast(terminal[slot].hex, terminal.bg.hex);
      expect(ratio, `${slot}: ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(3.0);
    }
  });

  it('light + dark body text clears AA (4.5) on its background', () => {
    // light: warm-900 on warm-50; dark: warm-100 on warm-950
    expect(contrast(ramps.warm[900], ramps.warm[50])).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ramps.warm[100], ramps.warm[950])).toBeGreaterThanOrEqual(4.5);
  });
});
