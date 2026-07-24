# 04 — Secrets & env agent discipline

**Invariant.** Agents never read, print, paste, or commit real secret/env values. Any CLI
subcommand that dumps live secrets to stdout is **forbidden**; only redacted status/log
subcommands are used for inspection. Destructive data-store operations are gated by a
runtime guard keyed on the **target host/identity** (local allowed, production refused
unconditionally, other remotes require explicit per-invocation opt-in), and the guard runs
even in `--dry-run`. Secrets get defense-in-depth: VCS-ignore + AI-index-ignore + a
pre-commit secret scanner. Deploys and env mutation are CI-owned, not agent-driven.

**Why it matters.** An autonomous agent that can print a secret can leak it into chat
logs, a commit, or a PR description — irreversibly. And "destructive op guarded by
`NODE_ENV`" fails the moment an env var is wrong; guarding by *target host* is robust to
misconfiguration.

**Mechanism (generic).**
- **Forbidden vs. safe:** the infra CLI subcommand that prints variables (e.g.
  `<cli> variables` / `<cli> env`) is banned — its output contains live secrets. The
  redacted `<cli> status` / `<cli> logs` are the substitutes for inspection. No
  agent-driven deploy or env mutation; deploy runs in CI.
- **Destructive-target guard** (for `db:*` / migration / reset scripts): decide by the
  connection *host*, not `NODE_ENV`. Local (`localhost/127.0.0.1/::1`) always allowed;
  production (by host or an explicit target-env token) refused **unconditionally**; other
  remotes require BOTH an explicit target-env token AND a per-invocation allow flag
  (refused if that flag is persisted in `.env` — it must be passed at call time). The
  guard executes even for `--dry-run`. Two hardenings worth copying: a strictest op class
  (e.g. schema-push) where **no token can unlock any remote at all**, and a **closed
  allowlist of remote-target labels** so a typo'd label can never accidentally unlock.
  See seed `guard-destructive-by-target-host`.
- **Three secret barriers:** (1) `.gitignore` real `.env*`; (2) exclude secrets from any
  AI-context indexer (a `.<tool>ignore` or equivalent); (3) a pre-commit secret scanner
  that name-blocks any real `.env*` (including rename targets via `--diff-filter=ACMR`),
  content-scans for cloud keys/tokens/private-key blocks, and optionally runs a
  gitleaks-style pass.

**Provegate implementation.**
1. Add the "never print/commit secrets; use status/logs not variable-dump" rule to the
   bootstrap doc + agent shims.
2. If the project has destructive data scripts, add a target-host guard (seed
   `guard-destructive-by-target-host` is the spec).
3. Wire a pre-commit secret scanner ahead of lint-staged; `.gitignore` + AI-index-ignore
   the `.env*` files.
4. Keep deploy/env mutation in CI; document that agents don't run them.

**De-emofy notes.** `railway`/`vercel` → provegate's actual infra CLI; the invariant is
"the subcommand that prints secrets is banned, status/logs is the substitute." Drop
Emofy's `DB_MIGRATE_TARGET_ENV` / `DB_ALLOW_REMOTE_MIGRATE` names, Drizzle/Infisical, and
the `packages/db/...` paths — keep the host-allowlist + per-invocation-token pattern
abstractly. `.cursorignore` → "exclude secrets from whatever AI indexer you use." The
"an agent can't edit its own permission allowlist" note is Claude-Code-harness-specific.

**Related.** ADR candidate (record the guard decision as an ADR in `_brain/adr/`) · seed
`guard-destructive-by-target-host`.
