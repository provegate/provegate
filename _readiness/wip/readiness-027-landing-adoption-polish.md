# Readiness Assessment: PRD-027 — Landing Adoption Polish

> **Iteration 2 (Codex, independent) — 7.03/10, UP 0.10, still ITERATE.** The round that
> proved the self-score's mechanism work but broke its *tests*. Both resolver claims the
> author remediated into the PRD (W1, W5) were **verified correct** — Codex executed
> `accumulateMetadata` directly and got the predicted output for `/` and `/alt`. That is why
> Technical Depth rose. Scope & Testability fell further, and two [P1]s landed:
>
> **(A) FR-6 cannot achieve its own fold target.** The metric promises both CTAs above the
> fold at 375×667, but the CTAs live inside the hero's **first** grid item and the
> `HandoffCard` is the **second** (`index.tsx:59-117`) — so hiding the later card cannot move
> earlier content upward. The FR and the metric it serves contradict each other geometrically.
> **(B) The FR-1/FR-8 tests assert declarations while the acceptance criteria promise resolved
> behavior** — a Next upgrade could restore `/alt`'s inherited image or suppress `/`'s, with
> every prescribed test green. And `/alt` has no operator row at all.
>
> Six [P2]s, including a **second false baseline**: the overview says the install command is
> authored twice; it is authored three times (`content.ts:18,35,350`) — and the PRD's own FR-3
> already names three consumers. Same defect class as iteration 1's [P1] C, one round later.
>
> <details><summary>Iteration 1 (6.93 ITERATE, self-scored)</summary>
>
> **Iteration 1 (self-scored, Claude Opus 5) — 6.93/10, ITERATE.** Three [P1]s. The
> decisive one is **[P1] A**: FR-1 instructs the implementer to declare
> `openGraph.images` explicitly, and the installed Next 16.2.11 applies file-based
> `opengraph-image` metadata **only when that key is absent** — so following the PRD as
> written suppresses the very card the PRD exists to add. Found by reading the resolver,
> not by reasoning about it. **[P1] C** is worse in kind: a Success Metrics baseline in the
> PRD is fabricated — it claims one orphaned anchor exists today; measured, there are zero.
>
> **Remediation status, 2026-07-27: all seven watch items closed** (PRD Changelog rows 2 and
> 3); `gate check PRD-027` passes after each pass. **The score below is NOT re-computed** — it
> stands against the pre-remediation PRD, and re-scoring the author's own remediation would
> repeat the very defect this round exists to catch. Next step is an independent round, which
> supersedes this row.
>
> Two of the seven closures changed the PRD's *design*, not just its wording, and both came
> from reading the installed resolver: FR-1 now forbids the `images` declaration it previously
> mandated (W1), and FR-8 drops `/alt`'s inherited card by declaration because `openGraph` is
> replaced wholesale rather than field-merged (W5). An independent round should verify those
> two against `next@16.2.11` rather than against this summary.
>
> **This is a self-score.** The author wrote the PRD. Every prior item in this wave
> (PRD-024/025/026) was scored by Codex, independently, and each independent round found
> defects the authoring model did not. Treat this as a pre-screen, not the gate.
>
> </details>

## Quick Meta

| Field                  | Value                                          |
| ---------------------- | ---------------------------------------------- |
| PRD                    | `_prds/wip/prd-027-landing-adoption-polish.md` |
| Score                  | 7.03/10                                        |
| Verdict                | ITERATE — two [P1] items: FR-6's fold target is geometrically unreachable by FR-6, and the FR-1/FR-8 tests assert declarations where the acceptance criteria promise resolved behavior |
| Iteration              | 2                                              |
| Model Tier (Execution) | do not assign — score < 8                      |
| Model Tier (Audit)     | high (on a PASS)                               |
| Scored by              | **Codex (codex-cli 0.145.0) via the `/codex` skill — independent, different model family, did not write the PRD** |
| Self-scored            | **no** (iteration 1 was; see the collapsed banner) |
| Date                   | 2026-07-27                                     |
| PRD Lint               | passed — `node packages/provegate/dist/cli.js check PRD-027` → `ok`, re-run in a writable workspace. Codex's own run exited 1 only because its read-only sandbox denied `_state/prds.json.<pid>.tmp`; that is an environment artifact, not a content failure |
| State Record           | updated — `gate status` re-run after saving    |

<!-- Verdict values: PASS | ITERATE | REJECT. The Score row and Verdict row are parsed
by the state builder — keep the `| Score |` and `| Verdict |` labels intact. -->

---

## Model Tier Recommendation

