# Releasing

Every step below that publishes or pushes is a human action. No CI path publishes
automatically; merging publishes nothing; the runner never pushes. The Release
workflow runs only when the owner dispatches it.

## Procedure

1. **Author a changeset** on a branch, through the gated workflow like any change:

   ```sh
   pnpm changeset
   ```

   Pick the bump (`minor` while pre-1.0), describe the surface in the changeset file.

2. **Version** — consumes the changeset, bumps `packages/provegate/package.json`,
   regenerates `CHANGELOG.md`:

   ```sh
   pnpm changeset version
   ```

   Verify the diff touches only the provegate package (no monorepo bleed), then run
   the full verification sweep:

   ```sh
   pnpm check-types && pnpm lint && pnpm test && pnpm build
   ```

   The pack audit (`test/pack.test.ts`) runs inside `pnpm test` and gates the
   tarball contents: required files, whitelist roots, LICENSE identity, hygiene.

   **If `prompts.enabled` is on** (it is, in this repository): the bump stales
   every bannered file in the installed prompt store — the banners name the
   version that rendered them, and `gate check --prompts` (CI's hygiene job)
   goes red on the mismatch. Reinstall per the check's own remedy: run
   `gate init --prompts` to print the reinstall unit, delete every path it
   prints, run it again, then confirm `gate check --prompts` reports every
   file `current`. The diff must be the banner line only.

3. **Review and land** the version commit through the workflow's gates as usual.

4. **Push** — the owner runs `git push`. (The runner has no code path for this;
   `gate push` exists solely to refuse.)

5. **Publish** — the owner dispatches the **Release** workflow (GitHub → Actions →
   Release → Run workflow). It re-verifies everything, then runs
   `changeset publish` with npm provenance (`id-token: write`). Nothing else in CI
   can publish; `NPM_TOKEN` is used by this workflow only, and it must be an npm
   **granular or automation** token — a classic publish token dies in CI with
   `EOTP` under 2FA. Provenance also requires the repository to be public.

6. **Verify**: check the npm listing shows the provenance badge and the new version;
   `npm view provegate version`. The workflow pushes the `provegate@X.Y.Z` tag
   `changeset publish` creates — confirm it arrived with `git ls-remote --tags origin`.

## Never

- Never run `npm publish` or `pnpm changeset publish` locally.
- Never add a workflow trigger other than `workflow_dispatch` to Release.
- Never hand-edit `CHANGELOG.md` — it is generated from changesets.
