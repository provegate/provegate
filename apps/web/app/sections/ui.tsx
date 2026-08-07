/**
 * Page-local layout helpers shared by every section. No colour, font, radius or
 * shadow is authored here — each one resolves to a `--pg-*` token from
 * `@provegate/design` (a test asserts no raw hex reaches this app).
 *
 * These are plain, hook-free components, so they render on the server and are
 * equally importable from the client sections.
 */
import * as React from 'react';
import { PRODUCT_NAME_PARTS } from './content';

/** Container: `--pg-container` wide, 28px gutters (design brief responsive rule). */
export const shell: React.CSSProperties = {
  maxWidth: 'var(--pg-container)',
  margin: '0 auto',
  padding: '0 28px',
};

/** The standard vertical rhythm between sections. */
export const section: React.CSSProperties = { padding: '84px 28px' };

/** A full-bleed tinted band with hairline rules top and bottom. */
export const band: React.CSSProperties = {
  background: 'var(--pg-bg-subtle)',
  borderTop: '1px solid var(--pg-border)',
  borderBottom: '1px solid var(--pg-border)',
};

export const mono: React.CSSProperties = { fontFamily: 'var(--pg-font-mono)' };

/** Terminal chrome — always dark, whatever the page theme (colour law). */
export const terminal: React.CSSProperties = {
  background: 'var(--pg-term-bg)',
  border: '1px solid var(--pg-term-border)',
  borderRadius: 'var(--pg-radius-lg)',
  overflow: 'hidden',
};

/** A flat card on the page surface. */
export const card: React.CSSProperties = {
  background: 'var(--pg-surface)',
  border: '1px solid var(--pg-border)',
  borderRadius: 'var(--pg-radius-lg)',
  padding: '26px 24px',
  height: '100%',
};

export const eyebrowStyle: React.CSSProperties = {
  ...mono,
  fontSize: 'var(--pg-text-xs)',
  letterSpacing: 'var(--pg-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--pg-text-subtle)',
  margin: '0 0 14px',
};

/**
 * Fluid display sizes. The token scale is a fixed ladder (4xl is 64px), which
 * is right on a desktop and far too large on a phone — an unclamped hero fills
 * the whole first screen. Each clamp runs BETWEEN two steps of the same ladder,
 * so both endpoints stay on-scale and no size is invented here.
 */
export const fluid = {
  /** Hero h1: 2xl → 4xl. */
  display: 'clamp(var(--pg-text-2xl), 5.4vw, var(--pg-text-4xl))',
  /** Section h2: xl → 2xl. */
  heading: 'clamp(var(--pg-text-xl), 3.4vw, var(--pg-text-2xl))',
  /** Band statements (core rule, refusal, positioning): lg → 2xl. */
  statement: 'clamp(var(--pg-text-lg), 2.7vw, var(--pg-text-2xl))',
  /** Proof figures: 2xl → 3xl. */
  stat: 'clamp(var(--pg-text-2xl), 4vw, var(--pg-text-3xl))',
};

export const lede: React.CSSProperties = {
  fontSize: 'var(--pg-text-md)',
  color: 'var(--pg-text-muted)',
  lineHeight: 'var(--pg-leading-relaxed)',
};

export function Eyebrow({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <p style={eyebrowStyle}>{children}</p>;
}

/**
 * Section header: eyebrow, balanced h2 and an optional lede. `center` narrows
 * and centres the block for the full-bleed bands.
 */
export function SectionHead({
  eyebrow,
  title,
  sub,
  center = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  center?: boolean;
}): React.JSX.Element {
  return (
    <div
      style={{
        marginBottom: 34,
        maxWidth: center ? 640 : 720,
        marginLeft: center ? 'auto' : 0,
        marginRight: center ? 'auto' : 0,
        textAlign: center ? 'center' : 'left',
      }}
    >
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2
        style={{
          fontSize: fluid.heading,
          fontWeight: 600,
          letterSpacing: 'var(--pg-tracking-tight)',
          lineHeight: 'var(--pg-leading-tight)',
          margin: 0,
          color: 'var(--pg-text)',
          textWrap: 'balance',
        }}
      >
        {title}
      </h2>
      {sub ? (
        <p style={{ ...lede, marginTop: 14, marginBottom: 0, textWrap: 'pretty' }}>{sub}</p>
      ) : null}
    </div>
  );
}

/** The gate mark: two posts and a check. Accent-toned, never green. */
export function Mark({ size = 26 }: { size?: number }): React.JSX.Element {
  return (
    <span style={{ color: 'var(--pg-accent)', display: 'inline-flex' }} aria-hidden="true">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <path d="M7 5 L7 27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M25 5 L25 27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
        <path
          d="M11 15.5 L14.5 19.5 L21.5 11"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/** Wordmark — CamelCase in prose; the binary stays lowercase in commands. */
export function Wordmark({ size = 'var(--pg-text-lg)' }: { size?: string }): React.JSX.Element {
  return (
    <span
      style={{
        fontWeight: 700,
        fontSize: size,
        letterSpacing: 'var(--pg-tracking-tight)',
        color: 'var(--pg-text)',
      }}
    >
      {PRODUCT_NAME_PARTS[0]}
      <span style={{ color: 'var(--pg-accent)' }}>{PRODUCT_NAME_PARTS[1]}</span>
    </span>
  );
}

/** The three window dots on a terminal chrome bar. Tokened, never hex. */
export function TermDots(): React.JSX.Element {
  return (
    <span style={{ display: 'flex', gap: 6 }} aria-hidden="true">
      {['var(--pg-red-500)', 'var(--pg-amber-500)', 'var(--pg-green-500)'].map((c) => (
        <span
          key={c}
          style={{
            width: 10,
            height: 10,
            borderRadius: 'var(--pg-radius-pill)',
            background: c,
            opacity: 0.85,
          }}
        />
      ))}
    </span>
  );
}

/** Terminal chrome bar: dots, a title, and optional trailing controls. */
export function TermBar({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}): React.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 15px',
        borderBottom: '1px solid var(--pg-term-border)',
      }}
    >
      <TermDots />
      <span
        style={{
          ...mono,
          fontSize: 'var(--pg-text-xs)',
          color: 'var(--pg-term-dim)',
          marginLeft: 6,
        }}
      >
        {title}
      </span>
      {children}
    </div>
  );
}

/** A small terminal-chrome button (replay, reset) — dim, hairline, mono. */
export const termButton: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'transparent',
  border: '1px solid var(--pg-term-border)',
  borderRadius: 'var(--pg-radius-sm)',
  color: 'var(--pg-term-dim)',
  fontFamily: 'var(--pg-font-mono)',
  fontSize: 'var(--pg-text-xs)',
  padding: '3px 9px',
  cursor: 'pointer',
};

/**
 * True when motion should be suppressed. If the preference cannot be read at
 * all — server render, or a host without `matchMedia` — the answer is TRUE:
 * an environment we cannot ask gets the finished state, never an animation it
 * never asked for. Real browsers always answer, so this only decides the
 * pre-hydration and test cases.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
