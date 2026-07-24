<!--
Work-item status enum + exit criteria — wave 3, part B.
The `Status:` line in each item's spec uses one of these CANONICAL values (write it
explicitly). A generated state file derives from these; a staleness gate keeps it honest.
Load-bearing design point: the enum SEPARATES implementation completion (Code Complete)
from ship readiness (Ship Verified) — don't collapse them.
-->

# Status states

| Status | Meaning | Exit criterion (→ next) |
|--------|---------|-------------------------|
| `Draft` | idea being written | spec complete → review |
| `In Review` | spec under review | reviewer approves → `Approved` |
| `Approved` | ready to plan/execute | readiness PASS + "Go" → `In Progress` |
| `In Progress` | implementation underway | required code tasks complete + agent-run verification recorded → `Code Complete` |
| `Code Complete` | code + tests done; agent-checkable work finished | final-audit gates green; operator rows exist → `Operator Verification`; no operator rows → `Ship Verified` |
| `Operator Verification` | operator rows remain OPEN — human/runtime/staging checks pending | rows executed by a human OR an acceptance waiver recorded → `Ship Verified` |
| `Ship Verified` | shipped + verified; requires the independent-review audit evidence (terminal) | archive records the archived cycle-phase |
| `Archived` | landed + summarized; recorded as the *cycle phase* of an archived Ship Verified item (the archive step never rewrites the status value itself) | — |
| `Blocked` | can't proceed | blocker cleared → prior state |
| `Deferred` | shelved mid-flight | re-open → `In Progress` |
| `Superseded` | replaced by another item | — |
| `Not Started` | queued, not begun | claimed → `In Progress` |

## Rules

- **Write the canonical status explicitly.** Do NOT write `Completed` or `Done` — those
  self-declare the terminal state and invert the gate order; a gate rejects them as an
  illegal alias. (seed `no-completed-done-status-alias`)
- **Status is declared; tier is derived from the folder.** A gate cross-checks the two and
  rejects `Unknown`.
- **`Code Complete` ≠ shippable.** It means the agent-checkable work is done. `Ship
  Verified` is the *output* of the final-audit gates plus resolved/waived operator rows —
  never a self-declared input.
- **`Operator Verification` is entered BECAUSE rows are open**, not after they're resolved.
  The acceptance waiver (wave-3 part A) is what lets the merge gate pass while rows stay
  unchecked.
- Benign synonyms may map in (e.g. `proposed → Draft`); keep that alias map tiny.
