import * as React from 'react';
import { CodeBlock, type CodeBlockProps } from './CodeBlock.js';

export interface CopyableCodeBlockProps extends CodeBlockProps {
  /** Explicit clipboard payload; falls back to `children` when that is a
   * plain string. When neither yields a string, NO control renders — an
   * affordance with no payload is the defect this component exists to
   * delete (PRD-027 FR-9). */
  copyText?: string;
}

/**
 * The client half of the split renderer: wraps the server-safe `CodeBlock`
 * and lands a real copy button in its header slot. Ships from the
 * `@provegate/design/react/client` entry, whose built output carries the
 * `"use client"` directive (the bundle drops a source-level directive — the
 * banner is applied at build, and a test reads the built file).
 *
 * `navigator.clipboard` is guarded: absent (jsdom, insecure context) means
 * the click is a no-op, never a throw.
 */
export function CopyableCodeBlock({
  copyText,
  children,
  ...rest
}: CopyableCodeBlockProps): React.JSX.Element {
  const payload = copyText ?? (typeof children === 'string' ? children : null);

  const control =
    payload === null ? null : (
      <button
        type="button"
        aria-label="Copy command"
        onClick={() => {
          void navigator.clipboard?.writeText(payload).catch(() => {
            /* clipboard denied — the affordance stays honest by doing nothing loudly-visible
               rather than throwing; the operator row covers the real copy */
          });
        }}
        style={{
          background: 'transparent',
          border: '1px solid var(--pg-term-border)',
          borderRadius: 'var(--pg-radius-sm)',
          color: 'var(--pg-term-dim)',
          fontFamily: 'var(--pg-font-mono)',
          fontSize: '0.75rem',
          padding: '2px 8px',
          cursor: 'pointer',
        }}
      >
        copy
      </button>
    );

  return (
    <CodeBlock {...rest} headerControl={control}>
      {children}
    </CodeBlock>
  );
}
