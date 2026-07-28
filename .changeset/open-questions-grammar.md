---
'provegate': minor
---

`gate check` closes the §9 Open Questions grammar. The old lint read `deferred` as a
substring and bullet-start lines of the first matching section only, so a genuine
unresolved question was invisible whenever it mentioned the word, hid in prose, a
comment, a fence, a link label, or a second section. Nine hiding places were measured
across eight successive exemption rules; the ninth rule is a closed set, not a better
predicate.

The section body now accepts exactly four raw-line forms: blank, `- (none)`,
`- Deferred to [PRD-NNN](<path>)`, and one terminal `---`. Everything else fails by
name. A deferral's referent is resolved through the state layer — configured id width,
containment in the artifact root, the state builder's own basename parser, existence,
a configured wip/deferred-role state directory, lstat-regular (symlinks refused),
realpath containment and distinctness from the declaring PRD, and the target's own
`# PRD-NNN:` H1 — so every variable character of both forms is either fixed syntax or
verified against a real, distinct, unfinished, filed work item. Exactly one Open
Questions section and exactly one Functional Requirements section are required;
duplicates and misses fail instead of being silently half-read.

This is the method rule of `phase-2-readiness-scorer.md` ("deferred to a follow-up PRD
with a link") made machine-checkable — no new flag, config key, or exported signature;
only which documents pass moves.

Migration, by hand, per wip PRD that now fails `gate check`:

1. Rewrite each §9 entry to one of the two exact forms. Rationale prose, tails,
   continuations and comments move out of the section (Non-Goals, the header, or the
   changelog) or are deleted.
2. A deferral needs a real target: create the follow-up first (`gate new`), then defer
   to it — the closed form passes only when the link resolves.
3. The shipped PRD template states both forms immediately before the §9 heading; an
   older install keeps its old template until you re-copy it.
4. Completed and deferred historical artifacts are OUTSIDE the migration: rewriting
   history is not required, and the wip corpus is what the readiness gate protects.
   Re-running `gate check` against an already-completed PRD may now honestly report
   §9 failures that were invisible before — expected, not a regression.

The change is one-directional-safe: a §9 in the closed form also passes the old
substring rule, so rolling back strands nothing.
