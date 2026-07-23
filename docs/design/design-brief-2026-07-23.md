# ProveGate — Design Brief (landing + CLI + design system)

> For: design agent / design system work. Written 2026-07-23.
> Source of truth for every factual claim below: `docs/research/provegate-bootstrap/`
> (`DECISIONS.md`, `whitepaper-gated-autonomy-2026-07-22.md`,
> `positioning-and-faq-2026-07-22.md`), plus `README.md`, `packages/provegate/QUICKSTART.md`,
> `packages/provegate/METHOD.md`, `packages/provegate/src/cli.ts`.
> **Do not invent product facts, numbers, or features.** If copy needs a claim that is not in
> this brief, flag it instead of writing it.

---

## 1. What the product is

**ProveGate** is an open-source (MIT) workflow + CLI that lets coding agents work autonomously
without anyone having to trust what the agent says about its own work. It is a **method** (the
7-Phase Gated PRD Workflow, thesis name: "Gated Autonomy") shipped as a **zero-dependency Node
CLI** plus prompts, templates and JSON schemas.

| Item | Value |
| --- | --- |
| Wordmark | **ProveGate** (CamelCase everywhere in prose/marketing) |
| Package / binary | `provegate` (lowercase); everyday command is `gate` |
| Tagline | **"ProveGate (prove + gate): prove it, then let it propagate."** |
| Thesis name | "Gated Autonomy" (whitepaper term — not the tool name) |
| Domain | provegate.dev |
| License | MIT |
| Repo | `provegate/provegate` (monorepo: `packages/provegate`, `apps/web`, `apps/docs`) |
| Status | pre-release; method extraction in progress |
| Runtime | Node ≥ 22, zero runtime dependencies, no telemetry, no network calls, no accounts |

The CamelCase wordmark is load-bearing: it separates the two morphemes and kills the
"propagate" misread. Never render it `Provegate` or `PROVEGATE` in body copy.

---

## 2. The problem (all numbers are citable, use them exactly)

Coding agents in 2026 are strong generators and unreliable narrators.

- **Agents misreport completion.** In a 20,574-session field study, "inaccurate self-reporting"
  — the agent claiming tests or deploys succeeded when they did not — is 22.58% of validated
  failure episodes, and its *share is growing* as models improve. 91.49% of visibly-resolved
  misalignment episodes needed explicit user correction; agent self-correction: 2.99%.
- **Agent consensus is not evidence.** In a security campaign, 80+ agents — including ten
  dedicated reviewer agents — unanimously endorsed an OpenSSL padding-oracle vulnerability that
  does not exist. One executed test killed it. Same study: a cross-family (Codex) critic found
  correctness issues in 3 of 19 fixes that Claude-family reviewers had approved.
- **Humans are miscalibrated too.** METR RCT: 16 experienced OSS devs, 246 tasks — they forecast
  a 24% speedup, felt a 20% speedup, and were actually **19% slower**.

So: neither the agent's claim, nor a panel of agents' consensus, nor a human's felt sense of
progress can serve as a gate. Only executed evidence can.

**What the market does instead:** spec-driven tools (Spec Kit, Kiro, BMAD, OpenSpec) gate the
*intention* with humans reading documents; worktree orchestrators isolate *files*, not claims;
adversarial-review prototypes gate on the agent's own self-assessed confidence. Adversarially
verified July 2026: no open-source workflow gates phase progression on machine-checkable
evidence.

---

## 3. The method (what we actually sell)

### 3.1 The core rule — the single idea the whole brand hangs on

> A phase boundary is a gate only when a machine can check it: a command's exit code, or an
> independent reviewer's structured verdict. The implementing agent's own assessment is never a
> gate.

### 3.2 Seven phases, one autonomy cut