| Phase               | Tier | Rationale |
| ------------------- | ---- | --------- |
| Execution (Phase 4) | do not assign | score below the PASS band |
| Audit (Phase 6)     | high | the one defect that shipped into this PRD is a framework-resolution mechanism that *reads* correct. A medium-tier audit would very likely accept `openGraph.images` declared next to an `opengraph-image.tsx` file as obviously right |

---

## Analysis

### Findings — iteration 2 (Codex, independent)

Every finding below was re-verified in this repository before being recorded here.

**[P1] J — FR-6 cannot achieve the fold target it is written to serve.** The Success Metrics
row promises eyebrow + h1 + lede + **both CTAs** above the fold at 375×667, and FR-6 is the FR
that delivers it. But the hero is a two-item grid: the **first** item holds eyebrow, h1, lede,
the terminal, both CTAs and the principles line, and the **second** item holds the
`HandoffCard` (`apps/web/app/sections/index.tsx:59-117` — the left `<div>` closes at 109, the
`<Reveal><HandoffCard/></Reveal>` follows). At ≤900px `globals.css:132-143` only collapses the
grid to one column, so the card renders *after* the CTAs. Hiding a later element cannot move an
earlier one upward. Verified by reading the JSX order directly. What would actually move the
CTAs is reducing the terminal's 188px `minHeight` (`hero-terminal.tsx:70`) or reordering the
CTAs ahead of the terminal on mobile — neither of which FR-6 specifies. Remedy: either add the
mobile reorder/compaction to FR-6, or drop the CTA half of the metric and keep FR-6 as a
length reduction only.

**[P1] K — the FR-1 and FR-8 assertions are one abstraction level below the criteria they
back.** FR-1's coherence triple reads source tokens and the exported `metadata` object
(`prd:165-181`); FR-8 checks `/alt`'s declaration (`prd:530`). Neither observes **emitted**
metadata, while the acceptance criteria promise resolved and unfurled behavior
(`prd:300-305,325-328`). A Next upgrade that changed the `:148` gate could restore `/alt`'s
inherited image or suppress `/`'s, and every prescribed test would stay green. The real-unfurl
operator row covers `/` only (`prd:559-563`), so `/alt` is proxy-tested end to end. This
survives W1's repair rather than being caused by it: the triple is a *better* declaration
assertion, still not a behavioural one. Remedy is available and cheap — the build already emits
parseable HTML for both routes (`apps/web/.next/server/app/index.html` 233,705 B and
`alt.html` 101,898 B, both confirmed present): assert root `og:image` + dimensions + twitter
image, and assert `/alt` has no image, `card: summary`, and `noindex, nofollow`.

**[P2] L — the OG card has no executable content specification.** FR-1 fixes dimensions,
tokens, mark and "layout" but names no exact strings, no source constants, no `export const alt`
and no shared `size` export (`prd:145-151`) — while Non-Goals forbid new copy (`prd:289-290`)
and the operator is asked to judge whether it "renders correctly" (`prd:559`). An implementer
must therefore either invent copy (forbidden) or guess. Remedy: prescribe the exact existing
constants, an `alt` export, and a named `size` reused by `ImageResponse`.

**[P2] M — FR-7's assertion is weaker than the Goal it serves.** The Goal says no export exists
"without a **render** that uses it" (`prd:77`); FR-7 accepts any textual reference under
`apps/web/app` (`prd:244-247`). `apps/web/tsconfig.json` does not set `noUnusedLocals`, so a
comment, a dead constant or an import-only reference satisfies a source scan. Remedy: narrow the
Goal's wording to "referenced", or specify a render-aware check.

**[P2] N — FR-5 has no scrollspy algorithm and ignores the second nav.** No intersection
tie-break is defined when several sections are visible at once. Worse, `Nav` maps `NAV_LINKS`
**twice** — the desktop strip and the mobile drawer (`nav.tsx:104` and `nav.tsx:159`, verified).
A natural implementation marks both, so an open drawer yields two `aria-current` links and
contradicts "exactly one" (`prd:217-225`). CSS hides the desktop strip at ≤900px but does not
remove it from the DOM, so a jsdom assertion sees both. Remedy: define precedence, name which
nav instance owns `aria-current`, and test the open-drawer case.

**[P2] O — the Rollback section contradicts FR-8's own reason for existing.** §7 says seven of
eight FRs are independently revertible and "nothing here depends on another FR having landed"
(`prd:383-386`). FR-8 exists *because* FR-1 makes the root card reach `/alt` (`prd:255-269`).
Reverting FR-8 alone restores the impersonating unfurl on an indexable concept page. Remedy:
declare FR-1 and FR-8 one rollback unit, ordered.

