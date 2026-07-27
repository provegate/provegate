const { useState, useEffect, useRef } = React;
const REDUCED = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const DS = window.DesignSystem_65dbcc;
const { Icon, Button, CodeBlock, HandoffCard, GateLine, PhasePipeline, EvidenceTable, VerdictBadge, Admonition } = DS;

/* ---------- brand marks ---------- */
const Mark = ({ size = 28 }) => (
  <span style={{ color: "var(--pg-accent)", display: "inline-flex" }}>
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M7 5 L7 27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M25 5 L25 27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M11 15.5 L14.5 19.5 L21.5 11" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);
const Wordmark = ({ size = "1.2rem" }) => (
  <span style={{ fontWeight: 700, fontSize: size, letterSpacing: "-0.025em", color: "var(--pg-text)" }}>
    Prove<span style={{ color: "var(--pg-accent)" }}>Gate</span>
  </span>
);

/* ---------- layout helpers ---------- */
const Eyebrow = ({ children }) => (
  <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pg-text-subtle)", marginBottom: 14 }}>{children}</div>
);
const SectionHead = ({ eyebrow, title, sub, center }) => (
  <div style={{ marginBottom: 34, maxWidth: center ? 640 : 720, marginLeft: center ? "auto" : 0, marginRight: center ? "auto" : 0, textAlign: center ? "center" : "left" }}>
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 style={{ fontSize: "clamp(1.7rem,3.2vw,2.3rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, margin: 0, color: "var(--pg-text)", textWrap: "balance" }}>{title}</h2>
    {sub ? <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "var(--pg-text-muted)", marginTop: 14, textWrap: "pretty" }}>{sub}</p> : null}
  </div>
);
function useTyping(steps, active) {
  const [line, setLine] = useState(0);
  const [col, setCol] = useState(0);
  useEffect(() => {
    if (!active) return;
    if (line >= steps.length) return;
    const full = steps[line];
    if (col < full.length) { const t = setTimeout(() => setCol(col + 1), 45); return () => clearTimeout(t); }
    const t = setTimeout(() => { setLine(line + 1); setCol(0); }, 520);
    return () => clearTimeout(t);
  }, [line, col, active, steps]);
  return { done: line, typed: steps[line] ? steps[line].slice(0, col) : "", finished: line >= steps.length };
}
function HeroTerminal() {
  const ref = useRef(null); const [go, setGo] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((e) => e.forEach(x => { if (x.isIntersecting) { setGo(true); io.disconnect(); } }), { threshold: 0.4 });
    io.observe(el); return () => io.disconnect();
  }, []);
  const steps = ["npm i -g provegate", "gate init", "gate run"];
  const { done, typed, finished } = useTyping(steps, go && !REDUCED);
  const outputs = ["added provegate v1.0", "created gate.toml \u00b7 3 gates", null];
  const shownDone = REDUCED ? steps.length : done;
  const showFinished = REDUCED || finished;
  return (
    <div ref={ref} style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-md)", overflow: "hidden", fontFamily: "var(--pg-font-mono)", boxShadow: "var(--pg-shadow-md)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", borderBottom: "1px solid var(--pg-term-border)" }}>
        <span style={{ display: "flex", gap: 6 }}>{["#f4776b", "#e8b44a", "#4fd08a"].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.85 }} />)}</span>
        <span style={{ fontSize: "0.72rem", color: "var(--pg-term-dim)", marginLeft: 4 }}>zsh — ~/app</span>
      </div>
      <div style={{ padding: "15px 16px", fontSize: "0.8125rem", lineHeight: 1.7, minHeight: 168 }}>
        {steps.map((s, i) => {
          if (i > shownDone) return null;
          const isCurrent = !REDUCED && i === done && !finished;
          const text = isCurrent ? typed : s;
          return (
            <div key={i}>
              <div><span style={{ color: "var(--pg-term-green)", userSelect: "none" }}>$ </span><span style={{ color: "var(--pg-term-fg)" }}>{text}</span>{isCurrent ? <span className="pg-caret" style={{ color: "var(--pg-term-fg)" }}>█</span> : null}</div>
              {i < shownDone && outputs[i] ? <div style={{ color: "var(--pg-term-dim)", paddingLeft: 14 }}>{outputs[i]}</div> : null}
            </div>
          );
        })}
        {showFinished ? (
          <div style={{ marginTop: 6 }}>
            <GateLine bare status="passed" name="build" command="pnpm build" code={0} />
            <GateLine bare status="passed" name="test" command="pnpm test" code={0} />
            <GateLine bare status="passed" name="typecheck" command="tsc --noEmit" code={0} />
            <div style={{ marginTop: 8, color: "var(--pg-term-green)" }}>{"\u2713"} all gates passed. exit 0.</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
function Reveal({ children, delay = 0, as: Tag = "div", style }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { setTimeout(() => el.classList.add("pg-in"), delay); io.unobserve(el); } });
    }, { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, [delay]);
  return <Tag ref={ref} className="pg-reveal" style={style}>{children}</Tag>;
}
const WRAP = { maxWidth: "var(--pg-container)", margin: "0 auto", padding: "0 28px" };
const CODE_INSTALL = "npm i -g provegate\ngate init";
const CODE_TERMINAL = "npm i -g provegate\ngate init\ngate run";
const CODE_TOML = "[gate.test]\ncmd = \"pnpm test\"\nrequire = \"exit0\"\n\n[gate.release]\nkind = \"operator\"\nreviewer = \"@lead\"";

