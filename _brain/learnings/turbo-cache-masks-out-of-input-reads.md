---
name: turbo-cache-masks-out-of-input-reads
description: >-
  A cached test task that reads paths outside its declared turbo inputs replays a stale
  green when those paths change; the failure surfaces only when an unrelated input busts
  the cache.
type: gotcha
scope: project
status: active
links: [false-green-on-missing-file]
provenance: practices-handoff-import
---

The provegate package's review-quorum test scans `_docs/reviews/` — outside the package
directory, so outside its turbo task inputs. Adding an invalid file there kept `pnpm test`
green (cache replay); the failure surfaced only when a later lockfile change invalidated
the cache, far from the change that caused it.

**Why:** turbo hashes declared inputs to decide cache hits; a file the test reads but the
task doesn't declare cannot invalidate the cache, so the replayed green certifies stale
state.
**How to apply:** When a test reads repo paths outside its package, add them to the turbo
task's `inputs` — or treat any suspicious green after touching such paths with
`--force`. When a fresh failure appears "caused" by an unrelated change, first ask
whether that change merely busted a cache that was masking it.
