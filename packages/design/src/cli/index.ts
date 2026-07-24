/**
 * `@provegate/design/cli` — the terminal half of the design system: the ANSI
 * theme (generated from tokens.ts) plus the pure card + status-line string
 * builders. NOTHING here imports CSS, React, or a third-party module, so a
 * zero-runtime-dependency consumer (the provegate CLI) can bundle it. The
 * import-graph test enforces that.
 */
export {
  colorTier,
  paint,
  glyph,
  verdictSlot,
  VERDICTS,
  type ColorTier,
  type TermSlot,
  type Verdict,
} from './theme.js';
export { stopCard, handoffCard, type GateResultRow } from './cards.js';
export { statusLine } from './status-line.js';
