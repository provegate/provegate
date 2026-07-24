# PRD-011: CLI Design Adoption — Output as a Designed Surface

> **Status**: Ship Verified
>
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: owner
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `cli-design-adoption`
> **Cycle Phase**: 1 (PRD Generation)
> **PRD Class**: feature
> **Class Rationale**: (default class) — user-visible behavior change across every
> command's output.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

The design system's first premise: **most people meet ProveGate as terminal
output, so the output is designed.** The handoff ships copy-exact specimens for
every command surface — status-line grammar, the two box-drawing moments, the
status table, the dry-run plan, the refusals, `--help`, and a colour/NO_COLOR
matrix. Those specimens are meant to become the CLI's string builders.

Today's CLI already has the right bones — the glyph vocabulary (`✓ ✗ ⚠ →`), the
56-char card family, the refusal — but no color, no aligned columns, no live
per-gate line, and a help screen that predates the system. This PRD adopts the
terminal half of `@provegate/design` (built by PRD-010) and reproduces the
specimens.

Two constraints shape every decision here:

1. **Zero runtime dependencies survive.** `@provegate/design` enters as a
   **devDependency**; tsup bundles it into `dist/`, so the published
   `package.json` still declares no `dependencies`. A gate proves it.
2. **The glyph carries status; color is redundant.** Under `NO_COLOR` or a
   non-TTY stdout, output must lose styling and lose no information. A test
   asserts the color-stripped output is byte-identical to the no-color output.

---

## 2. Goals

### Primary Goals

- [ ] Every command's output matches the handoff specimens: glyph grammar, color
      slots, aligned columns, box-drawing confined to the handoff and the refusal.
- [ ] Not a single hex or ANSI escape is authored in `packages/provegate` —
      they all come from `@provegate/design/cli`.
- [ ] The published package still declares zero runtime dependencies.
- [ ] `NO_COLOR=1` and piped stdout produce complete, unambiguous output.

### Success Metrics

| Metric                                  | Current                    | Target                          | Measurement           |
| --------------------------------------- | -------------------------- | ------------------------------- | --------------------- |
| ANSI/hex literals in `src/`             | 0 (no color at all)        | 0 (all via design theme)        | `theme.test.ts`       |
| Per-gate feedback during `gate run`     | none until the final card  | one status line per gate        | `cli.test.ts`         |
| Information lost under `NO_COLOR`       | n/a                        | none (glyph carries status)     | `no-color.test.ts`    |
| Published runtime dependencies          | 0                          | 0                               | `pack.test.ts`        |

---

## 3. User Stories

#### User Story 1

```
As an agent watching a long `gate run`,
I want one status line per gate as it resolves,
so that I see which gate is slow and which one failed without waiting for the card.
```

**Acceptance Criteria:**

- [ ] Each gate emits `<glyph> phase N  <name>  exit <code>  <verdict>` on
      completion, in the verdict's color slot.
- [ ] Verdict words come from the closed ledger set only:
      `passed · failed · partial · skipped · operator · blocked`.
- [ ] A skipped or not-run gate is dim with `=`, never green.
- [ ] `--json` consumers and existing exit codes are unaffected.

#### User Story 2

```
As an operator whose claim was refused,
I want the refusal to name both surfaces and the lease holder,
so that I can narrow my Conflict Surface without reading lock files by hand.
```

**Acceptance Criteria:**

- [ ] `gate open` overlap refusal prints the owning PRD and its owned glob, the
      refused PRD and the wanted path, the holding agent, phase and remaining TTL,
      and a `→` resolve hint.
- [ ] The refusal reads as a decision (human-blue `→` line), not a crash; exit
      code stays 1.

#### User Story 3

```
As a developer piping gate output into a log or a CI job,
I want color to disappear and meaning to survive,
so that grep and my terminal-less environment still work.
```

**Acceptance Criteria:**

- [ ] `NO_COLOR=1` and non-TTY stdout both disable every escape sequence.
- [ ] Stripping ANSI from colored output yields exactly the no-color output.
- [ ] Terminals without truecolor get the 16-color floor, not garbage.

---

## 4. Functional Requirements

