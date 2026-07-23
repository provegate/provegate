A single gate-result line as printed by `gate run`; use to show individual check outcomes.

```jsx
<GateLine status="passed" name="phase 5: §11 verification commands" command="pnpm test" code={0} />
<GateLine status="failed" name="typecheck" command="tsc --noEmit" code={2} />
<GateLine status="operator" name="staging smoke test" />
```

`status`: the closed ledger vocabulary — `passed failed partial skipped operator blocked`. `operator` (needs a human/staging) and `blocked` (dependency broken) are honest escape hatches, never a silent pass. The glyph carries status (`✓ ✗ ⚠ = → !`) so NO_COLOR loses nothing. Set `bare` to drop the panel wrapper (e.g. inside HandoffCard). Verdict + exit code sit right, dotted leader between.
