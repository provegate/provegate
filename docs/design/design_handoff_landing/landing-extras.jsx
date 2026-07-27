const { useState: xUseState, useMemo: xUseMemo } = React;
const XDS = window.DesignSystem_65dbcc;
const { Icon: XIcon, Button: XButton, CodeBlock: XCodeBlock, GateLine: XGateLine, VerdictBadge: XVerdictBadge, Admonition: XAdmonition } = XDS;

const XWRAP = { maxWidth: "var(--pg-container)", margin: "0 auto", padding: "0 28px" };
const XEyebrow = ({ children }) => (
  <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pg-text-subtle)", marginBottom: 14 }}>{children}</div>
);
const XHead = ({ eyebrow, title, sub, center }) => (
  <div style={{ marginBottom: 34, maxWidth: center ? 640 : 720, marginLeft: center ? "auto" : 0, marginRight: center ? "auto" : 0, textAlign: center ? "center" : "left" }}>
    <XEyebrow>{eyebrow}</XEyebrow>
    <h2 style={{ fontSize: "clamp(1.7rem,3.2vw,2.3rem)", fontWeight: 600, letterSpacing: "-0.025em", lineHeight: 1.1, margin: 0, color: "var(--pg-text)", textWrap: "balance" }}>{title}</h2>
    {sub ? <p style={{ fontSize: "1.05rem", lineHeight: 1.6, color: "var(--pg-text-muted)", marginTop: 14, textWrap: "pretty" }}>{sub}</p> : null}
  </div>
);
function XReveal({ children, delay = 0, style }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((ents) => ents.forEach(e => { if (e.isIntersecting) { setTimeout(() => el.classList.add("pg-in"), delay); io.unobserve(el); } }), { threshold: 0.12 });
    io.observe(el); return () => io.disconnect();
  }, [delay]);
  return <div ref={ref} className="pg-reveal" style={style}>{children}</div>;
}

/* ---------- Tabs primitive (engineered, hairline) ---------- */
function Tabs({ tabs, value, onChange }) {
  return (
    <div role="tablist" style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--pg-border)", marginBottom: 16, flexWrap: "wrap" }}>
      {tabs.map(t => {
        const active = t.id === value;
        return (
          <button key={t.id} role="tab" aria-selected={active} onClick={() => onChange(t.id)} style={{
            background: "transparent", border: "none", cursor: "pointer",
            fontFamily: "var(--pg-font-mono)", fontSize: "0.82rem", padding: "9px 14px",
            color: active ? "var(--pg-text)" : "var(--pg-text-subtle)",
            borderBottom: active ? "2px solid var(--pg-text)" : "2px solid transparent",
            marginBottom: -1, fontWeight: active ? 600 : 400,
          }}>{t.label}</button>
        );
      })}
    </div>
  );
}

/* ---------- 1. Tabbed install ---------- */
const INSTALLERS = {
  npm: "npm i -g provegate\ngate init",
  pnpm: "pnpm add -g provegate\ngate init",
  brew: "brew install provegate/tap/gate\ngate init",
  curl: "curl -fsSL https://provegate.dev/install.sh | sh\ngate init",
};
function InstallTabs() {
  const [tab, setTab] = xUseState("npm");
  return (
    <section style={{ ...XWRAP, padding: "84px 28px 0" }}>
      <XHead eyebrow="// install" title="Install however you ship." sub="One binary, no runtime dependencies. Pick your package manager — the gates are the same everywhere." />
      <div style={{ maxWidth: 620 }}>
        <XReveal>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "npm", label: "npm" }, { id: "pnpm", label: "pnpm" }, { id: "brew", label: "brew" }, { id: "curl", label: "curl" }]} />
          <XCodeBlock filename={tab === "curl" ? "install.sh" : "terminal"} prompt>{INSTALLERS[tab]}</XCodeBlock>
        </XReveal>
      </div>
    </section>
  );
}

