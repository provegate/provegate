# Readiness Assessment: PRD-034 — Prompt Store Reconciliation

Three of iteration 3’s five missing pieces are genuinely closed. The bounded-walk and canonical-spelling remediations remain open because code-valid configurations contradict their new guarantees.

## Quick Meta

| Field | Value |
| --- | --- |
| PRD | `_prds/wip/prd-034-prompt-store-reconciliation.md` |
| PRD Class | `infra` |
| Score | 7.6/10 |
| Verdict | ITERATE |
| Iteration | 4 |
| Model Tier (Execution) | none |
| Model Tier (Audit) | none |
| Scored by | GPT-5 via Codex — fresh independent Phase 2 re-score |
| Self-scored | no |
| Date | 2026-07-28 |
| State Record | pending |
| PRD Lint | WAIVED for this review. `node packages/provegate/dist/cli.js check PRD-034` failed at the documented sandbox write with `EPERM: operation not permitted, open '/Users/rayvaz/Projects/provegate/_state/prds.json.28984.tmp'`. The exact read-only `lintPrd` equivalent currently reports only an unrelated dirty-worktree memory-corpus error: `indexed record 'ADR-0004-method-rule-vs-repo-rule' does not validate`; an isolated PRD-content run with memory disabled returns `{ "ok": true, "issues": [] }`. Per the review instruction, command-level evidence relies on the orchestrating session’s out-of-sandbox green run dated 2026-07-28. |

## Model Tier Recommendation

No implementation or audit tier is assigned while the verdict is ITERATE. A future PASS in the 8.0–8.9 band should use **high/high**.

## Iteration 4 — Closure Review

### 1. T5 adapter consequence and T6 production guidance — GENUINELY CLOSED

FR-3 now owns the T6 guidance as real CLI output rather than unnamed adopter prose:

> “`prompts.enabled` false → exit 0 with a note whose text is a **named production surface, tested verbatim**” (§4, lines 202–204)

> “clear `templates.prd` in the same change that removes the block, and the generated files remain on disk, readable by agents, until a human deletes them” (§4, lines 205–207)

FR-6 binds the expected text to the real command:

> “asserting the disabled note’s **exact production text** … against the CLI’s real output, never against fixture-local prose” (§4, lines 264–267)

Section 6 separately preserves both model consequences and the T5 adapter result:

> “the existing Claude/Cursor adapters report as diverged, because their content embeds the old store path” (§6, lines 322–324)

> “its note carries the exact T6 text — the unexercised search and both adopter consequences — asserted verbatim against the CLI output” (§6, lines 325–327)

The shorter disabled-note criterion at lines 337–340 and the §11 command-row summary omit the consequences, but neither weakens or contradicts the stronger acceptance criterion above. The production surface, required content, and production-shaped test are now bound.

### 2. Exact orphan-walk domain — OPEN

The new traversal rule is precise and genuinely bounds `prompts.dir: "."`:

> “the walk visits precisely the directories that contain at least one planned path … and lists each one’s immediate entries; it descends nowhere else” (§4, lines 141–144)

> “the bound survives `prompts.dir: "."` because the dirname set under `.` is still only the planned directories, never the repository” (§4, lines 145–146)

The scoped universal claim is also internally understandable: an orphan is claimed only among bannered immediate entries of those directories. The defect is that the chosen domain cannot satisfy the PRD’s still-active T4 removed-adapter claim.

`generatedPaths()` emits adapters only from `config.prompts.adapters` (`prompts.ts`, lines 788–831 and 842–847). Removing `claude-code` removes every planned member beneath `.claude/commands`; removing `cursor` similarly removes `.cursor/rules`. Consequently neither directory belongs to the dirname set from which its orphan must be discovered.

A built-code probe with `adapters: ['cursor', 'codex']` produced these dirnames:

> `.provegate/prompts`, `.provegate/templates`, `.cursor/rules`, `.provegate`

There was no `.claude/commands` root. This contradicts:

> “the dirname set … spans the store’s subdirectories and the two adapter roots by construction” (§4, lines 142–144)

and the acceptance criterion:

> “Given an adapter removed from `config.prompts.adapters` with its file on disk … the file reports `orphaned` via its banner” (§6, lines 309–310)