/* ---------- theme icons ---------- */
const SunIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4" />
  </svg>
);
const MoonIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" />
  </svg>
);

/* ---------- Nav ---------- */
const NAV_LINKS_ALL = [["How it works", "#how"], ["Method", "#phases"], ["Ledger", "#ledger"], ["Proof", "#proof"], ["Install", "#install"]];
function Nav({ theme, onToggle, links }) {
  const [open, setOpen] = useState(false);
  const NAV_LINKS = links || NAV_LINKS_ALL;
  const link = { color: "var(--pg-text-muted)", fontSize: "0.9rem", fontWeight: 500 };
  const themeLabel = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 20, background: "color-mix(in srgb, var(--pg-bg) 82%, transparent)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...WRAP, padding: "13px 28px", display: "flex", alignItems: "center", gap: 12 }}>
        <a href="#top" style={{ display: "flex", alignItems: "center", gap: 9 }} aria-label="ProveGate home"><Mark size={25} /><Wordmark /></a>
        <nav style={{ display: "flex", gap: 22, marginLeft: 30 }} className="pg-navlinks" aria-label="Primary">
          {NAV_LINKS.map(([t, h]) => <a key={h} href={h} style={link}>{t}</a>)}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onToggle} title={themeLabel} aria-label={themeLabel} style={{ background: "transparent", border: "1px solid var(--pg-border-strong)", borderRadius: "var(--pg-radius-md)", width: 36, height: 36, cursor: "pointer", color: "var(--pg-text-muted)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <span className="pg-nav-cta" style={{ display: "inline-flex", gap: 10 }}>
            <Button variant="secondary" size="sm" href="#" leftIcon={<Icon name="github" size={15} />}>GitHub</Button>
            <Button variant="primary" size="sm" href="#install">Get started</Button>
          </span>
          <button className="pg-navtoggle" onClick={() => setOpen(o => !o)} aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="pg-mobile-nav" style={{ background: "transparent", border: "1px solid var(--pg-border-strong)", borderRadius: "var(--pg-radius-md)", width: 36, height: 36, cursor: "pointer", color: "var(--pg-text-muted)", alignItems: "center", justifyContent: "center" }}>
            <Icon name={open ? "cross" : "terminal"} size={16} />
          </button>
        </div>
      </div>
      {open ? (
        <div id="pg-mobile-nav" style={{ borderTop: "1px solid var(--pg-border)", background: "var(--pg-bg)", padding: "12px 28px 18px", display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_LINKS.map(([t, h]) => <a key={h} href={h} onClick={() => setOpen(false)} style={{ ...link, padding: "10px 0", borderBottom: "1px solid var(--pg-border)" }}>{t}</a>)}
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <Button variant="secondary" size="sm" href="#" leftIcon={<Icon name="github" size={15} />}>GitHub</Button>
            <Button variant="primary" size="sm" href="#install" onClick={() => setOpen(false)}>Get started</Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section id="top" style={{ ...WRAP, padding: "76px 28px 44px", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 52, alignItems: "center" }} className="pg-hero">
      <div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--pg-font-mono)", fontSize: "0.78rem", color: "var(--pg-text-subtle)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-pill)", padding: "5px 12px", marginBottom: 22 }}>
          <span style={{ color: "var(--pg-accent-text)" }}>◆</span> open-source · CLI + method
        </div>
        <h1 style={{ fontSize: "clamp(2.6rem,5vw,3.6rem)", fontWeight: 700, lineHeight: 1.04, letterSpacing: "-0.03em", margin: 0, color: "var(--pg-text)", textWrap: "balance" }}>
          An agent's <span style={{ fontFamily: "var(--pg-font-mono)", fontWeight: 500, fontSize: "0.8em" }}>done</span> is not evidence.
        </h1>
        <p style={{ fontSize: "1.18rem", lineHeight: 1.55, color: "var(--pg-text-muted)", maxWidth: 520, marginTop: 22, textWrap: "pretty" }}>
          ProveGate gates autonomous coding agents on evidence a machine can check. Work passes only when a command exits <span style={{ fontFamily: "var(--pg-font-mono)", color: "var(--pg-accent-text)" }}>0</span> — or an independent reviewer's verdict says <span style={{ fontFamily: "var(--pg-font-mono)", color: "var(--pg-accent-text)" }}>passed</span>.
        </p>
        <div style={{ marginTop: 26, maxWidth: 420 }}>
          <HeroTerminal />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" href="#install">Read the spec</Button>
          <Button variant="ghost" size="lg" href="#how" rightIcon={<Icon name="arrowRight" size={17} />}>How gates work</Button>
        </div>
        <div style={{ marginTop: 22, fontFamily: "var(--pg-font-mono)", fontSize: "0.78rem", color: "var(--pg-text-subtle)" }}>
          MIT · zero deps · local-only · no telemetry · Node ≥ 22
        </div>
      </div>
      <Reveal delay={80}>
        <HandoffCard
          title="phase 6 → 7 · a1b9f3c"
          lines={[
            { blank: true },
            { gate: "passed", text: "unit         pnpm test       exit 0" },
            { gate: "passed", text: "typecheck    tsc --noEmit    exit 0" },
            { gate: "passed", text: "lint         eslint .        exit 0" },
            { gate: "blocked", text: "e2e          playwright      not run" },
            { blank: true },
            { arrow: true, text: "No. Push is yours." },
            { blank: true },
          ]}
          style={{ boxShadow: "var(--pg-shadow-lg)" }} />
      </Reveal>
    </section>
  );
}

/* ---------- Logo/trust strip ---------- */
function TrustStrip() {
  const items = ["listed but not run is never passed", "one test killed what 80+ agents could not", "push is always yours"];
  return (
    <div style={{ borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)", background: "var(--pg-bg-subtle)" }}>
      <div style={{ ...WRAP, padding: "16px 28px", display: "flex", flexWrap: "wrap", gap: "10px 34px", alignItems: "center", justifyContent: "center" }}>
        {items.map((t, i) => (
          <span key={i} style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-text-subtle)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "var(--pg-accent-text)" }}>✓</span>{t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- How it works — animated gate run ---------- */
const RUN_LINES = [
  { status: "passed", name: "build", command: "pnpm build", code: 0 },
  { status: "passed", name: "test: unit", command: "pnpm test", code: 0 },
  { status: "passed", name: "typecheck", command: "tsc --noEmit", code: 0 },
  { status: "failed", name: "test: e2e", command: "playwright test", code: 1 },
  { status: "operator", name: "operator review", command: "gate review", code: null },
];
function GateRun() {
  const [n, setN] = useState(0);
  const ref = useRef(null); const started = useRef(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting && !started.current) { started.current = true; run(); } });
    }, { threshold: 0.3 });
    io.observe(el); return () => io.disconnect();
  }, []);
  function run() {
    if (REDUCED) { setN(RUN_LINES.length); return; }
    setN(0);
    RUN_LINES.forEach((_, i) => setTimeout(() => setN(i + 1), 420 * (i + 1)));
  }
  return (
    <div ref={ref} style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", overflow: "hidden", boxShadow: "var(--pg-shadow-md)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 16px", borderBottom: "1px solid var(--pg-term-border)" }}>
        <span style={{ display: "flex", gap: 6 }}>
          {["#f4776b", "#e8b44a", "#4fd08a"].map(c => <span key={c} style={{ width: 11, height: 11, borderRadius: "50%", background: c, opacity: 0.85 }} />)}
        </span>
        <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.75rem", color: "var(--pg-term-dim)", marginLeft: 6 }}>gate run — main</span>
        <button onClick={run} aria-label="Replay the gate run" style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-sm)", color: "var(--pg-term-dim)", fontFamily: "var(--pg-font-mono)", fontSize: "0.7rem", padding: "3px 9px", cursor: "pointer" }}>replay</button>
      </div>
      <div style={{ padding: "16px 18px", fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem", minHeight: 214 }}>
        <div style={{ color: "var(--pg-term-green)", marginBottom: 10 }}>$ gate run</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {RUN_LINES.slice(0, n).map((r, i) => <GateLine key={i} bare status={r.status} name={r.name} command={r.command} code={r.code} />)}
        </div>
        {n >= RUN_LINES.length ? (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dotted var(--pg-term-border)", color: "var(--pg-term-red)", fontSize: "0.8125rem" }}>
            ✗ gate failed — 1 failed, 1 operator pending. handoff blocked. <span style={{ color: "var(--pg-term-dim)" }}>exit 1</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
const STEPS = [
  { icon: "terminal", title: "Declare the gates", body: "Each check is a command with an expected exit code. No prose, no vibes — a gate is a thing a machine can run." },
  { icon: "machine", title: "Agent works the phases", body: "The agent implements, tests, audits and learns autonomously. Every claim it makes is re-run, not trusted." },
  { icon: "gate", title: "Evidence decides", body: "Green is earned by exit 0 or an operator verdict. Listed but not run is never passed — the ledger records it all." },
];
function How() {
  return (
    <section id="how" style={{ ...WRAP, padding: "84px 28px" }}>
      <SectionHead eyebrow="// how it works" title="Run the gates. Read the evidence. Nothing else counts." sub="ProveGate wraps your agent's workflow in checks that a machine settles. The CLI prints exactly what ran, what passed, and what did not." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 44, alignItems: "center" }} className="pg-how-grid">
        <Reveal><GateRun /></Reveal>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {STEPS.map((s, i) => (
            <Reveal key={i} delay={i * 90}>
              <div style={{ display: "flex", gap: 16, padding: "16px 0", borderBottom: i < STEPS.length - 1 ? "1px solid var(--pg-border)" : "none" }}>
                <div style={{ flex: "none", width: 42, height: 42, borderRadius: "var(--pg-radius-md)", border: "1px solid var(--pg-border-strong)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--pg-text-muted)", background: "var(--pg-surface)" }}>
                  <Icon name={s.icon} size={20} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.75rem", color: "var(--pg-text-subtle)" }}>{String(i + 1).padStart(2, "0")}</span>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0, color: "var(--pg-text)", letterSpacing: "-0.015em" }}>{s.title}</h3>
                  </div>
                  <p style={{ fontSize: "0.98rem", lineHeight: 1.55, color: "var(--pg-text-muted)", margin: "6px 0 0", textWrap: "pretty" }}>{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Phases ---------- */
const METHOD_PHASES = [
  { n: 1, label: "PRD", authority: "human" },
  { n: 2, label: "Readiness", authority: "human" },
  { n: 3, label: "Tasks", authority: "human" },
  { n: 4, label: "Implement", authority: "machine" },
  { n: 5, label: "Test", authority: "machine" },
  { n: 6, label: "Audit", authority: "machine" },
  { n: 7, label: "Learn", authority: "machine" },
];
function Phases() {
  return (
    <section id="phases" style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...WRAP, padding: "84px 28px" }}>
        <SectionHead eyebrow="// the method" title="Phases 1–3 human, 4–7 autonomous. Push is always yours." sub="A person writes the PRD, checks readiness and cuts the tasks. The agent implements, tests, audits and learns — but the runner never pushes." />
        <Reveal><PhasePipeline phases={METHOD_PHASES} active={5} /></Reveal>
      </div>
    </section>
  );
}

/* ---------- Refusal ---------- */
function Refusal() {
  return (
    <section style={{ maxWidth: "var(--pg-container-prose)", margin: "84px auto", padding: "0 28px" }}>
      <Reveal>
        <div style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", padding: "44px 32px", fontFamily: "var(--pg-font-mono)", textAlign: "center", boxShadow: "var(--pg-shadow-md)" }}>
          <div style={{ color: "var(--pg-term-dim)", fontSize: "0.85rem" }}>$ gate push</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, margin: "18px 0 10px", color: "var(--pg-term-human)", fontSize: "clamp(1.5rem,3.5vw,2rem)", fontWeight: 500 }}>
            <Icon name="human" size={28} />No. Push is yours.
          </div>
          <div style={{ color: "var(--pg-term-dim)", fontSize: "0.92rem", lineHeight: 1.6, maxWidth: 460, margin: "0 auto" }}>The runner contains no code path that pushes to a remote. That decision stays with a human.</div>
        </div>
      </Reveal>
    </section>
  );
}

/* ---------- Ledger ---------- */
function Ledger() {
  return (
    <section id="ledger" style={{ ...WRAP, padding: "0 28px 84px" }}>
      <SectionHead eyebrow="// the evidence ledger" title="Listed but not run is never passed." sub="Every gate leaves a record: the command, the machine verdict, the exit code, and where the evidence lives. Auditable after the fact, by anyone." />
      <Reveal>
        <EvidenceTable caption="run a1b9f3c · 2026-07-22 14:02 UTC" rows={[
          { check: "unit tests", command: "pnpm test", verdict: "passed", code: 0, evidence: "312 passed · 4.1s" },
          { check: "typecheck", command: "tsc --noEmit", verdict: "passed", code: 0, evidence: "0 errors" },
          { check: "integration", command: "pnpm test:int", verdict: "passed", code: 0, evidence: "48 passed" },
          { check: "e2e", command: "playwright test", verdict: "failed", code: 1, evidence: "1 failed · logs/e2e.txt" },
          { check: "release sign-off", command: "operator review", verdict: "operator", evidence: "awaiting @lead" },
        ]} />
      </Reveal>
      <p style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.85rem", color: "var(--pg-text-subtle)", marginTop: 18, textAlign: "center" }}>one test killed what 80+ agents' reasoning could not.</p>
    </section>
  );
}

/* ---------- Features ---------- */
const FEATURES = [
  { icon: "exit0", title: "Exit-0 semantics", body: "A gate passes on exit 0, fails on anything else. The contract is the same one your shell already understands." },
  { icon: "human", title: "Operator gates", body: "Some things a command can't settle — a release sign-off, a judgement call. Route those to a person and record a structured verdict." },
  { icon: "machine", title: "Independent audit", body: "Phase 6 is blocking and independent — by default a different model family. A pass mechanically requires Critical: 0; an absent reviewer never counts." },
  { icon: "merge", title: "Handoff cards", body: "Each phase hands off with a card: what ran, what passed, and whether the boundary is clear to cross." },
  { icon: "terminal", title: "CLI-native", body: "Runs where you already work. Plain output, real exit codes, scriptable in CI — no dashboard required." },
  { icon: "gate", title: "The ledger", body: "An append-only record of checks and verdicts. Reproducible, greppable, and honest about what wasn't run." },
];
function Features() {
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...WRAP, padding: "84px 28px" }}>
        <SectionHead eyebrow="// why provegate" title="Built for engineers who don't trust vibes." center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          {FEATURES.map((f, i) => (
            <Reveal key={i} delay={(i % 3) * 70}>
              <div style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-md)", padding: "22px 22px 24px", height: "100%" }}>
                <div style={{ color: "var(--pg-text-muted)", marginBottom: 14 }}><Icon name={f.icon} size={22} /></div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: "0 0 6px", color: "var(--pg-text)", letterSpacing: "-0.015em" }}>{f.title}</h3>
                <p style={{ fontSize: "0.94rem", lineHeight: 1.55, color: "var(--pg-text-muted)", margin: 0, textWrap: "pretty" }}>{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Install / CTA ---------- */
function Install() {
  return (
    <section id="install" style={{ ...WRAP, padding: "88px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 52, alignItems: "center" }} className="pg-install-grid">
        <div>
          <SectionHead eyebrow="// get started" title="Three commands to your first gate." sub="Install the CLI, initialize the config, and run. ProveGate reads your gates from a single file and prints the evidence." />
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Admonition type="tip" title="No lock-in">Gates are just commands. Delete ProveGate and your checks still run in CI exactly as before.</Admonition>
            <Admonition type="human" title="Push stays with you">ProveGate never pushes, merges, or deploys on your behalf. It verifies; you decide.</Admonition>
          </div>
        </div>
        <Reveal delay={70}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <CodeBlock filename="terminal" prompt>{CODE_TERMINAL}</CodeBlock>
            <CodeBlock filename="gates.toml">{CODE_TOML}</CodeBlock>
          </div>
        </Reveal>
      </div>
      <div style={{ marginTop: 56, textAlign: "center", background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "48px 28px" }}>
        <h2 style={{ fontSize: "clamp(1.6rem,3vw,2.1rem)", fontWeight: 600, letterSpacing: "-0.025em", margin: 0, color: "var(--pg-text)", textWrap: "balance" }}>Prove it, then propagate.</h2>
        <p style={{ fontSize: "1.05rem", color: "var(--pg-text-muted)", margin: "12px auto 0", maxWidth: 520, lineHeight: 1.55 }}>Open source. CLI-first. Free forever for the checks that keep your agents honest.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 26, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="primary" size="lg" href="#" leftIcon={<Icon name="github" size={17} />}>Star on GitHub</Button>
          <Button variant="secondary" size="lg" href="#" rightIcon={<Icon name="arrowRight" size={17} />}>Read the docs</Button>
        </div>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */
function Footer() {
  const col = (title, links) => (
    <div>
      <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pg-text-subtle)", marginBottom: 12 }}>{title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map(l => <a key={l} href="#" style={{ color: "var(--pg-text-muted)", fontSize: "0.9rem" }}>{l}</a>)}
      </div>
    </div>
  );
  return (
    <footer style={{ borderTop: "1px solid var(--pg-border)", background: "var(--pg-bg-subtle)" }}>
      <div style={{ ...WRAP, padding: "48px 28px 28px", display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }} className="pg-footer-grid">
        <div style={{ maxWidth: 280 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}><Mark size={22} /><Wordmark /></div>
          <p style={{ fontSize: "0.9rem", color: "var(--pg-text-subtle)", lineHeight: 1.55, margin: 0 }}>Gate autonomous coding agents on machine-checkable evidence.</p>
        </div>
        {col("Product", ["How it works", "The method", "Evidence ledger", "Changelog"])}
        {col("Docs", ["Quickstart", "gates.toml", "Operator gates", "CI integration"])}
        {col("Project", ["GitHub", "Spec", "License", "Contributing"])}
      </div>
      <div style={{ ...WRAP, padding: "18px 28px", display: "flex", alignItems: "center", gap: 12, borderTop: "1px solid var(--pg-border)", color: "var(--pg-text-subtle)", fontSize: "0.82rem", fontFamily: "var(--pg-font-mono)" }}>
        <span>provegate · MIT</span>
        <span style={{ marginLeft: "auto" }}>prove it, then propagate.</span>
      </div>
    </footer>
  );
}

Object.assign(window, { PG_Nav: Nav, PG_Hero: Hero, PG_TrustStrip: TrustStrip, PG_How: How, PG_Phases: Phases, PG_Refusal: Refusal, PG_Ledger: Ledger, PG_Features: Features, PG_Install: Install, PG_Footer: Footer });
