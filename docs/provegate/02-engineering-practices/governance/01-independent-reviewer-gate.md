# 01 — Independent-reviewer gate

**Invariant.** The agent or person that produces a change can never be the authority that
passes its review gate. A gate closes only on an *objective* signal: an automated check
exiting 0, **or** a distinct reviewer (different model, or a human, with no authoring
context) issuing an explicit `pass`, recorded as a durable artifact whose precondition is
zero critical findings. Self-declaring "done / green" is prohibited.

**Why it matters.** Self-audit misses blind spots by construction — the author shares the
mental model that produced the bug. In Emofy, post-hoc independent reviews surfaced 87+56
findings *inside* PRDs that had already self-declared "Ship Verified." The gate is only as
trustworthy as its independence.

**Mechanism (generic).**
- Gate-pass condition, stated once and enforced everywhere: *"a gate passes only when its
  automated check returns 0, or an independent reviewer says `pass`. An agent may not
  self-declare a gate green."*
- The independent review runs on the **full diff vs. base**, by a reviewer with no
  implementation context — a different model/agent session, or a human. Prompt it to
  *refute* the diff, not to bless it.
- The verdict is a committed artifact (see `templates/review-artifact.md`) with
  blockquote `> **Key:** value` metadata the check parses: `Item`, `Verdict: pass|fail`,
  `Reviewer`, `Tool/Model`, `Base SHA`, `Diff range`, `Critical: N` (+ optional `Quorum`).
  **Rule: `Verdict: pass` requires `Critical: 0`** — a machine check enforces this exact
  coupling, so a "pass" with open criticals is impossible.
- For classes of work where review is genuinely optional (e.g. pure test-hardening), the
  skip is recorded *in the work-item ledger with a justification* — never as an artifact
  verdict; for feature/hotfix/infra work, skipping is invalid.

**Provegate implementation.**
1. Add the gate-pass sentence to the bootstrap doc (practice 05) and every agent shim.
2. Drop `templates/review-artifact.md` into the review-artifacts dir; require one per
   gated change.
3. Add a check (wave 2, alongside `verify:*`) that parses the artifact and fails if
   `Verdict: pass` && `Critical > 0`, or if the artifact is missing for a review-required
   class.
4. Wire the independent review to a second agent/model or a human step — never the
   authoring session.

**De-emofy notes.** Emofy's default reviewer is a specific external CLI ("codex" review
mode, a different model family) with a fallback fresh-agent session, and a `Quorum N/5`
field from its multi-agent panel. Genericize: reviewer = "any second model or human";
`Quorum` is optional and only meaningful if you run a panel. Drop `verify:review-artifact`,
`prd:autorun`, and PRD numbers.

**Related.** `templates/review-artifact.md` · deepens `00`'s Durable Artifacts row ·
seed `durable-artifact-must-commit`.
