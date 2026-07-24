/**
 * ProveGate design tokens — THE single source of truth for every colour.
 *
 * Every hex in the system lives here (in `ramps` or `tints`); nothing else in
 * the repo authors a colour. `scripts/generate-tokens.ts` reads this file and
 * emits BOTH the web token CSS (`src/tokens/colors.css`) and the terminal ANSI
 * theme (`src/cli/theme.ts`). A byte-identity test regenerates and diffs the
 * committed output, so a hand-edit of either generated file fails the gate.
 *
 * Change proof-green once here → web and terminal move together.
 *
 * Values are transcribed verbatim from the design handoff
 * (`docs/design/design_handoff_provegate/`). Do not re-pick or round.
 */

// ── Base ramps — warm-leaning neutral + the status hues ────────────────────
export const ramps = {
  warm: {
    50: '#faf9f6',
    100: '#f3f1eb',
    200: '#e7e4db',
    300: '#d6d2c6',
    400: '#b4af9f',
    500: '#8f8a7b',
    600: '#6b6659',
    700: '#4a463d',
    800: '#2e2b25',
    900: '#1c1a16',
    950: '#14130d',
  },
  green: { 400: '#4fd08a', 500: '#1fa45e', 600: '#147d45', 700: '#0e5e34' },
  red: { 400: '#f4776b', 500: '#db4437', 600: '#c13328', 700: '#9a2820' },
  amber: { 400: '#e8b44a', 500: '#c98a17', 600: '#a66e08' },
  human: { 400: '#6fa8f5', 500: '#2f6fe0', 600: '#2258c0' },
  cyan: { 400: '#63b6c2', 500: '#3a8b98', 600: '#2b6d78' },
  stale: { 400: '#b39a52', 600: '#7c6a34' },
} as const;

// ── Literal tints — the only hexes that are not ramp steps ──────────────────
export const tints = {
  white: '#ffffff',
  // light-theme solid status backgrounds
  accentBgLight: '#e8f4ec',
  failBgLight: '#fbe9e7',
  pendingBgLight: '#fbf1dc',
  humanBgLight: '#e7effc',
  planBgLight: '#e4f1f3',
  staleBgLight: '#f4efdf',
  // dark-theme one-off literals
  bgSubtleDark: '#191712',
  borderDark: '#2a2721',
  accentHoverDark: '#6fdca1',
  linkHoverDark: '#9cc2f8',
} as const;

/** `#rrggbb` → `[r, g, b]`. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

/** A ramp hex at an alpha, as a CSS `rgba(...)` — how the dark theme tints its
 * status backgrounds, kept sourced from the ramp rather than re-typed. */
