---
name: grep-token-anchors-real-impl
description: >-
  A per-FR grep must match the real implementation symbol (anchored), and `|` in a gate
  command reads as a shell pipe to the safety filter — avoid alternation in gate greps.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file]
provenance: workflow-seed
---

A per-requirement grep is only as good as its pattern. Two recurring failures: (1) the
pattern matches a *near* token (a comment, a different function with a shared prefix, a
re-export) rather than the real implementation, so the gate greens on code that doesn't
satisfy the requirement; (2) a `|` inside the pattern is indistinguishable from a shell
pipe to the gate's safety filter — the filter splits on it, the trailing segment fails the
runnable-prefix allowlist, and the whole command is **refused** (a loud stop, not a wrong
match).

**Why:** greps certify by string presence, not by meaning — a loose pattern turns "the
string appears somewhere" into "the requirement is met"; and a safety filter cannot tell
pattern-`|` from pipe-`|`.
**How to apply:** Grep the actual symbol the implementation must use (verify it by reading
the code first, not by guessing the name). Anchor patterns (word boundaries, path scope).
Avoid `|` alternation in gate commands entirely — use separate rows or a dedicated assert
script. When in doubt, assert the match count, not just its existence.