**[P2] P — the memory capture needs a write the PRD never declares.** The PRD produces a
learning (`prd:481-488`) and `_brain/PROTOCOL.md:219-224` requires an INDEX pointer for it, but
`_brain/INDEX.md` appears in neither the Conflict Surface (`prd:492-501`) nor Implementation
Scope (`prd:410-426`). An implementing agent following the stop-and-ask rule must halt on an
out-of-scope file at Phase 7. Remedy: declare `_brain/INDEX.md` in both, and name the pointer
update in Durable Artifacts.

**[P2] Q — a second false baseline, same class as iteration 1's [P1] C.** The overview says the
install command is "authored twice" citing `content.ts:18` and `:350` (`prd:49`). Measured:
**three** occurrences — `:18` (`HERO.install`), `:35` (`HERO_TERMINAL.steps`), `:350`
(`INSTALLERS[0].code`). The PRD's own FR-3 already names all three consumers, so the overview
contradicts its own FR. Remedy: state three, consolidated to one.

### What held up under independent execution

- **W1 is correct.** Static Open Graph / Twitter images are applied only when the level lacks
  its own `images` key (`resolve-metadata.js:137-157`), and post-processing fills Twitter images
  from resolved Open Graph (`:619-653`).
- **W5 is correct, and was proven by running the resolver** rather than reading it. Codex
  invoked `accumulateMetadata` directly with the PRD's prescribed shapes and got: `/` →
  `https://provegate.dev/opengraph-image` in both Open Graph and Twitter; `/alt` → own
  title/description, **no image**, `twitter.card: summary`, `noindex, nofollow`. `openGraph` and
  `twitter` declarations replace their resolved objects (`:182-190`) while metadata accumulates
  level by level (`:764-800`).
- `metadataBase` makes the root image absolute, and the non-grouped route stays
  `/opengraph-image` (`get-metadata-route.js:45-46,63-70`).
- **The measurable baselines held** (except Q): built `/` and `/alt` have no image metadata
  today, both inherit the root title and card, `/alt` has no robots directive; rendered anchors
  have **zero** orphans; TrustStrip is 0-of-3 linked; `#ledger` and `#proof` exist and
  `#refusal` does not.
- The export census held: 38 exports, `PROOF` the sole zero-reference one (`content.ts:284-288`).
- Static egress passed: `[egress] clean`, and the scanner does cover both built apps.
- FR-2/FR-3/FR-4 and FR-6's CSS half fit their named environments — `landing.test.tsx` is jsdom
  (`:1-5`), `a11y.test.ts` is correctly source-text-only (`:1-11`). W3's split was right.
- The turbo claim held: `test` declares no `inputs` (`turbo.json:15-17`) and the verifier rejects
  adding them (`verify-turbo-inputs.mjs:56-69`).
- Value arithmetic held: `0.25×3 + 0.25×3 + 0.20×2 + 0.15×5 + 0.15×5 = 3.40`. Memory Inputs are
  active and indexed; the Memory Output repeats in Durable Artifacts.
- Security and contract hard caps do not apply.

### Findings — iteration 1 (self-scored)

**[P1] A — FR-1's central instruction is inverted, and following it suppresses the card.**
FR-1 says to "wire `openGraph.images` and `twitter.images` **explicitly** in `metadata`
rather than relying on file-convention injection, so the contract is assertable at the
source." Measured against the installed resolver
(`next@16.2.11/dist/lib/metadata/resolve-metadata.js`):

- `:148-157` — file-based `openGraph` image metadata is merged **only if** the level's own
  metadata does not have an `openGraph.images` key. The comment in Next's source says so
  verbatim: *"file based metadata is specified and current level metadata openGraph.images
  is not specified"*.
- `:138-147` — the same gate for `twitter`.
- `:636` — when `twitter` has no `images` key, it is auto-filled from `openGraph.images`.

So the explicit declaration the PRD mandates turns the convention **off** and forces the
implementer to hardcode the generated route path. (`get-metadata-route.js:45-46` shows the
path is `/opengraph-image` un-suffixed only because the file sits outside a route group —
a detail the PRD never states and a future route group would silently break.) The correct
contract is the opposite of what is written: ship `app/opengraph-image.tsx` and declare
**neither** images key, letting `:148` fill `openGraph` and `:636` fill `twitter`. An
autonomous agent following FR-1 as written ships a landing page whose OG card is
suppressed — the exact defect the PRD exists to fix, reintroduced by the fix.