/* ---------- 2. Command reference ---------- */
const COMMANDS = [
  { cmd: "gate init", desc: "scaffold gate.toml in the current repo" },
  { cmd: "gate run", desc: "run every gate, write the evidence ledger" },
  { cmd: "gate push", desc: "refuses — the runner never pushes for you" },
  { cmd: "gate ledger", desc: "list past runs and their recorded evidence" },
];
function CommandRef() {
  return (
    <section style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// command reference" title="Four commands. That's the whole surface." sub="No daemon, no dashboard, no account. Everything runs where you already work and prints exactly what it did. The runner has no code path that pushes — gate push refuses." />
      <XReveal>
        <div style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", overflow: "hidden", boxShadow: "var(--pg-shadow-sm)" }}>
          {COMMANDS.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "13px 18px", borderTop: i ? "1px solid var(--pg-term-border)" : "none", fontFamily: "var(--pg-font-mono)", flexWrap: "wrap" }}>
              <span style={{ color: "var(--pg-term-green)", flex: "none", userSelect: "none" }}>$</span>
              <span style={{ color: "var(--pg-term-fg)", fontSize: "0.85rem", minWidth: 210 }}>{c.cmd}</span>
              <span style={{ color: "var(--pg-term-dim)", fontSize: "0.82rem", flex: 1 }}>{c.desc}</span>
            </div>
          ))}
        </div>
      </XReveal>
    </section>
  );
}

/* ---------- 3. Interactive playground ---------- */
const DEFAULT_TOML = `[gate.build]
cmd = "pnpm build"
require = "exit0"

[gate.test]
cmd = "pnpm test"
require = "exit0"

[gate.release]
kind = "operator"
reviewer = "@lead"`;
function parseGates(src) {
  const out = []; let cur = null;
  src.split("\n").forEach(raw => {
    const line = raw.trim();
    let m = line.match(/^\[gate\.([\w-]+)\]$/);
    if (m) { cur = { name: m[1], cmd: null, expect: 0, kind: "machine", reviewer: null }; out.push(cur); return; }
    if (!cur) return;
    if ((m = line.match(/^cmd\s*=\s*"(.*)"$/))) cur.cmd = m[1];
    else if ((m = line.match(/^require\s*=\s*"exit(\d+)"$/))) cur.expect = parseInt(m[1], 10);
    else if ((m = line.match(/^kind\s*=\s*"(.*)"$/))) cur.kind = m[1];
    else if ((m = line.match(/^reviewer\s*=\s*"(.*)"$/))) cur.reviewer = m[1];
  });
  return out;
}
function Playground() {
  const [src, setSrc] = xUseState(DEFAULT_TOML);
  const gates = xUseMemo(() => parseGates(src), [src]);
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...XWRAP, padding: "84px 28px" }}>
        <XHead eyebrow="// playground" title="Edit the config. Watch the gate run." sub="This is the whole model: gates in, evidence out. Change a command, a require, or add an operator gate — the run below re-reads it live." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "stretch" }} className="pg-pg-grid">
          <XReveal style={{ height: "100%" }}>
            <div style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--pg-term-border)", color: "var(--pg-term-dim)", fontFamily: "var(--pg-font-mono)", fontSize: "0.75rem" }}>
                <XIcon name="terminal" size={14} /> gate.toml
                <button onClick={() => setSrc(DEFAULT_TOML)} aria-label="Reset config to default" style={{ marginLeft: "auto", background: "transparent", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-sm)", color: "var(--pg-term-dim)", fontFamily: "var(--pg-font-mono)", fontSize: "0.7rem", padding: "2px 8px", cursor: "pointer" }}>reset</button>
              </div>
              <textarea value={src} onChange={e => setSrc(e.target.value)} spellCheck={false} style={{
                flex: 1, minHeight: 260, resize: "vertical", background: "transparent", border: "none", outline: "none",
                color: "var(--pg-term-fg)", fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem", lineHeight: 1.6, padding: "14px 16px",
              }} />
            </div>
          </XReveal>
          <XReveal delay={80} style={{ height: "100%" }}>
            <div style={{ background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", padding: "16px 18px", height: "100%", fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem" }}>
              <div style={{ color: "var(--pg-term-green)", marginBottom: 12 }}>$ gate run</div>
              {gates.length === 0 ? (
                <div style={{ color: "var(--pg-term-dim)" }}>no gates found — add a <span style={{ color: "var(--pg-term-fg)" }}>[gate.name]</span> block.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {gates.map((g, i) => {
                    if (g.kind === "operator") return <XGateLine key={i} bare status="operator" name={g.name} command={g.reviewer ? `review → ${g.reviewer}` : "operator"} />;
                    return <XGateLine key={i} bare status="passed" name={g.name} command={g.cmd || "—"} code={g.expect} />;
                  })}
                </div>
              )}
              {gates.length > 0 ? (() => {
                const ops = gates.filter(g => g.kind === "operator").length;
                const machine = gates.length - ops;
                return (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dotted var(--pg-term-border)", color: ops ? "var(--pg-term-amber)" : "var(--pg-term-green)" }}>
                    {ops ? `→ ${machine} passed, ${ops} awaiting operator. handoff blocked.` : `✓ all ${machine} gates passed. exit 0.`}
                  </div>
                );
              })() : null}
            </div>
          </XReveal>
        </div>
        <p style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-text-subtle)", marginTop: 14 }}>illustrative — real runs execute your commands and record actual exit codes.</p>
      </div>
    </section>
  );
}

