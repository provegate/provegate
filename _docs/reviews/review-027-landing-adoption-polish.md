<!--
Independent-review artifact — practice 01. Reviewer is NOT the author.
-->

# Independent Review: PRD-027 — Landing Adoption Polish

> **PRD:** PRD-027
> **Verdict:** pass
> **Reviewer:** Codex CLI sessions (orchestrated by the implementing session; all findings and verdicts are Codex's own)
> **Tool/Model:** codex (OpenAI, gpt-5.x, reasoning high) — different model family from the author (Claude Fable 5)
> **Base SHA:** 81f9a295
> **Diff range:** main..3222c8d
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass

## Findings

Ranked most-severe first. Two criticals across three rounds — both found, fixed, and
re-verified within this review; round 3 returned "No findings … PASS" plainly.

- **critical (RESOLVED, round 1 → `952e63f`)** · `packages/design/src/react/CodeBlock.tsx`
  — the first fix gave the server renderer a PUBLIC `headerControl` slot, which
  reintroduced the exact affordance-without-handler path FR-9 exists to delete (any
  caller could render a handlerless "copy" node). Fix: the slot moved to
  `CodeBlockBase`, internal and not barrel-exported; a type-level deny test holds the
  public surface.
- **critical (RESOLVED, round 2 → the follow-up commit)** · `CodeBlock.tsx:87` — the
  public wrapper spread every runtime prop into the base, so a JS caller (or structural
  spread) could still smuggle the slot through the public surface; Codex reproduced it
  against the built barrel. Fix: `headerControl={undefined}` hard-dropped AFTER the
  spread, plus a runtime spread-smuggle test.
- **advisory (all RESOLVED)** — the four-payloads test neither clicked nor mocked
  (now: all four production controls clicked against a clipboard mock with exact payload
  assertions); the export census could silently miss `export{X};`-form declarations
  (now: `^export\b` word boundary, unrecognized forms fail loudly); `/alt`'s title test
  accepted substring drift (now: `<title>`, `og:title`, `description` and
  `og:description` pinned exactly); ledger evidence counts were stale (now: real
  per-file outputs — metadata 8, landing 37, content 13, a11y 9, design 54).

## Verdict rationale

The contracts held from round 1 — the no-images resolver coherence, the `/alt` split, the
install single-source, the retained-ratio scrollspy, the census scoping, docs' server MDX
import — and every finding across the rounds was in the FR-9 delivery seam, which is
exactly where the PRD's own history (a rejection built on an inert affordance) predicted
the risk. Round 3 verified all closures against source, confirmed nothing new, and said
PASS plainly. Suites at close: web 67/67 (four files), design 54/54, floor green, egress
clean; live-browser operator rows all passed, with the hero baseline comparison at
1240px against the recorded 1562px.
