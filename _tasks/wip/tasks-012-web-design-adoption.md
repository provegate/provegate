# Tasks: Web Design Adoption

> **PRD**: [prd-012-web-design-adoption.md](../../_prds/wip/prd-012-web-design-adoption.md)
> **Readiness**: [readiness-012-web-design-adoption.md](../../_readiness/wip/readiness-012-web-design-adoption.md)
> **Status**: Not Started
> **Readiness Score**: 8.4/10
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

- `packages/design/src/react/index.ts` — `./react` entry: the nine components
- `packages/design/src/react/*.tsx` — Icon, Button, VerdictBadge, Admonition,
  CodeBlock, GateLine, HandoffCard, EvidenceTable, PhasePipeline
- `packages/design/test/react-card.test.ts` — web card textContent == shared builder
- `apps/web/app/layout.tsx` — root, `styles.css` import, theme, OG metadata, favicon
- `apps/web/app/page.tsx` — composes the section components
- `apps/web/app/sections/*.tsx` — the eleven landing sections
- `apps/web/app/icon.svg` — favicon from the design asset
- `apps/web/package.json` — design dep + vitest devDeps (new test runner)
- `apps/web/test/landing.test.ts` — eleven sections, proof-adjacent limits
- `apps/web/test/content-web.test.ts` — copy discipline, wordmark casing
- `apps/web/test/contrast.test.ts` — AA over token pairs, no color-only status
- `apps/web/README.md` — token map, rebuilt-not-copied, rejected kit facts
- `apps/docs/app/global.css` — bind `--pg-*` onto Fumadocs variables
- `apps/docs/components/mdx.tsx` — register design components in the MDX map
- `apps/docs/lib/layout.shared.tsx` — shared fonts, dark canonical
- `apps/docs/app/og/docs/[...slug]/route.tsx` — brand OG card, bounded slug
- `apps/docs/package.json` — design dependency
- `scripts/check-static-egress.mjs` — zero-dep external-origin scanner
- `package.json` — root script entry for the egress check

### Notes

- Depends on PRD-010 landing first; extends `packages/design/**` with `src/react/`.
- Kits are references, not sources:
  `docs/design/design_handoff_provegate/design-system/ui_kits/` +
  `components/**` (`.d.ts.txt` prop contracts) + `guidelines/*.card.html`.
- Do NOT ship `_ds_bundle.js`; rebuild against the `.d.ts.txt` contracts.

---

## Tasks

- [ ] 1.0 React components in the design package
  - [ ] 1.1 Port the nine components into `packages/design/src/react/*.tsx` behind
        the `./react` export: `Icon`, `Button`, `VerdictBadge`, `Admonition`,
        `CodeBlock`, `GateLine`, `HandoffCard`, `EvidenceTable`, `PhasePipeline`.
        Preserve every prop name + type from the `.d.ts.txt` contracts; style via
        `--pg-*`, inline no value. (FR-1)
  - [ ] 1.2 `HandoffCard` + `GateLine` render by calling the shared string builders
        from `@provegate/design/cli` (PRD-010 FR-11) and wrapping the lines in
        themed markup — one implementation, no drift. (FR-2)
  - [ ] 1.3 `packages/design/test/react-card.test.ts`: web card `textContent`
        equals the builder's output for a fixture; `handoff` (green rule) /
        `stopped` (red rule) map to the right rule color. (FR-2)

- [ ] 2.0 Landing page (apps/web)
  - [ ] 2.1 Rebuild `apps/web/app/layout.tsx` + `page.tsx`: import
        `@provegate/design/styles.css` once at root, `data-theme="dark"` canonical
        with a working light theme, remove every hardcoded inline style. (FR-3)
  - [ ] 2.2 Build the eleven sections in `apps/web/app/sections/*.tsx` in order:
        nav, hero, problem, core rule, method (PhasePipeline), mechanisms, refusal,
        proof + limits, positioning, FAQ, footer. Limits sit adjacent to proof.
        Terminal blocks are real CLI strings (selectable, no animation). Primary
        CTA = copyable install block; GitHub secondary. (FR-3)
  - [ ] 2.3 Write landing copy from approved sources only (brief §2/§4 +
        whitepaper): the three problem data points, the core-rule pull-quote, the
        seven-phase cut, the five mechanisms, the refusal, proof-with-limits,
        positioning, principles. Enforce the do-not-say list. (FR-4)
  - [ ] 2.4 `apps/web/test/landing.test.ts`: all eleven sections present; the
        limits block renders adjacent to the proof block. (FR-3)

