import type { Metadata } from 'next';
import * as React from 'react';
import { Icon, PhasePipeline } from '@provegate/design/react';
import {
  COMMANDS,
  CORE_RULE,
  CTA,
  PRODUCT_NAME,
  FEATURES,
  HERO,
  LINKS,
  OPERATOR_FLOW,
  PHASES,
  PHASE_DETAIL,
  PRINCIPLES,
  PROOF_STATS,
  QUICKSTART,
  REFUSAL,
  RUN_LINES,
  RUN_SUMMARY,
} from '../sections/content';
import { Mark, TermDots, Wordmark, fluid, mono, shell, terminal } from '../sections/ui';
import './alt.css';

/**
 * /alt — an alternative landing concept: denser, terminal-forward, docs-style.
 * Same facts as the main page (all copy comes from sections/content.ts), a
 * different reading rhythm: install and evidence first, narrative later.
 */

// PRD-027 FR-8: /alt stops competing with / in search AND in unfurls. The
// `openGraph` declaration REPLACES the resolved parent object wholesale
// (resolve-metadata.js:182-190), so declaring title+description with NO
// `images` key drops the card app/opengraph-image.tsx would otherwise thread
// down the segment chain — and the card TYPE goes with the image:
// `summary_large_image` without an image is FR-1's defect one route over.
export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — alternative landing concept`,
  description:
    'An alternative landing concept for internal comparison — denser, terminal-forward, docs-style. Not the product page.',
  robots: { index: false, follow: false },
  openGraph: {
    title: `${PRODUCT_NAME} — alternative landing concept`,
    description:
      'An alternative landing concept for internal comparison — denser, terminal-forward, docs-style. Not the product page.',
  },
  twitter: { card: 'summary' },
};

const muted: React.CSSProperties = { color: 'var(--pg-text-muted)' };
const subtle: React.CSSProperties = { color: 'var(--pg-text-subtle)' };

const card: React.CSSProperties = {
  background: 'var(--pg-surface)',
  border: '1px solid var(--pg-border)',
  borderRadius: 'var(--pg-radius-lg)',
  padding: '22px 22px',
  height: '100%',
};

const eyebrow: React.CSSProperties = {
  ...mono,
  fontSize: 'var(--pg-text-xs)',
  letterSpacing: 'var(--pg-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--pg-text-subtle)',
  margin: '0 0 14px',
};

const h2: React.CSSProperties = {
  fontSize: fluid.heading,
  fontWeight: 600,
  letterSpacing: 'var(--pg-tracking-tight)',
  lineHeight: 'var(--pg-leading-tight)',
  margin: 0,
  textWrap: 'balance',
};

const primaryBtn: React.CSSProperties = {
  ...mono,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 'var(--pg-text-sm)',
  fontWeight: 'var(--pg-fw-semibold)',
  color: 'var(--pg-accent-contrast)',
  background: 'var(--pg-accent)',
  borderRadius: 'var(--pg-radius-md)',
  padding: '11px 18px',
};

const ghostBtn: React.CSSProperties = {
  ...mono,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  fontSize: 'var(--pg-text-sm)',
  color: 'var(--pg-text)',
  border: '1px solid var(--pg-border-strong)',
  borderRadius: 'var(--pg-radius-md)',
  padding: '11px 18px',
};

function Nav(): React.JSX.Element {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'color-mix(in srgb, var(--pg-bg) 82%, transparent)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={{ ...shell, display: 'flex', alignItems: 'center', gap: 22, height: 58 }}>
        <a
          href="/alt"
          aria-label="ProveGate — alt landing"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 9 }}
        >
          <Mark size={20} />
          <Wordmark size="var(--pg-text-base)" />
        </a>
        <nav className="alt-navlinks" style={{ marginLeft: 12 }} aria-label="Sections">
          {[
            ['Features', '#features'],
            ['Pipeline', '#pipeline'],
            ['Commands', '#commands'],
            ['Proof', '#proof'],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-muted)' }}
            >
              {label}
            </a>
          ))}
        </nav>
        <a href={LINKS.github} style={{ ...ghostBtn, marginLeft: 'auto', padding: '8px 14px' }}>
          <Icon name="github" width={15} height={15} aria-hidden="true" />
          GitHub
        </a>
      </div>
    </header>
  );
}

function HeroTerminal(): React.JSX.Element {
  return (
    <div style={{ ...terminal, boxShadow: 'var(--pg-shadow-lg)' }}>
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
          gate run PRD-001
        </span>
      </div>
      <div
        style={{
          ...mono,
          fontSize: 'var(--pg-text-sm)',
          lineHeight: 'var(--pg-leading-mono)',
          padding: '18px 18px 20px',
          overflowX: 'auto',
        }}
      >
        <div style={{ color: 'var(--pg-term-dim)' }}>$ gate run PRD-001</div>
        {RUN_LINES.map((l) => (
          <div key={l.name} style={{ whiteSpace: 'nowrap' }}>
            <span
              style={{
                color: l.status === 'passed' ? 'var(--pg-term-green)' : 'var(--pg-term-human)',
              }}
            >
              {l.status === 'passed' ? '✓' : '→'}
            </span>{' '}
            <span style={{ color: 'var(--pg-term-fg)' }}>{l.name}</span>
            {l.command ? (
              <span style={{ color: 'var(--pg-term-dim)' }}>
                {' '}
                · {l.command}
                {typeof l.code === 'number' ? ` · exit ${l.code}` : ''}
              </span>
            ) : null}
          </div>
        ))}
        <div style={{ marginTop: 14, color: 'var(--pg-term-green)', whiteSpace: 'nowrap' }}>
          {RUN_SUMMARY.earned}
        </div>
        <div style={{ color: 'var(--pg-term-human)', whiteSpace: 'nowrap' }}>
          {RUN_SUMMARY.human}
        </div>
      </div>
    </div>
  );
}

function Hero(): React.JSX.Element {
  return (
    <section style={{ padding: '76px 28px 64px' }}>
      <div style={{ ...shell }}>
        <div className="alt-hero">
          <div>
            <p style={{ ...eyebrow, color: 'var(--pg-accent-text)' }}>{HERO.eyebrow}</p>
            <h1
              style={{
                fontSize: fluid.display,
                fontWeight: 700,
                letterSpacing: 'var(--pg-tracking-tight)',
                lineHeight: 'var(--pg-leading-tight)',
                margin: '0 0 18px',
                textWrap: 'balance',
              }}
            >
              {HERO.thesis}
            </h1>
            <p
              style={{
                fontSize: 'var(--pg-text-md)',
                ...muted,
                lineHeight: 'var(--pg-leading-relaxed)',
                margin: '0 0 26px',
                maxWidth: 560,
                textWrap: 'pretty',
              }}
            >
              {HERO.sub}
            </p>
            <div
              style={{
                ...mono,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 14,
                fontSize: 'var(--pg-text-sm)',
                border: '1px solid var(--pg-border)',
                borderRadius: 'var(--pg-radius-md)',
                background: 'var(--pg-bg-subtle)',
                padding: '12px 16px',
                marginBottom: 22,
              }}
            >
              <span style={{ color: 'var(--pg-text-subtle)' }}>$</span>
              <span>{HERO.install.split('\n')[0]}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href={LINKS.github} style={primaryBtn}>
                Star on GitHub
                <Icon name="arrowRight" width={14} height={14} aria-hidden="true" />
              </a>
              <a href={LINKS.docs} style={ghostBtn}>
                Read the docs
              </a>
            </div>
          </div>
          <HeroTerminal />
        </div>
      </div>
    </section>
  );
}

function CoreRule(): React.JSX.Element {
  return (
    <section style={{ padding: '0 28px 64px' }}>
      <div
        style={{
          ...shell,
          borderLeft: '3px solid var(--pg-accent)',
          padding: '18px 28px',
          background: 'var(--pg-bg-subtle)',
          borderRadius: 'var(--pg-radius-md)',
          maxWidth: 'calc(var(--pg-container) - 56px)',
        }}
      >
        <p
          style={{
            fontSize: 'var(--pg-text-md)',
            lineHeight: 'var(--pg-leading-relaxed)',
            margin: 0,
            textWrap: 'pretty',
          }}
        >
          {CORE_RULE}
        </p>
      </div>
    </section>
  );
}

function Features(): React.JSX.Element {
  return (
    <section id="features" style={{ padding: '24px 28px 72px' }}>
      <div style={shell}>
        <p style={eyebrow}>Why ProveGate</p>
        <h2 style={{ ...h2, marginBottom: 30 }}>Built for people who read exit codes.</h2>
        <div className="alt-bento">
          {FEATURES.map((f) => (
            <div key={f.title} style={card}>
              <span style={{ color: 'var(--pg-accent)', display: 'inline-flex', marginBottom: 12 }}>
                <Icon name={f.icon} width={20} height={20} aria-hidden="true" />
              </span>
              <h3 style={{ fontSize: 'var(--pg-text-base)', fontWeight: 600, margin: '0 0 8px' }}>
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 'var(--pg-text-sm)',
                  ...muted,
                  lineHeight: 'var(--pg-leading-relaxed)',
                  margin: 0,
                }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pipeline(): React.JSX.Element {
  return (
    <section
      id="pipeline"
      style={{
        padding: '72px 28px',
        background: 'var(--pg-bg-subtle)',
        borderTop: '1px solid var(--pg-border)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={shell}>
        <p style={eyebrow}>The seven phases</p>
        <h2 style={{ ...h2, marginBottom: 8 }}>
          Humans own intent and release. The machine owns the verified middle.
        </h2>
        <div style={{ margin: '30px 0 36px', overflowX: 'auto' }}>
          <PhasePipeline phases={PHASES} showPush />
        </div>
        <div className="alt-duo">
          {PHASE_DETAIL.filter((p) => p.n === 6 || p.n === 'push').map((p) => (
            <div key={String(p.n)} style={card}>
              <p
                style={{
                  ...mono,
                  fontSize: 'var(--pg-text-xs)',
                  margin: '0 0 8px',
                  color: p.authority === 'human' ? 'var(--pg-human-text)' : 'var(--pg-accent-text)',
                }}
              >
                {p.authority === 'human' ? 'human authority' : 'machine gate'} · {String(p.n)}
              </p>
              <h3 style={{ fontSize: 'var(--pg-text-base)', fontWeight: 600, margin: '0 0 8px' }}>
                {p.label}
              </h3>
              <p
                style={{
                  fontSize: 'var(--pg-text-sm)',
                  ...muted,
                  lineHeight: 'var(--pg-leading-relaxed)',
                  margin: 0,
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Commands(): React.JSX.Element {
  return (
    <section id="commands" style={{ padding: '72px 28px' }}>
      <div style={shell}>
        <p style={eyebrow}>CLI reference</p>
        <h2 style={{ ...h2, marginBottom: 30 }}>
          Twelve commands. No daemon, no dashboard, no account.
        </h2>
        <div className="alt-cmd">
          {COMMANDS.map(([name, desc]) => (
            <div
              key={name}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'baseline',
                padding: '10px 0',
                borderBottom: '1px solid var(--pg-border)',
              }}
            >
              <code
                style={{
                  ...mono,
                  fontSize: 'var(--pg-text-sm)',
                  color: 'var(--pg-accent-text)',
                  minWidth: 118,
                }}
              >
                gate {name}
              </code>
              <span style={{ fontSize: 'var(--pg-text-sm)', ...muted }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Proof(): React.JSX.Element {
  return (
    <section
      id="proof"
      style={{
        padding: '72px 28px',
        background: 'var(--pg-bg-subtle)',
        borderTop: '1px solid var(--pg-border)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={shell}>
        <p style={eyebrow}>Why gates, not vibes</p>
        <h2 style={{ ...h2, marginBottom: 30 }}>Self-reporting fails. Evidence doesn’t.</h2>
        <div className="alt-stats">
          {PROOF_STATS.map((s) => (
            <div key={s.stat} style={card}>
              <div
                style={{
                  fontSize: fluid.stat,
                  fontWeight: 700,
                  letterSpacing: 'var(--pg-tracking-tight)',
                  color: 'var(--pg-text)',
                  marginBottom: 10,
                }}
              >
                {s.stat}
              </div>
              <p
                style={{
                  fontSize: 'var(--pg-text-sm)',
                  ...muted,
                  lineHeight: 'var(--pg-leading-relaxed)',
                  margin: '0 0 12px',
                }}
              >
                {s.body}
              </p>
              <p style={{ ...mono, fontSize: 'var(--pg-text-xs)', ...subtle, margin: 0 }}>
                {s.source}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperatorAndRefusal(): React.JSX.Element {
  return (
    <section style={{ padding: '72px 28px' }}>
      <div style={{ ...shell }}>
        <div className="alt-duo">
          <div style={card}>
            <p style={eyebrow}>Operator gates</p>
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '6px 0 16px' }}
            >
              {OPERATOR_FLOW.nodes.map((n, i) => (
                <div key={n.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      color: n.human ? 'var(--pg-human)' : 'var(--pg-accent)',
                      display: 'inline-flex',
                    }}
                  >
                    <Icon name={n.icon} width={16} height={16} aria-hidden="true" />
                  </span>
                  <span style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text)' }}>
                    {n.label}
                  </span>
                  {i < OPERATOR_FLOW.nodes.length - 1 ? (
                    <span style={{ ...subtle, ...mono, fontSize: 'var(--pg-text-xs)' }}>↓</span>
                  ) : null}
                </div>
              ))}
            </div>
            <p
              style={{
                fontSize: 'var(--pg-text-sm)',
                ...muted,
                lineHeight: 'var(--pg-leading-relaxed)',
                margin: 0,
              }}
            >
              {OPERATOR_FLOW.note}
            </p>
          </div>
          <div style={{ ...terminal, height: '100%' }}>
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
                the refusal
              </span>
            </div>
            <div
              style={{
                ...mono,
                fontSize: 'var(--pg-text-sm)',
                lineHeight: 'var(--pg-leading-mono)',
                padding: '20px 18px',
              }}
            >
              <div style={{ color: 'var(--pg-term-dim)' }}>$ {REFUSAL.command}</div>
              <div style={{ color: 'var(--pg-term-red)', margin: '6px 0 16px' }}>
                {REFUSAL.output}
              </div>
              <div
                style={{
                  color: 'var(--pg-term-dim)',
                  fontFamily: 'var(--pg-font-sans)',
                  fontSize: 'var(--pg-text-sm)',
                  lineHeight: 'var(--pg-leading-relaxed)',
                }}
              >
                {REFUSAL.note}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Quickstart(): React.JSX.Element {
  return (
    <section style={{ padding: '8px 28px 72px' }}>
      <div style={shell}>
        <p style={eyebrow}>First green run</p>
        <h2 style={{ ...h2, marginBottom: 30 }}>Four steps.</h2>
        <div className="alt-steps">
          {QUICKSTART.map((s, i) => (
            <div key={s.t} style={card}>
              <div
                style={{
                  ...mono,
                  fontSize: 'var(--pg-text-xs)',
                  color: 'var(--pg-accent-text)',
                  marginBottom: 10,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <h3
                style={{
                  ...mono,
                  fontSize: 'var(--pg-text-sm)',
                  fontWeight: 'var(--pg-fw-semibold)',
                  margin: '0 0 8px',
                }}
              >
                {s.t}
              </h3>
              <p
                style={{
                  fontSize: 'var(--pg-text-sm)',
                  ...muted,
                  lineHeight: 'var(--pg-leading-relaxed)',
                  margin: 0,
                }}
              >
                {s.d}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta(): React.JSX.Element {
  return (
    <section
      style={{
        padding: '84px 28px',
        textAlign: 'center',
        background: 'var(--pg-bg-subtle)',
        borderTop: '1px solid var(--pg-border)',
      }}
    >
      <div style={{ ...shell, maxWidth: 640 }}>
        <h2 style={{ ...h2, fontSize: fluid.statement, marginBottom: 14 }}>{CTA.title}</h2>
        <p
          style={{
            fontSize: 'var(--pg-text-md)',
            ...muted,
            lineHeight: 'var(--pg-leading-relaxed)',
            margin: '0 0 28px',
          }}
        >
          {CTA.body}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href={LINKS.github} style={primaryBtn}>
            {CTA.primary}
          </a>
          <a href={LINKS.docs} style={ghostBtn}>
            {CTA.secondary}
          </a>
        </div>
        <p style={{ ...mono, fontSize: 'var(--pg-text-xs)', ...subtle, marginTop: 34 }}>
          {PRINCIPLES}
        </p>
      </div>
    </section>
  );
}

function Footer(): React.JSX.Element {
  return (
    <footer style={{ borderTop: '1px solid var(--pg-border)', padding: '26px 28px' }}>
      <div
        style={{
          ...shell,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap',
          ...mono,
          fontSize: 'var(--pg-text-xs)',
          ...subtle,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Mark size={16} />
          <Wordmark size="var(--pg-text-sm)" />
        </span>
        <a href="/" style={{ color: 'var(--pg-text-subtle)' }}>
          current landing
        </a>
        <a href={LINKS.github} style={{ color: 'var(--pg-text-subtle)' }}>
          GitHub
        </a>
        <a href={LINKS.license} style={{ color: 'var(--pg-text-subtle)' }}>
          MIT license
        </a>
        <span style={{ marginLeft: 'auto' }}>prove it, then let it propagate.</span>
      </div>
    </footer>
  );
}

export default function AltPage(): React.JSX.Element {
  return (
    <main>
      <Nav />
      <Hero />
      <CoreRule />
      <Features />
      <Pipeline />
      <Commands />
      <Proof />
      <OperatorAndRefusal />
      <Quickstart />
      <FinalCta />
      <Footer />
    </main>
  );
}
