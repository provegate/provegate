# Tasks: React Component Layer

> **PRD**: [prd-012-web-design-adoption.md](../../_prds/wip/prd-012-web-design-adoption.md)
> **Readiness**: [readiness-012-web-design-adoption.md](../../_readiness/wip/readiness-012-web-design-adoption.md)
> **Status**: Not Started
> **Readiness Score**: 8.4/10
> **Model Tier (Execution)**: high
> **Created**: 2026-07-24
> **Updated**: 2026-07-24

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

- `packages/design/package.json` — react peer + dev deps, DOM test env deps
- `packages/design/tsup.config.ts` — emit `./react` with JSX
- `packages/design/tsconfig.json` — jsx settings, react types
- `packages/design/vitest.config.ts` — DOM env scoped to `*.test.tsx`
- `packages/design/src/react/Icon.tsx` — geometric single-stroke icon set
- `packages/design/src/react/Button.tsx` — primary/secondary/ghost, never green
- `packages/design/src/react/VerdictBadge.tsx` — closed verdict set, glyph-first
- `packages/design/src/react/Admonition.tsx` — note/tip/warning/pass/fail/human
- `packages/design/src/react/CodeBlock.tsx` — always-dark terminal block
- `packages/design/src/react/GateLine.tsx` — status grammar line
- `packages/design/src/react/HandoffCard.tsx` — structured lines[] card
- `packages/design/src/react/EvidenceTable.tsx` — evidence ledger table
- `packages/design/src/react/PhasePipeline.tsx` — 7-phase diagram
- `packages/design/src/react/index.ts` — barrel: all nine
- `packages/design/test/props.test.tsx` — prop-contract fidelity + render
- `packages/design/test/react.test.tsx` — colour law, verdict set, glyph grammar
- `packages/design/test/cli-entry.test.ts` — extend: ./cli stays React-free (built)
- `packages/design/README.md` — the React layer

### Notes

- Contracts: `docs/design/design_handoff_provegate/design-system/components/**`
  (`.d.ts.txt` = prop contract, preserved; `.jsx.txt` = reference, rebuilt).
  Landing README (`docs/design/design_handoff_landing/README.md`) is authoritative
  on CURRENT APIs where they disagree (HandoffCard especially).
- Style via `--pg-*` tokens only. Green is earned. Verdict set is the closed six.
- `ds-overrides.jsx` / `_ds_bundle.js` are NEVER ported.

---

## Tasks

- [ ] 1.0 React tooling + package wiring (FR-1)
  - [ ] 1.1 `package.json`: add `react`+`react-dom` as `peerDependencies` AND
        devDependencies, `@types/react(-dom)` dev, a DOM test env (jsdom or
        happy-dom) + `@testing-library/react` dev. Keep `private`; **no runtime
        `dependencies`**. (FR-1, W3)
  - [ ] 1.2 `tsconfig.json`: `jsx: react-jsx`, react types; `tsup.config.ts`: add
        the react entry with JSX emit (already an entry from PRD-010 — fill it).
        (FR-1)
  - [ ] 1.3 **W1** — `vitest.config.ts`: DOM environment scoped to `**/*.test.tsx`
        only, so the node-env tests (tokens/cli/assets `.test.ts`) keep their
        environment. Verify the existing 26 tests still pass. (FR-1, W1)
  - [ ] 1.4 Confirm `pnpm --filter @provegate/design build` emits `dist/react/`
        with JSX and types. (FR-1)

- [ ] 2.0 Primitives: Icon + Button
  - [ ] 2.1 `Icon.tsx` — 24px grid, 2px stroke, round caps, `currentColor`; names
        `check gate cross pending human machine lock exit0 merge terminal copy
        arrowRight chevronRight github`; `human` vs `machine` distinct. Contract
        from `Icon.d.ts.txt`. (FR-2)
  - [ ] 2.2 `Button.tsx` — `variant primary|secondary|ghost`, `size sm|md|lg`;
        **no green** (primary neutral). `--pg-*` only. Contract from
        `Button.d.ts.txt`. (FR-3)

- [ ] 3.0 Feedback: VerdictBadge + Admonition (FR-4)
  - [ ] 3.1 `VerdictBadge.tsx` — closed `verdict` set (default `passed`), props
        `label code solid size`; glyph-first, monospace; **green only for
        `passed`**, `dim` for `skipped`, per the colour law. Contract from
        `VerdictBadge.d.ts.txt` reconciled to the landing README.
  - [ ] 3.2 `Admonition.tsx` — `type note|tip|warning|pass|fail|human`, `title`.
        Left-rule callout; colour per type (pass=green, fail=red, human=blue).

- [ ] 4.0 CLI-grammar: CodeBlock + GateLine + HandoffCard
  - [ ] 4.1 `CodeBlock.tsx` — always-dark terminal block, props `filename lang
        prompt copyable`, string children. (FR-5)
  - [ ] 4.2 `GateLine.tsx` — closed `status` set (default `passed`), props `name
        command code bare`; the glyph (`✓ ✗ ⚠ = → !`) carries status, colour
        redundant. (FR-5)
  - [ ] 4.3 `HandoffCard.tsx` — **structured** `{variant, title, width=56,
        lines[]}`; each line `string | {blank} | {gate,text} | {arrow,text}`;
        copy-exact box-drawing; `→ READY TO PUSH` in human-blue; green rule
        (handoff) / red rule (stopped). Does NOT call the CLI string builder.
        Contract from the landing README (the `.d.ts.txt` matches). (FR-6)