- [ ] 3.0 Docs theming (bind, don't fork)
  - [ ] 3.1 **M4 — verify first**: determine against installed
        `@fumadocs/base-ui` 16.11.5 + Tailwind v4 whether binding `--pg-*` onto
        Fumadocs' `--color-fd-*` themes the site, or whether a `@theme` block is
        required; record the finding in a Deferrals line before wiring. (FR-5, M4)
  - [ ] 3.2 Bind the variables in `apps/docs/app/global.css`, wire the shared
        self-hosted fonts, set dark canonical. Fumadocs layout components used
        as-is; `lucide-react` stays. (FR-5)
  - [ ] 3.3 Register the design components in `apps/docs/components/mdx.tsx`
        (CodeBlock, GateLine, HandoffCard, EvidenceTable, PhasePipeline,
        VerdictBadge, Admonition). (FR-5)
  - [ ] 3.4 Confirm `pnpm --filter docs build` is clean. (FR-5)

- [ ] 4.0 Brand surfaces + OG
  - [ ] 4.1 Render the brand OG card on `apps/docs/app/og/docs/[...slug]/route.tsx`.
        **M5**: bound the `[...slug]` input (cap length, restrict charset, fall
        back to the site title on violation) before it reaches the image. (FR-6, M5)
  - [ ] 4.2 Add static OG metadata + favicon to `apps/web` (`layout.tsx`,
        `app/icon.svg`) from `assets/logo.svg` + `assets/favicon.svg`. (FR-6)

- [ ] 5.0 Egress + a11y gates
  - [ ] 5.1 Write `scripts/check-static-egress.mjs` (zero-dep Node): scan both
        apps' built output for external origins (`http://`, `https://` in fetched
        assets, `fonts.googleapis.com`, analytics hosts); exit non-zero on any hit.
        Note in the script's header that runtime-assembled URLs are out of its
        reach (the egress-scan blind spot). Wire the root `package.json` script. (FR-7)
  - [ ] 5.2 **M2 machine half** — `apps/web/test/contrast.test.ts`: AA over every
        semantic token pair in both themes (incl. terminal text on terminal
        surface); assert no status is encoded by color alone (every status carries
        its glyph). (FR-8)

- [ ] 6.0 Content hygiene + README
  - [ ] 6.1 `apps/web/test/content-web.test.ts`: banned vocabulary
        (`PROVEN`/`VIOLATED`, speedup %), fabricated-metric patterns (version,
        download counts, star counts), wordmark casing (`ProveGate` prose,
        `provegate`/`gate` binary), closed verdict set. (FR-9)
  - [ ] 6.2 Add `vitest` + config to `apps/web/package.json` as devDependencies
        (new test runner). Bundle/site output unaffected. (FR-9, §7 M3)
  - [ ] 6.3 Write `apps/web/README.md`: the token map, why the kits were rebuilt
        not copied, which kit facts were rejected as fabricated (`v1.4.0`,
        `v1.2.0`, weekly downloads, `gate|pass` shield), how to add a section
        without inventing a claim. (FR-10)

- [ ] 7.0 Phase 5 — Testing
  - [ ] 7.1 Run every PRD §11 command; paste evidence into the Verification Ledger.
  - [ ] 7.2 Cross-cutting floor: `pnpm check-types`, `pnpm lint`, `pnpm test`,
        `pnpm build`, `gate check PRD-012`, the never-push invariant, the hygiene
        grep.
  - [ ] 7.3 Complete the operator-owned rows (§8 below) in a real browser and
        record acceptance — `skipped` is not legal for these.

