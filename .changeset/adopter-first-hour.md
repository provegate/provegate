---
'provegate': minor
---

`gate new` creates the artifacts the gate chain reads, and resolves what the configuration
already knows.

- `gate new --tasks <ID>` and `gate new --review <ID>` instantiate the shipped tasks and review
  templates at the paths the Phase-6 gate reads. Identity comes from the PRD artifact's basename
  and only from the wip state; an existing destination is reported and left byte-untouched.
- The template pass now substitutes the seven tokens configuration can answer
  (`{{CMD_CHECK_TYPES}}`, `{{CMD_LINT}}`, `{{CMD_TEST}}`, `{{CMD_BUILD}}`, `{{CMD_TEST_SCOPED}}`,
  `{{MEMORY_ROOT}}`, `{{DOCS_ROOT}}`) and reports the rest. The pass is unconditional over that
  closed set and its replacements are literal, so a configured value containing `$&` stays what
  it says. An unfilled Durable Artifacts section therefore declares paths that do not exist, and
  Phase 7 refuses it by name — write `none` there when a work item produces no durable output.
- With `memory.enabled: false`, new PRDs omit the Memory Inputs and Memory Outputs sections. The
  lint still fails those same bytes where the contract is on.
- The id anchor accepts both `{{ID_PREFIX}}` and the configured prefix, so a repository that
  renders its own prompt store can create work items again.
- The Phase-6 stop names the task path it expects and the ledger row it reads.
- `gate --help` and both quickstart copies teach the new modes, and the manifest recipe now
  precedes the close section that executes it.

**Behaviour change:** a freshly instantiated PRD now passes `gate check`. The refusal it used to
produce fired on the unsubstituted placeholder command, not on the emptiness; restoring a
signal for an unfilled artifact is tracked separately.
