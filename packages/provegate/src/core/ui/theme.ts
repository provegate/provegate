/**
 * The CLI's single presentation choke point. Everything visual — the colour
 * tier decision, the paint function, the glyph table, the verdict→slot map, and
 * the card + status-line string builders — is re-exported from
 * `@provegate/design/cli`, the shared design-system origin. No glyph, no ANSI
 * escape, and no hex is authored anywhere else in `packages/provegate`.
 *
 * `@provegate/design` is a devDependency; tsup bundles it into `dist/`, so the
 * published package still declares ZERO runtime dependencies (pack.test.ts).
 * The design `./cli` entry is pure (no CSS, no React), so this stays safe to
 * bundle.
 */
export {
  colorTier,
  paint,
  glyph,
  verdictSlot,
  VERDICTS,
  stopCard,
  handoffCard,
  statusLine,
  type ColorTier,
  type TermSlot,
  type Verdict,
  type GateResultRow,
} from '@provegate/design/cli';