/* ---------- 4. CI integration ---------- */
const CI = {
  actions: { file: ".github/workflows/gate.yml", code: `name: gate
on: [push, pull_request]
jobs:
  gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g provegate
      - run: gate run --ci` },
  gitlab: { file: ".gitlab-ci.yml", code: `gate:
  image: node:20
  script:
    - npm i -g provegate
    - gate run --ci
  artifacts:
    paths: [.gate/ledger.json]` },
  pre: { file: ".git/hooks/pre-push", code: `#!/bin/sh
# block the push if the gates aren't green
gate run --quiet || {
  echo "gate failed — push blocked."
  exit 1
}` },
};
function CIIntegration() {
  const [tab, setTab] = xUseState("actions");
  const c = CI[tab];
  return (
    <section style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// ci integration" title="Same gates in CI. Exit codes travel." sub="ProveGate is just a command, so it drops into any pipeline. --ci prints machine-parseable output and fails the job on the first non-zero gate." />
      <div style={{ maxWidth: 680 }}>
        <XReveal>
          <Tabs value={tab} onChange={setTab} tabs={[{ id: "actions", label: "GitHub Actions" }, { id: "gitlab", label: "GitLab CI" }, { id: "pre", label: "pre-push hook" }]} />
          <XCodeBlock filename={c.file}>{c.code}</XCodeBlock>
        </XReveal>
      </div>
    </section>
  );
}

/* ---------- 5. Comparison ---------- */
function Comparison() {
  const col = (title, glyph, glyphColor, rows, foot, footVerdict) => (
    <div style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "26px 24px", height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <span style={{ color: glyphColor, display: "inline-flex" }}><XIcon name={glyph} size={20} /></span>
        <h3 style={{ fontSize: "1.05rem", fontWeight: 600, margin: 0, color: "var(--pg-text)", letterSpacing: "-0.015em" }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", gap: 10, fontSize: "0.94rem", lineHeight: 1.5, color: "var(--pg-text-muted)" }}>
            <span style={{ color: glyphColor, flex: "none", fontFamily: "var(--pg-font-mono)" }}>{glyph === "cross" ? "✗" : "✓"}</span>
            <span>{r}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--pg-border)" }}>
        <XVerdictBadge verdict={footVerdict} label={foot} />
      </div>
    </div>
  );
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...XWRAP, padding: "84px 28px" }}>
        <XHead eyebrow="// the difference" title="Self-attestation vs. evidence." center sub="An agent saying it's done and a gate proving it are not the same event. ProveGate only records the second one." />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="pg-cmp-grid">
          <XReveal style={{ height: "100%" }}>
            {col("Self-attestation", "cross", "var(--pg-fail-text)", [
              "\u201cI ran the tests and they pass.\u201d — unverified",
              "Green is claimed, never re-run",
              "Failures surface after merge, in production",
              "No record of what actually executed",
            ], "trust me", "failed")}
          </XReveal>
          <XReveal delay={80} style={{ height: "100%" }}>
            {col("ProveGate evidence", "check", "var(--pg-pass-text)", [
              "The command is re-run independently, every time",
              "Green is earned by exit 0 or an operator verdict",
              "Failures block the handoff before they propagate",
              "Every check and verdict lands in the ledger",
            ], "exit 0", "passed")}
          </XReveal>
        </div>
      </div>
    </section>
  );
}

