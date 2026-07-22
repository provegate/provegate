# The Gated Autonomy Method

The 7-phase gated workflow this package ships: let coding agents work autonomously
without trusting a single word they say about their own work. Hardened over ~390
production work items in the parent project before extraction.

**The gate rule — the whole method in one sentence:** a phase boundary is a gate only
if a machine can check it — a verification command's exit code, or an independent
reviewer's structured verdict; never the implementing agent's own judgment.

---

## The seven phases

```
Phase 1:  PRD Drafting        → define WHAT and WHY               (human-approved)
Phase 2:  Readiness Scoring   → staff-engineer stress test        (PASS verdict)
Phase 3:  Task Generation     → atomic implementation plan        (human "Go")
Phase 4:  Implementation      → write the behavior                ┐
Phase 5:  Testing             → execute every §11 command         │ autonomous
Phase 6:  Final Auditing      → independent adversarial review    │ (gated)
Phase 7:  Learning            → capture durable knowledge         ┘
→ Merge to local base          (autonomous, all gates green — `gate run`)
→ Cleanup                      (after the merge is verified)
→ Push to remote               (HUMAN — never automated)
```

Each phase has a prompt in `prompts/` and produces an artifact from `templates/`.

### The autonomy boundary

Humans own **intent and release**: the spec (Phase 1 approval), the readiness verdict,
the task plan ("Go"), and the push. Phases 4–7 plus the local merge run autonomously
because every boundary is machine-gated. If any gate fails, the runner STOPs and hands
back with the working tree intact.

| Phase / step     | Gate (machine-checkable)                                                        | On fail    |
| ---------------- | ------------------------------------------------------------------------------- | ---------- |
| 2 → 3            | readiness PASS (score ≥ 8 **and** no hard cap tripped) + `gate check` clean     | ITERATE    |
| 4 Implementation | type-check + lint + build + test floor + class-default gates (`gates.manifest`) | STOP       |
| 5 Testing        | every PRD §11 FR command exits 0 (safety-checked, really executed)              | STOP       |
| 6 Final Auditing | `independent-review` ledger row `passed` + structured review artifact (schema)  | STOP       |
| 7 Learning       | every declared Durable Artifact present in the merge diff                       | STOP       |
| → Merge          | operator rows = 0 **or** valid owner acceptance entry; clean checkout           | STOP       |
| → Post-merge     | manifest `postMerge` gates on the base; failure auto-reverts the merge          | revert     |
| → Push           | —                                                                               | human only |

Ordering invariants: **Learning runs before the merge** (durable docs land in the same
merge as the code); **cleanup runs after the merge is verified** (a failed merge never
destroys the working tree); **nothing ever pushes** (`gate push` exists only to refuse).

---

## PRD classes

The phase count is a ceiling, not a toll. The class right-sizes scoring, skeleton, and
lint strictness — pick it in Phase 1, honestly:

| Class            | When                                                               | Phase 2 twist                                | Phase 3 skeleton           |
| ---------------- | ------------------------------------------------------------------ | -------------------------------------------- | -------------------------- |
| `feature`        | New user-facing capability, schema/permission change, cross-module | full 6-dimension formula                     | full-stack layers          |
| `test-hardening` | Single-test or test-infra fix, no production code                  | Tenancy + Migration N/A, weight concentrated | diagnostic → fix → audit   |
| `hotfix`         | Production bug fix, bounded blast radius                           | Migration N/A, Tenancy half-weight           | repro → fix → verify       |
| `infra`          | Workflow / tooling / CI / deploy                                   | Migration inflated to 20%                    | feature + Migration parent |

Below trivial size, the honest answer is: don't use the workflow.

---

## The calibration principle

Calibration against 143 post-ship review findings showed the decimal readiness score
has **zero predictive power inside the PASS band**. What discriminates is wiring:

- **Binary verdict** (PASS / ITERATE) — never negotiate scope by tenths of a point.
- **Hard caps** force ITERATE regardless of the weighted total: a touched protected
  surface without a named runnable deny test; a new client→server payload without a
  round-trip contract test; a failed `gate check` without a written waiver.
- Executed evidence only: **a listed-but-not-run command is never "passed."**

