# Contributing

Pre-release: the method core is still being extracted, so expect churn. Issues and discussion
are welcome; large PRs will likely collide with extraction work — ask first.

## Setup

Node ≥ 22, pnpm ≥ 10.

```sh
pnpm install
pnpm build && pnpm test && pnpm check-types && pnpm lint
```

## The adopter smoke

```sh
pnpm smoke:adopter                 # pack the local CLI, install it, close one PRD
pnpm smoke:adopter -- --from-npm   # do the same with the published package
KEEP=1 pnpm smoke:adopter          # keep the fixture repo to poke at it
```

It builds a plain npm + tsc repo with no workspace link, installs the packed tarball, and drives
one PRD from `gate init` to a merged local close. Every other check in this repository reads
this source tree, so this is the only one that can see what an install actually hands someone.

Known defects are declared in the `KNOWN_RED` map inside `scripts/adopter-smoke.sh` with the work
item that owns each one. A known-red assertion that starts passing **fails the run** — delete its
entry in the same change that fixes it.

## Ground rules

- **Never add a code path that pushes to a git remote** — not in the CLI, not in CI. The only
  publishing path is the human-triggered release workflow.
- `packages/provegate` ships with **zero runtime dependencies**. If your change seems to need
  one, open an issue instead.
- No telemetry, no network calls in the CLI.
- Method content (prompts, templates, schemas) is extracted from the parent project in roadmap
  phases — placeholders stay placeholders until then; don't fabricate content ahead of
  extraction.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org); the subject must
  not start with an upper-case letter (commitlint enforces this via the `commit-msg` hook that
  `pnpm install` wires up).
- Releases go through [Changesets](https://github.com/changesets/changesets): add one with
  `pnpm changeset` when your change affects the published package.
