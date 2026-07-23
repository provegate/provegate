The card family — how a gate summarizes a phase then hands off or stops. A signature brand surface; these specimens become the CLI's string builders, so they are copy-exact (56-char rule, `│` gutter).

```jsx
// the handoff card (green rule, ends in READY TO PUSH)
<HandoffCard
  title="HANDOFF CARD"
  lines={[
    "PRD-001 (fix-login-timeout)",
    "merged: feat/prd-001-fix-login-timeout → LOCAL main (no-ff)",
    "diff:   6 files changed, 214 insertions(+), 12 deletions(-)",
    "gates:",
    { gate: "passed", text: "phase 4: typecheck + lint + build" },
    { gate: "passed", text: "phase 5: §11 verification commands" },
    { gate: "passed", text: "phase 6: review artifact (verdict pass, Critical 0)" },
    { gate: "passed", text: "phase 7: durable artifacts in diff" },
    { gate: "passed", text: "post-merge: build green" },
    "operator rows: 0 | Autonomous Close: operator-gated",
    "metrics: _state/metrics.jsonl (local JSONL, yours)",
    { arrow: true, text: "READY TO PUSH — run `git push` yourself (the runner never pushes)" },
  ]}
/>

// the stopped card (red rule)
<HandoffCard
  variant="stopped"
  title="STOPPED at Phase 5"
  lines={[
    "PRD-001: verification command exited 1",
    { gate: "passed", text: "phase 4: typecheck + lint + build" },
    { gate: "failed", text: "phase 5: §11 verification commands" },
    "worktree left intact — fix and re-run with --from-phase=N, or hand back to a human",
  ]}
/>
```

`variant`: `handoff` (green rule) or `stopped` (red rule). The runner contains no code path that pushes to a remote — the card states the refusal as a decision, not a failure. The glyph carries status, so it reads under NO_COLOR. On narrow terminals the card scrolls in its own container; strings wrap at the `width` (default 56).