- [ ] 8.0 Phase 6 — Final Auditing
  - [ ] 8.1 Independent adversarial review → verdict artifact at
        `_docs/reviews/review-012-web-design-adoption.md`. `Verdict: pass` requires
        `Critical: 0`. Reviewer attacks: the egress-scan blind spot, copy-discipline
        residue (a plausible invented number), the OG input bound, the Fumadocs
        binding.

- [ ] 9.0 Phase 7 — Learning
  - [ ] 9.1 Confirm the declared Durable Artifact (`apps/web/README.md`) is in the
        merge diff.
  - [ ] 9.2 Knowledge ingest: the Fumadocs binding finding (M4) and the rejected
        kit facts.

---

## Verification Ledger

| Gate               | Command / Check                                                       | Scope  | Result  | Evidence | Notes                       |
| ------------------ | --------------------------------------------------------------------- | ------ | ------- | -------- | --------------------------- |
| FR-1               | `pnpm --filter @provegate/design build`                               | design | pending |          | react entry builds           |
| FR-2               | `pnpm --filter @provegate/design test test/react-card.test.ts`        | design | pending |          | web card == shared builder   |
| FR-3               | `pnpm --filter web test test/landing.test.ts`                         | web    | pending |          | eleven sections, proof+limits |
| FR-4               | `pnpm --filter web test test/content-web.test.ts`                     | web    | pending |          | copy discipline, casing      |
| FR-5               | `pnpm --filter docs build`                                            | docs   | pending |          | themed docs build clean      |
| FR-6               | `grep -Eq "slice\(0," "apps/docs/app/og/docs/[...slug]/route.tsx"`     | docs   | pending |          | OG slug bounded              |
| FR-7               | `node scripts/check-static-egress.mjs`                               | root   | pending |          | zero external origins        |
| FR-8               | `pnpm --filter web test test/contrast.test.ts`                       | web    | pending |          | AA pairs; no color-only status |
| FR-9               | `pnpm --filter web test test/content-web.test.ts`                     | web    | pending |          | banned/fabricated scan       |
| FR-10              | `grep -c "token map" apps/web/README.md`                             | web    | pending |          | adoption documented          |
| types              | `pnpm check-types`                                                    | root   | pending |          | zero errors                  |
| lint               | `pnpm lint`                                                           | root   | pending |          | zero warnings                |
| test               | `pnpm test`                                                           | root   | pending |          | full workspace suite         |
| build              | `pnpm build`                                                          | root   | pending |          | clean, all packages/apps      |
| gate-check         | `node packages/provegate/dist/cli.js check PRD-012`                   | repo   | pending |          | PRD passes its own gate      |
| never-push         | `node packages/provegate/dist/cli.js push; test $? -eq 1`             | repo   | pending |          | refusal exit 1               |
| hygiene            | `grep -ri -l -e emofy -e rayvaz apps/web/app && exit 1 || true`      | web    | pending |          | no personal names            |
| independent-review | `_docs/reviews/review-012-web-design-adoption.md`                   | repo   | pending |          | verdict pass, critical = 0   |

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

- (none — land PRD-010 first; `packages/design/src/react/` extends it)

---

## Operator Handoff

| Task | Category  | Owner    | Required Check                                             | Status  | Notes                        |
| ---- | --------- | -------- | --------------------------------------------------------- | ------- | ---------------------------- |
| 5.x  | manual-qa | operator | Visible focus rings on every interactive element          | pending | keyboard tab-through          |
| 5.x  | manual-qa | operator | `prefers-reduced-motion` suppresses motion                | pending | OS setting on                 |
| 5.x  | manual-qa | operator | No horizontal body scroll at 375px                        | pending | wide blocks scroll in-box     |
| 8.x  | manual-qa | operator | Visual parity vs `guidelines/*.card.html` + landing kit    | pending | both themes, desktop + mobile |
| 8.x  | manual-qa | operator | Terminal specimens on page match reader's own `gate` output | pending | real-browser check            |