| Phase | Name | Output artifact | Gate | Actor |
| --- | --- | --- | --- | --- |
| 1 | PRD Drafting | `prd-XXX.md` | human approval | human-gated |
| 2 | Readiness Scoring | `readiness-XXX.md` | binary PASS verdict + hard caps | human-gated |
| 3 | Task Generation | `tasks-XXX.md` | human "Go" | human-gated |
| 4 | Implementation | code, isolated worktree | typecheck + lint + build + class gates, exit 0 | autonomous |
| 5 | Testing | verification ledger evidence | every per-FR command exits 0 | autonomous |
| 6 | Final Auditing | review artifact | independent reviewer verdict `pass`, `Critical: 0` | autonomous |
| 7 | Learning | durable docs | declared artifacts present in the merge diff | autonomous |
| → | Merge | local integration branch | operator rows = 0 or recorded acceptance; post-merge build green | autonomous |
| → | Push | remote / CI / deploy | — | **human only** |

The cut: **humans own intent and release; the machine owns the verified middle.** If any gate
fails the runner stops and hands back, worktree intact. Ordering invariants: learning runs
*before* the merge (docs land in the same merge as the code); cleanup runs *after* the merge is
verified (a failed merge never destroys work). Absolute invariant: **the runner contains no code
path that pushes to a remote.**

### 3.3 The other five mechanisms (each is a landing-page beat)

1. **The PRD is an executable contract, not prose.** Per-FR `Targets:` (file/symbol paths),
   per-FR verification commands (§11 table — these *are* the Phase 5 gate, and a lint dry-runs
   their safety before code exists: command allowlist, `git push` and shell metacharacters
   refused), a DO-NOT list, a **Conflict Surface** (globs this item exclusively owns), **Durable
   Artifacts** (docs it promises to update), and a **PRD class**
   (`feature` / `hotfix` / `test-hardening` / `infra`) that right-sizes the pipeline.
2. **Readiness: binary verdict + empirical hard caps.** A calibration study of 143 post-ship
   findings against 83 readiness scores found the decimal score had **zero** predictive power
   inside the passing band (r = −0.03; a flagship feature shipped dead-on-arrival under a 9.1).
   So: verdict is PASS/ITERATE, decimals are advisory color, and hard caps replace deductions
   (touch a route → name a runnable access-control deny test; new client→server payload → name a
   round-trip contract test). No bypass lane.
3. **Testing: run, don't list.** A verification command that was listed but not executed is never
   `passed`. Ledger vocabulary is deliberately narrow: `passed` · `failed` · `partial` ·
   `skipped` · `operator` · `blocked`. The two escape hatches are honest ones (`operator` = needs
   a human/staging; `blocked` = dependency broken), never a silent pass.
4. **Auditing: an adversary who didn't write the code.** Phase 6 is blocking, independent, and by
   default a **different model family**. Output is a structured artifact with a machine-checked
   metadata block; `Verdict: pass` mechanically requires `Critical: 0`. High-stakes items get a
   five-lens panel (correctness, security, tenant isolation, contract, performance) with ≥3/5
   quorum; an absent reviewer never counts as a pass. Why: two post-hoc audits of *self-reviewed*
   work found 87 and 56 findings.
5. **Parallel agents: declared ownership, mechanical conflict detection.** Claiming an item writes
   a **lock as a lease** (agent, phase, TTL, worktree, branch, `ownedPaths`). A path-conflict gate
   refuses when two active leases' globs overlap — **at claim time, not merge time**. Append-only
   shared manifests are exempted via git union-merge. One merge channel: every item lands
   no-fast-forward, one at a time, with post-merge typecheck+build and auto-revert.

### 3.4 The substrate split (good diagram material)

A **deterministic runner** (script) executes gates, parses artifacts, merges, sequences — never
writes code, never pushes. **Stochastic agents** implement, test, review, write — never act as the
gate authority. Each substrate only does what it can be trusted to do.

---

## 4. Proof (and its honest limits)

- ~390 production PRDs shipped through the workflow on a multi-tenant SaaS TypeScript monorepo,
  including multi-wave parallel execution (sustained: 2–3 agents in flight).
- The 143-findings × 83-scores calibration study, and the redesign it forced. Scored era: **0**
  critical post-ship findings; unscored era: 2.
- Deferral governance: a deferred item is a ledger row with an owner, an expiry, and a renewal
  counter capped at one — after that, conversion to a tracked PRD is mechanically forced. The
  15-open-row cap has held.