1. **FR-1**: Add `@provegate/design` as a **devDependency** (`workspace:*`) of
   `packages/provegate` and introduce `src/core/ui/theme.ts` as the single import
   site re-exporting the design package's colorizer, glyph table **and string
   builders**. Verify tsup inlines them and the published manifest still declares
   no `dependencies`.
   - **Targets:** `packages/provegate/package.json`,
     `packages/provegate/src/core/ui/theme.ts`,
     `packages/provegate/tsup.config.ts`
2. **FR-2**: Implement the capability tiers in that module: truecolor when the
   terminal advertises it, the 16-color ANSI floor otherwise, and no escapes at
   all when `NO_COLOR` is set or stdout is not a TTY. Every status glyph is a
   named constant; no glyph or escape is written inline anywhere else.
   - **Targets:** `packages/provegate/src/core/ui/theme.ts`
3. **FR-3**: Emit per-gate status lines during `gate run` by giving `runChain` an
   optional result reporter and having `cli.ts` render it through the design
   package's shared status-line builder. The core stays silent by default —
   printing remains the CLI's job (existing substrate split).
   - **Targets:** `packages/provegate/src/core/run/chain.ts`,
     `packages/provegate/src/core/run/index.ts`,
     `packages/provegate/src/cli.ts`
4. **FR-4**: Retire the local card builders in favor of the shared ones: delete
   the string construction in `core/run/cards.ts`, re-export the design package's
   `handoffCard`/`stopCard` through it so existing importers keep compiling, and
   apply color at the CLI — green rule and human-blue `→ READY TO PUSH` on the
   handoff card, red rule and a red `✗` on the stopped card. Card text must not
   change by one character; a test compares the rendered card against the
   pre-change fixture. Box-drawing stays reserved for exactly these two moments.
   - **Targets:** `packages/provegate/src/core/run/cards.ts`,
     `packages/provegate/src/cli.ts`
5. **FR-5**: Rebuild `gate status` as an aligned table with the header
   `ID  STATE  READINESS  TASKS  SLUG`, column widths computed from the data,
   readiness rendered `PASS · 9.1` (verdict colored, score dim) and `—` for
   absent values. Output stays greppable: one record per line, no wrapping.
   - **Targets:** `packages/provegate/src/cli.ts`
6. **FR-6**: Apply the grammar to `gate queue` (section headers, stale leases in
   stale-amber, overlaps with `!`) and to the `gate open` refusal detail from
   User Story 2 — extending `ClaimResult` with structured overlap data if the
   current pre-rendered issue strings cannot carry it. Any such type change is
   **additive only** (a new optional field; the existing `issues` array is
   untouched), since `ClaimResult` is re-exported from `src/index.ts`.
   - **Targets:** `packages/provegate/src/cli.ts`,
     `packages/provegate/src/core/run/open.ts`,
     `packages/provegate/src/index.ts`
7. **FR-7**: Rebuild the `--dry-run` plan view as the specimen tree: a
   `[run] DRY-RUN` header in plan-cyan, phase rows, `·`-prefixed command rows
   dim beneath each phase, the `→ merge` row, and the closing
   `nothing runs · nothing merges · this is a plan`.
   - **Targets:** `packages/provegate/src/cli.ts`,
     `packages/provegate/src/core/run/chain.ts`
8. **FR-8**: Rebuild `--help` to the specimen: wordmark line with the tagline and
   the version, `USAGE` and `COMMANDS` sections, aligned option column, and the
   closing line `humans own intent and release · the machine owns the verified
   middle`. Keep `gate push` refusing with `No. Push is yours.` byte-for-byte,
   now in human-blue, exit 1.
   - **Targets:** `packages/provegate/src/cli.ts`
9. **FR-9**: Gate the invariants: a color/no-color identity test (strip ANSI from
   colored output → equals `NO_COLOR=1` output) covering every command, a non-TTY
   test, a no-emoji/closed-verdict-vocabulary scan of `src/`, and a published-
   manifest test asserting zero runtime dependencies.
   - **Targets:** `packages/provegate/test/theme.test.ts`,
     `packages/provegate/test/no-color.test.ts`,
     `packages/provegate/test/pack.test.ts`,
     `packages/provegate/test/cli.test.ts`
