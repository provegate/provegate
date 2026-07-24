# Tasks: CLI Design Adoption

> **PRD**: [prd-011-cli-design-adoption.md](../../_prds/wip/prd-011-cli-design-adoption.md)
> **Readiness**: [readiness-011-cli-design-adoption.md](../../_readiness/wip/readiness-011-cli-design-adoption.md)
> **Status**: Not Started
> **Readiness Score**: 8.3/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-23
> **Updated**: 2026-07-23

---

## Task Outcome Rules

- `[x]` means the task was completed as written.
- Leave operator-owned, environment-dependent, or blocked tasks unchecked.
- Record implementation decisions in **Deferrals & Decisions**.
- Record human/runtime/staging work in **Operator Handoff**.
- A PRD may be `Code Complete` with operator handoff items, but it is not
  `Ship Verified` until required handoff items are resolved or explicitly accepted.
- Phase 4 agents hold a valid lock lease (METHOD.md → Locks) before editing
  implementation files or this task file.

---

## Relevant Files

- `packages/provegate/package.json` — add `@provegate/design` devDependency
- `packages/provegate/tsup.config.ts` — confirm design is inlined into dist
- `packages/provegate/src/core/ui/theme.ts` — single import site: colorizer, glyphs, builders
- `packages/provegate/src/core/run/cards.ts` — re-export shared builders; drop local strings
- `packages/provegate/src/core/run/chain.ts` — optional per-gate result reporter
- `packages/provegate/src/core/run/index.ts` — thread the reporter through
- `packages/provegate/src/core/run/open.ts` — structured overlap data for the refusal
- `packages/provegate/src/index.ts` — additive `ClaimResult` field (public API)
- `packages/provegate/src/cli.ts` — render status lines, tables, plan, help, refusal
- `packages/provegate/test/theme.test.ts` — capability tiers
- `packages/provegate/test/no-color.test.ts` — strip-ANSI identity + non-TTY
- `packages/provegate/test/cli.test.ts` — status lines, card color, help
- `packages/provegate/test/cli-state.test.ts` — status table alignment
- `packages/provegate/test/open.test.ts` — overlap refusal detail
- `packages/provegate/test/chain.test.ts` — dry-run plan tree
- `packages/provegate/test/pack.test.ts` — published manifest declares zero deps
- `apps/docs/content/docs/cli-output.mdx` — output grammar doc (durable artifact)
- `apps/docs/content/docs/meta.json` — nav entry for the new page

### Notes

- Depends on PRD-010 landing first (consumes `@provegate/design/cli`).
- Overlaps PRD-008 on `open.ts` / `cli.ts` / `cli.test.ts` — claim sequentially;
  the path-conflict gate refuses a simultaneous lease.
- Reference target strings:
  `docs/design/design_handoff_provegate/reference/cli-static-specimens.dc.html`.

---

## Tasks

- [ ] 1.0 devDependency + theme choke point
  - [ ] 1.1 Add `@provegate/design` as `devDependency` (`workspace:*`) to
        `packages/provegate/package.json`. (FR-1)
  - [ ] 1.2 Create `src/core/ui/theme.ts` re-exporting the design package's
        colorizer, glyph table AND card/status-line string builders — the single
        import site; no glyph, hex, or escape authored anywhere else. (FR-1, FR-2)
  - [ ] 1.3 Implement capability tiers in `theme.ts`: truecolor when advertised
        (`COLORTERM`), 16-color floor otherwise, no escapes under `NO_COLOR` or
        non-TTY stdout. Single choke point — nothing downstream re-checks
        `isTTY`. **W2**: pin `NO_COLOR` semantics (presence with non-empty value;
        test the empty-string case) and the truecolor fallback direction. (FR-2, W2)
  - [ ] 1.4 Confirm tsup inlines the design import; `test/pack.test.ts` asserts the
        published manifest has no `dependencies`. **W4**: rebuild + diff
        `test/pack-manifest.json` — no new chunks, no new published files. (FR-1, W4)
  - [ ] 1.5 `test/theme.test.ts`: truecolor / 16-color / none tiers render the
        expected escapes (or none). (FR-2)