The Memory Input still calls the mechanism a search over “three declared roots” (§Memory Inputs, lines 465–470), which is neither the new exact dirname-set definition nor true when an external adapter is removed.

The walk is bounded and `.`-safe, but it is not total for the orphan behavior the same PRD promises. This is a new fourth-pass defect.

### 3. Canonical report spelling and exception matching — OPEN

The architectural split is sound in principle. Normalizing a finding’s report spelling does not canonicalize or transform an exception entry, so it does not inherently breach FR-2’s “rejection, not canonicalization” rule. For forward-slash spellings containing repeated separators, `.` segments, or a leading `./`, the canonical report path still identifies the same destination that native resolution writes.

The implementation contract nevertheless remains contradictory for a reachable legal spelling:

> “the primitive normalizes each joined `dir + '/' + rel` with POSIX rules — collapse repeated separators, drop a leading `./`” (§4, lines 114–117)

> “the canonical report spelling … by construction contains no backslash” (§4, lines 168–170)

Current validation rejects leading backslashes and `..`, but permits internal backslashes: `unsafeRelPath()` splits on `/` or `\` only to inspect segments and does not reject the separator (`validate.ts`, lines 467–481). A built-code call confirmed `validateConfig({ prompts: { dir: 'foo\\bar' } })` returns no issue.

POSIX normalization does not convert `\` into `/`. For the legal generated path `foo\bar/prompts/phase-1-x.md`, both `posix.normalize()` and the report spelling retain the backslash. FR-2 must reject the matching exception entry:

> “a backslash anywhere refuses the entry” (§4, lines 161–165)

Thus the report is not “by construction” compatible with every legal `prompts.dir`.

The installer mismatch has two branches:

- If “POSIX rules” means actual `path.posix.normalize`, the report still names the literal backslash-containing path written on POSIX, but no exception can match it.
- If implementation additionally converts backslashes to slashes to satisfy FR-2, the report names `foo/bar/...` while the POSIX installer’s native `resolve(root, rawPath)` writes beneath a literal `foo\bar` directory. The report then no longer names what was written.

Nothing on disk is moved, but the “every legal spelling” and “no adopter migration” claims are false until the backslash case is decided explicitly. The changelog repeats the false universal closure at line 621.

### 4. Exact-file pack manifest scope — GENUINELY CLOSED

FR-5 now owns the exact update:

> “the packed file also joins `packages/provegate/test/pack-manifest.json` — the exact-file manifest the pack test enforces, where an unlisted new file fails deliberately” (§4, lines 239–241)

The file appears in FR-5’s Targets (§4, line 249), Implementation Scope:

> “`packages/provegate/test/pack-manifest.json` (the exact-file manifest gains the new packed path or the pack test fails deliberately)” (§8, lines 432–435)

and the Conflict Surface (§10, line 544).

Repository behavior matches the claim: `pack.test.ts` compares the dry-run tarball and manifest for both extra and missing files (lines 35–45). The implementation no longer needs an undeclared exact-file edit.

### 5. T7 memory attribution — GENUINELY CLOSED

Memory Outputs now says:

> “This design keeps no stored hash and no receipt (the model’s T7); the only recorded provenance is the banner’s **version**, and that is what does the one job recomputation cannot — splitting a package-caused difference (`stale`) from a same-version one (`modified`)” (lines 511–518)

Durable Artifacts repeats:

> “the banner version (the only stored provenance — no hash, no receipt) does the attribution job recomputation cannot” (lines 561–564)

This is faithful to Revision 2: the reporter recomputes expected bytes, no receipt exists, and banner version supplies attribution only. The two deliberately unbannered paths remain `unattributable` elsewhere in the PRD, so these statements do not invent attribution for them.

## Derivation Fidelity

The load-bearing boundaries remain intact:

- **T3 no-write:** FR-1 says the primitive writes nothing (§4, lines 151–153), while FR-2 says an exception never authorizes a write (§4, lines 181–186).
- **T7 no-receipt:** expected state is recomputed from the installed package and current config, with no stored state (§4, lines 109–113).
- **Constraint 1 — no adopter-config write:** exception entries are adopter-owned input; no command receives authority to edit `workflow.config.json`.
- **Constraint 2 — no adopter-file deletion:** FR-3 prints the human deletion and reinstall remedy, and §12 explicitly forbids command deletion.
- No runtime dependency, network call, or remote-push path is introduced.

The two open defects do not relax those boundaries. They make promised reporting behavior incomplete for reachable configurations.

## Cross-Section Consistency Sweep

Sections 1–3 retain the Revision 2 detection/attribution split and introduce no stale receipt or write authority.

Sections 4 and 6 disagree internally on orphan discovery: the exact current-plan dirname set excludes external adapter roots precisely when those adapters become unplanned, while both sections still promise their discovery. Memory Inputs preserves an older “three declared roots” description.

Sections 4, 6, and the changelog overstate canonical compatibility. No explicit test case covers an internal-backslash `prompts.dir`; the “non-normalized path” fixture concerns exception-entry rejection, not the legal generated-path spelling that causes the contradiction.

Sections 7–8 are consistent on additive migration, complete-key rollback, exact manifest scope, and ordering. Sections 9–10 contain no new open question or scope omission. Section 11’s shortened notes are incomplete summaries but do not contradict their parent FRs. Section 12 continues to preserve the no-dependency, no-push, no-delete, and no-unconfigured-repository behavior constraints.

## Hard Caps and Clarity Gate

No readiness hard cap is triggered:

- No runtime dependency is added to `packages/provegate`.
- No network or remote-push path is introduced.
- No method-content file is changed.
- T3 no-write, T7 no-receipt, and constraints 1–2 remain explicit.
- The CLI lint write failure is the documented sandbox `EPERM`; the current read-only corpus failure names an unrelated uncommitted ADR rather than PRD-034.

Clarity is capped at 7.0. Two central mechanisms make universal claims disproved by code-valid states: removing an external adapter removes its scan root, and a legal internal-backslash `prompts.dir` cannot produce the exception-compatible report spelling the PRD claims.

## Scorecard

| Dimension | Weight | Score | Weighted |
| --- | ---: | ---: | ---: |
| Clarity | 15% | 7.0 | 1.05 |
| Completeness | 20% | 7.5 | 1.50 |
| Technical Depth | 20% | 7.0 | 1.40 |
| MT&S — repository critical rules | 10% | 9.5 | 0.95 |
| Scope & Testability | 15% | 6.5 | 0.98 |
| Migration & Rollback | 20% | 8.5 | 1.70 |
| **Total** | **100%** |  | **7.58 → 7.6** |

## Missing Pieces

1. Reconcile the bounded traversal domain with T4. The domain must retain the directories needed to discover removed external adapters independently of current adapter membership, or the PRD must explicitly retract and derive the corresponding orphan claims. Preserve the immediate-entry bound and the `prompts.dir: "."` guarantee.

2. Resolve internal backslashes in legal `prompts.dir` values. Either tighten that existing config surface with an explicit adopter migration, define a report spelling that still names the actual cross-platform disk destination and remains exception-compatible, or change the exception contract. Add a fixture using a legal backslash-containing `prompts.dir`; an exception-path rejection fixture alone cannot prove this seam.

## Iteration History

| Date | Iteration | Score | Verdict |
| --- | ---: | ---: | --- |
| 2026-07-28 | 1 | 5.1 | ITERATE |
| 2026-07-28 | 2 | 7.3 | ITERATE |
| 2026-07-28 | 3 | 7.4 | ITERATE |
| 2026-07-28 | 4 | 7.6 | ITERATE |

## Verdict

ITERATE. The T5/T6 production contract, exact pack-manifest scope, and T7 attribution wording are now genuinely closed. The PRD still cannot pass while its bounded walk excludes removed external adapters that it promises to report and its canonical spelling remains incompatible with a legal `prompts.dir` spelling.


---

> **Transcription note (orchestrating session, 2026-07-28).** Iteration 4 transcribed
> verbatim from a fresh independent Codex session. Trajectory 5.1 → 7.3 → 7.4 → 7.6;
> three of five pieces confirmed genuinely closed (T5/T6 production contract,
> pack-manifest scope, T7 attribution). The two open pieces are both real seams the
> remediation's own guarantees created: the planned-dirname walk domain silently drops a
> REMOVED adapter's root (breaking the T4 orphan promise), and a legal
> backslash-containing `prompts.dir` defeats the "canonical spelling has no backslash"
> claim. Lint EPERM is the documented sandbox artifact; out-of-sandbox green the same
> day. Remediation by the non-scorer session follows.