10. **FR-10**: Document the output grammar for users in a new docs page: the
    glyph table, the color law, the ledger vocabulary, `NO_COLOR`/non-TTY
    behavior, and why box-drawing appears only twice.
    - **Targets:** `apps/docs/content/docs/cli-output.mdx`,
      `apps/docs/content/docs/meta.json`

---

## 5. Non-Goals (Out of Scope)

- Web adoption (`apps/web`, `apps/docs` theming, the React components) — deferred
  wave.
- New commands, new flags, or changed exit codes. This PRD changes how output
  looks, not what the CLI does.
- Any TUI, alternate screen buffer, spinner, progress bar, or animation — the
  design system's canonical CLI surface is static output.
- Changing `--json` shapes. Machine output stays exactly as it is.
- Changing the two cards' text. Only color is added.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a colored run, **When** ANSI escapes are stripped, **Then** the result
  is byte-identical to the same command under `NO_COLOR=1`.
- **Given** stdout is a pipe, **When** any command runs, **Then** the output
  contains no escape sequence.
- **Given** a gate that was listed but not executed, **When** it is rendered,
  **Then** it is dim with `=` and never green.
- **Given** an overlapping claim, **When** `gate open` refuses, **Then** both
  surfaces, the lease holder and a `→` resolve hint are printed and the exit code
  is 1.
- **Given** the published tarball, **When** its manifest is read, **Then**
  `dependencies` is absent or empty.
- **Given** `gate push`, **When** it runs, **Then** stdout/stderr still reads
  exactly `No. Push is yours.` and the exit code is 1.

---

## 7. Technical Considerations

### Architecture

- **The reporter, not a logger.** `runChain` currently returns results and prints
  nothing; every string leaves through `cli.ts`. Preserve that: the reporter is an
  optional callback the CLI supplies, so core stays silent, testable, and free of
  presentation. Resist moving rendering into core.
- **Capability detection is a single choke point.** Truecolor / 16-color / none is
  decided once in `src/core/ui/theme.ts`; nothing downstream re-checks `isTTY`.
  This is what makes the identity test meaningful.
- **Alignment must not break grep.** The status table pads with spaces only — no
  box-drawing, no unicode rules — so `grep PRD-001` keeps working and column
  widths adapt to the widest row.
- **Sequencing.** PRD-011 needs PRD-010's `@provegate/design/cli`. It also
  overlaps PRD-008 (`cli.ts`, `open.ts`) — the path-conflict gate will serialize
  them at claim time, which is the intended behavior, not an obstacle. Claim after
  PRD-008 lands, or narrow the surface if run in parallel.
- **Docs page instead of an edit.** The output grammar goes into a new
  `cli-output.mdx` rather than the existing `cli.mdx`, which PRD-008 and PRD-009
  already claim — a deliberately narrower conflict surface.

### Dependencies

- `@provegate/design` (PRD-010) as a devDependency, bundled by tsup. No runtime
  dependency is added, and no network call or push path is introduced.

---

## 8. Implementation Scope

### In Scope

- [ ] `packages/provegate/src/core/ui/theme.ts` (new), `cli.ts`,
      `core/run/cards.ts`, `core/run/chain.ts`, `core/run/index.ts`,
      `core/run/open.ts`, `package.json`, `tsup.config.ts`
- [ ] `packages/provegate/test/` — theme, no-color, pack, cli test updates
- [ ] `apps/docs/content/docs/cli-output.mdx` + `meta.json`

### Out of Scope

- `packages/design/**` (PRD-010 owns it), `apps/web/**`, `apps/docs` theming,
  the React components, `apps/docs/content/docs/cli.mdx`.

---

## 9. Open Questions

- (none — reporter shape and docs-page placement settled in §7)

---

## 10. References

- `docs/design/design_handoff_provegate/reference/cli-static-specimens.dc.html` —
  copy-exact target strings for every command
- `docs/design/design_handoff_provegate/reference/cli-surface.html` — status-line
  grammar and legend
- `docs/design/design_handoff_provegate/README.md` — glyph table, color-as-signal
  rules, the `theme.ts` sketch
