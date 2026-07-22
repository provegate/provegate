# Positioning & FAQ — Gated Autonomy Workflow (launch source material)

> Internal source document feeding the future README, launch blog post, and comment-thread replies.
> English by design (launch language). Companion to the whitepaper and roadmap, 2026-07-22.

---

## 1. One-liners (pick per channel)

- **Thesis:** Your coding agent's "done" is not evidence. Gate it on exit codes.
- **Category:** Spec-driven development gates what you _intend_ to build. This gates what you
  actually _shipped_.
- **Mechanism:** Autonomous phases, machine-checkable gates, human-only push.
- **Provocation (HN-style):** 80 agents unanimously approved a vulnerability that didn't exist.
  One executed test killed it. Build your workflow around the test, not the consensus.
- **Enterprise:** The audit trail your AI policy asks for, produced as a side effect of shipping.
- **Brand:** ProveGate — prove it, then let it propagate.

## 2. Elevator pitch (90 words)

Coding agents misreport completion — in 20K+ real sessions, false "tests pass" claims are the
third most common failure and growing. This workflow makes agent self-assessment structurally
irrelevant: seven phases where every autonomous boundary is a machine-checkable gate (a verification
command's exit code or an independent cross-model reviewer's structured verdict), executed-evidence
testing ("listed but not run" is never "passed"), declared conflict surfaces for parallel agents,
and a hard rule that nothing pushes to a remote without a human. Hardened over ~390 production PRDs.
MIT, agent-agnostic, bring your own gates.

## 3. Positioning map (what we are / are not)

| They are                                                                    | We are                                                                            | Relationship                                                                                |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Spec Kit / Kiro / BMAD / OpenSpec: spec authoring, human doc-review gates   | Execution-to-ship gating on executed evidence                                     | **Complementary, upstream of us.** Their output (spec + tasks) is our Phase 1–3 input shape |
| Worktree orchestrators / agent teams: file isolation, session management    | Claim verification + conflict-surface ownership + merge train                     | **Complementary, below us.** We add the layer their own docs say is manual                  |
| Adversarial-review tools (multi-model-review, adverse…): cross-model debate | Cross-model review **plus** machine-checked verdict schema plus executed evidence | We mandate what they prototype, and gate what they self-assess                              |
| CI/CD: post-push verification                                               | Pre-push, in-workflow, per-phase verification                                     | CI is the second net; our gates fire before anything leaves the machine                     |
| Devin-style full autonomy: ticket → PR, review everything after             | Bounded autonomy: humans own intent + release, machine owns the verified middle   | Different bet on where trust goes                                                           |

**Category claim we can defend:** first open-source workflow combining machine-checkable phase
gates + executed-test shipping evidence + independent cross-model review + parallel-agent
conflict-surface orchestration. (Each element's absence in the market was adversarially verified
July 2026; the combination even more so.)

## 4. FAQ / objection handling

**"Seven phases is bureaucracy. I just want to ship."**
The phase count is the ceiling, not the toll. PRD classes right-size the pipeline: a hotfix runs a
repro→fix→verify skeleton, not a feature ceremony. And below trivial size, the honest answer is
printed in our own docs: don't use the workflow. The comparison that matters isn't "7 phases vs
0 phases" — it's "7 phases vs re-reviewing everything your agent claimed it did."

**"My agent already runs tests."**
Running tests and _being gated on them_ are different things. Field data: agents claim tests passed
when they didn't, in 22.58% of validated failure episodes — and the share grows as models improve.
The gate isn't for the agent's convenience; it's so the claim never has to be trusted.

**"Isn't this just Spec Kit with extra steps?"**
Spec Kit ends where the risk begins: at "implement". Its gates are humans reading markdown. Ours
start after the spec: exit codes, executed evidence, a reviewer from a different model family whose
`pass` mechanically requires zero critical findings. Use both — spec-driven authoring upstream,
gated execution downstream.

**"Claude Code / my IDE will just add this natively."**
Isolation, probably (worktrees already exist). The method, less likely: readiness calibration, hard
caps, review-artifact schemas, deferral governance, and merge-train policy are workflow opinions,
not platform features. We sit above platforms deliberately — the method already runs across three
different agent CLIs in production.

