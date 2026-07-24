import * as React from 'react';

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  filename?: string;
  lang?: string;
  prompt?: boolean;
  copyable?: boolean;
}

/** Always-dark terminal code/command block — the terminal surface is its own
 * panel regardless of theme. Evidence is monospace. `copyable` renders a copy
 * affordance; the actual clipboard wiring is the consumer's (kept dependency-
 * and side-effect-free here). */
export function CodeBlock({
  children,
  filename,
  lang,
  prompt = false,
  copyable = false,
  className = '',
  style = {},
  ...rest
}: CodeBlockProps): React.JSX.Element {
  return (
    <div
      className={`pg-codeblock ${className}`}
      data-lang={lang}
      style={{
        background: 'var(--pg-term-bg)',
        border: '1px solid var(--pg-term-border)',
        borderRadius: 'var(--pg-radius-md)',
        overflow: 'hidden',
        ...style,
      }}
      {...rest}
    >
      {filename || copyable ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 14px',
            borderBottom: '1px solid var(--pg-term-border)',
            fontFamily: 'var(--pg-font-mono)',
            fontSize: '0.75rem',
            color: 'var(--pg-term-dim)',
          }}
        >
          <span>{filename}</span>
          {copyable ? (
            <span aria-hidden="true" style={{ color: 'var(--pg-term-dim)' }}>
              copy
            </span>
          ) : null}
        </div>
      ) : null}
      <pre
        style={{
          margin: 0,
          padding: '14px 16px',
          fontFamily: 'var(--pg-font-mono)',
          fontSize: '0.8125rem',
          lineHeight: 1.75,
          color: 'var(--pg-term-fg)',
          overflowX: 'auto',
          whiteSpace: 'pre',
        }}
      >
        {prompt ? <span style={{ color: 'var(--pg-term-dim)' }}>$ </span> : null}
        {children}
      </pre>
    </div>
  );
}
