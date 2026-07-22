# ProveGate — Repository Bootstrap Prompt

> Paste this into a fresh agent session (Claude Code / Cursor / Codex) in an EMPTY directory
> that will become the provegate repository. The `provegate-bootstrap/` folder containing this
> file must be copied into the new repo (suggested location: `docs/research/`) BEFORE starting,
> so the referenced documents resolve.

---

## Mission

Scaffold the **ProveGate** monorepo from scratch: an open-source method + CLI that gates
autonomous AI coding on machine-checkable evidence ("Gated Autonomy"). You are building the
repository skeleton, toolchain, CI, and placeholder packages — NOT the full method extraction
(that is roadmap Phase B–D and happens in later sessions against this skeleton).

## Read first (in this order)

1. `DECISIONS.md` — locked constraints. Do not re-litigate LOCKED items; confirm PENDING items
   with the owner before hard-wiring them.
2. `oss-extraction-roadmap-2026-07-22.md` — the program plan; this bootstrap is Phase A's
   "repo iskeleti" item.
3. `whitepaper-gated-autonomy-2026-07-22.md` — the thesis (skim; informs README/docs tone).
4. `positioning-and-faq-2026-07-22.md` — launch copy source (README one-liners, do-not-say list).
5. `de-emofy-inventory-2026-07-22.md` + `competitor-landscape-*.md` — background, on demand.
6. `source-snapshot/MANIFEST.md` — the frozen source material (39 scripts, 12 prompts,
   6 templates, 3 schemas, reference docs) that Phase B–D extraction will port from. During
   THIS bootstrap you only need to know it exists; do not port anything yet. The manifest's
   "Kullanım kuralları" section binds all later extraction sessions (config over hardcode,
   no personal names, English-only package content).

## Target structure

```
provegate/
├── packages/
│   └── provegate/                # npm: provegate
│       ├── src/                  # TypeScript source
│       │   ├── cli.ts            # bin entry (subcommand router)
│       │   ├── core/             # state/, locks/, run/, gates/ (empty stubs + index)
│       │   └── index.ts          # programmatic exports
│       ├── prompts/              # method prompts (placeholder README now; Phase D fills)
│       ├── templates/            # artifact templates (placeholder README now; Phase D fills)
│       ├── schemas/              # JSON schemas (placeholder README now; Phase B fills)
│       ├── examples/             # gate plugin gallery (placeholder README now)
│       ├── package.json          # name provegate, MIT, node >=22, bin (see PENDING), zero runtime deps
│       └── tsup.config.ts
├── apps/
│   ├── web/                      # Next.js landing (minimal: one page, tagline, npm install snippet)
│   └── docs/                     # Fumadocs site (getting-started stub + method overview stub)
├── docs/research/                # THIS folder, copied in
├── _prds/ _readiness/ _tasks/ _docs/ _state/   # dogfood workflow tree ({wip,completed} + schema/, locks/ gitignored)
├── .github/workflows/ci.yml     # typecheck + lint + test + build on PR/push
├── .github/workflows/release.yml# changesets → npm publish --provenance (manual/tag trigger)
├── .changeset/
├── turbo.json  pnpm-workspace.yaml  package.json
├── CLAUDE.md / AGENTS.md         # thin pointers (agent entry: read docs/research/DECISIONS.md)
├── LICENSE (MIT)  README.md  CONTRIBUTING.md
```

## Task sequence

1. **Workspace:** `pnpm init` root (private), `pnpm-workspace.yaml` (`packages/*`, `apps/*`),
   turborepo with tasks `build`, `check-types`, `lint`, `test` (correct `dependsOn`/`inputs` —
   see Known traps), prettier + eslint (flat config) + commitlint (conventional; scope warn-only),
   `.gitignore` (node_modules, dist, `_state/locks/`, `.turbo`), `engines.node: ">=22"`.
2. **packages/provegate:** TypeScript strict; tsup config (ESM, `dts: true`, `clean: true`,
   target node22); CLI skeleton with subcommand router and stub commands that print their
   roadmap phase (`init`, `new`, `check`, `open`, `run`, `land`, `queue`, `status`) — each exits 1
   with "not implemented yet (roadmap Phase X)". If the owner confirms the PENDING dual-bin
   decision, register both bins and implement the one real behavior at bootstrap:
   **`gate push` (and `provegate push`) prints "No. Push is yours." and exits 1.**
   One vitest test asserting the push refusal (the never-push invariant gets CI coverage
   from commit one).
3. **apps/docs:** Fumadocs scaffold; pages: `index` (what is ProveGate — from positioning
   elevator pitch), `method` (7-phase overview stub linking whitepaper), `cli` (command
   reference stub, marked auto-generated-later).
4. **apps/web:** minimal Next.js single page — wordmark **ProveGate**, tagline
   "prove it, then let it propagate.", install snippet, GitHub link. No design system yet.
5. **Release chain:** Changesets init; `release.yml` publishing `packages/provegate` with
   `--provenance` (requires `id-token: write`); README badge placeholders.
6. **Dogfood scaffold:** create the workflow artifact tree (`_prds/{wip,completed}` etc. with
   `.gitkeep` + short READMEs); root `README.md` explains the repo runs its own method;
   `_state/schema/` empty with pointer note (schemas arrive in Phase B).
7. **CI:** `ci.yml` running `pnpm check-types && pnpm lint && pnpm test && pnpm build` via turbo
   on PR + push to main. Green before finishing.
8. **README.md:** first line = tagline; then the elevator pitch (positioning §2), status banner
   ("pre-release — method extraction in progress"), decisions link. Respect the do-not-say list
   (positioning §6): no "first ever", no unmeasured speedup claims, no PROVEN/VIOLATED jargon.

## Constraints (hard)

- **Never add a code path that pushes to a git remote** from any CLI command or CI job other
  than the explicit human-triggered release workflow.
- MIT license, no telemetry, no network calls in the CLI.
- `packages/provegate` runtime dependencies: **zero** (dev-deps fine). If a task seems to need
  a runtime dep, stop and surface it.
- Conventional commits; subject must not start upper-case (commitlint `subject-case`).
- Do not fabricate method content (prompts/templates/schemas) — those are extracted from the
  parent project in later phases; placeholders only.

## Known traps (transferred from the parent repo — real incidents)

- **tsup + TS `incremental`:** combining tsc incremental info with tsup `clean: true` caused
  silent emit blindness (stale/missing dist while types pass). Keep `incremental` OFF in the
  package tsconfig, or don't rely on tsc for emit at all — tsup owns emit, tsc owns types
  (`noEmit: true`).
- **Turbo `inputs` too narrow = stale-green cache:** missing inputs made gates pass on stale
  dist. Declare `inputs` covering config files (tsup.config, tsconfig) not just `src/**`.
- **Strict env passthrough:** if you add turbo env config, remember `passThroughEnv` /
  `globalEnv` membership is exact-match; spreads don't register.
- **`prove` as a bin name is forbidden** — `/usr/bin/prove` (Perl TAP) exists on default macOS/Linux.
- lint-staged + lockfile: never let a hook silently drop `pnpm-lock.yaml` from a commit.

## Definition of done

- `pnpm install && pnpm build && pnpm test && pnpm check-types && pnpm lint` all green at root.
- `node packages/provegate/dist/cli.js --help` lists subcommands; `... push` refuses with exit 1.
- Both apps `pnpm --filter <app> build` green.
- CI workflow file valid (act or careful review); initial commit history conventional.
- A closing report to the owner: what was scaffolded, PENDING decisions still open, and the
  suggested first real PRD (Phase B: config core + state/lock extraction) per the roadmap.
