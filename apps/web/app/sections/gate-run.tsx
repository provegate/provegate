'use client';

import * as React from 'react';
import { GateLine } from '@provegate/design/react';
import { TermBar, mono, prefersReducedMotion, termButton, terminal } from './ui';
import * as C from './content';

/**
 * `gate run`, staged one status line at a time when it scrolls into view, with
 * a replay control. Under reduced motion the whole run renders at once. The
 * lines are the real tool's, not a simulation — the stagger is presentation.
 */
export function GateRun(): React.JSX.Element {
  const [shown, setShown] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);
  const started = React.useRef(false);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  const run = React.useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
    if (prefersReducedMotion()) {
      setShown(C.RUN_LINES.length);
      return;
    }
    setShown(0);
    C.RUN_LINES.forEach((_, i) => {
      timers.current.push(setTimeout(() => setShown(i + 1), 420 * (i + 1)));
    });
  }, []);

  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(C.RUN_LINES.length);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started.current) {
            started.current = true;
            run();
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      for (const t of timers.current) clearTimeout(t);
    };
  }, [run]);

  return (
    <div ref={ref} style={{ ...terminal, boxShadow: 'var(--pg-shadow-md)' }}>
      <TermBar title="gate run — PRD-001">
        <button type="button" onClick={run} aria-label="Replay the gate run" style={termButton}>
          replay
        </button>
      </TermBar>
      <div style={{ padding: '16px 18px', ...mono, fontSize: 'var(--pg-text-sm)', minHeight: 214 }}>
        <div style={{ color: 'var(--pg-term-green)', marginBottom: 10 }}>$ gate run PRD-001</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {C.RUN_LINES.slice(0, shown).map((r) => (
            <GateLine
              key={r.name}
              bare
              status={r.status}
              name={r.name}
              command={r.command}
              code={r.code}
            />
          ))}
        </div>
        {shown >= C.RUN_LINES.length ? (
          <div
            style={{
              marginTop: 14,
              paddingTop: 12,
              borderTop: '1px dotted var(--pg-term-border)',
              fontSize: 'var(--pg-text-sm)',
            }}
          >
            <div style={{ color: 'var(--pg-term-green)' }}>{C.RUN_SUMMARY.earned}</div>
            <div style={{ color: 'var(--pg-term-human)' }}>{C.RUN_SUMMARY.human}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
