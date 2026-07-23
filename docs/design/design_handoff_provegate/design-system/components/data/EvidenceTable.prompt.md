The evidence ledger table; use to record what was checked, by what command, and the machine result.

```jsx
<EvidenceTable
  caption="run a1b9f3c · 2026-07-22"
  rows={[
    { check: "phase 5: unit", command: "pnpm test", verdict: "passed", code: 0, evidence: "312 passed · 4.1s" },
    { check: "phase 4: typecheck", command: "tsc --noEmit", verdict: "passed", code: 0, evidence: "0 errors" },
    { check: "phase 5: e2e", command: "playwright test", verdict: "failed", code: 1, evidence: "1 failed · logs/e2e.txt" },
    { check: "staging smoke", command: "needs staging", verdict: "operator", evidence: "awaiting @lead" },
  ]}
/>
```

Fixed columns: check · command · verdict · exit · evidence. Verdict uses the closed ledger vocabulary via VerdictBadge (green earned, red real failure; `operator`/`blocked` are honest escape hatches).
