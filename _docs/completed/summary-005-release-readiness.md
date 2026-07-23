# Development Summary: Release Readiness

> **PRD**: [prd-005-release-readiness.md](../../_prds/wip/prd-005-release-readiness.md)
> **Tasks**: [tasks-005-release-readiness.md](../../_tasks/wip/tasks-005-release-readiness.md)
> **Ship Readiness**: Ship Verified
> **Completed**: 2026-07-23
> **Author**: rayvaz (implementing agent: claude-fable-5; reviewer: codex)

---

## Overview

`provegate@0.1.0` is publishable: LICENSE ships in the tarball (it did not before —
npm omits a license outside the package dir), the version came through changesets
with a generated CHANGELOG, the tarball's contents are an exact committed manifest
enforced by test, and RELEASING.md gives the owner the publish procedure with every
irreversible step human-owned.

## Key Decisions

- **Copyright line**: `ProveGate contributors` (owner call, W1) — root and package
  copies byte-identity-tested against drift.
- **Exact pack manifest over allowlist** (codex round-1 critical): the packed set
  equals `test/pack-manifest.json` exactly; any tarball change is a conscious,
  reviewed fixture diff. Residue scan covers every packed file.
- **CHANGELOG.md into `files`**: npm's always-included set excludes changelogs —
  found by the pack test, verified against npm docs by the reviewer.
- Frozen surfaces held: zero diff on `src/**` and `.github/workflows/**`.

## Review Trail

Codex, 2 rounds: fail (1 critical + 2 P2 — permissive whitelist, pin-regex gaps,
state bleed) → pass, 0 findings. Full disposition in
[review-005-release-readiness.md](../reviews/review-005-release-readiness.md).

## Verification

338/338 tests, types/lint/build clean, `gate check PRD-005` green, push refusal
intact, hygiene clean over the full packed set, `_state` zero-diff vs main.
