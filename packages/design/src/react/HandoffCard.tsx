import * as React from 'react';
import type { GateStatus } from './GateLine.js';

/** A body line: plain string, a blank gutter, a `{gate, text}` check row, or a
 * `{arrow, text}` handoff row. This structured model (not a wrapper around the
 * CLI string builder) lets the landing compose arbitrary card content; parity
 * with the terminal is at the grammar level (glyphs, box chars, colours). */
export type HandoffLine =
  | string
  | { blank: true }
  | { gate: GateStatus; text: string }
  | { arrow: true; text: string }
  | { text: string };

const GLYPH: Record<GateStatus, [string, string]> = {
  passed: ['✓', 'var(--pg-term-green)'],
  failed: ['✗', 'var(--pg-term-red)'],
  partial: ['⚠', 'var(--pg-term-amber)'],
  skipped: ['=', 'var(--pg-term-dim)'],
  operator: ['→', 'var(--pg-term-human)'],
  blocked: ['!', 'var(--pg-term-stale)'],
};

function Line({ children, style }: { children?: React.ReactNode; style?: React.CSSProperties }): React.JSX.Element {
  return <div style={{ whiteSpace: 'pre', ...style }}>{children}</div>;
}

export interface HandoffCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'handoff' | 'stopped';
  title?: string;
  width?: number;
  lines?: HandoffLine[];
}

export function HandoffCard({
  variant = 'handoff',
  title,
  width = 56,
  lines = [],
  className = '',
  style = {},
  ...rest
}: HandoffCardProps): React.JSX.Element {
  const headColor = variant === 'stopped' ? 'var(--pg-term-red)' : 'var(--pg-term-green)';
  const head = title ?? (variant === 'stopped' ? 'STOPPED' : 'HANDOFF CARD');
  const gutter = <span style={{ color: 'var(--pg-term-border)' }}>{'│'}</span>;
  const topFill = '─'.repeat(Math.max(2, width - 4 - head.length));
  const bottom = '─'.repeat(Math.max(4, width - 1));

  return (
    <div
      className={`pg-handoff pg-handoff--${variant} ${className}`}
      style={{
        background: 'var(--pg-term-bg)',
        border: '1px solid var(--pg-term-border)',
        borderRadius: 'var(--pg-radius-md)',
        fontFamily: 'var(--pg-font-mono)',
        fontSize: '0.8125rem',
        lineHeight: 1.75,
        color: 'var(--pg-term-fg)',
        padding: '14px 18px',
        overflowX: 'auto',
        ...style,
      }}
      {...rest}
    >
      <Line style={{ color: headColor }}>{`┌─ ${head} ${topFill}`}</Line>
      {lines.map((ln, i) => {
        const key = i;
        if (ln == null || (typeof ln === 'object' && 'blank' in ln && ln.blank)) {
          return <Line key={key}>{gutter}</Line>;
        }
        if (typeof ln === 'string') {
          return (
            <Line key={key}>
              {gutter}
              <span> {ln}</span>
            </Line>
          );
        }
        if ('gate' in ln) {
          const [g, c] = GLYPH[ln.gate];
          return (
            <Line key={key}>
              {gutter}
              <span>{'   '}</span>
              <span style={{ color: c, fontWeight: 700 }}>{g}</span>
              <span>{` ${ln.text}`}</span>
            </Line>
          );
        }
        if ('arrow' in ln) {
          return (
            <Line key={key}>
              {gutter}
              <span style={{ color: 'var(--pg-term-human)' }}>{` → ${ln.text}`}</span>
            </Line>
          );
        }
        return (
          <Line key={key}>
            {gutter}
            <span>{` ${'text' in ln ? ln.text : ''}`}</span>
          </Line>
        );
      })}
      <Line style={{ color: headColor }}>{`└${bottom}`}</Line>
    </div>
  );
}