**[P1] B — FR-1's assertion cannot be made against what the test can see.** Consequence of
A, and it survives A's repair. A unit test can import the `metadata` object exported by
`layout.tsx`; the OG image is injected during Next's *resolution*, so it never appears
there. "Declaration and asset agree" is therefore unassertable at the level the §11 row
runs at. An implementer hitting this writes the assertion against a field that is
permanently empty and then either weakens it or asserts something else and calls it done.
The row must name the assertable form — the coherence triple below (W1) — or the
verification is theatre.

**[P1] C — a Success Metrics baseline is fabricated.** The table claims: *"Rendered
`href="#…"` with no matching id — Current: 1 (`#refusal` is unlinkable — no id exists to
link to)"*. Measured by rendering all 23 sections into one container:

```
anchors: ["how","install","ledger","method","proof","top"]
orphans: []
```

**Zero.** Nothing on the page links to `#refusal` today, so no anchor is orphaned. The real
defect is that `Refusal` has no `id` for a link to *point at* — a missing target, not a
broken link. A metric row that states a current value nobody measured is precisely the
self-attestation this method refuses, and it reached the PRD's own evidence table.

**[P2] D — FR-6 targets a test file that cannot hold half of its assertion.**
`test/a11y.test.ts` carries no `@vitest-environment jsdom` pragma and asserts over
`globals.css` as text. FR-6's row promises the CSS rule **and** "exactly one HandoffCard in
the DOM"; the second needs a render. Measured: the DOM count works in `landing.test.tsx`
(which has the pragma) and returns 1. Split the row — CSS presence in `a11y.test.ts`, DOM
count in `landing.test.tsx`.

**[P2] E — `aria-current="true"` is the imprecise token.** ARIA defines `location` for the
current location within a set, which is what an in-page section indicator is; `true` is the
generic fallback. FR-5 prescribes `true` without argument. Either prescribe `location` or
say why `true`.

**[P2] F — FR-8 does not close the inheritance FR-1 creates.** A root
`app/opengraph-image.tsx` applies to child segments, so after FR-1 lands, `/alt` unfurls as
the product page even though FR-8 makes it `noindex, nofollow`. Noindex governs crawlers,
not unfurls. Either give `/alt` its own `openGraph` block or state the inheritance as
accepted, with the reason.

**[P2] G — no rollback treatment, and the one asymmetry that exists is the unfurl cache.**
The PRD has no Migration/Rollback section. Per-FR the change is additive and `git revert`
covers the repository — but X, Slack and LinkedIn cache OG cards, so a wrong card outlives
the revert by however long the consumer's cache does. The operator row that verifies a real
unfurl is listed without an ordering constraint; it needs to be a precondition to
announcing the link anywhere, not one item in a flat list.

**[P3] H — FR-3's "exactly once" is brittle for a non-defect.** A future doc comment citing
`npm install -D provegate` would fail the test without any duplication being introduced.
Scope the count to non-comment source, or count declarations rather than occurrences.

**[P3] I — the §11 Notes-column hazard is live and it bit at authoring time.** The first
`gate check PRD-027` refused two Notes-column spans as unsafe commands (`aria-current`,
`/alt`), because `safety.ts:47-59` extracts every backticked span on an `| FR-N |` row and
exempts only extension-terminated paths. This is `notes-column-runs-commands`, still
unfixed in the parser. Not a defect in this PRD — it is disclosed in the Memory Inputs and
a comment under the table — but it is the second PRD in this wave to pay the same toll,
which is evidence for fixing the parser rather than the authors.

### What was confirmed by execution

- **`PROOF` is the only unreferenced export.** Enumerated all 38 `export const`s in
  `sections/content.ts` and counted references across the 14 app sources: `PROOF` scores 0,
  every other export ≥ 1. FR-7 therefore smuggles in no additional deletion, and its
  "no unreferenced export" rule is satisfiable the moment `PROOF` goes.
- **FR-4's anchor-closure assertion is mechanically possible.** All 23 sections render into
  one container (155 ms), and `render(<Page />)` also works (13,766 characters of text), so
  the test can assert over the real composition instead of a per-section approximation.
  The existing suite reads `page.tsx` as *text* (`landing.test.tsx:49`), which had suggested
  rendering it might not work; measured, it does.
- **FR-2 needs no new primitive.** `TermBar` already accepts `children` for trailing
  controls and `termButton` exists for exactly this kind of chrome button
  (`app/sections/ui.tsx:173-211`).
- **Current anchors all resolve.** FR-4 is additive hardening, not a bug fix — which is the
  correct framing and the opposite of what metric C claimed.
