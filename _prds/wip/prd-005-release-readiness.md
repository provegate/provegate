# PRD-005: Release Readiness — Version, License, Pack Audit

> **Status**: Draft
> **Created**: 2026-07-23
> **Updated**: 2026-07-23
> **Author**: rayvaz
> **Audience**: Implementing Agent (Claude Code / Cursor / Codex)
> **Slug**: `release-readiness`
> **Cycle Phase**: 3 (Tasks Generated)
> **PRD Class**: infra
> **Class Rationale**: no product behavior changes — packaging, versioning, and release
> mechanics so the human-triggered publish can happen; the engine and method content are
> untouched.
> **Autonomous Close**: operator-gated
> **State Record**: `_state/prds.json`

---

## 1. Introduction / Overview

Everything is Ship Verified; nothing is publishable. The package sits at `0.0.0`, the
tarball ships **without a LICENSE file** (the root `LICENSE` is outside the package
directory, so `npm pack` omits it — the README's MIT badge points at a file the npm
consumer never receives), there is no changeset, no CHANGELOG, and no written procedure
for the owner's publish. This PRD makes `provegate@0.1.0` a tarball the owner can
publish with one workflow dispatch — and adds a pack-audit test so the tarball's
contents become a gated invariant instead of a hope.

The release workflow itself (`release.yml`, human-triggered, provenance) already exists
and is **not modified**. The never-push/never-publish-automatically invariant is
architectural and stays.

---

## 2. Goals

### Primary Goals

- [ ] `provegate` tarball is complete: LICENSE included, files whitelist audited by test.
- [ ] Version `0.1.0` via changesets — changeset, `changeset version`, CHANGELOG.
- [ ] Pack-audit test: required files present, nothing outside the whitelist roots,
      hygiene (no parent-project residue) enforced on the built `dist/`.
- [ ] `RELEASING.md`: the owner's publish procedure, start to finish, no ambiguity.

### Success Metrics

| Metric                  | Current                  | Target                        | Measurement          |
| ----------------------- | ------------------------ | ----------------------------- | -------------------- |
| Tarball license         | absent                   | LICENSE in `npm pack` output  | pack-audit test      |
| Version                 | 0.0.0, no changeset      | 0.1.0 + CHANGELOG entry       | package.json + file  |
| Tarball content drift   | unaudited (41 files)     | whitelist-audited by test     | pack-audit test      |
| Publish procedure       | tribal knowledge         | RELEASING.md, step-listed     | file exists + linted |

---

## 3. User Stories

#### User Story 1

```
As the owner about to publish,
I want the tarball contents to be a tested invariant,
so that what lands on npm is exactly the audited method package — nothing missing, nothing leaked.
```

**Acceptance Criteria:**

- [ ] A test unpacks the `npm pack` file list and asserts: `LICENSE`, `README.md`,
      `METHOD.md`, `QUICKSTART.md`, `dist/cli.js`, `dist/index.js`, and at least one
      file under each of `prompts/`, `templates/`, `schemas/`, `examples/`.
- [ ] The same test asserts every packed file lives under a whitelisted root
      (`dist/`, `prompts/`, `templates/`, `schemas/`, `examples/`) or is one of the
      named root files — an unexpected path fails the test.
- [ ] Built `dist/` output contains no `emofy`/`rayvaz` residue (hygiene extends from
      src to the artifact that actually ships).

#### User Story 2

```
As the owner running the release,
I want a written procedure with the human gates explicit,
so that publishing is a checklist, not archaeology.
```

**Acceptance Criteria:**

- [ ] `RELEASING.md` documents: changeset authoring → `changeset version` → review the
      version commit → push (owner) → `workflow_dispatch` on Release → provenance note.
- [ ] The document states explicitly that no CI path publishes automatically and the
      runner never pushes.

---

## 4. Functional Requirements

1. **FR-1 — LICENSE in the package**: copy the root MIT `LICENSE` into
   `packages/provegate/` (npm includes it automatically); a test asserts the two files
   are byte-identical so they cannot drift.
   - **Targets:** `packages/provegate/LICENSE`
2. **FR-2 — Version 0.1.0 via changesets**: author a minor changeset describing the
   0.1.0 surface (engine, runner, method package, launch surface); run
   `pnpm changeset version`; result: `package.json` at `0.1.0`,
   `packages/provegate/CHANGELOG.md` generated. No publish — the release workflow is
   the only publisher and it is owner-triggered.
   - **Targets:** `.changeset/*.md`, `packages/provegate/package.json`, `packages/provegate/CHANGELOG.md`
3. **FR-3 — Pack-audit test**: `test/pack.test.ts` runs `npm pack --dry-run --json`
   and enforces the whitelist + required-files + hygiene assertions of User Story 1.
   - **Targets:** `packages/provegate/test/pack.test.ts`
4. **FR-4 — Version single-sourcing check**: test asserts `cli --version` output equals
   `package.json` version (already wired via require — the test pins it), and that no
   shipped doc (`README.md`, `QUICKSTART.md`, `METHOD.md`) hardcodes a version string.
   - **Targets:** `packages/provegate/test/pack.test.ts`
