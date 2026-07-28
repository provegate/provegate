# Independent Review: PRD-028 — Open Questions Grammar

> **PRD:** PRD-028
> **Verdict:** pass
> **Reviewer:** Codex (codex exec, read-only sandbox, reasoning effort high) — not the implementing agent
> **Base SHA:** `4cb5084ed6`
> **Critical:** 0
> **Quorum:** 1/1 pass (single independent reviewer over seven rounds; Critical: 0 sustained across rounds 6–7)

---

## Protocol

Seven adversarial rounds against the full diff vs main, the implementing session
fixing between rounds and the reviewer verifying every prior fix before hunting
fresh. Findings were reconstructed from the code before being credited;
rejections were adjudicated and recorded, never silently dropped. The
confirmation criterion was two consecutive rounds at Critical: 0.

## Round ledger

| Round | Critical | What it found | Disposition |
| ----- | -------- | ------------- | ----------- |
| 1 | 2 | A symlinked state DIRECTORY (`deferred` → `completed`) relabeled finished work as unfinished while every file-level check passed; a HARDLINKED finished artifact defeated realpath identity (realpath canonicalizes names, not files). Plus: two deny rows rode on missing files rather than their named rule; two live "active" restatements; stale changelog counts | Both [P1]s fixed as FR-1 rule extensions (canonical state-segment equality; `nlink > 1` refused), deny-tested with positive controls. Fixture targets created; restatements corrected; supersession brackets added |
| 2 | 3 | A case-insensitive filesystem resolved a deferral to an item the state builder refuses (lowercase link opening an uppercase file); a requirement written inside a FENCE counted as a real FR, so a document with no live requirements passed; the render/lint referent disagreement (doc-relative resolution, `#` fragments) | First two fixed: on-disk basename byte-equality against the directory listing; `frBlocks` reads the scanner's executable lines. Third ADJUDICATED: no fail-open exists — every non-repo-relative form fails closed — the path is a repository-relative state-layer coordinate; the charset two readers disagree on (`#`, `\`, `:`) refused. [P2]s: rules written into the PRD normatively, template names the configured width, corpus number derived through `parseArtifactName`. [P3]: invisible refused lines diagnosed |
| 3 | 1 | `?` and `%` still split the referent (query suffix, percent-decoding); the case fixture was vacuous on case-sensitive CI; the hard-cap engine's move to the executable view was undeclared; the changeset understated the rule set; `JSON.stringify` printed NBSP invisibly; a stale rule-3 parenthetical | Charset extended; mechanism-pinned conditional fixture; the cap-semantics change DECLARED (comment corrected, regression pinned: fenced target does not fire, live target does); changeset completed; `U+NNNN` codepoint rendering with fixture; parenthetical corrected |
| 4 | 1 | `&quest;` — CommonMark decodes named character references in link destinations, so an on-disk `&`-named file passed every identity check while the rendered link pointed elsewhere. Changeset omitted number equality | `&` joins the refused charset, deny fixture against a real on-disk `&quest;` file; changeset completed |
| 5 | 1 | ASCII control characters (U+0000–U+001F, U+007F): legal in a POSIX filename, refused by CommonMark as a link destination — the deferral passed without the required link rendering | Control range joins the refused charset, deny fixture against a real on-disk U+0007 file |
| 6 | 0 | Round-5 fix verified; no Critical-grade fail-open found | pass |
| 7 | 0 | Sustain check on fresh angles (grammar lines, cardinality, identity recovery, contract interactions): "No Critical-grade fail-open findings" | pass — Critical: 0 sustained |

## Adjudications on record

1. **Repository-relative coordinate.** The deferral path resolves against the
   repository root, not the declaring document — the historical corpus, the
   template, and the state layer all use that form, and every non-conforming
   form fails closed. The residual disagreement surface (characters a renderer
   reads differently) is refused as a charset: `#`, `?`, `%`, `&`, `\`, `:`,
   and ASCII controls.
2. **Completed-artifact boundary.** The corpus oracle covers the configured wip
   role only, per FR-3 and Non-Goals; historical artifacts stand and honestly
   report §9 failures if re-checked (the changeset states this). PRD-002's
   fixture expectation moved accordingly — a declared invalidation.
3. **Hard-cap executable view.** `frBlocks` reading scanner text lines changes
   which targets the cap engine sees (a fenced example no longer fires a cap) —
   taken as a declared behavior change: the target reader now agrees with the
   evidence reader (`contractView`) about what is on the page, and the
   semantics are pinned by regression.

## W4 inspection (task 7.2)

- All sixteen deny rows present (15 matrix rows + the absent-fifth-argument
  row), each paired with a positive control whose only difference is the rule
  under test; the wrong-width and parser-rejected rows carry otherwise-valid
  existing targets after round 1.
- Symlink-to-self, symlink-to-other, hardlink, directory-alias, H1-less stub,
  absent fifth argument, and the custom `stateRoles` configuration each carry a
  dedicated fixture; symlinks and hardlinks are created at test runtime, never
  committed.
- Vacuity checked by mutation before round 1: `stat`-for-`lstat` killed the two
  symlink rows, deleting the H1 rule killed the stub row, prefix-matching
  `- (none)` killed the tail row; the suite was green again on revert.

## Restatement sweep (task 7.3)

Grep over the PRD and tests for the live counts (nine history rows, sixteen
deny fixtures), "unfinished", and configured role names: the only remaining
old-count or "active" occurrences sit inside historical changelog rows, each
carrying an explicit supersession bracket.

## Scores

- Test coverage of the closed grammar: 38 tests in `open-questions.test.ts`,
  plus the corpus oracle (9 wip files, 0 offenders) and the four-input turbo
  assertion. Full suite 1255/1255.
- Behavior changes beyond the §9 rule are enumerated and declared: two
  `prd-ready.test.ts` fixture invalidations, §9 sections added to two
  lint-green fixtures, the FR cardinality rule, and the executable-view cap
  semantics.
