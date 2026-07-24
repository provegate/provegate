# Practices pack — manual wiring (deliberately not automated)

`gate init --practices` only creates files; it never edits your existing files, never
runs `git config`, and never installs dependencies. Finish the wiring yourself:

## 1. Git hooks

```sh
git config core.hooksPath .githooks
```

Or make it automatic for every contributor via a package.json prepare script:
`"prepare": "git config core.hooksPath .githooks"`.

## 2. Commitlint (optional but recommended)

```sh
npm i -D @commitlint/cli @commitlint/config-conventional
```

Then edit `commitlint.config.mjs`: replace the example SCOPES with your own.

## 3. Verify library — package.json scripts

Add to your root package.json `scripts` (then SHRINK
`scripts/verify/gates-wired-exceptions.json` — remove each entry as you wire it; the
meta-gate enforces that the list only shrinks):

```json
"verify:brain": "node scripts/verify/verify-brain.mjs",
"verify:review-artifact": "node scripts/verify/verify-review-artifact.mjs",
"verify:durable-artifacts": "node scripts/verify/verify-durable-artifacts.mjs",
"verify:deferred": "node scripts/verify/verify-deferred.mjs",
"verify:test-task-coverage": "node scripts/verify/verify-test-task-coverage.mjs",
"verify:gates-wired": "node scripts/verify/verify-gates-wired.mjs",
"verify:dependency-audit": "node scripts/verify/verify-dependency-audit.mjs",
"verify:workflow": "node scripts/verify/verify-workflow.mjs",
"ship:pre": "node scripts/verify/verify-workflow.mjs"
```

Wire CI: run `verify:workflow` + `verify:gates-wired` in a hygiene job;
`verify:dependency-audit` needs registry access, so keep it CI-only.

## 4. Agent entrypoint shims

Paste the snippets from the installed package (`node_modules/provegate/practices/shims/`)
into your entrypoints — the pack never edits them:

- `CLAUDE.md.snippet` → your `CLAUDE.md`
- `AGENTS.md.snippet` → your `AGENTS.md`
- `cursor-brain.mdc.snippet` → `.cursor/rules/brain.mdc`

## 5. Fill the templates

- `AGENT_BOOTSTRAP.md` — replace every `{{PLACEHOLDER}}` with your project's facts.
- `STATUS.md` — fill the Current state table.
- `_docs/review-artifact.template.md` — copy per gated change into `_docs/reviews/`.

## 6. Sanity check

```sh
node scripts/verify/verify-workflow.mjs
```

Must exit 0 on a fresh install.