The scoring weights and caps in `prompts/phase-2-readiness-scorer.md` encode this
calibration — adapt the wording to your project, never the numbers.

---

## Status lifecycle

| Status                  | Meaning                                              |
| ----------------------- | ---------------------------------------------------- |
| `Draft`                 | PRD being written / scored                           |
| `In Review`             | Under readiness iteration                            |
| `Approved`              | PASS verdict; ready for task generation / execution  |
| `In Progress`           | Phase 4 active                                       |
| `Code Complete`         | Agent-finishable work done; verification recorded    |
| `Operator Verification` | Human/runtime/staging checks remain                  |
| `Ship Verified`         | Audit passed with evidence; deferrals triaged        |
| `Superseded`            | Replaced by other work                               |
| `Blocked`               | Cannot proceed safely; blocker + resumption recorded |
| `Deferred`              | Shelved mid-flight; artifacts in the deferred state  |

`[x]` in a task file means **completed as written** — never "deferred", "operator-owned",
or "covered later". Operator-owned work stays unchecked with an Operator Handoff row.

Artifacts live in lifecycle directories (`wip` / `completed` / `deferred`, configurable
via `workflow.config.json`); `gate status` derives the state snapshot from them — the
artifacts are the source of truth, the snapshot is a cache.

---

## Conflict surfaces, locks, and parallel agents

1. **Declare** — the PRD's `## Conflict Surface` lists the glob paths it claims
   exclusive write ownership of. Shared append-only manifests are excluded by config.
2. **Claim** — the implementing agent records a lock lease (`_state/locks/*.json`, see
   `schemas/agent-lock.schema.json`): agent, item, phase, TTL, `ownedPaths` mirroring
   the surface. Leases live on the main checkout; stale leases fail validation loud.
3. **Detect** — the path-conflict gate materializes the globs against tracked files and
   fails when two active execution-phase claims overlap; `gate queue` warns when two
   READY items' declared surfaces collide (do not schedule them together).

Playbook: one item = one lease = one feature branch. Disjoint surfaces may run in
parallel; overlapping surfaces serialize. The Phase 6 reviewer is never the
implementing session. One serialized merge channel: land one item before merging the
next when they touch the same package.

## Operator acceptance

Work with operator-owned handoff rows may close autonomously **only** when an
owner-signed acceptance entry exists in the acceptances file
(`_state/acceptances.json`, see `schemas/acceptances.schema.json`): the signing
identity must be in `workflow.config.json` `owners` (roles, never person names), items
non-empty, reason recorded. Agents never write acceptance entries on their own
initiative — the acceptance is the owner's decision, recorded verbatim. The runner's
merge gate validates the entry mechanically and refuses otherwise.

## Deferral governance

Deferrals are allowed but they expire:

1. Every deferred item gets a tracked row: **owner + due date + renewal counter**.
2. Overdue rows are gate failures: renew (with justification, counter +1) or convert
   to a work item.
3. One renewal maximum — the second renewal must become a work item.
4. Cap the open-deferral table (default 15). At the cap: convert the oldest row first,
   then add — never skip recording a deferral, never check `[x]` on deferred work.
5. A skipped test or unmet AC without a matching deferral row is a violation.

---

## The toolchain

| Piece                   | Role                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `workflow.config.json`  | Repo shape + vocabulary (dirs, id pattern, statuses, branches, owners) |
| `gates.manifest.json`   | Gate membership + policy (phase chains, class defaults, hard caps)     |
| `gate status` / `queue` | State snapshot + scheduling view (overlaps, claims, ready set)         |
| `gate check`            | PRD readiness lint (structure + manifest hard caps) + wiring audit     |
| `gate run` / `land`     | The deterministic close: gates → archive → local merge → handoff card  |
| `gate push`             | Refuses. Push is yours.                                                |
| `prompts/`              | The phase protocols (this method, operationalized for agents)          |
| `templates/`            | The artifacts, byte-compatible with the gate parsers                   |
| `examples/`             | Gate-plugin gallery — your domain gates stay in your repo              |

Metrics: every gate result appends to a local JSONL you own (gitignored by default).
No telemetry, no accounts, no network calls.
