'use client';

import * as React from 'react';
import { GateLine } from '@provegate/design/react';
import { TermBar, mono, prefersReducedMotion, terminal, termButton } from './ui';
import * as C from './content';

/** Types `steps[line]` a character at a time, then advances. Inert when paused. */
function useTyping(
  steps: readonly string[],
  active: boolean,
): { line: number; typed: string; finished: boolean } {
  const [line, setLine] = React.useState(0);
  const [col, setCol] = React.useState(0);

  React.useEffect(() => {
    if (!active || line >= steps.length) return;
    const full = steps[line] ?? '';
    if (col < full.length) {
      const t = setTimeout(() => setCol((c) => c + 1), 45);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setLine((l) => l + 1);
      setCol(0);
    }, 520);
    return () => clearTimeout(t);
  }, [line, col, active, steps]);

  return { line, typed: (steps[line] ?? '').slice(0, col), finished: line >= steps.length };
}

/**
 * The hero terminal. Typing starts when the block scrolls into view, and under
 * `prefers-reduced-motion: reduce` the finished state renders immediately —
 * no typing, no caret blink (the caret animation is CSS-gated too).
 */
export function HeroTerminal(): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const [visible, setVisible] = React.useState(false);
  const [reduced, setReduced] = React.useState(true);

  React.useEffect(() => {
    setReduced(prefersReducedMotion());
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const steps = C.HERO_TERMINAL.steps;
  const { line, typed, finished } = useTyping(steps, visible && !reduced);
  const settled = reduced ? steps.length : line;
  const done = reduced || finished;

  return (
    <div
      ref={ref}
      style={{
        ...terminal,
        borderRadius: 'var(--pg-radius-md)',
        boxShadow: 'var(--pg-shadow-md)',
        ...mono,
      }}
    >
      <TermBar title={C.HERO_TERMINAL.title}>
        {/* PRD-027 FR-2: the first action, copy-ready from the first screen. The
            payload is the real install constant — never a second literal — and
            the control is live before the typing animation settles (it renders
            with the chrome, not with the finished state). Clipboard guarded:
            absent (jsdom, insecure context) means no-op, never a throw. */}
        <button
          type="button"
          aria-label="Copy install command"
          style={termButton}
          onClick={() => {
            void navigator.clipboard?.writeText(C.HERO.install).catch(() => {
              /* clipboard denied — operator row covers the real copy */
            });
          }}
        >
          copy
        </button>
      </TermBar>
      <div
        style={{
          padding: '15px 16px',
          fontSize: 'var(--pg-text-sm)',
          lineHeight: 'var(--pg-leading-relaxed)',
          minHeight: 188,
        }}
      >
        {steps.map((step, i) => {
          if (i > settled) return null;
          const current = !reduced && i === line && !finished;
          const echo = C.HERO_TERMINAL.echoes[i];
          return (
            <div key={step}>
              <div>
                <span style={{ color: 'var(--pg-term-green)', userSelect: 'none' }}>$ </span>
                <span style={{ color: 'var(--pg-term-fg)' }}>{current ? typed : step}</span>
                {current ? (
                  <span
                    className="pg-caret"
                    style={{ color: 'var(--pg-term-fg)' }}
                    aria-hidden="true"
                  >
                    █
                  </span>
                ) : null}
              </div>
              {i < settled && echo ? (
                <div style={{ color: 'var(--pg-term-dim)', paddingLeft: 14 }}>{echo}</div>
              ) : null}
            </div>
          );
        })}
        {done ? (
          <div style={{ marginTop: 6 }}>
            {C.HERO_TERMINAL.gates.map((g) => (
              <GateLine
                key={g.command}
                bare
                status="passed"
                name={g.name}
                command={g.command}
                code={g.code}
              />
            ))}
            <div style={{ marginTop: 8, color: 'var(--pg-term-green)' }}>
              {C.HERO_TERMINAL.earned}
            </div>
            <div style={{ color: 'var(--pg-term-human)' }}>{C.HERO_TERMINAL.human}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
