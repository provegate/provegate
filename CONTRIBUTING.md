# Contributing

Pre-release: the method core is still being extracted, so expect churn. Issues and discussion
are welcome; large PRs will likely collide with extraction work — ask first.

## Setup

Node ≥ 22, pnpm ≥ 10.

```sh
pnpm install
pnpm build && pnpm test && pnpm check-types && pnpm lint
```

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