- [ ] 2.0 Card family + per-gate status lines
  - [ ] 2.1 Retire local card construction in `src/core/run/cards.ts`: re-export
        the design package's `handoffCard`/`stopCard` so existing importers keep
        compiling; delete the duplicated string builder. Card text must not change
        by one character. (FR-4)
  - [ ] 2.2 Apply color at the CLI: handoff card → green rule + human-blue
        `→ READY TO PUSH`; stopped card → red rule + red `✗` on the failing row.
        Box-drawing stays reserved for these two moments only. (FR-4)
  - [ ] 2.3 Give `runChain` an optional result reporter (`chain.ts`, `index.ts`);
        core stays silent by default — `cli.ts` supplies the reporter and renders
        each gate line via the shared status-line builder. (FR-3)
  - [ ] 2.4 `test/cli.test.ts`: per-gate lines use the closed ledger vocabulary; a
        skipped/not-run gate is dim `=`, never green; card text equals the
        pre-change fixture. (FR-3, FR-4)

- [ ] 3.0 Status table + queue + refusal detail
  - [ ] 3.1 Rebuild `gate status` as an aligned table: header
        `ID  STATE  READINESS  TASKS  SLUG`, data-computed column widths,
        readiness `PASS · 9.1` (verdict colored, score dim), `—` for absent. One
        record per line, space-padded only (stays greppable). (FR-5)
  - [ ] 3.2 `test/cli-state.test.ts`: assert alignment across varying id/slug
        widths and that `grep PRD-001` still matches a row. (FR-5)
  - [ ] 3.3 Apply the grammar to `gate queue`: section headers, stale leases in
        stale-amber, overlaps with `!`. (FR-6)
  - [ ] 3.4 Extend `ClaimResult` (`open.ts`) with structured overlap data —
        **additive only**: new optional field, existing `issues` untouched; export
        the type from `src/index.ts`. (FR-6, M1)
  - [ ] 3.5 Render the `gate open` overlap refusal from that data in `cli.ts`:
        owning PRD + owned glob, refused PRD + wanted path, holding agent + phase +
        remaining TTL, a human-blue `→` resolve hint; exit stays 1. (FR-6)
  - [ ] 3.6 `test/open.test.ts`: refusal names both surfaces + lease holder; exit
        code 1; reads as a decision, not a crash. (FR-6)

- [ ] 4.0 Plan view + help + refusal
  - [ ] 4.1 Rebuild `--dry-run` as the specimen tree: plan-cyan `[run] DRY-RUN`
        header, phase rows, `·`-prefixed dim command rows, `→ merge` row, closing
        `nothing runs · nothing merges · this is a plan`. (FR-7)
  - [ ] 4.2 `test/chain.test.ts`: dry-run plan tree structure. (FR-7)
  - [ ] 4.3 Rebuild `--help`: wordmark + tagline + version, `USAGE`, `COMMANDS`,
        aligned option column, closing `humans own intent and release · the machine
        owns the verified middle`. Keep `gate push` → `No. Push is yours.`
        byte-for-byte, now human-blue, exit 1. (FR-8)
  - [ ] 4.4 `test/cli.test.ts`: `--help` matches the specimen; `push` output +
        exit code unchanged. (FR-8)

- [ ] 5.0 Invariant tests (no-color identity)
  - [ ] 5.1 **W1** — `test/no-color.test.ts`: for every command, strip ANSI from
        the colored render and assert byte-identity with the `NO_COLOR=1` render —
        compare two renderings of ONE fixture, never two live runs. (FR-9, W1)
  - [ ] 5.2 Non-TTY test: piped stdout produces no escape sequence. (FR-9)
  - [ ] 5.3 Scan `src/` for a stray escape/hex/glyph outside `core/ui/theme.ts`;
        no emoji; verdict words limited to the closed set. (FR-9)

- [ ] 6.0 Docs + drift sweep
  - [ ] 6.1 Write `apps/docs/content/docs/cli-output.mdx`: glyph table, color law,
        ledger vocabulary, `NO_COLOR`/non-TTY contract, why box-drawing appears
        only twice; add the nav entry to `meta.json`. (FR-10)
  - [ ] 6.2 **W3** — documentation sweep: check every place the repo quotes CLI
        output (`METHOD.md`, `QUICKSTART.md`, `prompts/**`, `apps/docs/content/**`)
        and update in the same merge, or record the drift in Deferrals. (W3)
  - [ ] 6.3 **W5** — record `gate status --json` as a follow-up item (out of scope
        here) so the machine path for `status` is not silently forgotten. (W5)

