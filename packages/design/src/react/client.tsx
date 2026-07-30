import * as React from 'react';
import { Button } from './Button.js';
import { CodeBlockBase, type CodeBlockProps } from './CodeBlock.js';

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
    <CodeBlockBase {...rest} headerControl={control}>
      {children}
    </CodeBlockBase>
  );
}

export type ConsentStatus = 'unset' | 'granted' | 'denied';

const CONSENT_EVENT = 'pg-consent-change';

/** In-memory fallback so a private-mode visitor's choice still applies for the
 * visit even when localStorage throws — it just doesn't persist. */
let memoryConsent: ConsentStatus = 'unset';

function readStored(storageKey: string): ConsentStatus {
  try {
    const v = window.localStorage.getItem(storageKey);
    // A readable store is authoritative — the memory fallback speaks only
    // when localStorage throws, else a cleared store would resurrect it.
    return v === 'granted' || v === 'denied' ? v : 'unset';
  } catch {
    return memoryConsent;
  }
}

export interface ConsentControls {
  /** `null` until the stored choice has been read on the client — render
   * nothing in that window so a returning visitor never sees a flash. */
  status: ConsentStatus | null;
  grant: () => void;
  deny: () => void;
  /** Withdraw: clears the stored choice and reopens the banner. GDPR requires
   * withdrawal to be as easy as consent — give this a permanent surface. */
  reset: () => void;
}

/** Consent state shared across every consumer on the page (banner, analytics
 * loader, footer control) — writes broadcast an event, and the `storage`
 * listener keeps other tabs in step. */
export function useConsent(storageKey = 'pg-consent'): ConsentControls {
  const [status, setStatus] = React.useState<ConsentStatus | null>(null);
  React.useEffect(() => {
    const sync = (): void => setStatus(readStored(storageKey));
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CONSENT_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [storageKey]);
  const write = React.useCallback(
    (value: ConsentStatus): void => {
      memoryConsent = value;
      try {
        if (value === 'unset') window.localStorage.removeItem(storageKey);
        else window.localStorage.setItem(storageKey, value);
      } catch {
        /* private mode: memoryConsent carries the choice for this visit */
      }
      window.dispatchEvent(new Event(CONSENT_EVENT));
    },
    [storageKey],
  );
  return {
    status,
    grant: React.useCallback(() => write('granted'), [write]),
    deny: React.useCallback(() => write('denied'), [write]),
    reset: React.useCallback(() => write('unset'), [write]),
  };
}

export interface ConsentBannerProps {
  status: ConsentStatus | null;
  onAllow: () => void;
  onDecline: () => void;
  /** Overrides the default Google Analytics sentence. */
  message?: React.ReactNode;
}

/**
 * A quiet consent card: bottom-left, non-modal, no overlay, no animation —
 * the page stays fully usable and ignoring it means no consent, so nothing
 * loads. Decline sits beside Allow at the same size (an uneven pair is the
 * dark pattern GDPR names). Renders only while no choice is stored.
 */
export function ConsentBanner({
  status,
  onAllow,
  onDecline,
  message,
}: ConsentBannerProps): React.JSX.Element | null {
  if (status !== 'unset') return null;
  return (
    <section
      aria-label="Cookie consent"
      style={{
        position: 'fixed',
        left: 16,
        right: 16,
        bottom: 16,
        zIndex: 40,
        maxWidth: 380,
        background: 'var(--pg-surface)',
        border: '1px solid var(--pg-border-strong)',
        borderRadius: 'var(--pg-radius-lg)',
        boxShadow: 'var(--pg-shadow-lg)',
        padding: '16px 18px',
        fontFamily: 'var(--pg-font-sans)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--pg-font-mono)',
          fontSize: 'var(--pg-text-xs)',
          letterSpacing: 'var(--pg-tracking-caps)',
          textTransform: 'uppercase',
          color: 'var(--pg-text-subtle)',
          marginBottom: 8,
        }}
      >
        {'// cookies'}
      </div>
      <p
        style={{
          margin: '0 0 12px',
          fontSize: 'var(--pg-text-sm)',
          color: 'var(--pg-text)',
          lineHeight: 'var(--pg-leading-normal)',
        }}
      >
        {message ??
          'Google Analytics runs only if you allow it. Nothing loads and no cookie is set before you choose.'}
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <Button size="sm" onClick={onAllow}>
          Allow
        </Button>
        <Button size="sm" variant="secondary" onClick={onDecline}>
          Decline
        </Button>
      </div>
    </section>
  );
}