- **The `DO NOT` on turbo `inputs` matches a shipped gate,** not an invented rule:
  `scripts/verify/verify-turbo-inputs.mjs` refuses an `inputs` key on any cached task as a
  blanket rule, exceptions file empty.
- **No claim overlap.** `gate queue`: PRD-021 is the only in-flight item and its Conflict
  Surface holds no `apps/**` path.
- **`verify:test-task-coverage` is package-level;** `apps/web` already has a real test task,
  so the new `test/metadata.test.ts` needs no registration.
- **The two rejected review items are correctly rejected,** with citations that hold:
  `Problem`/`Proof` render different data (`index.tsx:168` vs `516`/`531`, asserted by
  `landing.test.tsx:79-85`), and `copyable` is already passed in `tabs.tsx:93,121` and
  rendered by `CodeBlock.tsx:38-52`.

### Hard caps — each checked explicitly, none tripped

| Cap | Result |
| --- | ------ |
| Security (protected surface without a deny-path test) | **not tripped.** No route, endpoint or query path is protected. The one input-drawing risk — arbitrary text rendered into an image, which is why the docs route bounds its `[...slug]` (`route.tsx:11-19`) — is structurally absent: this card is static and takes no input |
| Contract (new client→server payload) | **not tripped.** No payload |
| Runtime dependency in `packages/provegate` | **not tripped.** The package is untouched; `next/og` ships inside `next`, already a dependency of `apps/web` |
| Push code path | **not tripped.** Nothing executes git |
| Method content traceability | **not tripped.** No prompt, template or schema |
| Lint | **not tripped.** `gate check PRD-027` → ok |

---

## Scorecard — iteration 2 (Codex, independent)

Class `feature` weights, per `packages/provegate/prompts/phase-2-readiness-scorer.md`.

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | Unchanged. W1's repair removed the wrong instruction, but FR-1 still has no content spec (L), FR-5 no algorithm (N), and FR-6 no path to its own target (J) |
| 2         | Completeness             | 20%    | 6.5/10     | Down 0.5. The rollback section now exists but contradicts FR-8's dependency (O), the memory capture omits a required write (P), and a second baseline is false (Q) |
| 3         | Technical Depth          | 25%    | 7.0/10     | **Up 1.0** — the two remediated resolver claims were executed and held (W1, W5). Against that, J is a geometric error inside the design itself |
| 4         | Multi-Tenancy & Security | 20%    | 9.0/10     | Unchanged. No tenant, auth, protected-route, payload, network or dependency surface; caps checked individually |
| 5         | Scope & Testability      | 10%    | 5.5/10     | **Down 1.0** — the FR-1/FR-8 tests sit one abstraction below their criteria (K), `/alt` has no operator row, and FR-7's assertion is weaker than its Goal (M) |
| 6         | Migration & Rollback     | 10%    | 6.5/10     | Up 0.5 for the new section and the ordered unfurl precondition; docked for the false independence claim (O) |
| **Total** | **Weighted**             |        | **7.03/10** | **ITERATE** |

Weighted sum:
`0.15×6.5 + 0.20×6.5 + 0.25×7.0 + 0.20×9.0 + 0.10×5.5 + 0.10×6.5`
= `0.975 + 1.300 + 1.750 + 1.800 + 0.550 + 0.650 = 7.025` → 7.03.

<details><summary>Scorecard — iteration 1 (self-scored, 6.93)</summary>

| #         | Dimension                | Weight | Score      | Notes |
| --------- | ------------------------ | ------ | ---------- | ----- |
| 1         | Clarity                  | 15%    | 6.5/10     | Targets are concrete everywhere, every FR maps to a runnable row, DO NOT present, Open Questions empty — the agent-executability checklist passes. But FR-1's central instruction is *wrong in a direction an agent will follow*, and FR-6 names a file that cannot hold its assertion. A confidently wrong instruction is worse than a vague one |
| 2         | Completeness             | 20%    | 7.0/10     | Eight FRs cover eight measured defects; stories and acceptance criteria map cleanly; the two rejected review items are refuted rather than ignored. Missing: any rollback treatment, and FR-1's assertion has no specifiable form |
| 3         | Technical Depth          | 25%    | 6.0/10     | Strong where it was measured — the hex/token constraint, the egress gate, the `PG_ORDER` lock, the `TermBar` slot, generalizing two assertions into rules. Against that: the single most important mechanism in the PRD, Next's metadata resolution, was asserted from assumption and is backwards |
| 4         | Multi-Tenancy & Security | 20%    | 9.0/10     | No tenant, auth, protected-route, payload, network or dependency surface. The static card has no input to inject, and the precedent that bounds the dynamic case is cited |
| 5         | Scope & Testability      | 10%    | 6.5/10     | Non-Goals are explicit and priced; every FR has a command. But two of eight assertions are misplaced or unassertable, and one metric baseline is false |
| 6         | Migration & Rollback     | 10%    | 6.0/10     | Additive, per-FR revertible, `web` is `private` so no release coupling and no data migration. The one real asymmetry — third-party unfurl caches outliving a revert — is unaddressed, and the operator row that would catch it carries no ordering constraint |
| **Total** | **Weighted**             |        | **6.93/10** | **ITERATE** |