5. **FR-5 — RELEASING.md**: root-level owner procedure per User Story 2; do-not-say
   linted as a self-copy page (it is repo copy, not package content).
   - **Targets:** `RELEASING.md`, `packages/provegate/test/content-launch.test.ts`

---

## 5. Non-Goals (Out of Scope)

- No modification of `release.yml` or `ci.yml` (workflows are frozen surfaces here).
- No actual `npm publish` and no npm placeholder publish (owner action).
- No engine/src behavior changes beyond none-at-all; `src/` is frozen this PRD except
  nothing — FR-1..5 touch packaging, tests, and docs only.
- No docs-site changes.

---

## 6. Acceptance Criteria (Gherkin Style)

- **Given** a fresh checkout, **When** `npm pack --dry-run` runs in the package,
  **Then** the file list contains LICENSE and passes the whitelist audit.
- **Given** the release commit, **When** the owner reads `RELEASING.md` and follows it,
  **Then** the only publishing step is the owner-triggered workflow dispatch.
- **Given** the pack-audit suite, **When** a future PRD adds a stray file to `files`,
  **Then** the test names the unexpected path and fails.

---

## 7. Technical Considerations

### Architecture

- Pack audit shells `npm pack --dry-run --json` via `execFile` (array args, no shell).
- LICENSE duplication (root + package) is the npm-standard layout; the byte-identity
  test is the anti-drift gate.
- Changesets config already `access: public`, `baseBranch: main` — untouched.

### Dependencies

- None added. `npm` is already a required toolchain member.

### Database Changes

- None.

### API Changes

- None.

---

## 8. Implementation Scope

### In Scope

- `packages/provegate/LICENSE`, `packages/provegate/CHANGELOG.md`,
  `packages/provegate/package.json` (version only), `.changeset/*.md`,
  `packages/provegate/test/pack.test.ts`, `RELEASING.md`,
  `packages/provegate/test/content-launch.test.ts` (RELEASING.md added to lint set).

### Out of Scope

- Everything else, explicitly including `src/**` and `.github/workflows/**`.

---

## 9. Open Questions

- (none — 0.1.0 vs 1.0.0 resolved: 0.1.0; the whitepaper is v1.0, the tool is not)

---

## 10. References

- `docs/research/provegate-bootstrap/oss-extraction-roadmap-2026-07-22.md` — Faz A/E leftovers
- `.github/workflows/release.yml` — the frozen publisher
- `_docs/reviews/review-004-launch-quickstart.md` — hygiene precedent

---

## Conflict Surface

- `packages/provegate/LICENSE`
- `packages/provegate/CHANGELOG.md`
- `packages/provegate/package.json`
- `packages/provegate/test/pack.test.ts`
- `packages/provegate/test/content-launch.test.ts`
- `.changeset/**`
- `RELEASING.md`

---

## Durable Artifacts

- `RELEASING.md` — the owner's publish procedure
- `packages/provegate/CHANGELOG.md` — the 0.1.0 entry

---

## 11. Verification Commands

Run from repo root after `pnpm build`.

| FR   | Command / Check                                            | Scope     | Notes                                   |
| ---- | ---------------------------------------------------------- | --------- | --------------------------------------- |
| FR-1 | `test -f packages/provegate/LICENSE`                       | provegate | ships in tarball (audited by FR-3 test) |
| FR-2 | `grep -c "\"version\": \"0.1.0\"" packages/provegate/package.json` | provegate | changeset version applied        |
| FR-3 | `pnpm --filter provegate test test/pack.test.ts`           | provegate | whitelist + required files + hygiene    |
| FR-4 | `pnpm --filter provegate test test/pack.test.ts`           | provegate | version single-sourcing in same suite   |
| FR-5 | `test -f RELEASING.md`                                     | repo      | owner procedure exists; linted          |

Cross-cutting (all green before Code Complete):

- `pnpm check-types` — zero errors
- `pnpm lint` — zero warnings
- `pnpm --filter provegate test` — full suite incl. all prior PRD suites unchanged
- `pnpm build` — clean
- `node packages/provegate/dist/cli.js check PRD-005` — this PRD passes its own gate
- `node packages/provegate/dist/cli.js push; test $? -eq 1` — never-push invariant
- `grep -ri -l -e emofy -e rayvaz packages/provegate/dist RELEASING.md && exit 1 || true` — hygiene on shipping artifacts

---

## 12. DO NOT (Anti-Patterns)

- DO NOT touch `.github/workflows/**` — the publisher is frozen and human-triggered.
- DO NOT run `npm publish` or `changeset publish` locally, ever.
- DO NOT modify `src/**` — this PRD is packaging-only; an engine "quick fix" here is
  scope creep and a review flag.
- DO NOT hand-edit `CHANGELOG.md` into existence — it comes from `changeset version`.
- DO NOT add runtime dependencies or postinstall scripts to the package.
- DO NOT version-stamp shipped docs — the version lives in package.json alone.

---

## Changelog

| Date       | Author | Changes       |
| ---------- | ------ | ------------- |
| 2026-07-23 | rayvaz | Initial draft |
