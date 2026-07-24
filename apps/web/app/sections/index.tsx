import * as React from 'react';
import {
  Button,
  CodeBlock,
  EvidenceTable,
  GateLine,
  HandoffCard,
  Icon,
  PhasePipeline,
  VerdictBadge,
} from '@provegate/design/react';
import { Reveal } from './reveal';
import * as C from './content';

const shell: React.CSSProperties = {
  maxWidth: 'var(--pg-container)',
  margin: '0 auto',
  padding: '0 28px',
};
const section: React.CSSProperties = { padding: 'var(--pg-space-8) 0' };
const eyebrow: React.CSSProperties = {
  fontFamily: 'var(--pg-font-mono)',
  fontSize: 'var(--pg-text-xs)',
  letterSpacing: 'var(--pg-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--pg-text-subtle)',
  marginBottom: 'var(--pg-space-3)',
};
const h2: React.CSSProperties = {
  fontSize: 'var(--pg-text-2xl)',
  fontWeight: 600,
  letterSpacing: 'var(--pg-tracking-tight)',
  lineHeight: 'var(--pg-leading-snug)',
  margin: '0 0 var(--pg-space-5)',
};
const lede: React.CSSProperties = {
  fontSize: 'var(--pg-text-md)',
  color: 'var(--pg-text-muted)',
  lineHeight: 'var(--pg-leading-relaxed)',
  maxWidth: 'var(--pg-container-prose)',
};
const mono: React.CSSProperties = { fontFamily: 'var(--pg-font-mono)' };

