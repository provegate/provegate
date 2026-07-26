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

## 7. Check the memory install, if you enabled it

```sh
gate doctor --memory        # add --json for machine output
```

Read-only: it never edits config, manifests, entrypoints, scripts, or state, on
either the passing or the failing path.

**Order matters.** Do steps 1-5 first. `doctor` reports what is reachable NOW, so
running it before the shims and scripts are in place tells you what you already
know.

**Failures versus warnings.** A failure means something the contract needs is
unreachable locally — a missing index, a record that will not parse, no
entrypoint carrying the index pointer, a validator that is named but not wired.
Those exit 1. Two checks only ever warn: CI reachability, because workflow
layouts are yours and this tool cannot prove absence; and unfilled `{{TOKEN}}`
placeholders, which are a real install defect that breaks no gate today. A
warning never changes the exit code.

Bare `gate doctor` with no mode prints usage and exits 1 rather than guessing.

## 8. Recall, once you have records

```sh
gate memory find --query=caching
gate memory find --paths=src/api/handler.ts
gate memory find --tag=some-record --limit=5 --json
```

**Local only.** No embedding, no persistent index, no model, no network. Ranking
is by watched-path overlap, then exact name or tag, then description and name
tokens, with the slug as a final tie-break — so the same question returns the
same bytes on any machine.

**Deterministic, not relevant.** A record that matters but shares no watched
path, no exact name or tag, and no description token will not be found. `find`
augments `_brain/INDEX.md`; it does not replace reading it. Every result carries
the reasons it matched so you can see which of those rules fired.

At least one selector is required, and disabled memory refuses rather than
returning an empty list — an empty list would read as "nothing relevant" about a
store that was never consulted.

**Deferred on purpose:** there are no usage statistics, no hit counters, and no
ranking feedback. Recording which records get read would need a write path in a
read-only command, and tuning a ranking from it would make runs
machine-dependent — both give up the property that makes this trustworthy.
