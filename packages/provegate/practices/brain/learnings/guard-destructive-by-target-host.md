---
name: guard-destructive-by-target-host
description: >-
  Gate destructive data-store operations by the target host/identity, not by NODE_ENV; run
  the guard even in dry-run, and refuse persisted opt-in tokens.
type: gotcha
scope: workflow
status: active
links: []
provenance: workflow-seed
---

Destructive operations (migrations, resets, drops) guarded by `NODE_ENV` fail open the
moment an env var is misset — a shell that forgot to export `NODE_ENV=production` runs the
drop against prod. Guarding by the _target connection host_ is robust to that class of
misconfiguration.

**Why:** `NODE_ENV` describes the process, not the target; the two can disagree. The host
the command will actually mutate is the real risk surface.
**How to apply:** Decide by target host/identity: local (`localhost/127.0.0.1/::1`) always
allowed; production (by host, or an explicit target-env token) refused _unconditionally_;
other remotes require BOTH an explicit target-env token AND a per-invocation allow flag —
refused if that flag is persisted in `.env` (it must be passed at call time). Run the guard
even for `--dry-run`, so a dry-run can't be a foot-gun rehearsal that skips the check.