- **This repo runs its own method.** Every line of ProveGate shipped through the workflow it
  implements: PRDs, readiness verdicts, task ledgers and cross-model review artifacts are all in
  the repo — including the round where the reviewer caught the maintainers weakening the method's
  own calibrated doctrine. `gate run` landed the commits that built `gate run`.
- Limits we state out loud (this candor is part of the brand): the evidence is observational and
  single-project; gates cost effort to author; process overhead is real (below some task size the
  honest answer is *don't use the workflow*); verification is only as good as the commands
  written; the landscape moves.

---

## 5. Audience

1. **Primary — the agent-fluent senior/staff engineer or tech lead.** Already runs Claude Code /
   Codex / Cursor daily, has been burned by "tests pass" that didn't, is skeptical of process and
   allergic to marketing. Reads the terminal and the repo before the landing page. Converts on
   evidence and on a runnable command, never on adjectives.
2. **Secondary — the platform/EM buyer.** Needs an audit trail for an AI policy, cares that it is
   MIT, local-only, and that push stays human.
3. **Tertiary — HN/Reddit lurker.** Arrives from a title, scans for ~15 seconds, wants the
   provocation and the proof. The "80 agents / one test" story and the `gate push` refusal are
   what they screenshot.

---

## 6. Brand voice

**Evidence-first, terse, unhype, self-critical.** Sentences carry numbers or verbs, not adjectives.
The product's own thesis (claims without evidence are worthless) applies to its marketing: never
write a claim the repo cannot back.

Voice reference lines that already exist and work:

- "Your coding agent's 'done' is not evidence. Gate it on exit codes."
- "80 agents unanimously approved a vulnerability that didn't exist. One executed test killed it."
- "Spec-driven development gates what you *intend* to build. This gates what you actually
  *shipped*."
- "Autonomous phases, machine-checkable gates, human-only push."
- "No. Push is yours."
- "The audit trail your AI policy asks for, produced as a side effect of shipping."

### Do-not-say list (hard constraints)

- ❌ "First gated workflow ever" → ✅ "first **verified open-source combination** of machine
  gates + executed-evidence shipping + cross-model review + conflict-surface orchestration".
- ❌ "Prevents all agent failures" → ✅ "shifts trust from claims to evidence".
- ❌ **Any % faster / % fewer bugs claim.** We have calibration and practice evidence, not an RCT.
  Miscalibrated speed claims are literally what we cite against others.
- ❌ **PROVEN / VIOLATED badge jargon** — that vocabulary belongs to a dead competitor (shipgate).
  The verb "prove" is fine; verdict-badge labels are not.
- ❌ Specific internal claims about Spec Kit / Kiro / BMAD unless the doc says they were verified.
- ❌ Fake dashboards, fake logos, "trusted by" rows, fabricated testimonials, invented star counts.
- ❌ Any analytics/tracking script on the landing page. "No telemetry" is a product principle; a
  tracker on provegate.dev would be a self-inflicted wound. Design must not assume any
  third-party embed, font CDN, or beacon.

Tone calibration: the "-gate" suffix reads as *quality gate*, not scandal. Confident, dry, a
little deadpan. Humour is allowed exactly where the product is already funny (`gate push` →
"No. Push is yours.").

---

## 7. Landing page (`apps/web`, Next.js on Vercel)

Current state is a placeholder: centered `<h1>`, tagline, one paragraph, an install `<pre>`, three
links (`apps/web/app/page.tsx`). Everything is inline-styled, dark, no design system. Treat it as
a blank slate; keep the copy, replace the everything-else.

**Job of the page:** in ~15 seconds convince a skeptical senior engineer that (a) the failure mode
described is one they have personally lived, (b) the mechanism is mechanical rather than
aspirational, (c) the evidence is real and honestly bounded — then get them to a terminal.

**Primary CTA:** the install/quickstart command block (copyable). **Secondary:** GitHub. Docs and
the whitepaper/case-study are third.

### Suggested section IA (sequence is arguable; content is not)

1. **Hero** — wordmark + tagline + the thesis line + install block + GitHub. One screenful.
2. **The problem** — three data points (22.58% / 80 agents / METR 19%), rendered as evidence, not
   as a stat-brag row. This is the section that earns the rest.
3. **The core rule** — the pull-quote from §3.1. Deserves to be the most typographically committed
   moment on the page.
4. **The seven phases + the autonomy cut** — the signature visual (see below).
5. **The five mechanisms** — PRD-as-contract, readiness hard caps, run-don't-list, cross-model
   audit, conflict-surface leases. Each with one concrete artifact (a §11 table row, a ledger
   vocabulary chip set, a review metadata block, a refused overlap).
6. **The refusal moment** — `$ gate push` → `No. Push is yours.` plus the sentence "the runner
   contains no code path that pushes to a remote". Small, deadpan, memorable.
7. **Proof + limits** — ~390 items, the calibration study, "this repo runs its own method", and
   the limitations, visibly adjacent. Showing the limits next to the proof *is* the design idea.
8. **Positioning** — "complementary, upstream of us / below us" rather than a competitor teardown
   table. No named-competitor scorecards.
9. **Principles / FAQ + footer** — MIT, no telemetry, zero deps, agent-agnostic, Node ≥ 22.

### Signature visuals (pick and develop, do not do all)

- **The gate chain**: seven phases as a horizontal/vertical chain where the human→machine→human
  boundary is the visual event. The final segment (push) must read as *deliberately not
  automated*.
- **Real terminal output as a hero object**: the handoff card is already a designed artifact (see
  §8) and is the most honest possible screenshot. Use real strings from the CLI, never mockups
  with invented output.
- **Claim vs evidence**: a two-column motif — what the agent said / what the exit code said.
- **The lease/conflict surface**: two globs overlapping and the claim being refused at claim time.

Avoid: floating 3D glass shapes, generic gradient orbs, AI-slop hero illustration, dashboards
that don't exist, "enterprise SaaS" trust bars.

### Constraints

- Next.js App Router, Vercel, no analytics, no external font/asset CDN (self-host everything).
- Fast on a mid laptop and readable on mobile; long code/terminal blocks scroll inside their own
  container, page body never scrolls horizontally.
- **Dark-first is decided** (§12.1): dark is the canonical rendering and the one all imagery is
  authored in; light is a real, fully-specified theme derived from it, never an afterthought.
- Accessible: real contrast ratios on terminal-colored text (the ANSI-ish greens and reds are the
  usual failure), focus states, no color-only status encoding.
- The docs site (`apps/docs`) is Fumadocs and must be able to inherit the same tokens — design
  the system so a Fumadocs theme override is a token map, not a rewrite.

---

## 8. CLI design (`packages/provegate`)

The CLI is the product surface that matters most, and it is a **design surface**: cards, tables,
symbols, spacing, exit codes, refusals.

### Hard constraints (non-negotiable)

- **Zero runtime dependencies.** No chalk, no ink, no boxen, no ora. Any color/box drawing is
  hand-rolled ANSI in-package.
- Must degrade correctly: respect `NO_COLOR`, detect non-TTY (pipes, CI logs), and stay readable
  when color is stripped. Status must never be encoded in color alone — the glyph carries it.
- Output is parsed by humans *and* by agents. Line shapes should stay grep-friendly and stable.
- `--json` exists for machine consumption (`gate queue --json`) — human formatting must never be
  the only way to get the data.

### Current command surface

```
gate init      scaffold the workflow tree + starter configs (--dry-run)
gate new       create the next PRD from the shipped template (<slug> [--class=X] [--template=path])
gate open      claim a PRD: lease its conflict surface or refuse on overlap ([--steal] [--worktree])
gate status    rebuild workflow state from artifacts and show it
gate queue     show the PRD queue (--json)
gate check     lint a PRD for readiness (PRD-XXX | --wiring)
gate run       run gated phases 4-7 + local merge (--dry-run, --from-phase=4|5|6|7|merge)
gate land      merge step only (alias for run --from-phase=merge)
gate push      (refuses — push is always yours)
```

Aliases: `provegate` and `gate` are the same binary.

### Existing output vocabulary (inventory before redesign)

- **Prefix tags**: `[init] · [new] · [open] · [check] · [run]` at line start.
- **Glyphs**: `✓` passed, `✗` failed, `⚠` warning, `→` handoff/next, `+` created, `=` skipped,
  `!` overlap, `-` issue bullet.
- **Loud states in caps**: `REFUSED`, `STOLE`, `STALE`, `DRY-RUN`, `WARNING`, `STOPPED`,
  `HANDOFF CARD`, `READY TO PUSH`, section headers `READY / IN-FLIGHT / BLOCKED / IN-REVIEW`.
- **Two box-drawn cards**, 56-char rule, `┌─ … └────`, `│` gutter (`src/core/run/cards.ts`):

```
┌─ HANDOFF CARD ─────────────────────────────────────────
│ PRD-001 (fix-login-timeout)
│ merged: feat/prd-001-fix-login-timeout → LOCAL main (no-ff)
│ diff:   6 files changed, 214 insertions(+), 12 deletions(-)
│ gates:
│   ✓ phase 4: typecheck + lint + build
│   ✓ phase 5: §11 verification commands
│   ✓ phase 6: review artifact (verdict pass, Critical 0)
│   ✓ phase 7: durable artifacts in diff
│   ✓ post-merge: build green
│ operator rows: 0 | Autonomous Close: operator-gated
│ metrics: _state/metrics.jsonl (local JSONL, yours)
│ → READY TO PUSH — run `git push` yourself (the runner never pushes)
└────────────────────────────────────────────────────────
```

```
┌─ STOPPED at Phase 5 ───────────────────────────────────
│ PRD-001: verification command exited 1
│   ✓ phase 4: typecheck + lint + build
│   ✗ phase 5: §11 verification commands
│ worktree left intact — fix and re-run with --from-phase=N, or hand back to a human
└────────────────────────────────────────────────────────
```

```
$ gate push
No. Push is yours.
```

### What to design

1. **A CLI type/typography system for a fixed-width medium**: line width budget, indentation
   levels, when a prefix tag vs an indented bullet vs a card is correct, blank-line rhythm.
2. **A status/semantic palette mapped to the 16-color ANSI floor** (plus an optional 256/truecolor
   tier), with the guarantee that stripping color loses no information. Semantic slots needed:
   pass, fail, warn, refusal, dry-run/plan, stale, human-handoff, muted metadata.
3. **The card family** — handoff, stop, and any future card — as one coherent object with shared
   header/gutter/rule rules, including behavior on narrow terminals (< 60 cols) and long values.
4. **Tabular output** for `gate status` and `gate queue`: currently loose space-joined lines
   (`PRD-001  wip  readiness=PASS/9.1  tasks=4/7  slug`). Needs column alignment that survives
   varying id/slug widths and stays greppable.
5. **The dry-run plan view** (`gate run --dry-run`): a tree of gates about to run — the moment the
   user learns what "gated" means. Highest-leverage screen after the handoff card.
6. **Error and refusal grammar**: `gate open` overlap refusal, `gate check` issue lists, config
   errors. Refusals should read as decisions, not failures.
7. **The help screen** as designed copy.
8. **Progress during a long `gate run`** — long-running gates with no dependency on a spinner
   library; think per-gate lines that resolve in place or append.

### Anti-goals

No TUI, no full-screen alternate buffer, no animation-dependent output, no emoji beyond the
existing plain glyphs, no ASCII-art banner on every invocation.

---

## 9. The design system itself

The deliverable is one system spanning **two rendering media**: a browser (unlimited color, real
type) and a terminal (fixed-width, ~16 reliable colors, glyph-limited). The interesting design
problem is making them read as one product without pretending the terminal is a browser.

Wanted:

- **Tokens**: color (semantic-first: pass / fail / warn / refusal / muted / human-boundary),
  type scale, mono scale, spacing, radius, border. Each color token must declare its ANSI
  fallback and its light/dark values, and pass contrast in both.
- **Typography**: a display/text pairing plus a mono that is honest in a terminal *and* good on
  the web (terminal specimens and web code blocks must feel like the same voice).
  **Open-source licences only, self-hosted, no font CDN** (§12.5).
- **Motion**: minimal, purposeful; the product's aesthetic is "evidence", not "delight".
- **The gate/evidence iconography** — a small set (gate, lease, exit code, verdict, human
  boundary) that works at 16px, in a diagram, and as a glyph in the terminal card family.
- **Wordmark + one small mark** (§12.2): the wordmark carries prose and the hero; a single
  abstract glyph (gate / exit-code / boundary — not a padlock, not a checkmark-in-circle) covers
  favicon, GitHub org avatar, README badge, docs header. Must survive 16px and 1-bit.

---

## 10. Deliverables requested

1. Design system spec: tokens (web + ANSI mapping), type, spacing, motion, iconography.
2. Landing page design for `apps/web` (hero → footer), light + dark, desktop + mobile.
3. CLI output design: the card family, tables, plan view, refusals, help, color/no-color matrices,
   narrow-terminal behavior — as copy-exact specimens, since these become string builders.
4. Docs-site theming notes: how `apps/docs` (Fumadocs) inherits the tokens.
5. Copy deck for the landing page, respecting §6 and the do-not-say list, with any claim that
   needs owner verification explicitly flagged.

---

## 11. Reference material in the repo

| Path | What |
| --- | --- |
| `docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md` | full argument, all numbers, limitations |
| `docs/research/provegate-bootstrap/positioning-and-faq-2026-07-22.md` | one-liners, positioning map, FAQ, do-not-say list |
| `docs/research/provegate-bootstrap/DECISIONS.md` | locked identity/architecture decisions |
| `docs/research/provegate-bootstrap/competitor-landscape-agentic-workflows-2026-07-22.md` | market |
| `packages/provegate/METHOD.md` | method spec (classes, gates, locks, deferral governance) |
| `packages/provegate/QUICKSTART.md` | the narrative a first-time user follows |
| `packages/provegate/src/cli.ts`, `src/core/run/cards.ts` | every string the CLI prints today |
| `apps/web/app/page.tsx` | the placeholder landing page being replaced |
| `apps/docs/content/docs/*.mdx` | docs IA (index, quickstart, method, cli, case-study, whitepaper) |

---

## 12. Owner decisions (settled 2026-07-23 — treat as constraints)

| # | Decision | Consequence for the design |
| --- | --- | --- |
| 1 | **Dark-first is canonical.** | The hero, every screenshot, every terminal specimen and all social/OG imagery are authored in dark. Light is still a real, fully-specified theme (docs, print, system preference) — but it is derived from the dark system, not co-equal. Token work starts dark. |
| 2 | **Wordmark + one small mark.** | ProveGate wordmark carries prose and the hero. One abstract glyph — gate / exit-code / boundary territory, not a padlock and not a checkmark-in-circle — for favicon, GitHub org avatar, README badge, and the docs header. Must survive 16px and 1-bit. The mark never replaces the wordmark in body copy. |
| 3 | **The dogfood proof lives in the proof section**, not the hero. | Hero sells the mechanism; §7.7 collects the evidence: ~390 items, the calibration study, "this repo runs its own method", and the limitations, all adjacent. Design that section to hold four heterogeneous evidence types without turning into a stat-brag row. |
| 4 | **Static, real terminal output only.** | Every terminal block on the site is a copy-exact string the CLI actually prints, rendered as selectable text — no recorded session player, no typewriter animation, no fabricated output. Zero JS for these blocks; they must be readable, indexable, and horizontally scrollable in their own container. This also means CLI card design (§8) and landing design are the same deliverable, not two. |
| 5 | **Open-source fonts only, self-hosted.** | OFL/Apache-licensed families, files committed or built into the repo, no font CDN (consistent with the no-telemetry / no-external-request rule). Identity comes from pairing, scale and rhythm rather than from an exclusive license. The mono must be genuinely good as a terminal font too, since terminal specimens and web code blocks share one voice. |