- [ ] 7.0 Phase 5 — Testing
  - [ ] 7.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [ ] 7.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`,
        `pnpm --filter provegate test`, `pnpm build`, `gate check PRD-011`, the
        never-push invariant, the stray-escape grep.

- [ ] 8.0 Phase 6 — Final Auditing
  - [ ] 8.1 Independent adversarial review of the diff → verdict artifact at
        `_docs/reviews/review-011-cli-design-adoption.md`. `Verdict: pass` requires
        `Critical: 0`. Reviewer attacks: the published manifest (zero deps), the
        no-color identity claim, the additive-only `ClaimResult` change.

- [ ] 9.0 Phase 7 — Learning
  - [ ] 9.1 Confirm the declared Durable Artifact
        (`apps/docs/content/docs/cli-output.mdx`) is in the merge diff.
  - [ ] 9.2 Knowledge ingest: the choke-point rule and the doc-drift sweep result.

---

## Verification Ledger

| Gate               | Command / Check                                                       | Scope     | Result  | Evidence | Notes                       |
| ------------------ | --------------------------------------------------------------------- | --------- | ------- | -------- | --------------------------- |
| FR-1               | `pnpm --filter provegate test test/pack.test.ts`                      | provegate | pending |          | manifest: zero dependencies  |
| FR-2               | `pnpm --filter provegate test test/theme.test.ts`                     | provegate | pending |          | truecolor/16/none tiers      |
| FR-3               | `pnpm --filter provegate test test/cli.test.ts`                       | provegate | pending |          | per-gate lines, vocabulary   |
| FR-4               | `pnpm --filter provegate test test/cli.test.ts`                       | provegate | pending |          | card text unchanged, colored |
| FR-5               | `pnpm --filter provegate test test/cli-state.test.ts`                 | provegate | pending |          | aligned table, greppable     |
| FR-6               | `pnpm --filter provegate test test/open.test.ts`                      | provegate | pending |          | overlap refusal detail       |
| FR-7               | `pnpm --filter provegate test test/chain.test.ts`                     | provegate | pending |          | dry-run plan tree            |
| FR-8               | `node packages/provegate/dist/cli.js --help`                          | provegate | pending |          | help matches specimen        |
| FR-9               | `pnpm --filter provegate test test/no-color.test.ts`                  | provegate | pending |          | strip-ANSI identity + non-TTY |
| FR-10              | `grep -c "NO_COLOR" apps/docs/content/docs/cli-output.mdx`            | docs      | pending |          | output grammar documented    |
| types              | `pnpm check-types`                                                    | root      | pending |          | zero errors                  |
| lint               | `pnpm lint`                                                           | root      | pending |          | zero warnings                |
| test               | `pnpm --filter provegate test`                                        | provegate | pending |          | full suite; priors unchanged  |
| build              | `pnpm build`                                                          | root      | pending |          | clean, all packages/apps      |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-011`                   | repo      | pending |          | PRD passes its own gate      |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`             | repo      | pending |          | refusal exit 1               |
| no-stray-escape    | `grep -rn "\\x1b\[" packages/provegate/src --include=*.ts \| grep -v core/ui/theme.ts` | provegate | pending |          | escapes only in theme.ts     |
| independent-review | `_docs/reviews/review-011-cli-design-adoption.md`                    | repo      | pending |          | verdict pass, critical = 0   |

Allowed results: `pending`, `passed`, `failed`, `partial`, `skipped`, `operator`, `blocked`.

---

## Deferrals & Decisions

- (none yet)

---

## Progress Log

| Date | Task | Notes |
| ---- | ---- | ----- |
|      |      |       |

---

## Blockers / Open Questions

- (none — but sequence claim after PRD-008 to avoid the `open.ts`/`cli.ts` overlap)

---

## Operator Handoff

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
| —    | —        | —     | none machine-blocked | — | Human review that live terminal output matches specimens is a nice-to-have, not a gate |
