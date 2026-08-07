import * as React from 'react';

export type Verdict = 'passed' | 'failed' | 'partial' | 'skipped' | 'operator' | 'blocked';

interface VerdictStyle {
  glyph: string;
  label: string;
  fg: string;
  bg: string;
  bd: string;
}

// Colour law encoded: green (pass tokens) only for `passed`; `skipped` is muted,
// never green. Glyphs are the closed CLI grammar.
const MAP: Record<Verdict, VerdictStyle> = {
  passed: {
    glyph: '✓',
    label: 'passed',
    fg: 'var(--pg-pass-text)',
    bg: 'var(--pg-pass-bg)',
    bd: 'var(--pg-pass)',
  },
  failed: {
    glyph: '✗',
    label: 'failed',
    fg: 'var(--pg-fail-text)',
    bg: 'var(--pg-fail-bg)',
    bd: 'var(--pg-fail)',
  },
  partial: {
    glyph: '⚠',
    label: 'partial',
    fg: 'var(--pg-warn-text)',
    bg: 'var(--pg-warn-bg)',
    bd: 'var(--pg-warn)',
  },
  skipped: {
    glyph: '=',
    label: 'skipped',
    fg: 'var(--pg-muted)',
    bg: 'var(--pg-bg-subtle)',
    bd: 'var(--pg-border-strong)',
  },
  operator: {
    glyph: '→',
    label: 'operator',
    fg: 'var(--pg-human-text)',
    bg: 'var(--pg-human-bg)',
    bd: 'var(--pg-human)',
  },
  blocked: {
    glyph: '!',
    label: 'blocked',
    fg: 'var(--pg-stale-text)',
    bg: 'var(--pg-stale-bg)',
    bd: 'var(--pg-stale)',
  },
};

const SIZES = {
  sm: { fontSize: '0.6875rem', padding: '2px 7px', gap: 5 },
  md: { fontSize: '0.8125rem', padding: '3px 9px', gap: 6 },
} as const;

export interface VerdictBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  verdict?: Verdict;
  label?: string;
  code?: number | string;
  solid?: boolean;
  size?: 'sm' | 'md';
}

export function VerdictBadge({
  verdict = 'passed',
  label,
  code,
  solid = false,
  size = 'md',
  className = '',
  style = {},
  ...rest
}: VerdictBadgeProps): React.JSX.Element {
  const v = MAP[verdict];
  const sz = SIZES[size];
  const solidStyle: React.CSSProperties = solid
    ? { background: v.bd, color: 'var(--pg-term-bg)', borderColor: v.bd }
    : {
        background: v.bg,
        color: v.fg,
        borderColor: `color-mix(in srgb, ${v.bd} 35%, transparent)`,
      };
  return (
    <span
      className={`pg-verdict pg-verdict--${verdict} ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: sz.gap,
        fontFamily: 'var(--pg-font-mono)',
        fontWeight: 500,
        fontSize: sz.fontSize,
        lineHeight: 1,
        letterSpacing: '0.01em',
        textTransform: 'lowercase',
        padding: sz.padding,
        borderRadius: 'var(--pg-radius-sm)',
        border: '1px solid',
        ...solidStyle,
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ fontWeight: 700 }}>
        {v.glyph}
      </span>
      {label ?? v.label}
      {code != null ? <span style={{ opacity: 0.7 }}>· exit {code}</span> : null}
    </span>
  );
}
