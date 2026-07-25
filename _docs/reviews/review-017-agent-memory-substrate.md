# Independent Review: PRD-017 — Agent Memory Substrate

> **PRD:** PRD-017
> **Verdict:** pass
> **Reviewer:** codex CLI session (independent of the implementing agent)
> **Tool/Model:** OpenAI Codex CLI 0.145.0, gpt-5.6-sol, reasoning effort high — a different model family from the implementer (Claude Opus 5)
> **Base SHA:** 2e9a206e9ad0f03d2a2cb92b046ae4e0feb03137
> **Diff range:** 2e9a206..df7ca22 (18 commits)
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass (single cross-model reviewer over twelve rounds)
> **Rounds:** 12

## How this review was run

Twelve adversarial rounds against the merge diff, each one directed at the PRD, the
readiness watch items, and the owner-approved source addendum. Every round re-verified the
previous round's fixes by reconstructing the failing input before moving on, so a fix that
only looked applied did not survive.

Sixty-nine findings were raised across the twelve rounds. Every one was reproduced by the
implementer before being accepted — several were reproduced and found to be sharper than
reported, and the reproductions are in the commit messages. No finding was closed by
argument.

Rounds 1–5 concentrated on record containment. Round 6 replaced the design instead of
patching it again, and round 7 confirmed the replacement. Rounds 8–10 moved to provenance
and the default-off contract. Round 11 found no code defects. Round 12 found none, and its
advisories are closed in `df7ca22`.

## Findings

All findings from rounds 1–11 are closed and re-verified; round 12 raised no criticals.
The record below is by round, most consequential first.

- **critical (round 1)** · `packages/provegate/src/core/memory/parse.ts` — a record copied
  verbatim from the shipped learning template was rejected by both parsers: comments were
  stripped after the value's form was classified, so `description: >-  # …` read as a
  scalar and its continuation line failed as an orphan indent. Templates are not validated
  as records, so every gate stayed green while the artifact handed to authors produced an
  invalid record. Fixed by stripping the comment before classification.
- **critical (round 1)** · `scripts/verify/verify-brain.mjs` — the private-index check
  scanned a map already filtered to `learnings/` and `adr/` paths, so a direct
  `[secret](private/secret.md)` link was invisible to it. A check that cannot fail. Fixed
  to scan every local link; later hardened for reference definitions, angle-wrapped
  targets, percent-encoding, numeric and named character references, `file:` URLs, and
  case-variant segments.
- **critical (rounds 1–6)** · watch-glob containment — six rounds of edges (globstars
  spanning depth, an expansion bound that hid the escape it was meant to survive, symlink
  chains, TOCTOU, case-insensitive volumes, drive-relative Windows paths). Round 6
  established the question was wrong: a watch glob is never dereferenced, so its shape is
  the whole contract. Resolved by making the rule lexical and total, moving the filesystem
  check to the configured paths that are actually read, and recording the narrowing in the
  addendum rather than only in code.
- **critical (round 3)** · `packages/provegate/src/core/config/load.ts` — the fix for a
  containment hole broke the default-off guarantee: symlink resolution ran on merged
  defaults, so a repository that never opted in but whose `_brain` is a symlink failed
  every config load. A regression introduced by an earlier remediation, caught by the loop.
- **critical (rounds 7–10)** · configured-path containment — a symlinked parent defeated
  the segment walk, a dangling symlink was indistinguishable from a missing path, a chain
  whose first hop looked in-repo escaped, and case sensitivity was read off
  `process.platform` rather than probed on the volume. All resolved by canonicalizing
  through `realpath` on the longest existing prefix, reading link chains explicitly, and
  probing the volume by inode and device.
- **critical (round 4, corpus)** · the conformance corpus asserted coverage it did not
  exercise, and its cells were claimed by set membership alone. Now every declared cell has
  exactly one owning case, and each claim is checked against behaviour — a deny cell must
  fail on the field it names, an acceptance cell must produce no issues.
- **critical (rounds 8–10, provenance)** · the shipped protocol legislated a schema the
  addendum never authorized, and the addendum in turn described rules the code did not
  enforce. Resolved by specifying the subset, the closed vocabularies, the index rules, and
  the wikilink rule in addendum §12, with the protocol citing it instead of legislating.
- **critical (round 8, default-off)** · the approved claim said an unopted repository
  behaves byte-for-byte as before, but `verify:brain` is not gated by memory configuration
  and got stricter. Resolved honestly in addendum §13: the guarantee covers
  configuration-driven behavior, and validator strictness is a deliberate breaking
  improvement that names what will start failing.
- **critical (rounds 9–10, ADR shape)** · three bugs stacked in one heading matcher — a
  shared optional suffix, a case-insensitive flag, and a stop condition that required a
  newline, so `## Context considered`, `## context`, and an empty section followed
  immediately by the next heading all passed. Both implementations were wrong together,
  which is the one class conformance cannot catch.
- **minor (round 12, closed in `df7ca22`)** · inline lists filtered empty tokens, turning
  `links: [,]` into a legal empty list; the conformance runner exercised the shared helper
  rather than the executable verifier, hiding a real disagreement over `[[ slug ]]` written
  with spaces; the default-off tripwire matched import paths but not symbols; the packed
  protocol over-corrected and denied an enforcement that does exist for ADRs; two ledger
  entries were stale.

### Carried, with owner visibility

- `packages/provegate/test/content-prompts.test.ts` — the frozen-snapshot digest can replay
  a cached pass locally, because `provegate#test` hashes package files and the snapshot
  lives outside the package. The cache-free fix needs `verify-workflow.mjs` and
  `package.json`, neither in this PRD's Conflict Surface and the former claimed by PRD-021.
  Handed to PRD-021 on the status board rather than taken by force. CI checks out fresh
  with no restored turbo cache, so the gate is real there.

## Verdict rationale

Pass with zero criticals outstanding. The substrate enables nothing — no root
configuration, no gate wiring, no phase-prompt or template change — and that claim is
asserted by tests rather than argued, including a tripwire that fails if anything outside
`core/memory` starts importing the parser. The hole it closes is real and wider than the
PRD claimed: the previous validator stored the fold marker and never read a folded
description, so none was ever checked.

What earns the pass is not the absence of findings but how they were closed. Two of the
sixty-nine were regressions introduced by earlier remediations in this same review, and
both were caught here rather than after merge. One round replaced a design instead of
patching it a seventh time, and the narrowed claim was written into the owner-approved
method source rather than left implicit in code. Where an enforcement could not exist — the
`workflow-seed` reservation in a workspace with no pack to compare against — the text now
says so instead of promising it.
