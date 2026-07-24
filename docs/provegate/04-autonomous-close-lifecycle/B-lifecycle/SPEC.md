# Lifecycle state machine — SPEC (wave 3)

A work-item's state is expressed **two ways at once**, and they are cross-checked:
- **folder tier** — *path-derived* state (which subfolder the artifact sits in);
- **status field** — *declared* state (a `Status:` line in the artifact markdown).

A generated state file is the machine SSOT, rebuilt from the artifacts and staleness-gated.

---

## 1. Folder-tier model

Each artifact kind gets parallel subfolders; the subfolder **is** the coarse state:

| Folder | Subfolders | Notes |
|--------|-----------|-------|
| `_prds/` (or `specs/`) | `drafts/` · `wip/` · `completed/` · `deferred/` | only specs get `drafts/` |
| `_readiness/` | `wip/` · `completed/` · `deferred/` | no `drafts/` |
| `_tasks/` | `wip/` · `completed/` · `deferred/` | no `drafts/` |
| `_docs/` (summaries) | `wip/` · `completed/` | ship summaries |

Tier meaning: `drafts/` = pre-approval ideas/backlog not yet promoted · `wip/` = active
(the live queue) · `completed/` = shipped · `deferred/` = shelved mid-flight. The tier is
**derived from the path**, and the state scanner reads **only the three tracked tiers**
(`wip/`, `completed/`, `deferred/`) — `drafts/` is deliberately outside the state machine
entirely: the backlog is invisible to the gates until a draft is promoted into `wip/`.
Moving the file *is* the state transition for the coarse state.

---

## 2. Status enum (declared, fine-grained)

Canonical values (map lowercased input → canonical; keep a small alias map for benign
synonyms like `proposed→Draft`):

`Draft` · `In Review` · `Approved` · `In Progress` · `Code Complete` ·
`Operator Verification` · `Ship Verified` · `Superseded` · `Archived` · `Blocked` ·
`Deferred` · `Not Started`

Each has an **exit criterion** (documented in the workflow's status table). Two derived sets
the tooling uses: *implemented* = {Code Complete, Operator Verification, Ship Verified,
Archived}; *autonomous-close eligibility* = {eligible, operator-gated}.

Normalization strips markdown, splits on `|`, and drops trailing annotations after
`—/–/;/(/ - ` so `"Ship Verified — operator checks accepted 2026-06-01"` still resolves;
unresolvable → `Unknown` (which a gate rejects).

### Illegal alias rule — no "Completed" / "Done"
Although a normalizer *may* map `complete/completed/done` → `Ship Verified` for legacy files,
a **new** item using them is a **state violation**: writing `Status: Completed` self-declares
the terminal state and inverts the gate order (you'd claim shipped before the gates ran).
The check forces the canonical status to be written explicitly. (seed
`no-completed-done-status-alias`)

---

## 3. Transition scripts

| Script | Move / status / lock | Run by |
|--------|----------------------|--------|
| `state:sync` | rebuild the generated state file from all artifacts + re-emit the board panel; no move | either (idempotent) |
| `queue` / `state:*` (index/active/next/prd) | read-only queries | agent |
| `start` | create worktree + `feat/` branch + lock, append board row; **no status/folder change** | human-initiated, agent-run |
| `stop` | reverse of start: remove worktree, delete lock + board row, delete branch (unless kept) | either |
| `accept` | record owner-gated acceptance waiver; no move | **human only** |
| `autorun` | run phases 4–7 gates → archive wip→completed → no-ff merge to local integration → post-merge verify/auto-revert → stop → handoff card; **never pushes** | autonomous (human triggers) |
| `archive` | move wip→completed across spec/readiness/tasks/docs, set `Ship Verified` + `Archived` cycle, create summary stub, sync | autorun or manual |
| `defer` | move wip→deferred (spec/readiness/tasks), set `Deferred`, sync; **no** summary, **no** Ship Verified | human-initiated |

There is deliberately **no `new` scaffolder** — new items are authored from the template.

---

## 4. Deferral discipline

`defer` shelves an item mid-flight: moves the three artifacts wip→deferred, sets `Deferred`
in both blockquote-meta and frontmatter, syncs, and prints the re-open recipe (move back to
wip + reset status, then `start`). A deferred item stays tracked but goes quiet to the
readiness/state gates.

The **deferral table** on the status board is policed by a gate (see `02` practice 06):
every row needs **owner + expiry (YYYY-MM-DD) + renewal-counter (starts 0)**; overdue fails;
**renewal cap = 1** (renew once, then convert it to a real item and delete the row); an
**open-row cap** (e.g. 15) with a warning at 80%. A relief command converts the
earliest-expiry row into an item when the cap is hit.

---

## 5. SSOT — generated, not hand-maintained

- The machine state file is **generated** by scanning the artifact markdown; never
  hand-edited. Agents query it through the read-only commands, not by reading the raw file.
- **Staleness is a hard gate** (pattern P1, `03/B/patterns.md`): a check rebuilds the state
  in-memory and compares to the committed file **on a normalized form that excludes
  volatile fields** (the generation timestamp) — a literal byte-compare would be stale on
  every rebuild. Real drift fails with "run sync and commit."
- **Status is declared then derived + cross-checked:** `status` comes from the artifact's
  `Status:` line; the tier comes from the path; a gate cross-checks them (e.g. "spec is
  completed but tasks are wip") and rejects `Unknown`/illegal aliases.
- **SSOT layering:** the artifact markdown is the human-facing source of record; the
  generated state file is the durable SSOT for scripts/CI; the status board is a short human
  view only (regenerated cells; machine wins on conflict — `02` practice 06).

---

## 6. De-emofy notes

Rename `_prds/`→`specs/` (or keep), drop Turkish board headers, strip product/personal
tokens. Keep verbatim: the dual folder-tier + status-field model with cross-check, the
explicit status enum with exit criteria, the **no-Completed/Done** illegal-alias rule, the
generated-SSOT + staleness gate, and the deferral discipline. Reconcile any task-file naming
drift (per-file `TASK-*` vs. aggregate `tasks-<id>.md`) before porting.
