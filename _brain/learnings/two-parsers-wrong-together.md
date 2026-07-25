---
name: two-parsers-wrong-together
description: >-
  A conformance corpus cannot see the case where both implementations are wrong the same
  way; only a claim bound to behaviour and owned once per cell keeps it from shrinking.
type: gotcha
scope: workflow
status: active
links: [false-green-on-missing-file, gate-wire-or-delete, operator-row-must-be-a-table-row]
provenance: prd-017-close
---

When one format has two implementations that cannot import each other, the usual answer is
a shared conformance corpus: run every case through both, assert they agree. That catches
divergence. It is blind to the failure that actually happens most — both implementations
wrong in the same way, agreeing perfectly on a wrong answer.

Three of them shipped in PRD-017 and were found by an independent reviewer, not by the
corpus: `tags` accepted an ADR name because it shared a branch with `links`; ADR headings
matched by prefix, so `## Contextual` stood in for Context; an empty rationale marker passed
because only the marker's presence was checked. Every one had a corpus case that agreed.

**Why:** agreement is a property of the two implementations, not of the specification. A
corpus asks "do these two behave alike?" when the question that matters is "do these two
behave as specified?" — and when the spec lives only in the code, those are the same
question and the answer is always yes.

**How to apply:** Write the specification somewhere neither implementation can edit — for
shipped method content, the approved source — and make the corpus a coverage claim against
THAT. Then keep the claim honest: bind each case to the matrix cells it exercises, verify
the binding against actual behaviour (a deny cell must fail on the field it names, an
acceptance cell must produce no issues), and let exactly one case own each cell so deleting
a case always unclaims something. Without single ownership the corpus shrinks in silence,
which is [[false-green-on-missing-file]] one level up: the check ran, found nothing to
check, and reported green. And do not trust the corpus alone for a rule both sides could
plausibly get wrong together — those need an outside reader.
