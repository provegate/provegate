'use client';

import * as React from 'react';
import { Icon } from '@provegate/design/react';
import { Reveal } from './reveal';
import { SectionHead, mono, section, shell } from './ui';
import * as C from './content';

function FaqItem({ q, a, index }: { q: string; a: string; index: number }): React.JSX.Element {
  const [open, setOpen] = React.useState(false);
  const panelId = `pg-faq-panel-${index}`;
  const buttonId = `pg-faq-button-${index}`;
  return (
    <div style={{ borderBottom: '1px solid var(--pg-border)' }}>
      <button
        type="button"
        id={buttonId}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '18px 0',
          textAlign: 'left',
          color: 'var(--pg-text)',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            color: 'var(--pg-text-subtle)',
            display: 'inline-flex',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform var(--pg-dur-fast) var(--pg-ease)',
          }}
        >
          <Icon name="chevronRight" size={16} />
        </span>
        <span style={{ fontSize: 'var(--pg-text-md)', fontWeight: 500, flex: 1 }}>{q}</span>
      </button>
      <div id={panelId} role="region" aria-labelledby={buttonId} hidden={!open}>
        <p
          style={{
            margin: '0 0 18px 30px',
            fontSize: 'var(--pg-text-base)',
            lineHeight: 'var(--pg-leading-relaxed)',
            color: 'var(--pg-text-muted)',
            textWrap: 'pretty',
          }}
        >
          {a}
        </p>
      </div>
    </div>
  );
}

/** Quickstart beside the FAQ — four steps on the left, honest answers on the right. */
export function FaqAndQuickstart(): React.JSX.Element {
  return (
    <section id="faq" style={{ ...shell, ...section }}>
      <div
        className="pg-faq-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '0.9fr 1.1fr',
          gap: 56,
          alignItems: 'start',
        }}
      >
        <div>
          <SectionHead eyebrow="// quickstart" title="Green in four steps." />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {C.QUICKSTART.map((s, i) => (
              <Reveal key={s.t}>
                <div
                  style={{
                    display: 'flex',
                    gap: 16,
                    padding: '14px 0',
                    borderBottom:
                      i < C.QUICKSTART.length - 1 ? '1px solid var(--pg-border)' : 'none',
                  }}
                >
                  <span
                    style={{
                      flex: 'none',
                      width: 30,
                      height: 30,
                      borderRadius: 'var(--pg-radius-pill)',
                      border: '1px solid var(--pg-border-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ...mono,
                      fontSize: 'var(--pg-text-sm)',
                      color: 'var(--pg-text-muted)',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--pg-text-base)',
                        fontWeight: 600,
                        color: 'var(--pg-text)',
                        fontFamily: s.t.startsWith('gate ') ? 'var(--pg-font-mono)' : 'inherit',
                      }}
                    >
                      {s.t}
                    </div>
                    <p
                      style={{
                        margin: '4px 0 0',
                        fontSize: 'var(--pg-text-sm)',
                        lineHeight: 'var(--pg-leading-normal)',
                        color: 'var(--pg-text-muted)',
                      }}
                    >
                      {s.d}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        <div>
          <SectionHead eyebrow="// faq" title="Honest answers." />
          <div>
            {C.FAQS.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
