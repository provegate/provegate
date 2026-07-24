# 07 — Retro → learning ritual

**Invariant.** Learning is **not optional cleanup — it is a gated phase** of every unit of
work. Each work-item declares up front *where* its durable knowledge will land (a memory
learning / a decision record / a reusable pattern), and a machine check refuses to close
the item unless those artifacts were actually touched in the same merge. Separately, a
lightweight recurring retrospective captures cross-item learnings into a dated report.
Knowledge is written to the shared store — never left only in chat.

**Why it matters.** This is the pipeline the whole `_brain` design exists to feed (wave 1).
Without a *gate*, "capture the learning" is the step that always gets skipped under time
pressure, and the memory store slowly stops reflecting reality. Declaring the durable-artifact
paths up front + checking the diff touched them makes capture non-skippable.

**Mechanism (generic).** Two distinct rituals:
1. **Per-item Learning phase (mandatory, gated)** — runs *before* the merge so durable docs
   land in the same change:
   - The work-item spec has a **"Durable Artifacts"** field listing the paths that must be
     created/updated (e.g. `_brain/learnings/<slug>.md`, `_brain/adr/ADR-NNNN-*.md`, a
     patterns doc).
   - A check (`verify:durable-artifacts` equivalent) fails close if a declared path does
     **not** appear in the merge diff. (See seed `durable-artifact-must-commit`.)
   - Run the `_brain` **capture protocol** (SPEC §7): non-derivable learning → new
     `learnings/<slug>.md` + INDEX pointer.
   - Update the best-practices/patterns doc if a pattern has now been used 3+ times.
2. **Periodic retro (lightweight)** — a recurring (e.g. weekly) retrospective producing a
   dated note in a `retros/` dir, capturing cross-item themes that no single item owns.

An **event → memory-update table** (in the bootstrap doc) makes routing explicit: item done
→ update memory/wiki; new decision → ADR; pattern used 3+ times → patterns doc; bug fixed →
troubleshooting note.

**Provegate implementation.**
1. Add a "Durable Artifacts" field to the work-item template; make Phase 7 (Learning) run
   the `_brain` capture protocol.
2. Add the `verify:durable-artifacts` check (wave 2, with the other `verify:*`): declared
   paths must appear in the diff at close.
3. Add the event→update table to the bootstrap doc.
4. Create a `retros/` dir; run a periodic retro that deposits dated notes.

**De-emofy notes.** Drop `wiki-ingest`, `ship:pre`, `state:wiki-log`, "Second Brain", and
the gstack `/retro` skill name. Keep: the Durable-Artifacts-declared-and-checked mechanism,
the event→update table, and a `retros/` dir. **Honest caveat:** in Emofy the *enforced*
ritual is the per-item Phase-7 gate; the standalone retro-artifact practice is thin (few
files). Port the gate as the durable invariant; treat the periodic retro as a nice-to-have.

**Related.** feeds `_brain` (wave 1 capture protocol) · seed `durable-artifact-must-commit`
· practice 01 (review artifact is also a durable artifact) · practice 05 (event→update table).
