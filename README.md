ProveGate (prove + gate): prove it, then let it propagate.

# ProveGate

[![CI](https://github.com/provegate/provegate/actions/workflows/ci.yml/badge.svg)](https://github.com/provegate/provegate/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/provegate)](https://www.npmjs.com/package/provegate)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> **Status: pre-release — method extraction in progress.** The repository skeleton, CI, and
> the never-push invariant are in place; the method core (state, locks, gates, runner,
> prompts, templates, schemas) is being extracted phase by phase. Locked project decisions:
> [docs/research/provegate-bootstrap/DECISIONS.md](docs/research/provegate-bootstrap/DECISIONS.md).

Coding agents misreport completion — in 20K+ real sessions, false "tests pass" claims are the
third most common failure and growing. This workflow makes agent self-assessment structurally
irrelevant: seven phases where every autonomous boundary is a machine-checkable gate (a
verification command's exit code or an independent cross-model reviewer's structured verdict),
executed-evidence testing ("listed but not run" is never "passed"), declared conflict surfaces
for parallel agents, and a hard rule that nothing pushes to a remote without a human. Hardened
over ~390 production PRDs. MIT, agent-agnostic, bring your own gates.

```sh
npm install -D provegate
npx gate init          # scaffold the workflow tree + starter configs
npx gate check PRD-001 # lint your spec against the machine gates
npx gate run PRD-001   # phases 4-7 + local merge, gated end to end
```

```
$ gate push
No. Push is yours.
```

That refusal is load-bearing: the runner contains no code path that pushes to a git
remote. Everything reversible is autonomous; the irreversible step costs one human
keystroke. Start with the [quickstart](packages/provegate/QUICKSTART.md) — install to
handoff card, hotfix-class, one sitting.

## The evidence

Your coding agent's "done" is not evidence — so here is ours, caveats attached:
[the case study](apps/docs/content/docs/case-study.mdx) (~390 production work items,
a 143-finding calibration study, the redesign it forced) and
[the whitepaper](apps/docs/content/docs/whitepaper.mdx) (the full argument, the
limitations section included on purpose).

## This repo runs its own method

Every line of this codebase shipped through the workflow it implements — read the PRDs
in [`_prds/completed/`](_prds/completed/), the readiness verdicts, the task ledgers,
and the cross-model review artifacts in [`_docs/reviews/`](_docs/reviews/) (including
the round where the reviewer caught the maintainers weakening the method's own
calibrated doctrine, and the fix went through the method's own deferral governance).
The runner closed its own PRDs: `gate run` landed the commits that built `gate run`.

## Layout

| Path                 | What                                                             |
| -------------------- | ---------------------------------------------------------------- |
| `packages/provegate` | the npm package: CLI, core, and (soon) prompts/templates/schemas |
| `apps/web`           | [provegate.dev](https://provegate.dev) landing page              |
| `apps/docs`          | documentation site                                               |
| `docs/research`      | research corpus: whitepaper, roadmap, decisions, source snapshot |

## Principles

- **No telemetry.** No accounts, no cloud, no network calls in the CLI. Local JSONL metrics only.
- **Zero runtime dependencies** in the published package.
- **Human-only push.** No CLI command or CI job pushes to a remote; the only publishing path is
  the explicitly human-triggered [release workflow](.github/workflows/release.yml).

## License

[MIT](LICENSE)
