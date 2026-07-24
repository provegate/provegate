import * as React from 'react';
import { VerdictBadge, type Verdict } from './VerdictBadge.js';

export interface EvidenceRow {
  check: string;
  command?: string;
  verdict: Verdict;
  code?: number | string;
  evidence?: string;
}

export interface EvidenceTableProps extends React.HTMLAttributes<HTMLDivElement> {
  rows?: EvidenceRow[];
  caption?: string;
}

const TH: React.CSSProperties = {
  textAlign: 'left',
  fontFamily: 'var(--pg-font-mono)',
  fontSize: '0.6875rem',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  color: 'var(--pg-text-subtle)',
  fontWeight: 500,
  padding: '10px 14px',
  borderBottom: '1px solid var(--pg-border)',
  whiteSpace: 'nowrap',
};
const TD: React.CSSProperties = {
  padding: '11px 14px',
  fontSize: '0.875rem',
  color: 'var(--pg-text)',
  borderBottom: '1px solid var(--pg-border)',
  verticalAlign: 'middle',
};
const MONO: React.CSSProperties = {
  fontFamily: 'var(--pg-font-mono)',
  fontSize: '0.8125rem',
  color: 'var(--pg-text-muted)',
};

export function EvidenceTable({
  rows = [],
  caption,
  className = '',
  style = {},
  ...rest
}: EvidenceTableProps): React.JSX.Element {
  return (
    <div
      className={`pg-evidence ${className}`}
      style={{
        border: '1px solid var(--pg-border)',
        borderRadius: 'var(--pg-radius-md)',
        overflow: 'hidden',
        background: 'var(--pg-surface)',
        ...style,
      }}
      {...rest}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'var(--pg-font-sans)' }}>
        {caption ? (
          <caption style={{ ...TH, textAlign: 'left', borderBottom: 'none', padding: '12px 14px 4px' }}>
            {caption}
          </caption>
        ) : null}
        <thead>
          <tr>
            <th style={TH}>Check</th>
            <th style={TH}>Command</th>
            <th style={TH}>Verdict</th>
            <th style={TH}>Exit</th>
            <th style={TH}>Evidence</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={TD}>{r.check}</td>
              <td style={{ ...TD, ...MONO }}>{r.command}</td>
              <td style={TD}>
                <VerdictBadge verdict={r.verdict} size="sm" />
              </td>
              {/* Exit cell turns red ONLY on a real failure. */}
              <td style={{ ...TD, ...MONO, color: r.verdict === 'failed' ? 'var(--pg-fail-text)' : 'var(--pg-text-muted)' }}>
                {r.code != null ? r.code : '—'}
              </td>
              <td style={{ ...TD, ...MONO }}>{r.evidence ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