Weighted sum:
`0.15×6.5 + 0.20×7.0 + 0.25×6.0 + 0.20×9.0 + 0.10×6.5 + 0.10×6.0`
= `0.975 + 1.400 + 1.500 + 1.800 + 0.650 + 0.600 = 6.925` → 6.93.

</details>

---

## Missing Pieces (watch items — binding on Phase 3 and Phase 6)

### Iteration 2 — open, binding before re-scoring

- **W8 — make FR-6's fold target reachable, or drop it.** [P1] J. The card is the hero's second
  grid item; the CTAs are in the first. Either specify the mobile reorder/compaction that
  actually lifts the CTAs, or reduce the metric to a hero-length claim FR-6 can deliver.
- **W9 — assert FR-1 and FR-8 on emitted metadata, not declarations.** [P1] K. Add built-output
  assertions for **both** routes: `/` has `og:image` with dimensions plus a twitter image; `/alt`
  has no image, `card: summary`, and `noindex, nofollow`. Give `/alt` an operator row too.
- **W10 — specify the OG card's content.** [P2] L. Exact existing constants, an `alt` export, a
  named `size` reused by `ImageResponse`, and the minimal layout contract — so the implementer
  never has to invent copy the Non-Goals forbid.
- **W11 — settle FR-5's algorithm and nav ownership.** [P2] N. Intersection precedence, which of
  the two `NAV_LINKS` maps owns `aria-current`, and a test for the open drawer.
- **W12 — align FR-7 with its Goal.** [P2] M. Either narrow the Goal to "referenced" or make the
  check render-aware.
- **W13 — fix the rollback independence claim.** [P2] O. FR-1 and FR-8 are one ordered rollback
  unit; reverting FR-8 alone restores the impersonating unfurl.
- **W14 — declare the `_brain/INDEX.md` write.** [P2] P. It belongs in Implementation Scope, the
  Conflict Surface, and Durable Artifacts, or Phase 7 stalls on an out-of-scope file.
- **W15 — correct the install baseline to three.** [P2] Q. `content.ts:18,35,350`. The overview
  contradicts the PRD's own FR-3.

<details><summary>Iteration 1 watch items — all closed</summary>

> **All seven watch items are closed in the PRD** as of 2026-07-27 (Changelog rows 2 and 3).
> The descriptions stay as written so the independent round verifies each remediation against
> the original finding rather than against a summary of it. W5 was closed by measurement
> rather than by choice: the resolver replaces `openGraph` wholesale (`:183-186`) instead of
> field-merging, which is what makes `/alt` droppable by declaration.

- **W1 — invert FR-1 and give it an assertable contract.** *(closed)* Ship
  `apps/web/app/opengraph-image.tsx`; declare **neither** `openGraph.images` nor
  `twitter.images` in `layout.tsx`; cite `resolve-metadata.js:148` in the code so the
  omission reads as deliberate rather than forgotten. Replace the §11 assertion with the
  coherence triple: (i) the image module exists and exports a default renderer,
  (ii) `metadata` declares no `images` key at either level, (iii) `twitter.card` is
  `summary_large_image`. Any two without the third is the defect.
- **W2 — correct the Success Metrics baseline.** *(closed)* Orphaned anchors today: **0**. Restate the
  row as "anchor targets that exist for every claim the page makes: 2 of 3 → 3 of 3", and
  keep the orphan count as a regression floor at 0, not a defect count.
- **W3 — split FR-6's row.** *(closed)* CSS-rule presence in `a11y.test.ts`; the single-HandoffCard DOM
  count in `landing.test.tsx`, which has the jsdom pragma.
- **W4 — add a Migration & Rollback section.** *(closed)* State the unfurl-cache asymmetry, and make
  the real-unfurl operator row a precondition to sharing the link rather than a flat list
  item.
- **W5 — decide `/alt`'s OG inheritance in FR-8** *(closed)* — either with its own `openGraph` block or
  an explicit acceptance of the root card.