function rgbaOf(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

const V = (name: string): string => `var(--pg-${name})`;

// ── Semantic aliases — light theme (:root) ──────────────────────────────────
// Values are final CSS strings; hexes appear only via `tints`/`ramps`.
export const semanticLight: Record<string, string> = {
  bg: V('warm-50'),
  'bg-subtle': V('warm-100'),
  surface: tints.white,
  'surface-raised': tints.white,
  border: V('warm-200'),
  'border-strong': V('warm-300'),
  text: V('warm-900'),
  'text-muted': V('warm-700'),
  'text-subtle': V('warm-600'),
  'text-inverted': V('warm-50'),
  accent: V('green-600'),
  'accent-hover': V('green-700'),
  'accent-contrast': tints.white,
  'accent-text': V('green-600'),
  'accent-bg': tints.accentBgLight,
  pass: V('green-600'),
  'pass-text': V('green-600'),
  'pass-bg': tints.accentBgLight,
  fail: V('red-600'),
  'fail-text': V('red-600'),
  'fail-bg': tints.failBgLight,
  pending: V('amber-600'),
  'pending-text': V('amber-600'),
  'pending-bg': tints.pendingBgLight,
  human: V('human-600'),
  'human-text': V('human-600'),
  'human-bg': tints.humanBgLight,
  warn: V('amber-600'),
  'warn-text': V('amber-600'),
  'warn-bg': tints.pendingBgLight,
  refusal: V('human-600'),
  'refusal-text': V('human-600'),
  'refusal-bg': tints.humanBgLight,
  plan: V('cyan-600'),
  'plan-text': V('cyan-600'),
  'plan-bg': tints.planBgLight,
  stale: V('stale-600'),
  'stale-text': V('stale-600'),
  'stale-bg': tints.staleBgLight,
  muted: V('text-subtle'),
  link: V('human-600'),
  'link-hover': V('human-500'),
  'focus-ring': V('human-500'),
};

// ── Semantic aliases — dark theme ([data-theme="dark"]) ─────────────────────
export const semanticDark: Record<string, string> = {
  bg: V('warm-950'),
  'bg-subtle': tints.bgSubtleDark,
  surface: V('warm-900'),
  'surface-raised': V('warm-800'),
  border: tints.borderDark,
  'border-strong': V('warm-700'),
  text: V('warm-100'),
  'text-muted': V('warm-400'),
  'text-subtle': V('warm-500'),
  'text-inverted': V('warm-950'),
  accent: V('green-400'),
  'accent-hover': tints.accentHoverDark,
  'accent-contrast': V('warm-950'),
  'accent-text': V('green-400'),
  'accent-bg': rgbaOf(ramps.green[400], 0.14),
  pass: V('green-400'),
  'pass-text': V('green-400'),
  'pass-bg': rgbaOf(ramps.green[400], 0.14),
  fail: V('red-400'),
  'fail-text': V('red-400'),
  'fail-bg': rgbaOf(ramps.red[400], 0.15),
  pending: V('amber-400'),
  'pending-text': V('amber-400'),
  'pending-bg': rgbaOf(ramps.amber[400], 0.15),
  human: V('human-400'),
  'human-text': V('human-400'),
  'human-bg': rgbaOf(ramps.human[400], 0.15),
  warn: V('amber-400'),
  'warn-text': V('amber-400'),
  'warn-bg': rgbaOf(ramps.amber[400], 0.15),
  refusal: V('human-400'),
  'refusal-text': V('human-400'),
  'refusal-bg': rgbaOf(ramps.human[400], 0.15),
  plan: V('cyan-400'),
  'plan-text': V('cyan-400'),
  'plan-bg': rgbaOf(ramps.cyan[400], 0.15),
  stale: V('stale-400'),
  'stale-text': V('stale-400'),
  'stale-bg': rgbaOf(ramps.stale[400], 0.15),
  muted: V('text-subtle'),
  link: V('human-400'),
  'link-hover': tints.linkHoverDark,
  'focus-ring': V('human-400'),
};

// ── Terminal surface — ALWAYS dark, theme-independent ───────────────────────
// Each slot carries its truecolor hex and its 16-colour ANSI floor (fg SGR
// code, plus the bright variant where one exists). The glyph always carries
// status, so colour is redundant and NO_COLOR loses nothing.
export interface TerminalSlot {
  name: string;
  hex: string;
  /** 16-colour ANSI foreground code (e.g. 32 green); `bright` is the 90-series. */
  ansi16: number;
  ansiBright?: number;
}

export const terminal = {
  bg: { name: 'bg', hex: '#14130d', ansi16: 40 },
  fg: { name: 'fg', hex: '#e7e4db', ansi16: 37 },
  dim: { name: 'dim', hex: '#8f8a7b', ansi16: 90 },
  green: { name: 'green', hex: '#4fd08a', ansi16: 32, ansiBright: 92 },
  red: { name: 'red', hex: '#f4776b', ansi16: 31, ansiBright: 91 },
  amber: { name: 'amber', hex: '#e8b44a', ansi16: 33, ansiBright: 93 },
  human: { name: 'human', hex: '#6fa8f5', ansi16: 34, ansiBright: 94 },
  plan: { name: 'plan', hex: '#63b6c2', ansi16: 36, ansiBright: 96 },
  stale: { name: 'stale', hex: '#b39a52', ansi16: 33 },
  border: { name: 'border', hex: '#2e2b25', ansi16: 90 },
} as const satisfies Record<string, TerminalSlot>;

export type TerminalSlotName = keyof typeof terminal;

// ── The colour law + closed ledger vocabulary (FR-7) ────────────────────────
// A phase boundary's verdict is one of exactly these six words; each maps to a
// glyph (the source of truth under NO_COLOR) and a terminal colour slot.
// GREEN IS EARNED (passed only); RED IS REAL FAILURE only.
export const VERDICTS = ['passed', 'failed', 'partial', 'skipped', 'operator', 'blocked'] as const;
export type Verdict = (typeof VERDICTS)[number];

export interface VerdictStyle {
  glyph: string;
  /** Terminal colour slot; `dim` for non-earned states so they never read green. */
  slot: TerminalSlotName;
}

// `as const satisfies` — NOT an explicit `: Record<…>` annotation, which would
// widen the properties back to mutable and let `verdictStyles.skipped.slot =
// 'green'` type-check (defeating half the colour law). `as const` keeps every
// slot a readonly literal; `satisfies` still checks the shape. So repainting a
// verdict's colour is a compile error, as the law claims.
export const verdictStyles = {
  passed: { glyph: '✓', slot: 'green' },
  failed: { glyph: '✗', slot: 'red' },
  partial: { glyph: '⚠', slot: 'amber' },
  skipped: { glyph: '=', slot: 'dim' },
  operator: { glyph: '→', slot: 'human' },
  blocked: { glyph: '!', slot: 'stale' },
} as const satisfies Record<Verdict, VerdictStyle>;

/** Extra non-verdict glyphs the CLI grammar uses. */
export const glyphs = {
  separator: '·',
  handoff: '→',
  next: '→',
} as const;

// Brand assets — exported so consumers reference rather than copy them.
export const assets = {
  logo: 'assets/logo.svg',
  favicon: 'assets/favicon.svg',
} as const;
