import * as React from 'react';

export type AdmonitionType = 'note' | 'tip' | 'warning' | 'pass' | 'fail' | 'human';

// Colour law: `pass` is the only green callout (earned), `fail` red, `human`
// blue; note/tip/warning are neutral/amber informational.
const MAP: Record<AdmonitionType, { rule: string; bg: string; label: string }> = {
  note: { rule: 'var(--pg-border-strong)', bg: 'var(--pg-bg-subtle)', label: 'Note' },
  tip: { rule: 'var(--pg-human)', bg: 'var(--pg-human-bg)', label: 'Tip' },
  warning: { rule: 'var(--pg-warn)', bg: 'var(--pg-warn-bg)', label: 'Warning' },
  pass: { rule: 'var(--pg-pass)', bg: 'var(--pg-pass-bg)', label: 'Passed' },
  fail: { rule: 'var(--pg-fail)', bg: 'var(--pg-fail-bg)', label: 'Failed' },
  human: { rule: 'var(--pg-human)', bg: 'var(--pg-human-bg)', label: 'Human' },
};

export interface AdmonitionProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: AdmonitionType;
  title?: string;
  children?: React.ReactNode;
}

export function Admonition({
  type = 'note',
  title,
  children,
  className = '',
  style = {},
  ...rest
}: AdmonitionProps): React.JSX.Element {
  const m = MAP[type];
  return (
    <div
      className={`pg-admonition pg-admonition--${type} ${className}`}
      style={{
        borderLeft: `3px solid ${m.rule}`,
        background: m.bg,
        borderRadius: 'var(--pg-radius-sm)',
        padding: '12px 16px',
        fontFamily: 'var(--pg-font-sans)',
        fontSize: '0.9375rem',
        lineHeight: 1.55,
        color: 'var(--pg-text)',
        ...style,
      }}
      {...rest}
    >
      <div
        style={{
          fontWeight: 600,
          fontSize: '0.8125rem',
          letterSpacing: '0.02em',
          marginBottom: children ? 4 : 0,
          color: 'var(--pg-text-muted)',
        }}
      >
        {title ?? m.label}
      </div>
      {children}
    </div>
  );
}