/* ---------- 6. Operator gate flow ---------- */
function OperatorFlow() {
  const node = (glyph, label, tone, pill) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
      <div style={{
        width: 58, height: 58, display: "flex", alignItems: "center", justifyContent: "center",
        border: `1.5px solid ${tone}`, color: tone, background: "var(--pg-surface)",
        borderRadius: pill ? "var(--pg-radius-pill)" : "var(--pg-radius-md)",
      }}><XIcon name={glyph} size={24} /></div>
      <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.78rem", color: "var(--pg-text-muted)", maxWidth: 120 }}>{label}</span>
    </div>
  );
  const conn = (dashed) => (
    <div style={{ flex: 1, minWidth: 30, height: 0, borderTop: `1.5px ${dashed ? "dashed" : "solid"} var(--pg-border-strong)`, margin: "0 4px", alignSelf: "flex-start", marginTop: 29 }} />
  );
  return (
    <section style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// operator gates" title="When a command can't decide, a person does." sub="Some checks aren't machine-settleable — a release sign-off, a security judgement. Route those to a reviewer; the verdict is recorded the same way as any exit code." />
      <XReveal>
        <div style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "36px 28px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", flexWrap: "wrap", gap: 4 }}>
            {node("machine", "gates pass, exit 0", "var(--pg-text-muted)", false)}
            {conn(true)}
            {node("human", "reviewer verdict", "var(--pg-human)", true)}
            {conn(false)}
            {node("gate", "recorded in ledger", "var(--pg-text-muted)", false)}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 28, flexWrap: "wrap" }}>
            <XVerdictBadge verdict="operator" label="@lead approves" />
            <XVerdictBadge verdict="passed" label="release" />
          </div>
        </div>
      </XReveal>
    </section>
  );
}

