# Placeholder Registry

Every placeholder token used in `prompts/`, `templates/` and `practices/templates/` is
declared here. Tokens are
UPPER_SNAKE. Substitute them for your project when adopting a prompt or template —
manually, or via your agent during Phase 1. Where a token mirrors a `workflow.config.json`
field, the mapping is noted.

| Token | Meaning | Example value | workflow.config field | Empty | Enumerated |
| --- | --- | --- | --- | --- | --- |
| `{{PROJECT_NAME}}` | Your project's name as used in prose | `acme-platform` | — | — | — |
| `{{BASE_BRANCH}}` | Merge target for feature work | `main` | `branches.base` | — | — |
| `{{ID_PREFIX}}` | Work-item id prefix | `PRD` | `idPattern.prefix` | — | — |
| `{{CMD_CHECK_TYPES}}` | Type-check command | `pnpm check-types` | `commands.checkTypes` | — | — |
| `{{CMD_LINT}}` | Lint command | `pnpm lint` | `commands.lint` | — | — |
| `{{CMD_TEST}}` | Test command | `pnpm test` | `commands.test` | — | — |
| `{{CMD_TEST_SCOPED}}` | Test command scoped to affected packages | `pnpm test --filter <pkg>` | — | — | — |
| `{{CMD_BUILD}}` | Build command | `pnpm build` | `commands.build` | — | — |
| `{{DOMAIN_CHECKS}}` | Your project-specific review/readiness checklist block | RBAC + tenancy checklist | — | allowed | — |
| `{{LINK_TO_VISION_DOC}}` | Link to the document holding your product vision | `docs/vision.md` | — | — | — |
| `{{VISION_OR_DECISIONS_DOC}}` | Vision or decision-log document an agent should read first | `docs/decisions/` | — | — | — |
| `{{ONE_LINE_PRODUCT_FRAMING}}` | One sentence saying what the product is | `A gated workflow for agents` | — | — | — |
| `{{PROJECT_SPECIFIC_HARD_RULES}}` | Your non-negotiable rules block in the agent bootstrap | never touch prod data | — | — | — |
| `{{TECH_STANDARDS}}` | Your stack's coding-standards block (frameworks, patterns, layers) | backend/frontend/database rules | — | — | — |
| `{{ARCHITECTURE_DOC}}` | Path to your architecture/memory document | `docs/ARCHITECTURE.md` | — | — | — |
| `{{BEST_PRACTICES_DOC}}` | Path to your coding-standards document | `docs/BEST_PRACTICES.md` | — | — | — |
| `{{DOCS_ROOT}}` | Root of your knowledge base (wiki/ADRs/patterns) | `docs/knowledge` | — | — | — |
| `{{MEMORY_ROOT}}` | Root of your durable-memory record store | `_brain` | `memory.root` | — | — |
| `{{REVIEW_TOOL}}` | Your cross-model reviewer invocation | `codex review` | — | — | — |
| `{{ENV_NOTES}}` | What "real environment" means for your integration tests | `local PostgreSQL via compose` | — | allowed | — |

Column meanings (PRD-029 FR-4 reads this table; it is the single authority):

- **workflow.config field** — when set, the value resolves automatically from the
  repository's config and the adopter is never asked for it. Seven rows carry one.
- **Empty** — `allowed` means `''` is a legal value for this token. Prose blocks a project
  may legitimately have nothing to say in are `allowed`; a path or a command is not, because
  an empty `{{ARCHITECTURE_DOC}}` renders a protocol telling an agent to read nothing. A
  global rule in either direction is wrong, so the policy is per token and lives here.
- **Enumerated** — when set, a comma-separated list of the token's legal values. The package
  ships one fragment per value at `prompts/_fragments/<TOKEN>.<value>.md` and the config
  supplies the KEY, never the prose. No token is enumerated yet; PRD-031 ships the first.

Rules:

- A token not in this table must not appear in any shipped prompt or template
  (enforced by `test/content-placeholders.test.ts`).
- **Required values are derived from the RENDERED corpus, not from this table.** This
  registry also covers `practices/templates/`, which the protocol store does not render, so
  four of its rows are never asked of an adopter. Deriving the requirement from the
  catalogue rather than from what the consumer reads produces refusals nobody can satisfy.
- Substituted values that become §11 verification commands must satisfy the command
  safety gate: allowlisted prefix, no shell metachars, single line, no pipes inside a
  markdown table cell.
