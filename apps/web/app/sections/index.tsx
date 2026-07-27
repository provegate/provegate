import * as React from 'react';
import {
  Admonition,
  Button,
  CodeBlock,
  EvidenceTable,
  HandoffCard,
  Icon,
  PhasePipeline,
  VerdictBadge,
} from '@provegate/design/react';
import { Reveal } from './reveal';
import { HeroTerminal } from './hero-terminal';
import { GateRun } from './gate-run';
import { Playground as ManifestPlayground } from './playground';
import {
  Eyebrow,
  Mark,
  SectionHead,
  Wordmark,
  band,
  card,
  fluid,
  lede,
  mono,
  section,
  shell,
} from './ui';
import * as C from './content';

// Interactive sections live in their own client modules; re-exported here so
// `page.tsx` and the narrative test see one module surface.
export { Nav } from './nav';
export { PhaseDetail } from './phase-detail';
export { Anatomy } from './anatomy';
export { InstallTabs, CIIntegration } from './tabs';
export { FaqAndQuickstart } from './faq';

const prose: React.CSSProperties = {
  maxWidth: 'var(--pg-container-prose)',
  margin: '0 auto',
  padding: '0 28px',
};

export function Hero(): React.JSX.Element {
  return (
    <header
      id="top"
      className="pg-hero"
      style={{
        ...shell,
        padding: '76px 28px 44px',
        display: 'grid',
        gridTemplateColumns: '1.05fr 0.95fr',
        gap: 52,
        alignItems: 'center',
      }}
    >
      <div>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            ...mono,
            fontSize: 'var(--pg-text-xs)',
            color: 'var(--pg-text-subtle)',
            border: '1px solid var(--pg-border)',
            borderRadius: 'var(--pg-radius-pill)',
            padding: '5px 12px',
            marginBottom: 22,
          }}
        >
          <span style={{ color: 'var(--pg-accent-text)' }} aria-hidden="true">
            ◆
          </span>
          {C.HERO.eyebrow}
        </div>
        <h1
          style={{
            fontSize: fluid.display,
            fontWeight: 700,
            lineHeight: 'var(--pg-leading-tight)',
            letterSpacing: 'var(--pg-tracking-tight)',
            margin: 0,
            color: 'var(--pg-text)',
            textWrap: 'balance',
          }}
        >
          {C.HERO.thesis}
        </h1>
        <p style={{ ...lede, fontSize: 'var(--pg-text-lg)', maxWidth: 540, marginTop: 22, textWrap: 'pretty' }}>
          {C.HERO.sub}
        </p>
        <div style={{ marginTop: 26, maxWidth: 440 }}>
          <HeroTerminal />
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 20, flexWrap: 'wrap' }}>
          <Button as="a" href={C.LINKS.spec} variant="primary" size="lg">
            Read the spec
          </Button>
          <Button as="a" href="#how" variant="ghost" size="lg" rightIcon={<Icon name="arrowRight" size={17} />}>
            How gates work
          </Button>
        </div>
        <div style={{ marginTop: 22, ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)' }}>
          {C.PRINCIPLES}
        </div>
      </div>
      <Reveal>
        <HandoffCard
          variant="handoff"
          title="HANDOFF CARD"
          lines={C.HANDOFF_LINES}
          style={{ boxShadow: 'var(--pg-shadow-lg)' }}
        />
      </Reveal>
    </header>
  );
}

