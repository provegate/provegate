'use client';

import * as React from 'react';
import { Icon } from '@provegate/design/react';
import { Reveal } from './reveal';
import { SectionHead, mono, section, shell } from './ui';
import * as C from './content';

/**
 * The seven phases plus the push, one at a time. Human authority is pill-shaped
 * and human-blue; machine authority is square and neutral — the same authority
 * grammar the CLI's phase pipeline uses. Never green: selecting a chip is not
 * evidence.
 */
export function PhaseDetail(): React.JSX.Element {
  const [selected, setSelected] = React.useState<number | string>(5);
  const current = C.PHASE_DETAIL.find((p) => p.n === selected) ?? C.PHASE_DETAIL[0];
  const human = current.authority === 'human';
  const tone = human ? 'var(--pg-human)' : 'var(--pg-text-muted)';

  return (
    <section id="phases" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// the seven phases"
        title="Every phase, and who owns it."
        sub="Select a phase to see what happens and who decides. A human owns 1–3 and the push; the agent works 4–7 — and earns nothing without evidence."
      />
      <Reveal>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {C.PHASE_DETAIL.map((p) => {
            const active = p.n === selected;
            const isHuman = p.authority === 'human';
            const chipTone = isHuman ? 'var(--pg-human)' : 'var(--pg-text-muted)';
            return (
              <button
                key={String(p.n)}
                type="button"
                onClick={() => setSelected(p.n)}
                aria-pressed={active}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  background: active
                    ? isHuman
                      ? 'var(--pg-human-bg)'
                      : 'var(--pg-bg-subtle)'
                    : 'transparent',
                  border: `1px solid ${active ? chipTone : 'var(--pg-border)'}`,
                  borderRadius: isHuman ? 'var(--pg-radius-pill)' : 'var(--pg-radius-md)',
                  padding: '7px 13px',
                  color: active ? 'var(--pg-text)' : 'var(--pg-text-muted)',
                  fontFamily: 'var(--pg-font-sans)',
                  fontSize: 'var(--pg-text-sm)',
                  fontWeight: active ? 600 : 500,
                }}
              >
                <span style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: chipTone }}>
                  {p.n}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
        <div
          className="pg-phasedetail"
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 22,
            alignItems: 'start',
            background: 'var(--pg-surface)',
            border: '1px solid var(--pg-border)',
            borderRadius: 'var(--pg-radius-lg)',
            padding: 26,
          }}
        >
          <div
            style={{
              width: 58,
              height: 58,
              flex: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1.5px solid ${tone}`,
              color: tone,
              background: human ? 'var(--pg-human-bg)' : 'var(--pg-bg-subtle)',
              borderRadius: human ? 'var(--pg-radius-pill)' : 'var(--pg-radius-md)',
            }}
          >
            <Icon name={human ? 'human' : 'machine'} size={26} />
          </div>
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 8,
                flexWrap: 'wrap',
              }}
            >
              <h3
                style={{
                  fontSize: 'var(--pg-text-xl)',
                  fontWeight: 600,
                  margin: 0,
                  color: 'var(--pg-text)',
                  letterSpacing: 'var(--pg-tracking-tight)',
                }}
              >
                {current.label}
              </h3>
              <span
                style={{
                  ...mono,
                  fontSize: 'var(--pg-text-xs)',
                  letterSpacing: 'var(--pg-tracking-caps)',
                  textTransform: 'uppercase',
                  color: tone,
                  border: `1px solid color-mix(in srgb, ${tone} 40%, transparent)`,
                  borderRadius: 'var(--pg-radius-sm)',
                  padding: '2px 8px',
                }}
              >
                {human ? 'human gate' : 'machine gate'} · {current.who}
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: 'var(--pg-text-md)',
                lineHeight: 'var(--pg-leading-relaxed)',
                color: 'var(--pg-text-muted)',
                textWrap: 'pretty',
              }}
            >
              {current.body}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