**"Where's the proof it works?"**
~390 production PRDs; a 143-finding calibration study that reshaped our own gate (binary verdict +
hard caps — the decimal score had r = −0.03 with post-ship defects); 0 critical post-ship findings
in the scored era vs 2 before. Observational, single-project, and we say so loudly — it is still
more published calibration data than the rest of the field combined (next largest: N=3).

**"What if my project has no tests to gate on?"**
Then the workflow makes that visible instead of shipping around it. Start with the gates you have
(typecheck, lint, build are Phase 4's floor), and the readiness lint will keep telling you which FRs
have no runnable verification. The debt was always there; now it blocks instead of hides.

**"Why should the push be manual? I want full autonomy."**
Because push is the authority handoff — the one boundary where a mistake fans out to CI, deploys,
and teammates. Everything reversible is autonomous; the irreversible step costs one human keystroke.
If your risk tolerance differs, that's one config line — but the default ships safe, and the runner
itself contains no push code path, so "autonomous push" is an explicit choice you wire yourself.

**"Does it phone home?"**
No telemetry, no accounts, no cloud. Gate metrics append to a local JSONL you own.

**"License / can we use it at work?"**
MIT. Bring-your-own-gates means your domain checks never leave your repo.

## 5. Naming — DECIDED: provegate (owner, 2026-07-22)

Criteria were: evokes gate/evidence (not "spec", the crowded word); verb-able; npm + GitHub +
domain free; no Turkish-English false friends. **Decision: `provegate`** — npm and GitHub org both
free at sweep time; carries the thesis literally (prove, then pass the gate); "Gated Autonomy"
remains the thesis/whitepaper term. Runner-up was `exit0` (npm free, GitHub org taken); the
ra-prefix sweep produced `raproof` as the strongest personal-brand alternative (fully free,
declined in favor of thesis-literal provegate).

**Wordmark & tagline (owner-approved 2026-07-22):**

- Wordmark: **ProveGate** (CamelCase in all prose/marketing; package and binary stay lowercase).
  The CamelCase visually separates the morphemes and kills the "propagate" misread.
- Tagline (README first line, fixes pronunciation AND flips the propagate association into an
  ally): **"ProveGate (prove + gate): prove it, then let it propagate."**
- The propagate adjacency is managed, not feared: edit distance 2, autocorrect/SEO friction in
  the early days ("did you mean propagate?"), spoken-word ambiguity on podcasts, and `propagate`
  is an existing popular npm package (harmless reverse-typo direction). Mitigations above cover
  all four; the association's meaning is spin-positive (only proven changes propagate through
  the merge train).
- "-gate" scandal-suffix connotation noted and accepted — dev-tools context reads "quality gate".

**CLI command (proposed, decision pending):** dual-bin `{ "provegate", "gate" }` — package
provegate, everyday command `gate` (PATH-free and npm-bin-free at sweep; `prove` is DEAD ON
ARRIVAL — /usr/bin/prove is Perl's TAP harness). Subcommand grammar reads as English:
`gate open` (claim), `gate check` (readiness), `gate run` (phases 4–7), `gate land` (merge),
and `gate push` → refuses with "No. Push is yours." (exit 1) — the never-push commitment as a
demonstrable easter egg.

Copy caution: avoid leaning on "proof/PROVEN" badge language in launch copy — the dead shipgate
project (ISL DSL, npm Feb 2026) used that vocabulary; see landscape §2.5. The tagline's "prove"
verb is fine; the badge-jargon (PROVEN/VIOLATED verdict labels) is what we skip.
Remaining owner tasks: domain whois (.dev/.io), npm placeholder publish, GitHub org reservation.

## 6. Do-not-say list (claims we cannot back)

- ~~"First gated workflow ever"~~ → first **verified open-source combination** of the four elements
  (agent-gates prototyped machine gates; Vector does deterministic verification internally).
- ~~"Prevents all agent failures"~~ → shifts trust from claims to evidence; §6 limitations apply.
- ~~"X% faster / Y% fewer bugs"~~ → we have calibration + practice evidence, not an RCT. Never quote
  a speedup we didn't measure — miscalibrated speed claims are literally the thing we cite against
  others.
- Mainstream-tool specifics (Spec Kit/Kiro/BMAD internals) → only after primary-doc verification
  (research pass killed or couldn't verify those claims; roadmap Phase E gates this).