/* ---------- 7. FAQ + Quickstart ---------- */
const QUICKSTART = [
  { t: "Install the CLI", d: "One binary, global. No project runtime to add." },
  { t: "gate init", d: "Scaffolds a gates.toml with sensible defaults for your stack." },
  { t: "Declare your gates", d: "Each gate is a command and an expected exit code — or an operator." },
  { t: "gate run", d: "Runs everything, prints the evidence, writes the ledger. You push." },
];
const FAQS = [
  { q: "Does ProveGate run my code?", a: "It runs the commands you declare, nothing more. A gate is a command plus an expected exit code — the same thing your shell and CI already run." },
  { q: "Will it push or merge for me?", a: "No. Push is yours. ProveGate verifies and records evidence; the decision to propagate always stays with a human." },
  { q: "What if I stop using it?", a: "Your gates are plain commands. Delete ProveGate and they still run in CI exactly as before. There is no lock-in and no proprietary format to migrate off." },
  { q: "What's an operator gate?", a: "A check a machine can't settle — a sign-off, a judgement call. It's routed to a named reviewer whose structured pass/fail verdict is recorded like any exit code." },
  { q: "Is it really free?", a: "The CLI and method are open source under MIT. Free forever for the checks that keep your agents honest." },
];
function FAQItem({ q, a }) {
  const [open, setOpen] = xUseState(false);
  return (
    <div style={{ borderBottom: "1px solid var(--pg-border)" }}>
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, background: "transparent", border: "none", cursor: "pointer", padding: "18px 0", textAlign: "left" }}>
        <span style={{ color: "var(--pg-text-subtle)", display: "inline-flex", transform: open ? "rotate(90deg)" : "none", transition: "transform .18s cubic-bezier(0.2,0,0.1,1)" }}><XIcon name="chevronRight" size={16} /></span>
        <span style={{ fontSize: "1.02rem", fontWeight: 500, color: "var(--pg-text)", flex: 1 }}>{q}</span>
      </button>
      {open ? <p style={{ margin: "0 0 18px 30px", fontSize: "0.96rem", lineHeight: 1.6, color: "var(--pg-text-muted)", textWrap: "pretty" }}>{a}</p> : null}
    </div>
  );
}
function FaqAndQuickstart() {
  return (
    <section style={{ ...XWRAP, padding: "84px 28px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 56, alignItems: "start" }} className="pg-faq-grid">
        <div>
          <XHead eyebrow="// quickstart" title="Green in four steps." />
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {QUICKSTART.map((s, i) => (
              <XReveal key={i} delay={i * 70}>
                <div style={{ display: "flex", gap: 16, padding: "14px 0", borderBottom: i < QUICKSTART.length - 1 ? "1px solid var(--pg-border)" : "none" }}>
                  <span style={{ flex: "none", width: 30, height: 30, borderRadius: "var(--pg-radius-pill)", border: "1px solid var(--pg-border-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-text-muted)" }}>{i + 1}</span>
                  <div>
                    <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--pg-text)", fontFamily: /gate/.test(s.t) ? "var(--pg-font-mono)" : "inherit" }}>{s.t}</div>
                    <p style={{ margin: "4px 0 0", fontSize: "0.92rem", lineHeight: 1.5, color: "var(--pg-text-muted)" }}>{s.d}</p>
                  </div>
                </div>
              </XReveal>
            ))}
          </div>
        </div>
        <div>
          <XHead eyebrow="// faq" title="Honest answers." />
          <div>{FAQS.map((f, i) => <FAQItem key={i} {...f} />)}</div>
        </div>
      </div>
    </section>
  );
}

/* ---------- 8. Interactive 7-phase detail ---------- */
const PHASE_DATA = [
  { n: 1, label: "PRD", authority: "human", who: "you", d: "The PRD is an executable contract \u2014 per-FR target paths, verification commands, a DO-NOT list and a conflict surface. Not prose." },
  { n: 2, label: "Readiness", authority: "human", who: "you", d: "A PASS / ITERATE verdict with hard caps decides whether the plan is ready. Decimal scores are advisory \u2014 they had no predictive power inside the passing band." },
  { n: 3, label: "Tasks", authority: "human", who: "you", d: "The work is cut into tasks with declared ownership. Claiming an item writes a lease; overlapping leases are refused at claim time, not merge time." },
  { n: 4, label: "Implement", authority: "machine", who: "agent", d: "The agent writes the code for the task. It works autonomously, but its claim of done earns nothing yet." },
  { n: 5, label: "Test", authority: "machine", who: "agent", d: "The declared verification commands run. A command that was listed but not executed is never passed." },
  { n: 6, label: "Audit", authority: "machine", who: "agent", d: "An independent reviewer \u2014 by default a different model family \u2014 must return Critical: 0. An absent reviewer never counts as a pass." },
  { n: 7, label: "Learn", authority: "machine", who: "agent", d: "Durable artifacts and the evidence ledger are assembled at the boundary: what ran, what passed, what is clear to cross." },
  { n: "push", label: "Push", authority: "human", who: "you", d: "You read the evidence and push. The runner contains no code path that pushes to a remote \u2014 that decision stays with a human." },
];
function PhaseDetail() {
  const [sel, setSel] = xUseState(5);
  const cur = PHASE_DATA.find(p => p.n === sel);
  const human = cur.authority === "human";
  const tone = human ? "var(--pg-human)" : "var(--pg-text-muted)";
  return (
    <section id="phase-detail" style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// the seven phases" title="Every phase, and who owns it." sub="Select a phase to see what happens and who decides. Human owns 1–3 and the push; the agent works 4–7 \u2014 but earns nothing without evidence." />
      <XReveal>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
          {PHASE_DATA.map(p => {
            const active = p.n === sel;
            const ph = p.authority === "human";
            const c = ph ? "var(--pg-human)" : "var(--pg-text-muted)";
            return (
              <button key={p.n} onClick={() => setSel(p.n)} aria-pressed={active} style={{
                display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer",
                background: active ? (ph ? "var(--pg-human-bg)" : "var(--pg-bg-subtle)") : "transparent",
                border: `1px solid ${active ? c : "var(--pg-border)"}`,
                borderRadius: ph ? "var(--pg-radius-pill)" : "var(--pg-radius-md)",
                padding: "7px 13px", color: active ? "var(--pg-text)" : "var(--pg-text-muted)",
                fontFamily: "var(--pg-font-sans)", fontSize: "0.85rem", fontWeight: active ? 600 : 500,
              }}>
                <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.7rem", color: c }}>{p.n}</span>{p.label}
              </button>
            );
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 22, alignItems: "start", background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "26px 26px" }} className="pg-phasedetail">
          <div style={{
            width: 58, height: 58, flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
            border: `1.5px solid ${tone}`, color: tone, background: human ? "var(--pg-human-bg)" : "var(--pg-bg-subtle)",
            borderRadius: human ? "var(--pg-radius-pill)" : "var(--pg-radius-md)",
          }}><XIcon name={human ? "human" : "machine"} size={26} /></div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0, color: "var(--pg-text)", letterSpacing: "-0.02em" }}>{cur.label}</h3>
              <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.7rem", letterSpacing: "0.06em", textTransform: "uppercase", color: tone, border: `1px solid color-mix(in srgb, ${tone} 40%, transparent)`, borderRadius: "var(--pg-radius-sm)", padding: "2px 8px" }}>{human ? "human gate" : "machine gate"} · {cur.who}</span>
            </div>
            <p style={{ margin: 0, fontSize: "1.02rem", lineHeight: 1.6, color: "var(--pg-text-muted)", textWrap: "pretty" }}>{cur.d}</p>
          </div>
        </div>
      </XReveal>
    </section>
  );
}