- `packages/provegate/src/core/run/cards.ts` — the card family as shipped
- `_prds/wip/prd-010-design-system-package.md` — the token origin this consumes
- `CLAUDE.md` — zero runtime dependencies, no telemetry, no network calls

---

## Conflict Surface

- `packages/provegate/src/core/ui/theme.ts`
- `packages/provegate/src/core/run/cards.ts`
- `packages/provegate/src/core/run/chain.ts`
- `packages/provegate/src/core/run/index.ts`
- `packages/provegate/src/core/run/open.ts`
- `packages/provegate/src/cli.ts`
- `packages/provegate/src/index.ts`
- `packages/provegate/test/theme.test.ts`
- `packages/provegate/test/no-color.test.ts`
- `packages/provegate/test/cli.test.ts`
- `packages/provegate/test/pack.test.ts`
- `apps/docs/content/docs/cli-output.mdx`

---

## Durable Artifacts

- `apps/docs/content/docs/cli-output.mdx` — the CLI output grammar: glyphs, color
  law, ledger vocabulary, NO_COLOR/non-TTY contract

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR    | Command / Check                                                       | Scope     | Notes                                        |
| ----- | --------------------------------------------------------------------- | --------- | -------------------------------------------- |
| FR-1  | `pnpm --filter provegate test test/pack.test.ts`                      | provegate | published manifest declares no dependencies  |
| FR-2  | `pnpm --filter provegate test test/theme.test.ts`                     | provegate | truecolor / 16-color / none tiers            |
| FR-3  | `pnpm --filter provegate test test/cli.test.ts`                       | provegate | per-gate status lines, ledger vocabulary     |
| FR-4  | `pnpm --filter provegate test test/cli.test.ts`                       | provegate | card text unchanged, rules colored           |
| FR-5  | `pnpm --filter provegate test test/cli-state.test.ts`                 | provegate | aligned status table, greppable rows         |
| FR-6  | `pnpm --filter provegate test test/open.test.ts`                      | provegate | overlap refusal names both surfaces + lease  |
| FR-7  | `pnpm --filter provegate test test/chain.test.ts`                     | provegate | dry-run plan tree                            |
| FR-8  | `node packages/provegate/dist/cli.js --help`                          | provegate | help matches the specimen                    |
| FR-9  | `pnpm --filter provegate test test/no-color.test.ts`                   | provegate | strip-ANSI identity + non-TTY                |
| FR-10 | `grep -c "NO_COLOR" apps/docs/content/docs/cli-output.mdx`            | docs      | output grammar documented                    |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean build, all packages and apps
- `node packages/provegate/dist/cli.js check PRD-011` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -rn "\\x1b\[" packages/provegate/src --include=*.ts | grep -v core/ui/theme.ts` — no stray escapes

---

## 12. DO NOT (Anti-Patterns)

- DO NOT add `@provegate/design` (or anything else) to `dependencies`. It is a
  devDependency, bundled at build time; the published package stays dependency-free.
- DO NOT write an ANSI escape, a hex, or a status glyph outside
  `src/core/ui/theme.ts`.
- DO NOT encode status in color alone — the glyph is the source of truth and must
  survive `NO_COLOR`.
- DO NOT color anything green that did not pass a machine check or an operator
  verdict. No decorative green, no green headings, no green prompts.
- DO NOT use red for emphasis or for a warning — red is a non-zero exit or a fail
  verdict only.
- DO NOT introduce an emoji, a spinner, an animation, an alternate screen buffer,
  or a progress bar.
- DO NOT invent a verdict word outside `passed · failed · partial · skipped ·
  operator · blocked`, and never write `PROVEN` or `VIOLATED`.
- DO NOT change `--json` output, exit codes, or the text inside the two cards.
- DO NOT move rendering into `core/` — the runner stays silent and returns data.
- DO NOT extend box-drawing beyond the handoff and the refusal moments.
- DO NOT touch `packages/design/**` or `apps/docs/content/docs/cli.mdx` — other
  PRDs own them.
- DO NOT introduce `any`; use `unknown` + narrowing.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | owner  | Initial draft |