export function Nav(): React.JSX.Element {
  return (
    <nav
      style={{
        ...shell,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '18px 28px',
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <Icon name="gate" size={22} title="ProveGate" />
        ProveGate
      </span>
      <span style={{ display: 'inline-flex', gap: 18, alignItems: 'center' }}>
        <a href={C.LINKS.docs}>Docs</a>
        <a href={C.LINKS.github} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Icon name="github" size={18} /> GitHub
        </a>
      </span>
    </nav>
  );
}

export function Hero(): React.JSX.Element {
  return (
    <header style={{ ...shell, ...section, paddingTop: 'var(--pg-space-7)' }}>
      <p style={eyebrow}>// gated autonomy · machine-checkable</p>
      <h1
        style={{
          fontSize: 'var(--pg-text-4xl)',
          fontWeight: 700,
          letterSpacing: 'var(--pg-tracking-tight)',
          lineHeight: 'var(--pg-leading-tight)',
          margin: '0 0 var(--pg-space-5)',
          maxWidth: '16ch',
        }}
      >
        {C.HERO.thesis}
      </h1>
      <p style={{ ...lede, marginBottom: 'var(--pg-space-6)' }}>{C.HERO.sub}</p>
      <div style={{ maxWidth: 460, marginBottom: 'var(--pg-space-5)' }}>
        <CodeBlock filename="your terminal" prompt copyable>
          {C.HERO.install}
        </CodeBlock>
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <Button as="a" href={C.LINKS.docs} variant="primary">
          Read the spec
        </Button>
        <Button as="a" href={C.LINKS.github} variant="secondary" leftIcon={<Icon name="github" size={18} />}>
          GitHub
        </Button>
      </div>
    </header>
  );
}

export function Problem(): React.JSX.Element {
  return (
    <section id="problem" style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// the problem</p>
        <h2 style={h2}>Strong generators. Unreliable narrators.</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 'var(--pg-space-5)',
          }}
        >
          {C.PROOF_STATS.map((s) => (
            <div
              key={s.source}
              style={{
                border: '1px solid var(--pg-border)',
                borderRadius: 'var(--pg-radius-md)',
                padding: 'var(--pg-space-5)',
                background: 'var(--pg-surface)',
              }}
            >
              <div style={{ ...mono, fontSize: 'var(--pg-text-2xl)', fontWeight: 700, marginBottom: 8 }}>
                {s.stat}
              </div>
              <p style={{ margin: '0 0 12px', lineHeight: 'var(--pg-leading-normal)' }}>{s.body}</p>
              <div style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)' }}>
                {s.source}
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function CoreRule(): React.JSX.Element {
  return (
    <section
      style={{
        background: 'var(--pg-bg-subtle)',
        borderTop: '1px solid var(--pg-border)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={{ ...shell, ...section }}>
        <Reveal>
          <p style={eyebrow}>// the core rule</p>
          <p
            style={{
              fontSize: 'var(--pg-text-xl)',
              lineHeight: 'var(--pg-leading-snug)',
              fontWeight: 500,
              maxWidth: '30ch',
              margin: 0,
            }}
          >
            {C.CORE_RULE}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function Method(): React.JSX.Element {
  return (
    <section id="method" style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// seven phases, one autonomy cut</p>
        <h2 style={h2}>{C.PHASE_CUT}</h2>
        <div style={{ overflowX: 'auto', marginBottom: 'var(--pg-space-5)' }}>
          <PhasePipeline phases={C.PHASES} showPush />
        </div>
        <div style={{ maxWidth: 640 }}>
          <HandoffCard variant="handoff" title="HANDOFF CARD" lines={C.HANDOFF_LINES} />
        </div>
      </Reveal>
    </section>
  );
}

export function RunWalkthrough(): React.JSX.Element {
  return (
    <section style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// gate run · phases 4–7</p>
        <h2 style={h2}>One command runs the verified middle.</h2>
        <div
          style={{
            border: '1px solid var(--pg-term-border)',
            borderRadius: 'var(--pg-radius-md)',
            background: 'var(--pg-term-bg)',
            padding: '16px 20px',
            maxWidth: 720,
          }}
        >
          {C.RUN_LINES.map((l, i) => (
            <GateLine key={i} status={l.status} name={l.name} command={l.command} code={l.code} bare />
          ))}
        </div>
      </Reveal>
    </section>
  );
}

export function Refusal(): React.JSX.Element {
  return (
    <section style={{ ...shell, ...section }}>
      <Reveal>
        <div
          style={{
            border: '1px solid var(--pg-term-border)',
            borderRadius: 'var(--pg-radius-md)',
            background: 'var(--pg-term-bg)',
            padding: '20px 22px',
            maxWidth: 560,
            ...mono,
          }}
        >
          <div style={{ color: 'var(--pg-term-dim)' }}>$ {C.REFUSAL.command}</div>
          <div style={{ color: 'var(--pg-term-human)', fontWeight: 600 }}>{C.REFUSAL.output}</div>
        </div>
        <p style={{ ...lede, marginTop: 'var(--pg-space-4)' }}>{C.REFUSAL.note}</p>
      </Reveal>
    </section>
  );
}

export function EvidenceLedger(): React.JSX.Element {
  return (
    <section style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// the evidence ledger</p>
        <h2 style={h2}>Run, don’t list. A listed-but-not-run command is never passed.</h2>
        <EvidenceTable rows={[...C.LEDGER_ROWS]} />
        <p style={{ ...lede, marginTop: 'var(--pg-space-4)' }}>
          The vocabulary is closed: <VerdictBadge verdict="passed" size="sm" />{' '}
          <VerdictBadge verdict="operator" size="sm" /> <VerdictBadge verdict="blocked" size="sm" /> — never a
          silent pass.
        </p>
      </Reveal>
    </section>
  );
}

export function Proof(): React.JSX.Element {
  return (
    <section
      style={{
        background: 'var(--pg-bg-subtle)',
        borderTop: '1px solid var(--pg-border)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={{ ...shell, ...section }}>
        <Reveal>
          <p style={eyebrow}>// proof, and its honest limits</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--pg-space-6)' }}>
            <div>
              <div style={{ ...mono, fontSize: 'var(--pg-text-3xl)', fontWeight: 700 }}>{C.PROOF.scored}</div>
              <p style={{ ...lede }}>{C.PROOF.body}</p>
              <p style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-subtle)' }}>{C.PROOF.self}</p>
            </div>
            <div>
              <p style={{ ...eyebrow, marginBottom: 'var(--pg-space-3)' }}>limits we state out loud</p>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 'var(--pg-leading-relaxed)', color: 'var(--pg-text-muted)' }}>
                {C.LIMITS.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>
          <p style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-subtle)', marginTop: 'var(--pg-space-5)' }}>
            Showing the limits next to the proof is the point.
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function Positioning(): React.JSX.Element {
  return (
    <section style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// where it sits</p>
        <p style={{ fontSize: 'var(--pg-text-lg)', lineHeight: 'var(--pg-leading-snug)', maxWidth: '34ch', margin: 0 }}>
          {C.POSITIONING}
        </p>
      </Reveal>
    </section>
  );
}

export function CommandRef(): React.JSX.Element {
  return (
    <section id="commands" style={{ ...shell, ...section }}>
      <Reveal>
        <p style={eyebrow}>// command reference</p>
        <h2 style={h2}>Ten commands. The one it refuses is load-bearing.</h2>
        <div style={{ border: '1px solid var(--pg-border)', borderRadius: 'var(--pg-radius-md)', overflow: 'hidden' }}>
          {C.COMMANDS.map(([name, desc], i) => (
            <div
              key={name}
              style={{
                display: 'grid',
                gridTemplateColumns: '120px 1fr',
                gap: 16,
                padding: '10px 16px',
                borderTop: i === 0 ? 'none' : '1px solid var(--pg-border)',
              }}
            >
              <code style={{ ...mono, color: 'var(--pg-text)' }}>gate {name}</code>
              <span style={{ color: 'var(--pg-text-muted)' }}>{desc}</span>
            </div>
          ))}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 16, padding: '10px 16px', borderTop: '1px solid var(--pg-border)' }}>
            <code style={{ ...mono, color: 'var(--pg-term-human)' }}>gate push</code>
            <span style={{ color: 'var(--pg-text-muted)' }}>refuses — push is always yours</span>
          </div>
        </div>
        <p style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)', marginTop: 'var(--pg-space-3)' }}>
          {C.PRINCIPLES}
        </p>
      </Reveal>
    </section>
  );
}

export function Footer(): React.JSX.Element {
  return (
    <footer style={{ borderTop: '1px solid var(--pg-border)', background: 'var(--pg-bg-subtle)' }}>
      <div style={{ ...shell, padding: 'var(--pg-space-6) 28px', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Icon name="gate" size={20} /> {C.TAGLINE}
        </span>
        <span style={{ display: 'inline-flex', gap: 18 }}>
          <a href={C.LINKS.docs}>Docs</a>
          <a href={C.LINKS.github}>GitHub</a>
        </span>
      </div>
    </footer>
  );
}
