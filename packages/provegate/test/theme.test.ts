import { describe, expect, it } from 'vitest';
import { colorTier, paint, statusLine, verdictSlot, glyph, VERDICTS } from '../src/core/ui/theme.js';

// The CLI's colour comes from @provegate/design/cli via core/ui/theme. These
// pin the capability tiers and the NO_COLOR identity the whole CLI relies on
// (FR-2, FR-9): stripping the escapes from a coloured string yields exactly the
// no-colour string.

// eslint-disable-next-line no-control-regex -- ANSI escape matcher, control char is intentional
const STRIP = /\x1b\[[0-9;]*m/g;
const strip = (s: string): string => s.replace(STRIP, '');

describe('colour tier detection (single choke point)', () => {
  it('none under NO_COLOR or a non-TTY stdout', () => {
    expect(colorTier({}, false)).toBe('none');
    expect(colorTier({ NO_COLOR: '1' }, true)).toBe('none');
    // NO_COLOR must be non-empty to disable — the empty-string case stays coloured
    expect(colorTier({ NO_COLOR: '' }, true)).not.toBe('none');
  });

  it('truecolor only when advertised, else the 16-colour floor', () => {
    expect(colorTier({ COLORTERM: 'truecolor' }, true)).toBe('truecolor');
    expect(colorTier({ COLORTERM: '24bit' }, true)).toBe('truecolor');
    expect(colorTier({}, true)).toBe('ansi16');
  });
});

describe('paint is additive: stripping colour is lossless (FR-9)', () => {
  it('none returns text unchanged', () => {
    expect(paint('green', 'passed', 'none')).toBe('passed');
  });

  it('strip(coloured) === none for every slot, both tiers', () => {
    for (const slot of ['green', 'red', 'amber', 'human', 'plan', 'stale', 'dim', 'fg'] as const) {
      for (const tier of ['truecolor', 'ansi16'] as const) {
        const painted = paint(slot, 'X', tier);
        expect(painted).not.toBe('X'); // it did add escapes
        expect(strip(painted), `${slot}/${tier}`).toBe(paint(slot, 'X', 'none'));
      }
    }
  });
});

describe('the status-line grammar (shared builder)', () => {
  it('renders glyph · phase · name · verdict and strips clean when painted', () => {
    const line = statusLine({ phase: '5', name: 'testing', verdict: 'failed' });
    expect(line).toBe('✗ phase 5 · testing · failed');
    expect(strip(paint(verdictSlot.failed, line, 'truecolor'))).toBe(line);
  });

  it('every verdict has a glyph and a slot', () => {
    for (const v of VERDICTS) {
      expect(glyph[v]).toBeTruthy();
      expect(verdictSlot[v]).toBeTruthy();
    }
  });
});