/* ---------- 9. Anatomy of a gate ---------- */
const ANATOMY = [
  { seg: "glyph", desc: "pass / fail / pending, in the status color", color: "var(--pg-term-green)" },
  { seg: "name", desc: "the gate's declared name", color: "var(--pg-term-fg)" },
  { seg: "command", desc: "exactly what was executed", color: "var(--pg-term-dim)" },
  { seg: "leader", desc: "dotted rule, echoing CLI output", color: "var(--pg-term-dim)" },
  { seg: "verdict", desc: "the recorded outcome", color: "var(--pg-term-green)" },
  { seg: "exit", desc: "the real process exit code", color: "var(--pg-term-dim)" },
];
function Anatomy() {
  const [hov, setHov] = xUseState(null);
  const part = (key, children) => (
    <span onMouseEnter={() => setHov(key)} onMouseLeave={() => setHov(null)} style={{
      padding: "2px 4px", borderRadius: "var(--pg-radius-sm)", cursor: "default",
      background: hov === key ? "color-mix(in srgb, var(--pg-human) 22%, transparent)" : "transparent",
      transition: "background .15s cubic-bezier(0.2,0,0.1,1)",
    }}>{children}</span>
  );
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)" }}>
      <div style={{ ...XWRAP, padding: "84px 28px" }}>
        <XHead eyebrow="// anatomy of a gate" title="One line, and nothing hidden." center sub="This is a single line of gate run output. Every part is evidence a machine produced — hover to read what each does." />
        <XReveal>
          <div style={{ maxWidth: 720, margin: "0 auto", background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-lg)", padding: "34px 28px", boxShadow: "var(--pg-shadow-md)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--pg-font-mono)", fontSize: "clamp(0.8rem,1.6vw,0.98rem)", color: "var(--pg-term-fg)", flexWrap: "nowrap" }}>
              {part("glyph", <span style={{ color: "var(--pg-term-green)" }}>{"\u2713"}</span>)}
              {part("name", <span>test: unit</span>)}
              {part("command", <span style={{ color: "var(--pg-term-dim)" }}>pnpm test</span>)}
              {part("leader", <span style={{ flex: 1, borderBottom: "1px dotted var(--pg-term-border)", minWidth: 24, transform: "translateY(-4px)", display: "inline-block" }} />)}
              {part("verdict", <span style={{ color: "var(--pg-term-green)" }}>passed</span>)}
              {part("exit", <span style={{ color: "var(--pg-term-dim)" }}>exit 0</span>)}
            </div>
          </div>
        </XReveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, maxWidth: 900, margin: "22px auto 0" }}>
          {ANATOMY.map(a => (
            <div key={a.seg} onMouseEnter={() => setHov(a.seg)} onMouseLeave={() => setHov(null)} style={{
              background: "var(--pg-surface)", border: `1px solid ${hov === a.seg ? "var(--pg-human)" : "var(--pg-border)"}`,
              borderRadius: "var(--pg-radius-md)", padding: "13px 15px", transition: "border-color .15s",
            }}>
              <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-text)", marginBottom: 4 }}>{a.seg}</div>
              <div style={{ fontSize: "0.85rem", lineHeight: 1.45, color: "var(--pg-text-muted)" }}>{a.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- 10. Problem — canonical proof stats ---------- */
const PROBLEM = [
  { fig: "22.58%", figColor: "var(--pg-fail-text)", body: <>of validated failure episodes are <strong style={{ color: "var(--pg-text)" }}>inaccurate self-reporting</strong> — the agent claiming a test or deploy passed when it did not. Its share grows as models improve.</>, src: "20,574-session field study" },
  { fig: <>80+ <span style={{ fontSize: "1rem", color: "var(--pg-text-subtle)" }}>agents</span></>, figColor: "var(--pg-text)", body: <>unanimously endorsed an OpenSSL padding-oracle vulnerability that <strong style={{ color: "var(--pg-text)" }}>does not exist</strong> — ten of them dedicated reviewers. One executed test killed it.</>, src: "security review campaign" },
  { fig: <>19% <span style={{ fontSize: "1rem", color: "var(--pg-text-subtle)" }}>slower</span></>, figColor: "var(--pg-text)", body: <>Experienced devs forecast a 24% speedup and felt a 20% speedup — and were measurably <strong style={{ color: "var(--pg-text)" }}>slower</strong>. Felt progress is not evidence either.</>, src: "METR RCT · 16 devs · 246 tasks" },
];
function Problem() {
  return (
    <section id="problem" style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// the problem" title="Strong generators. Unreliable narrators." sub="Neither the agent's claim, nor a panel of agents' consensus, nor a human's felt sense of progress can serve as a gate. Only executed evidence can." />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 18 }} className="pg-problem-grid">
        {PROBLEM.map((p, i) => (
          <XReveal key={i} delay={i * 80} style={{ height: "100%" }}>
            <div style={{ background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "26px 24px", height: "100%" }}>
              <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "2.4rem", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1, color: p.figColor }}>{p.fig}</div>
              <div style={{ fontSize: "0.98rem", lineHeight: 1.55, color: "var(--pg-text-muted)", marginTop: 12, textWrap: "pretty" }}>{p.body}</div>
              <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.72rem", color: "var(--pg-text-subtle)", marginTop: 14 }}>{p.src}</div>
            </div>
          </XReveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- 11. Core rule (band) ---------- */
function CoreRule() {
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)", padding: "76px 0" }}>
      <div style={{ maxWidth: "var(--pg-container-prose)", margin: "0 auto", padding: "0 28px" }}>
        <XEyebrow>// the core rule</XEyebrow>
        <p style={{ fontSize: "clamp(1.5rem,2.6vw,2.1rem)", fontWeight: 600, lineHeight: 1.28, letterSpacing: "-0.02em", color: "var(--pg-text)", margin: 0, textWrap: "pretty" }}>
          A phase boundary is a gate only when a machine can check it: a command's exit code, or an independent reviewer's structured verdict. <span style={{ color: "var(--pg-text-subtle)" }}>The implementing agent's own assessment is never a gate — and neither is a panel of agents' consensus, nor a human's felt sense of progress.</span>
        </p>
      </div>
    </section>
  );
}

/* ---------- 12. Proof + honest limits ---------- */
const PROOF_EVIDENCE = [
  <>~390 production PRDs shipped through the workflow on a multi-tenant SaaS TypeScript monorepo, including multi-wave parallel execution.</>,
  <>Scored era: <strong style={{ color: "var(--pg-text)" }}>0</strong> critical post-ship findings. Unscored era: 2. A 143-findings \u00d7 83-scores study forced the redesign.</>,
  <>This repo runs its own method. <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.9em" }}>gate run</span> landed the commits that built <span style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.9em" }}>gate run</span>.</>,
];
const PROOF_LIMITS = [
  "The evidence is observational and single-project. No RCT, no speedup claim.",
  "Gates cost effort to author, and process overhead is real — below some task size the honest answer is don't use the workflow.",
  "Verification is only as good as the commands written. And the landscape moves.",
];
function Proof() {
  const col = { background: "var(--pg-surface)", border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-lg)", padding: "28px 26px", height: "100%" };
  const li = { fontSize: "0.98rem", lineHeight: 1.5, color: "var(--pg-text-muted)", paddingLeft: 22, position: "relative", marginBottom: 14, textWrap: "pretty" };
  const bullet = { position: "absolute", left: 0, fontFamily: "var(--pg-font-mono)" };
  return (
    <section id="proof" style={{ ...XWRAP, padding: "84px 28px" }}>
      <XHead eyebrow="// proof, and its honest limits" title="Showing the limits next to the proof is the point." sub="ProveGate is measured, not breathless. The evidence is real — and so are the conditions under which it doesn't apply." />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }} className="pg-proof-grid">
        <XReveal style={{ height: "100%" }}>
          <div style={col}>
            <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-accent-text)", marginBottom: 18 }}>evidence</div>
            {PROOF_EVIDENCE.map((t, i) => <div key={i} style={li}><span style={{ ...bullet, color: "var(--pg-pass-text)" }}>{"\u2713"}</span>{t}</div>)}
          </div>
        </XReveal>
        <XReveal delay={80} style={{ height: "100%" }}>
          <div style={col}>
            <div style={{ fontFamily: "var(--pg-font-mono)", fontSize: "0.8rem", color: "var(--pg-text-subtle)", marginBottom: 18 }}>limits we state out loud</div>
            {PROOF_LIMITS.map((t, i) => <div key={i} style={li}><span style={{ ...bullet, color: "var(--pg-text-subtle)" }}>{"\u00b7"}</span>{t}</div>)}
          </div>
        </XReveal>
      </div>
    </section>
  );
}