- **W6 — settle `aria-current`** *(closed)* — `location`, or a stated reason for `true`.
- **W7 — narrow FR-3's occurrence count** *(closed)* — so a future doc comment cannot fail it.

</details>

---

## Iteration History

| #   | Date       | Score | Verdict | Key Changes |
| --- | ---------- | ----- | ------- | ----------- |
| 2   | 2026-07-27 | 7.03  | ITERATE | **First independent round (Codex, codex-cli 0.145.0). UP 0.10, and the direction is informative: the score rose because the remediated *mechanisms* were verified correct, and fell on testability because the *tests* backing them were not.** Both self-remediated resolver claims held under execution, not reading: Codex invoked `accumulateMetadata` directly and got `/` → `https://provegate.dev/opengraph-image` in both Open Graph and Twitter, `/alt` → own title, **no image**, `card: summary`, `noindex, nofollow` (W1 `resolve-metadata.js:137-157` + `:619-653`; W5 `:182-190` + `:764-800`). Two [P1]s: **(J)** FR-6 cannot reach the fold target it serves — the CTAs are in the hero's first grid item and the `HandoffCard` is the second (`index.tsx:59-117`), so hiding the later card cannot lift earlier content; the real levers are the terminal's 188px `minHeight` or a mobile reorder, neither specified. **(K)** FR-1/FR-8 assert declarations and source tokens while their acceptance criteria promise resolved/unfurled behavior, so a framework change could break either direction with every test green — and `/alt` has no operator row; the fix is available since the build emits parseable HTML for both routes. Six [P2]s: **(L)** the OG card has no content spec — no exact strings, no `alt`, no shared `size` — while Non-Goals forbid inventing copy; **(M)** FR-7's textual-reference check is weaker than the Goal's "a render that uses it", and `noUnusedLocals` is off; **(N)** FR-5 has no intersection tie-break and `Nav` maps `NAV_LINKS` **twice** (`nav.tsx:104,159`), so an open drawer yields two `aria-current` links against "exactly one"; **(O)** the new Rollback section claims full FR independence while FR-8 exists *because* of FR-1; **(P)** the memory capture needs an `_brain/INDEX.md` write (`PROTOCOL.md:219-224`) that appears in neither Scope nor Conflict Surface, so Phase 7 stalls on an out-of-scope file; **(Q)** a **second false baseline** — the overview says the install command is authored twice, measured three (`content.ts:18,35,350`), contradicting the PRD's own FR-3. Also held: the measurable baselines (zero orphaned anchors, 0-of-3 TrustStrip links, `#refusal` absent, no image metadata on either built route), the 38-export census with `PROOF` the only orphan, `[egress] clean`, W3's test-file split, the turbo `inputs` claim, and the Value arithmetic. Codex's own `gate check` exited 1 only because its read-only sandbox denied the state tempfile; re-run writable → `ok` |
| 1   | 2026-07-27 | 6.93  | ITERATE | **First round, self-scored — the author's own model.** Three [P1]s. **(A)** FR-1 mandates explicit `openGraph.images`, and `resolve-metadata.js:148-157` applies file-based OG metadata *only when that key is absent* — following the PRD suppresses the card it exists to add; `:636` shows `twitter.images` auto-fills from `openGraph`, so both declarations are wrong. **(B)** consequently FR-1's assertion targets a field a unit test can never see, because injection happens during resolution, not in the exported `metadata` object. **(C)** the Success Metrics table claims one orphaned anchor exists today; rendering all 23 sections measures **zero** — the defect is a missing `id` to link to, not a broken link. Also **(D)** FR-6's DOM assertion is aimed at `a11y.test.ts`, which has no jsdom pragma; **(E)** `aria-current="true"` where `location` is the ARIA token for an in-page position; **(F)** the root OG card FR-1 adds will make `/alt` unfurl as the product page, which FR-8's noindex does not govern; **(G)** no rollback treatment at all, and third-party unfurl caches are the one thing a revert does not reach; **(H)** FR-3's "exactly once" fails on a future doc comment; **(I)** the live `notes-column-runs-commands` parser hazard refused two Notes spans at authoring time — disclosed, not a defect, but the second toll paid this wave. **Confirmed by execution:** `PROOF` is the only unreferenced export of 38; all 23 sections *and* `<Page />` render in jsdom, so FR-4's closure assertion is real; `TermBar` already takes trailing children; current anchors have zero orphans; the turbo `inputs` DO NOT matches a shipped blanket gate; no `apps/**` claim overlap; both rejected review items refuted with holding citations; every hard cap checked individually and none tripped |

---

## Project-Specific Checklist

