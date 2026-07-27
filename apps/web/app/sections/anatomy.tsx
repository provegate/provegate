'use client';

import * as React from 'react';
import { Reveal } from './reveal';
import { SectionHead, band, mono, section, shell, terminal } from './ui';
import * as C from './content';

const TONE: Record<'pass' | 'fg' | 'dim', string> = {
  pass: 'var(--pg-term-green)',
  fg: 'var(--pg-term-fg)',
  dim: 'var(--pg-term-dim)',
};

/**
 * One `gate run` status line, taken apart. The grammar is the shipped one from
 * `@provegate/design/cli`: `<glyph> phase N · <name> · <detail> · <verdict>`.
 * Hovering a segment or focusing its card highlights the pair, so the section
 * is usable from the keyboard and not only with a pointer.
 */
export function Anatomy(): React.JSX.Element {
  const [active, setActive] = React.useState<string | null>(null);

  return (
    <section id="anatomy" style={band}>
      <div style={{ ...shell, ...section }}>
        <SectionHead
          eyebrow="// anatomy of a gate"
          title="One line, and nothing hidden."
          center
          sub="This is a single line of gate run output. Every part is evidence a machine produced — the glyph carries the status on its own, so the line survives NO_COLOR."
        />
        <Reveal>
          <div
            style={{
              ...terminal,
              maxWidth: 720,
              margin: '0 auto',
              padding: '34px 28px',
              boxShadow: 'var(--pg-shadow-md)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                flexWrap: 'wrap',
                ...mono,
                fontSize: 'var(--pg-text-md)',
                color: 'var(--pg-term-fg)',
              }}
            >
              {C.ANATOMY_PARTS.map((p, i) => (
                <React.Fragment key={p.seg}>
                  {i > 0 ? <span style={{ color: 'var(--pg-term-dim)' }}>·</span> : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(p.seg)}
                    onMouseLeave={() => setActive(null)}
                    onFocus={() => setActive(p.seg)}
                    onBlur={() => setActive(null)}
                    aria-describedby={`pg-anatomy-${p.seg}`}
                    style={{
                      font: 'inherit',
                      color: TONE[p.tone],
                      border: 'none',
                      cursor: 'default',
                      padding: '2px 4px',
                      borderRadius: 'var(--pg-radius-sm)',
                      background:
                        active === p.seg ? 'color-mix(in srgb, var(--pg-human) 22%, transparent)' : 'transparent',
                      transition: 'background var(--pg-dur-fast) var(--pg-ease)',
                    }}
                  >
                    {p.text}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
        </Reveal>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            maxWidth: 900,
            margin: '22px auto 0',
          }}
        >
          {C.ANATOMY_PARTS.map((p) => (
            <button
              key={p.seg}
              type="button"
              id={`pg-anatomy-${p.seg}`}
              onMouseEnter={() => setActive(p.seg)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(p.seg)}
              onBlur={() => setActive(null)}
              style={{
                textAlign: 'left',
                cursor: 'default',
                background: 'var(--pg-surface)',
                border: `1px solid ${active === p.seg ? 'var(--pg-human)' : 'var(--pg-border)'}`,
                borderRadius: 'var(--pg-radius-md)',
                padding: '13px 15px',
                transition: 'border-color var(--pg-dur-fast) var(--pg-ease)',
              }}
            >
              <div style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text)', marginBottom: 4 }}>
                {p.seg}
              </div>
              <div
                style={{
                  fontSize: 'var(--pg-text-sm)',
                  lineHeight: 'var(--pg-leading-normal)',
                  color: 'var(--pg-text-muted)',
                }}
              >
                {p.desc}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
