# Phase 5: Testing Protocol

> **Cycle Phase:** 5 of 7
> **Role:** Adversarial Test Engineer
> **Goal:** Turn the PRD's per-FR Verification Commands into an executed, machine-checkable gate. Implementation (Phase 4) builds the behavior; this phase proves it — running every command for real and writing the tests that try to break it.

---

## Why this is its own phase

When testing rides inside execution, "listed-but-not-run" verification commands slip
through to shipped. Phase 5 makes the test surface a **gate the orchestration cannot
skip**: every FR's §11 command must exit 0 against a real environment before Phase 6.

The implementer is biased toward confirming their own code. Phase 5's stance is the
opposite — **assume the implementation is wrong and try to prove it.**

---

## Agent Constraints

1. **Run, don't list.** Every command in the PRD's §11 Verification Commands table is
   executed. Paste the command + trimmed output into the Verification Ledger. A command
   that was not run is `operator` or `blocked` — never `passed`.
2. **Real environment.** Integration commands run against the real thing
   ({{ENV_NOTES}}), not mocks. If the environment is unavailable, the ledger row is
   `operator` with the reason — it does not silently pass.
3. **Adversarial authoring.** Where the PRD touches guards, permissions/roles, tenant
   scoping, auth, or user-controlled filters, write at least one integration test that
   exercises the **deny** path (unauthorized access returns empty/denied, not data).
   This gate may only be `passed` or `failed` — `skipped` is not acceptable (an
   `operator` result requires an explicit `Operator Acceptance` meta on the PRD).
4. **Contract round-trips.** Where the PRD introduced a client→server payload, run the
   named round-trip contract test against the real schema.

---

## The Gate

```
For each FR-N in PRD §4:
  run the matching §11 Verification Command(s)
  exit 0  → ledger row `passed` (command + output pasted)
  exit ≠0 → ledger row `failed`  → STOP, hand back to Phase 4
risk-class diff present?  → at least one deny-path integration test `passed`
contract payload present? → named round-trip contract test `passed`
```

All green → Phase 6 (Final Auditing). Any `failed` → return to implementation; do not
advance. `gate run {{ID_PREFIX}}-XXX` executes exactly this chain mechanically — a
listed-but-unsafe or missing command STOPs the runner.

---

## Output

- Update the task file's **Verification Ledger** with one row per FR command (result +
  evidence).
- New test files land under the implementation parent's scope (tests are written next
  to the behavior, per Phase 3).
- Record any accepted scope cut in **Deferrals & Decisions**; record
  environment-blocked checks in **Operator Handoff** (never as `[x]`).

---

## Handoff

> "Phase 5 complete for {{ID_PREFIX}}-XXX. Every §11 command executed (N passed /
> M failed). Risk-class deny test: [passed/N-A]. Contract test: [passed/N-A]. Ready for
> Phase 6: Final Auditing."