| Check | Result |
| ----- | ------ |
| No external request added (fonts, images, beacons) | **specified and gated.** Satori's built-in typeface; `node scripts/check-static-egress.mjs` is an FR-1 row. Note the scanner does not read `<meta content>` and `provegate.dev` is in `OWN_HOSTS`, so the emitted absolute `og:image` URL cannot false-positive |
| No raw hex under `apps/web/app` | **specified.** Colours from `@provegate/design/tokens`, mirroring the docs route's stated reason (Satori cannot read CSS custom properties). `content-web.test.ts` scans every `.ts`/`.tsx`/`.css` under `app/` |
| Copy discipline — no fabricated version, badge, count, testimonial | **holds.** No new claim; FR-3 reduces the copy surface rather than adding to it |
| Real CLI surface only — no `gate.toml`, no `gate ledger` | **untouched.** No FR alters the command reference |
| `PG_ORDER` section order preserved | **explicit DO NOT,** with the enforcing test cited (`landing.test.tsx:15-56`) |
| Push-path omission preserved | **holds.** Nothing executes git; the `Refusal` section gains an `id` only |
| Memory Inputs name active, indexed records | **holds.** All six resolve in `_brain/INDEX.md`; `gate check` validates them |
| Memory Outputs repeat in Durable Artifacts | **holds.** One learning path, present in both lists |
| Declared `Value` equals its weighted sum | **holds.** 3.40 = 0.75+0.75+0.40+0.75+0.75, arithmetic shown in the header. Note it sits *exactly* at the ≥3.40 threshold, and the header says to broaden rather than ship thin if a dimension is scored lower |
| Operator rows are table/list rows, never `skipped` | **holds.** Five operator-owned items, each a real-browser observation |

---

## Verdict

**ITERATE — 7.03/10, iteration 2, scored independently by Codex.**

The remediation worked where it was verifiable and failed where it was not. Both resolver
claims the author derived from `node_modules` were confirmed by *executing* the resolver —
`accumulateMetadata` produced exactly the predicted output for `/` and for `/alt` — which is
the strongest possible outcome for W1 and W5 and the reason Technical Depth rose a full point.

What the independent round found is that the PRD's evidence stops one level short of its own
promises. FR-1 and FR-8 assert declarations; their acceptance criteria describe what an unfurl
does. FR-6 promises a fold the geometry it specifies cannot produce. FR-7 promises a render and
tests a substring. In each case the PRD is *more* confident than its verification supports —
the same shape as the defect it was written to fix in `apps/web`, which is the honest thing to
notice about it.

And a second fabricated baseline appeared, in the round *after* the first one was corrected:
the overview says the install command is authored twice; it is authored three times, and the
PRD's own FR-3 already says so. One false baseline is a slip. Two, in consecutive rounds, in
the same document, is a pattern worth naming — measure the number before writing it, every
time.

**Required before re-scoring:** W8 and W9 (the two [P1]s). W10–W15 should land in the same
pass; each is a paragraph, and O, P and Q are contradictions with the PRD's own text rather
than open questions.

**Confidence in the PASS band:** the two [P1]s are both specification errors, not discoveries
about the world — the mechanism underneath is now verified. A single remediation pass that
closes W8–W15 should clear 8.0.

<details><summary>Verdict — iteration 1 (self-scored)</summary>

**ITERATE — 6.93/10, iteration 1, self-scored.**

The PRD's diagnosis is sound and mostly measured: eight real defects, two review items
correctly refuted with citations, and the parts that were executed rather than reasoned
(the unreferenced-export census, the render feasibility, the `TermBar` slot) all held. What
sinks it is one mechanism and one number. FR-1 gets Next's metadata resolution exactly
backwards, in the direction an autonomous agent will follow without hesitation, and the fix
would therefore ship the defect it names. And the Success Metrics table asserts a current
value — one orphaned anchor — that measurement puts at zero.

The second failure is the more instructive one. A wrong baseline in an evidence table is
not a typo; it is the failure mode this whole method exists to catch, appearing in a
document written *by* the method's tooling author. It is also exactly what an independent
scorer is for.

**Required before re-scoring:** W1–W4 (the three [P1]s plus the rollback gap). W5–W7 may
land in the same pass or as flagged watch items on a PASS.

**Required before Phase 3 regardless of score:** an independent round on a different model
family. PRD-024, PRD-025 and PRD-026 were each scored by Codex, and each round found
defects the authoring model had not — including one found only by *executing* the PRD's own
instructions. This assessment found three defects in its own author's work, which is
evidence the method works, not evidence that self-scoring is sufficient.

</details>
