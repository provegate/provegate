# Announcement draft — OWNER EDITS BEFORE POSTING

> Draft for the owner's voice pass. Not shipped in the package; do-not-say linted.
> Suggested venue order: HN Show, then the usual aggregators. Title options below.

## Title options

1. Show HN: ProveGate — gate your coding agent on exit codes, not its own claims
2. Show HN: My coding agent's "done" is not evidence, so I built a gate for it
3. Show HN: A workflow where the runner literally cannot push

## Body

Eighty-plus agents, including ten dedicated reviewers, once unanimously endorsed an
OpenSSL vulnerability that did not exist. One executed test killed it. That result
(the Refute-or-Promote study) is the whole thesis in miniature: agent consensus is not
evidence — execution is.

ProveGate is the workflow that came out of shipping ~390 production work items on that
thesis. Seven phases; every autonomous boundary is a machine-checkable gate: a
verification command's exit code, or an independent reviewer's structured verdict —
never the implementing agent's own judgment. Humans own the spec, the readiness
verdict, the task plan, and the push. The machine owns the verified middle. `gate
push` exists as a command, and its entire implementation is a refusal.

Things in it that I have not seen elsewhere:

- A readiness gate calibrated against 143 post-ship review findings. The finding that
  reshaped it: the decimal score had r = -0.03 with post-ship defects — so the verdict
  became binary, and hard caps (named deny-path test, round-trip contract test) do the
  discriminating.
- "Run, don't list": a §11 verification command that was listed but not executed is
  never "passed". The runner executes the spec's own commands, through a safety
  allowlist that refuses shell metacharacters and `git push` inside test rows.
- Cross-model review as a blocking gate with a machine-validated artifact (verdict,
  critical count, base SHA, quorum — `pass` mechanically requires zero criticals).
- Conflict surfaces for parallel agents: declared glob ownership, lock leases,
  overlap detection before work starts instead of at merge time.

The meta-story: the tool was built with its own workflow. Every PRD, readiness
verdict, task ledger, and cross-model review artifact is in the repo — including the
round where the reviewer caught me weakening the method's own calibrated quorum while
porting it, and the fix had to go through the method's own deferral governance. The
gates do not care who you are.

Honest limits, stated in the whitepaper's own limitations section: the evidence is
observational and single-project; gates presuppose runnable verification commands;
below trivial task size the docs tell you not to use it.

MIT. No telemetry, no accounts, no network calls. Zero runtime dependencies.

Repo: https://github.com/provegate/provegate
Quickstart: install to handoff card in one sitting.

## Comment-thread crib (from the positioning FAQ)

- "Seven phases is bureaucracy" → classes right-size it; hotfix runs repro→fix→verify;
  the comparison is not 7 vs 0, it is 7 vs re-reviewing everything your agent claimed.
- "My agent already runs tests" → running tests and being gated on them are different
  things; the gate exists so the claim never has to be trusted.
- "Just Spec Kit with extra steps?" → spec-driven tools gate what you intend; this
  gates what you shipped. Use both.
- "Why manual push?" → push is the authority handoff; everything reversible is
  autonomous, the irreversible step costs one keystroke, and the runner has no push
  code path to misconfigure.

## Launch checklist

- [ ] **Before the first share, after the first deploy** (PRD-027 FR-1 — unfurl
      consumers cache what they fetch, so a wrong card outlives its revert): run
      an OG debugger against the **deployed** origin — `/` renders the 1200×630
      card; `/alt` unfurls title-only with **no** image and a `summary` card.
      Ordering: after first deploy, before the URL appears in any README, post,
      or message.