/* ---------- 13. Positioning (band) ---------- */
function Positioning() {
  return (
    <section style={{ background: "var(--pg-bg-subtle)", borderTop: "1px solid var(--pg-border)", borderBottom: "1px solid var(--pg-border)", padding: "64px 0" }}>
      <div style={{ maxWidth: "var(--pg-container-prose)", margin: "0 auto", padding: "0 28px" }}>
        <XEyebrow>// where it sits</XEyebrow>
        <p style={{ fontSize: "clamp(1.25rem,2.2vw,1.5rem)", fontWeight: 600, lineHeight: 1.35, letterSpacing: "-0.01em", color: "var(--pg-text)", margin: 0, textWrap: "pretty" }}>
          Spec-driven development gates what you <em style={{ fontStyle: "normal", color: "var(--pg-text-subtle)" }}>intend</em> to build. ProveGate gates what you actually <span style={{ color: "var(--pg-accent-text)" }}>shipped</span> — complementary, downstream of the spec.
        </p>
      </div>
    </section>
  );
}

Object.assign(window, { PG_InstallTabs: InstallTabs, PG_CommandRef: CommandRef, PG_Playground: Playground, PG_CIIntegration: CIIntegration, PG_Comparison: Comparison, PG_OperatorFlow: OperatorFlow, PG_FaqAndQuickstart: FaqAndQuickstart, PG_PhaseDetail: PhaseDetail, PG_Anatomy: Anatomy, PG_Problem: Problem, PG_CoreRule: CoreRule, PG_Proof: Proof, PG_Positioning: Positioning });
