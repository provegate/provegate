# provegate

## 0.1.0

### Minor Changes

- First public surface: the gated-workflow engine (config, state, locks, gates,
  safety-allowlisted runner with local no-ff merge + auto-revert), the `gate` /
  `provegate` CLI (`init`, `status`, `queue`, `check`, `run`, `land`, and the
  permanent `push` refusal), the method package (prompts, templates, schemas,
  example gates, METHOD.md), and the quickstart. No runtime dependencies, no
  telemetry, no network calls, no code path that pushes.
