Machine-checkable verdict chip; use anywhere a gate result is shown — ledger rows, PR checks, CLI summaries.

```jsx
<VerdictBadge verdict="passed" code={0} />
<VerdictBadge verdict="failed" code={1} />
<VerdictBadge verdict="partial" />
<VerdictBadge verdict="skipped" />
<VerdictBadge verdict="operator" />
<VerdictBadge verdict="blocked" />
```

Vocabulary is the closed ledger set: `passed failed partial skipped operator blocked` — always lowercase, monospace. `operator` (needs a human/staging) and `blocked` (dependency broken) are the two honest escape hatches, never a silent pass. Optional `code` appends `· exit N`. Never label a verdict "PROVEN" or "VIOLATED". The glyph (`✓ ✗ ⚠ = → !`) carries the status so it survives NO_COLOR; green appears only on `passed` (earned), red only on `failed` (real failure).
