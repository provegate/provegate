# 05 — Agent bootstrap entrypoint

**Invariant.** A single canonical doc is the **mandatory first read for any agent**
(tool-independent). It states the workflow contract, maps the knowledge base, prescribes a
*tiered* reading strategy (don't read everything), lists the non-negotiable rules, and
enforces the principle that per-tool config files (CLAUDE.md, `.cursor/rules`, AGENTS.md)
are **thin pointers** — durable knowledge lives in one shared place, never duplicated
per agent.

**Why it matters.** Without one entrypoint, each agent/tool re-derives project context from
scratch (expensive, inconsistent) and per-tool config files drift into conflicting copies
of the same rules. One bootstrap + thin shims = one source of truth, cheap onboarding, no
drift. This is the same "thin shim" principle as the `_brain` loading model (wave 1) —
applied to the whole repo, not just memory.

**Mechanism (generic).** See `templates/AGENT_BOOTSTRAP.template.md`. Section skeleton:
1. **Who / What** — one-line product framing + pointer to the vision doc.
2. **The gated workflow in brief** — name the phases, the non-negotiable rules
   (machine-checkable gate, no self-declare, which phases are human-approved vs. autonomous,
   push always human), and the trigger phrase.
3. **Knowledge map** — a tree of the docs/knowledge base (bootstrap, memory index,
   best-practices, workflow, decisions, patterns, runbooks) + the state dir.
4. **Reading strategy** — tiered ("do not read every file"): Quick-Start → … → full onboarding.
5. **Critical rules** — numbered hard rules (imports/SSOT, commit format, don't violate ADRs).
6. **Cross-agent coordination** — how to claim/query work-item state + locks (practice 06).
7. **Configs-are-pointers principle** — a table mapping each agent → its config → "how it
   connects", with the explicit rule that configs are pointers only.
8. **Memory update rules** — an event→update table (item done → update memory; new decision
   → ADR; pattern used 3+ times → patterns doc).

**Provegate implementation.**
1. Create `docs/ai-context/AGENT_BOOTSTRAP.md` from the template; fill the skeleton.
2. Make it the first line of `CLAUDE.md`, `AGENTS.md`, and the cursor rule: "read this
   before any work."
3. Keep every per-tool config a thin pointer to it — no rule content duplicated.

**De-emofy notes.** Strip Emofy product framing, `@emofy/*` import rules, roles/scope-plane
rules, "Second Brain" branding, and the specific tool names. Keep the skeleton and the
"configs are pointers" principle. Generalize "7-Phase Gated PRD Workflow" to provegate's
gated workflow.

**Related.** pairs with `_brain` shims (wave 1) · practice 06 (coordination section) ·
practice 07 (memory update rules).
