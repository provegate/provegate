import * as React from 'react';

export type GateStatus = 'passed' | 'failed' | 'partial' | 'skipped' | 'operator' | 'blocked';

// The glyph carries status; colour is redundant (matches the CLI). Terminal
// slots so a web GateLine reads exactly like a line of `gate run` output.
const MAP: Record<GateStatus, { glyph: string; color: string }> = {
  passed: { glyph: '✓', color: 'var(--pg-term-green)' },
  failed: { glyph: '✗', color: 'var(--pg-term-red)' },
  partial: { glyph: '⚠', color: 'var(--pg-term-amber)' },
  skipped: { glyph: '=', color: 'var(--pg-term-dim)' },
  operator: { glyph: '→', color: 'var(--pg-term-human)' },
  blocked: { glyph: '!', color: 'var(--pg-term-stale)' },
};

export interface GateLineProps extends React.HTMLAttributes<HTMLDivElement> {
  status?: GateStatus;
  name?: string;
  command?: string;
  code?: number | string;
  bare?: boolean;
}

export function GateLine({
  status = 'passed',
  name,
  command,
  code,
  bare = false,
  className = '',
  style = {},
  ...rest
}: GateLineProps): React.JSX.Element {
  const m = MAP[status];
  return (
    <div
      className={`pg-gateline pg-gateline--${status} ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'var(--pg-font-mono)',
        fontSize: '0.8125rem',
        lineHeight: 1.7,
        color: 'var(--pg-term-fg)',
        ...(bare ? {} : { padding: '2px 0' }),
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden="true"
        style={{ color: m.color, flex: 'none', fontWeight: 700, width: '1ch', textAlign: 'center' }}
      >
        {m.glyph}
      </span>
      {name ? <span style={{ color: 'var(--pg-term-fg)' }}>{name}</span> : null}
      {command ? <span style={{ color: 'var(--pg-term-dim)' }}>{command}</span> : null}
      {code != null ? <span style={{ color: 'var(--pg-term-dim)' }}>· exit {code}</span> : null}
      <span style={{ color: m.color, marginLeft: 'auto' }}>{status}</span>
    </div>
  );
}
