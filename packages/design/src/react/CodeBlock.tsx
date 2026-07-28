import * as React from 'react';

export interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  filename?: string;
  lang?: string;
  prompt?: boolean;
}

/** INTERNAL. The header slot exists only for `CopyableCodeBlock` (the client
 * entry), which is the one consumer allowed to put a control there — a PUBLIC
 * slot would let any caller render a handlerless "copy" affordance, which is
 * exactly the defect FR-9 deletes. Not re-exported from the barrel; the
 * type-level deny test holds the public surface closed. */
export interface InternalCodeBlockProps extends CodeBlockProps {
  headerControl?: React.ReactNode;
}

/** Always-dark terminal code/command block — the terminal surface is its own
 * panel regardless of theme. Evidence is monospace. This is the SERVER-SAFE
 * renderer: no hooks, no handlers, importable from server components and
 * Fumadocs' MDX pipeline. A copy control is a client capability and lives in
 * `@provegate/design/react/client` (`CopyableCodeBlock`) — this component
 * deliberately has no `copyable` prop, so a copy affordance can never render
 * without the handler behind it (PRD-027 FR-9). */
export function CodeBlockBase({
  children,
  filename,
  lang,
  prompt = false,
  headerControl,
  className = '',
  style = {},
  ...rest
}: InternalCodeBlockProps): React.JSX.Element {
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
      {filename || headerControl ? (
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
          {headerControl ?? null}
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

/** The public server-safe renderer: no copy affordance, no header slot. The
 * explicit `headerControl={undefined}` AFTER the spread is load-bearing: a
 * JS caller (or a structural spread) could otherwise smuggle the internal
 * slot through the public surface — Codex round 2 reproduced exactly that
 * against the built barrel. */
export function CodeBlock(props: CodeBlockProps): React.JSX.Element {
  return <CodeBlockBase {...props} headerControl={undefined} />;
}