export function TrustStrip(): React.JSX.Element {
  return (
    <div style={band}>
      <div
        style={{
          ...shell,
          padding: '16px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px 34px',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {C.TRUST_STRIP.map((t) => (
          <span
            key={t}
            style={{
              ...mono,
              fontSize: 'var(--pg-text-sm)',
              color: 'var(--pg-text-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ color: 'var(--pg-accent-text)' }} aria-hidden="true">
              ✓
            </span>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Problem(): React.JSX.Element {
  return (
    <section id="problem" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// the problem"
        title="Strong generators. Unreliable narrators."
        sub="Neither the agent's claim, nor a panel of agents' consensus, nor a human's felt sense of progress can serve as a gate. Only executed evidence can."
      />
      <div className="pg-problem-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}>
        {C.PROOF_STATS.map((s) => (
          <Reveal key={s.source} style={{ height: '100%' }}>
            <div style={card}>
              <div
                style={{
                  ...mono,
                  fontSize: fluid.stat,
                  fontWeight: 600,
                  letterSpacing: 'var(--pg-tracking-tight)',
                  lineHeight: 'var(--pg-leading-tight)',
                  color: s.stat === '22.58%' ? 'var(--pg-fail-text)' : 'var(--pg-text)',
                }}
              >
                {s.stat}
              </div>
              <p
                style={{
                  fontSize: 'var(--pg-text-base)',
                  lineHeight: 'var(--pg-leading-normal)',
                  color: 'var(--pg-text-muted)',
                  margin: '12px 0 0',
                  textWrap: 'pretty',
                }}
              >
                {s.body}
              </p>
              <div style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)', marginTop: 14 }}>
                {s.source}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function CoreRule(): React.JSX.Element {
  return (
    <section style={{ ...band, padding: '76px 0' }}>
      <div style={prose}>
        <Reveal>
          <Eyebrow>// the core rule</Eyebrow>
          <p
            style={{
              fontSize: fluid.statement,
              fontWeight: 600,
              lineHeight: 'var(--pg-leading-snug)',
              letterSpacing: 'var(--pg-tracking-tight)',
              color: 'var(--pg-text)',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            {C.CORE_RULE} <span style={{ color: 'var(--pg-text-subtle)' }}>{C.CORE_RULE_TAIL}</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/** How it works — the animated run beside the three-step rail. */
export function RunWalkthrough(): React.JSX.Element {
  return (
    <section id="how" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// how it works"
        title="Run the gates. Read the evidence. Nothing else counts."
        sub="ProveGate wraps your agent's workflow in checks a machine settles. The CLI prints exactly what ran, what passed, and what did not — then hands the push back to you."
      />
      <div
        className="pg-how-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 44, alignItems: 'center' }}
      >
        <Reveal>
          <GateRun />
        </Reveal>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {C.HOW_STEPS.map((s, i) => (
            <Reveal key={s.title}>
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  padding: '16px 0',
                  borderBottom: i < C.HOW_STEPS.length - 1 ? '1px solid var(--pg-border)' : 'none',
                }}
              >
                <div
                  style={{
                    flex: 'none',
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--pg-radius-md)',
                    border: '1px solid var(--pg-border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--pg-text-muted)',
                    background: 'var(--pg-surface)',
                  }}
                >
                  <Icon name={s.icon} size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3
                      style={{
                        fontSize: 'var(--pg-text-lg)',
                        fontWeight: 600,
                        margin: 0,
                        color: 'var(--pg-text)',
                        letterSpacing: 'var(--pg-tracking-tight)',
                      }}
                    >
                      {s.title}
                    </h3>
                  </div>
                  <p
                    style={{
                      fontSize: 'var(--pg-text-base)',
                      lineHeight: 'var(--pg-leading-normal)',
                      color: 'var(--pg-text-muted)',
                      margin: '6px 0 0',
                      textWrap: 'pretty',
                    }}
                  >
                    {s.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * The manifest playground. It plans, it never runs: the output is the real
 * `gate run --dry-run` chain, so no verdict — and no green — is invented for
 * work that has not happened.
 */
export function Playground(): React.JSX.Element {
  return (
    <section id="playground" style={band}>
      <div style={{ ...shell, ...section }}>
        <SectionHead
          eyebrow="// playground"
          title="Edit the manifest. Read the plan."
          sub="This is the whole model: gates in, evidence out. gates.manifest.json declares the per-phase commands; phases 5, 6 and 7 carry built-in gates it cannot remove. Edit it and the plan below re-reads it live."
        />
        <ManifestPlayground />
        <p style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-subtle)', marginTop: 14 }}>
          a plan, not a run — validation and chain order are the shipped ones; verdicts come only from `gate run`.
        </p>
      </div>
    </section>
  );
}

/** The method band: seven phases, the autonomy cut, the handoff. */
export function Method(): React.JSX.Element {
  return (
    <section id="method" style={band}>
      <div style={{ ...shell, ...section }}>
        <SectionHead
          eyebrow="// the method"
          title="Phases 1–3 human, 4–7 autonomous. Push is always yours."
          sub={C.PHASE_CUT}
        />
        <Reveal>
          <div style={{ overflowX: 'auto' }}>
            <PhasePipeline phases={C.PHASES} active={5} showPush />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function OperatorFlow(): React.JSX.Element {
  const connector = (dashed: boolean): React.JSX.Element => (
    <div
      aria-hidden="true"
      style={{
        flex: 1,
        minWidth: 30,
        height: 0,
        borderTop: `1.5px ${dashed ? 'dashed' : 'solid'} var(--pg-border-strong)`,
        margin: '29px 4px 0',
        alignSelf: 'flex-start',
      }}
    />
  );
  return (
    <section id="operator" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// operator gates"
        title="When a command can't decide, a person does."
        sub="Some checks aren't machine-settleable — a release sign-off, a security judgement. Route those to a named owner; the acceptance is recorded like any other evidence, and the merge gate refuses while the row is unaccepted."
      />
      <Reveal>
        <div
          style={{
            background: 'var(--pg-surface)',
            border: '1px solid var(--pg-border)',
            borderRadius: 'var(--pg-radius-lg)',
            padding: '36px 28px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', flexWrap: 'wrap', gap: 4 }}>
            {C.OPERATOR_FLOW.nodes.map((n, i) => (
              <React.Fragment key={n.label}>
                {i > 0 ? connector(i === 1) : null}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center' }}>
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1.5px solid ${n.human ? 'var(--pg-human)' : 'var(--pg-border-strong)'}`,
                      color: n.human ? 'var(--pg-human)' : 'var(--pg-text-muted)',
                      background: n.human ? 'var(--pg-human-bg)' : 'var(--pg-surface)',
                      borderRadius: n.human ? 'var(--pg-radius-pill)' : 'var(--pg-radius-md)',
                    }}
                  >
                    <Icon name={n.icon} size={24} />
                  </div>
                  <span style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-muted)', maxWidth: 140 }}>
                    {n.label}
                  </span>
                </div>
              </React.Fragment>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
            <VerdictBadge verdict="operator" label="owner accepts" />
            <VerdictBadge verdict="passed" label="merge" />
          </div>
        </div>
      </Reveal>
      <p style={{ ...lede, fontSize: 'var(--pg-text-sm)', maxWidth: 720, margin: '18px auto 0', textAlign: 'center' }}>
        {C.OPERATOR_FLOW.note}
      </p>
    </section>
  );
}

export function Refusal(): React.JSX.Element {
  return (
    <section style={{ ...prose, margin: '84px auto' }}>
      <Reveal>
        <div
          style={{
            background: 'var(--pg-term-bg)',
            border: '1px solid var(--pg-term-border)',
            borderRadius: 'var(--pg-radius-lg)',
            padding: '44px 32px',
            textAlign: 'center',
            boxShadow: 'var(--pg-shadow-md)',
            ...mono,
          }}
        >
          <div style={{ color: 'var(--pg-term-dim)', fontSize: 'var(--pg-text-sm)' }}>$ {C.REFUSAL.command}</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              margin: '18px 0 10px',
              color: 'var(--pg-term-human)',
              fontSize: fluid.statement,
              fontWeight: 500,
            }}
          >
            <Icon name="human" size={28} />
            {C.REFUSAL.output}
          </div>
          <div
            style={{
              color: 'var(--pg-term-dim)',
              fontSize: 'var(--pg-text-base)',
              lineHeight: 'var(--pg-leading-relaxed)',
              maxWidth: 460,
              margin: '0 auto',
            }}
          >
            {C.REFUSAL.note}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function EvidenceLedger(): React.JSX.Element {
  return (
    <section id="ledger" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// the evidence ledger"
        title="Listed but not run is never passed."
        sub="Every gate leaves a record: the command, the machine verdict, the exit code, and where the evidence lives. Auditable after the fact, by anyone."
      />
      <Reveal>
        <EvidenceTable caption="PRD-001 · phases 4–7" rows={[...C.LEDGER_ROWS]} />
      </Reveal>
      <p style={{ ...lede, marginTop: 'var(--pg-space-4)' }}>
        The vocabulary is closed: <VerdictBadge verdict="passed" size="sm" />{' '}
        <VerdictBadge verdict="operator" size="sm" /> <VerdictBadge verdict="blocked" size="sm" /> — never a silent
        pass.
      </p>
    </section>
  );
}

export function Proof(): React.JSX.Element {
  const bullet: React.CSSProperties = {
    fontSize: 'var(--pg-text-base)',
    lineHeight: 'var(--pg-leading-normal)',
    color: 'var(--pg-text-muted)',
    paddingLeft: 22,
    position: 'relative',
    marginBottom: 14,
    textWrap: 'pretty',
  };
  const glyph: React.CSSProperties = { position: 'absolute', left: 0, ...mono };
  return (
    <section id="proof" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// proof, and its honest limits"
        title="Showing the limits next to the proof is the point."
        sub="ProveGate is measured, not breathless. The evidence is real — and so are the conditions under which it doesn't apply."
      />
      <div className="pg-proof-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Reveal style={{ height: '100%' }}>
          <div style={card}>
            <div style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-accent-text)', marginBottom: 18 }}>
              evidence
            </div>
            {C.PROOF_EVIDENCE.map((t) => (
              <div key={t} style={bullet}>
                <span style={{ ...glyph, color: 'var(--pg-pass-text)' }} aria-hidden="true">
                  ✓
                </span>
                {t}
              </div>
            ))}
          </div>
        </Reveal>
        <Reveal style={{ height: '100%' }}>
          <div style={card}>
            <div style={{ ...mono, fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-subtle)', marginBottom: 18 }}>
              limits we state out loud
            </div>
            {C.LIMITS.map((t) => (
              <div key={t} style={bullet}>
                <span style={{ ...glyph, color: 'var(--pg-text-subtle)' }} aria-hidden="true">
                  ·
                </span>
                {t}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** Self-attestation vs. evidence, side by side. */
export function Comparison(): React.JSX.Element {
  const column = (
    title: string,
    icon: 'cross' | 'check',
    tone: string,
    rows: readonly string[],
    foot: string,
    verdict: 'failed' | 'passed',
  ): React.JSX.Element => (
    <div style={{ ...card, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <span style={{ color: tone, display: 'inline-flex' }}>
          <Icon name={icon} size={20} />
        </span>
        <h3
          style={{
            fontSize: 'var(--pg-text-lg)',
            fontWeight: 600,
            margin: 0,
            color: 'var(--pg-text)',
            letterSpacing: 'var(--pg-tracking-tight)',
          }}
        >
          {title}
        </h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
        {rows.map((r) => (
          <div
            key={r}
            style={{
              display: 'flex',
              gap: 10,
              fontSize: 'var(--pg-text-base)',
              lineHeight: 'var(--pg-leading-normal)',
              color: 'var(--pg-text-muted)',
            }}
          >
            <span style={{ color: tone, flex: 'none', ...mono }} aria-hidden="true">
              {icon === 'cross' ? '✗' : '✓'}
            </span>
            <span>{r}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--pg-border)' }}>
        <VerdictBadge verdict={verdict} label={foot} />
      </div>
    </div>
  );
  return (
    <section id="difference" style={band}>
      <div style={{ ...shell, ...section }}>
        <SectionHead
          eyebrow="// the difference"
          title="Self-attestation vs. evidence."
          center
          sub="An agent saying it's done and a gate proving it are not the same event. ProveGate only records the second one."
        />
        <div className="pg-cmp-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Reveal style={{ height: '100%' }}>
            {column(
              C.COMPARISON.attestation.title,
              'cross',
              'var(--pg-fail-text)',
              C.COMPARISON.attestation.rows,
              C.COMPARISON.attestation.foot,
              'failed',
            )}
          </Reveal>
          <Reveal style={{ height: '100%' }}>
            {column(
              C.COMPARISON.evidence.title,
              'check',
              'var(--pg-pass-text)',
              C.COMPARISON.evidence.rows,
              C.COMPARISON.evidence.foot,
              'passed',
            )}
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function Positioning(): React.JSX.Element {
  return (
    <section style={{ ...band, padding: '64px 0' }}>
      <div style={prose}>
        <Reveal>
          <Eyebrow>// where it sits</Eyebrow>
          <p
            style={{
              fontSize: 'clamp(var(--pg-text-lg), 2.2vw, var(--pg-text-xl))',
              fontWeight: 600,
              lineHeight: 'var(--pg-leading-snug)',
              color: 'var(--pg-text)',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            {C.POSITIONING}
          </p>
        </Reveal>
      </div>
    </section>
  );
}

export function Features(): React.JSX.Element {
  return (
    <section id="features" style={{ ...shell, ...section }}>
      <SectionHead eyebrow="// why provegate" title="Built for engineers who don't trust vibes." center />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {C.FEATURES.map((f) => (
          <Reveal key={f.title} style={{ height: '100%' }}>
            <div style={{ ...card, borderRadius: 'var(--pg-radius-md)', padding: '22px 22px 24px' }}>
              <div style={{ color: 'var(--pg-text-muted)', marginBottom: 14 }}>
                <Icon name={f.icon} size={22} />
              </div>
              <h3
                style={{
                  fontSize: 'var(--pg-text-lg)',
                  fontWeight: 600,
                  margin: '0 0 6px',
                  color: 'var(--pg-text)',
                  letterSpacing: 'var(--pg-tracking-tight)',
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 'var(--pg-text-base)',
                  lineHeight: 'var(--pg-leading-normal)',
                  color: 'var(--pg-text-muted)',
                  margin: 0,
                  textWrap: 'pretty',
                }}
              >
                {f.body}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export function CommandRef(): React.JSX.Element {
  return (
    <section id="commands" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// command reference"
        title="Thirteen commands. The one it refuses is load-bearing."
        sub="No daemon, no dashboard, no account. Everything runs where you already work and prints exactly what it did — and the runner has no code path that pushes, so gate push refuses."
      />
      <Reveal>
        <div
          style={{
            background: 'var(--pg-term-bg)',
            border: '1px solid var(--pg-term-border)',
            borderRadius: 'var(--pg-radius-lg)',
            overflow: 'hidden',
            boxShadow: 'var(--pg-shadow-sm)',
          }}
        >
          {C.COMMANDS.map(([name, desc], i) => (
            <div
              key={name}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 18,
                padding: '11px 18px',
                borderTop: i === 0 ? 'none' : '1px solid var(--pg-term-border)',
                ...mono,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ color: 'var(--pg-term-green)', flex: 'none', userSelect: 'none' }} aria-hidden="true">
                $
              </span>
              <span style={{ color: 'var(--pg-term-fg)', fontSize: 'var(--pg-text-sm)', minWidth: 210 }}>
                gate {name}
              </span>
              <span style={{ color: 'var(--pg-term-dim)', fontSize: 'var(--pg-text-sm)', flex: 1 }}>{desc}</span>
            </div>
          ))}
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 18,
              padding: '11px 18px',
              borderTop: '1px solid var(--pg-term-border)',
              ...mono,
              flexWrap: 'wrap',
            }}
          >
            <span style={{ color: 'var(--pg-term-human)', flex: 'none', userSelect: 'none' }} aria-hidden="true">
              $
            </span>
            <span style={{ color: 'var(--pg-term-human)', fontSize: 'var(--pg-text-sm)', minWidth: 210 }}>
              gate push
            </span>
            <span style={{ color: 'var(--pg-term-dim)', fontSize: 'var(--pg-text-sm)', flex: 1 }}>
              refuses — push is always yours
            </span>
          </div>
        </div>
      </Reveal>
      <p style={{ ...mono, fontSize: 'var(--pg-text-xs)', color: 'var(--pg-text-subtle)', marginTop: 14 }}>
        {C.PRINCIPLES}
      </p>
    </section>
  );
}

/** Install + the closing call to action. */
export function Install(): React.JSX.Element {
  return (
    <section id="install" style={{ ...shell, ...section }}>
      <div
        className="pg-install-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 52, alignItems: 'center' }}
      >
        <div>
          <SectionHead
            eyebrow="// get started"
            title="Two commands to your first gate."
            sub="Install the CLI and initialize the workflow. ProveGate reads your gates from gates.manifest.json and the PRD, then prints the evidence."
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Admonition type="tip" title="No lock-in">
              Gates are just commands. Delete ProveGate and your checks still run in CI exactly as before.
            </Admonition>
            <Admonition type="human" title="Push stays with you">
              ProveGate never pushes or deploys on your behalf. It verifies and merges locally; you decide what
              propagates.
            </Admonition>
          </div>
        </div>
        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <CodeBlock filename="terminal" prompt copyable>
              {C.HERO.install}
            </CodeBlock>
            <CodeBlock filename="gates.manifest.json" lang="json" copyable>
              {C.MANIFEST_SEED}
            </CodeBlock>
          </div>
        </Reveal>
      </div>
      <div
        style={{
          marginTop: 56,
          textAlign: 'center',
          background: 'var(--pg-surface)',
          border: '1px solid var(--pg-border)',
          borderRadius: 'var(--pg-radius-lg)',
          padding: '48px 28px',
        }}
      >
        <h2
          style={{
            fontSize: fluid.heading,
            fontWeight: 600,
            letterSpacing: 'var(--pg-tracking-tight)',
            margin: 0,
            color: 'var(--pg-text)',
            textWrap: 'balance',
          }}
        >
          {C.CTA.title}
        </h2>
        <p style={{ ...lede, margin: '12px auto 0', maxWidth: 520 }}>{C.CTA.body}</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 26, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            as="a"
            href={C.LINKS.github}
            variant="primary"
            size="lg"
            leftIcon={<Icon name="github" size={17} />}
          >
            {C.CTA.primary}
          </Button>
          <Button
            as="a"
            href={C.LINKS.docs}
            variant="secondary"
            size="lg"
            rightIcon={<Icon name="arrowRight" size={17} />}
          >
            {C.CTA.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
}

export function Footer(): React.JSX.Element {
  return (
    <footer style={{ borderTop: '1px solid var(--pg-border)', background: 'var(--pg-bg-subtle)' }}>
      <div
        className="pg-footer-grid"
        style={{ ...shell, padding: '48px 28px 28px', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 32 }}
      >
        <div style={{ maxWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 12 }}>
            <Mark size={22} />
            <Wordmark />
          </div>
          <p style={{ fontSize: 'var(--pg-text-sm)', color: 'var(--pg-text-subtle)', lineHeight: 'var(--pg-leading-normal)', margin: 0 }}>
            Gate autonomous coding agents on machine-checkable evidence.
          </p>
        </div>
        {C.FOOTER_COLUMNS.map((col) => (
          <div key={col.title}>
            <div
              style={{
                ...mono,
                fontSize: 'var(--pg-text-xs)',
                letterSpacing: 'var(--pg-tracking-caps)',
                textTransform: 'uppercase',
                color: 'var(--pg-text-subtle)',
                marginBottom: 12,
              }}
            >
              {col.title}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {col.links.map(([label, href]) => (
                <a key={label} href={href} style={{ color: 'var(--pg-text-muted)', fontSize: 'var(--pg-text-sm)' }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div
        style={{
          ...shell,
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderTop: '1px solid var(--pg-border)',
          color: 'var(--pg-text-subtle)',
          fontSize: 'var(--pg-text-xs)',
          ...mono,
        }}
      >
        <span>provegate · MIT</span>
        <span style={{ marginLeft: 'auto' }}>{C.TAGLINE}</span>
      </div>
    </footer>
  );
}
