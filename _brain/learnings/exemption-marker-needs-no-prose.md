---
name: exemption-marker-needs-no-prose
description: >-
  A lint exemption permitting any author-typed field always leaves one place to put the
  thing being exempted; only a closed grammar whose every variable character is verified
  against a real work item converges.
type: gotcha
scope: workflow
links: [narrow-the-grammar-not-the-parser, surface-set-without-its-predicate]
status: active
watch: [packages/provegate/src/core/gates/prd-ready.ts]
---
PRD-028 measured this nine times against eight successive §9 exemption rules: the
substring filter, the link-or-id requirement, the opening-form anchor, the end anchor,
the no-free-text form, the id-label form, the existence check, and basename-level
resolution. Each rule was a predicate describing what is forbidden, each predicate had a
complement nobody enumerated, and the question moved into that complement every time —
the rationale tail, the continuation, the comment, the link label, the target slug, the
self-link, the symlink alias. Nothing syntactic separates a rationale from a claim, so
any field an author may type is a field a question can occupy.

What converged was a grammar with no author-typed field at all: two exact line forms,
where every variable character is either fixed syntax or verified against a real,
distinct, unfinished, filed work item on disk — and identity is canonical (regular file,
one hard link, realpath containment with state-segment agreement, on-disk byte-equal
basename, a charset both the renderer and the filesystem read the same way, the target's
own H1). Existence is the proof; prose is the hole. Five further adversarial rounds
attacked the verified field and never the form — the grammar held; only the verification
deepened.

**Why:** an exemption exists to let something through, so its surface is exactly where
the exempted thing's cousins will be written; a predicate war there never ends, because
each fix defines the next hiding place.

**How to apply:** when a lint needs an escape hatch, make the hatch a closed set of
exact forms whose variable parts are resolved against the system of record (state layer,
filesystem, config) — never validated as shapes, never allowed to carry free text.
Rationale belongs outside the judged span, and the guidance that teaches the form
belongs immediately before it, where no grammar reads.