- [ ] 5.0 Data + diagram: EvidenceTable + PhasePipeline
  - [ ] 5.1 `EvidenceTable.tsx` — `rows[]` of `{check, command, verdict, code,
        evidence}`; verdict cell renders `VerdictBadge`; exit cell red only when
        `verdict === 'failed'`. (FR-7)
  - [ ] 5.2 `PhasePipeline.tsx` — `phases[]`, `active`, `showPush`; human gates
        (1–3) vs machine gates (4–7) visually distinct; push always the human
        boundary; callers pass explicit `phases`. (FR-8)

- [ ] 6.0 Barrel + exports (FR-9)
  - [ ] 6.1 `react/index.ts` exports all nine (replacing the PRD-010 stub);
        `@provegate/design/react` resolves them with types.

- [ ] 7.0 Tests (FR-10)
  - [ ] 7.1 `props.test.tsx` — each component accepts its `.d.ts.txt` props and
        renders (jsdom); all nine resolve from the barrel.
  - [ ] 7.2 `react.test.tsx` — colour law: `Button` has no green variant;
        `VerdictBadge` green only for `passed`, dim for `skipped`; the verdict set
        is exactly the closed six; glyphs are `✓ ✗ ⚠ = → !`; `EvidenceTable` exit
        red only on `failed`; `HandoffCard` renders the box + `→ READY TO PUSH`.
  - [ ] 7.3 Token-only scan: no hardcoded hex or font-stack in `src/react/**`.
  - [ ] 7.4 **W2** — extend `cli-entry.test.ts`: the built `dist/cli` has no React
        (`react`/`react-dom`/`jsx-runtime`), not just the source import graph.

- [ ] 8.0 README (FR-11)
  - [ ] 8.1 `packages/design/README.md` — the React layer: the nine components,
        the HandoffCard lines contract, the colour-law obligations for consumers,
        peer-React vs React-free `./cli`.

- [ ] 9.0 Phase 5 — Testing
  - [ ] 9.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [ ] 9.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `gate check PRD-012`, never-push, hygiene grep.

- [ ] 10.0 Phase 6 — Final Auditing
  - [ ] 10.1 Independent adversarial review → verdict artifact at
        `_docs/reviews/review-012-web-design-adoption.md`. `Verdict: pass`
        requires `Critical: 0`. Reviewer attacks: `./cli` React-free (built
        output), prop-contract fidelity, the colour law (green only for passed),
        peer-React resolution.

- [ ] 11.0 Phase 7 — Learning
  - [ ] 11.1 Confirm the declared Durable Artifact (`packages/design/README.md`)
        is in the merge diff.
  - [ ] 11.2 Knowledge ingest: the DOM-test-env split and the HandoffCard
        lines-contract decision (not derivable from the code alone).

---

## Verification Ledger

| Gate               | Command / Check                                                       | Scope  | Result  | Evidence | Notes                       |
| ------------------ | --------------------------------------------------------------------- | ------ | ------- | -------- | --------------------------- |
| FR-1               | `pnpm --filter @provegate/design build`                               | design | pending |          | react entry builds with JSX  |
| FR-2               | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | pending |          | Icon renders, names present  |
| FR-3               | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | pending |          | Button has no green variant  |
| FR-4               | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | pending |          | VerdictBadge/Admonition sets |
| FR-5               | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | pending |          | CodeBlock + GateLine glyphs  |
| FR-6               | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | pending |          | HandoffCard lines[] + box    |
| FR-7               | `pnpm --filter @provegate/design test test/react.test.tsx`            | design | pending |          | EvidenceTable exit red-on-fail |
| FR-8               | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | pending |          | PhasePipeline explicit phases |
| FR-9               | `pnpm --filter @provegate/design test test/props.test.tsx`            | design | pending |          | nine resolve from the barrel |
| FR-10              | `pnpm --filter @provegate/design test test/cli-entry.test.ts`         | design | pending |          | ./cli React-free (built)     |
| FR-11              | `grep -c "HandoffCard" packages/design/README.md`                     | design | pending |          | React layer documented       |
| types              | `pnpm check-types`                                                    | root   | pending |          | zero errors                  |
| lint               | `pnpm lint`                                                           | root   | pending |          | zero warnings                |
| test               | `pnpm test`                                                           | root   | pending |          | full suite; priors unchanged  |
| build              | `pnpm build`                                                          | root   | pending |          | clean, all packages/apps      |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-012`                   | repo   | pending |          | PRD passes its own gate      |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`             | repo   | pending |          | refusal exit 1               |
| hygiene            | `grep -ri -l -e emofy -e rayvaz packages/design/src && exit 1 \|\| true` | design | pending |          | no personal names            |
| independent-review | `_docs/reviews/review-012-web-design-adoption.md`                    | repo   | pending |          | verdict pass, critical = 0   |

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

- (none — depends on PRD-010, which is landed)

---

## Operator Handoff

> None — every gate is machine-checkable. Visual parity of the components is a
> nice-to-have verified by the consuming PRDs (013/014), not a gate here.

| Task | Category | Owner | Required Check | Status | Notes |
| ---- | -------- | ----- | -------------- | ------ | ----- |
|      |          |       |                |        |       |
