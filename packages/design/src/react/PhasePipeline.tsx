import * as React from 'react';

export interface Phase {
  n: number | string;
  label: string;
  authority: 'human' | 'machine';
}

export interface PhasePipelineProps extends React.HTMLAttributes<HTMLDivElement> {
  phases?: Phase[];
  showPush?: boolean;
  active?: number | string;
}

/** Canonical seven phases: humans own intent (1–3), the machine owns the
 * verified middle (4–7), push is always the human boundary. Callers should pass
 * an explicit `phases`; this default matches the method. */
const DEFAULT_PHASES: Phase[] = [
  { n: 1, label: 'PRD', authority: 'human' },
  { n: 2, label: 'Readiness', authority: 'human' },
  { n: 3, label: 'Tasks', authority: 'human' },
  { n: 4, label: 'Implement', authority: 'machine' },
  { n: 5, label: 'Test', authority: 'machine' },
  { n: 6, label: 'Audit', authority: 'machine' },
  { n: 7, label: 'Learn', authority: 'machine' },
];

function node(p: Phase, isActive: boolean): React.JSX.Element {
  const human = p.authority === 'human';
  return (
    <div
      key={String(p.n)}
      aria-current={isActive ? 'step' : undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        flex: '1 1 0',
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          fontFamily: 'var(--pg-font-mono)',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: human ? 'var(--pg-human-text)' : 'var(--pg-text-muted)',
          background: isActive ? 'var(--pg-bg-subtle)' : 'transparent',
          // Human gates read as pills (person decides); machine gates as squares.
          border: `1.5px solid ${human ? 'var(--pg-human)' : 'var(--pg-border-strong)'}`,
          borderRadius: human ? 'var(--pg-radius-pill)' : 'var(--pg-radius-sm)',
        }}
      >
        {p.n}
      </div>
      <span
        style={{
          fontFamily: 'var(--pg-font-sans)',
          fontSize: '0.75rem',
          color: 'var(--pg-text-muted)',
          textAlign: 'center',
        }}
      >
        {p.label}
      </span>
    </div>
  );
}

export function PhasePipeline({
  phases = DEFAULT_PHASES,
  showPush = true,
  active,
  className = '',
  style = {},
  ...rest
}: PhasePipelineProps): React.JSX.Element {
  return (
    <div
      className={`pg-pipeline ${className}`}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 4,
        fontFamily: 'var(--pg-font-sans)',
        ...style,
      }}
      {...rest}
    >
      {phases.map((p) => node(p, p.n === active))}
      {/* The push node highlights when active is 'push' (its canonical name) or
          '→' (its rendered symbol) — per the contract, `active` may be 'push'. */}
      {showPush
        ? node(
            { n: '→', label: 'Push (you)', authority: 'human' },
            active === 'push' || active === '→',
          )
        : null}
    </div>
  );
}
