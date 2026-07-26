# Placeholder Registry

Every placeholder token used in `prompts/` and `templates/` is declared here. Tokens are
UPPER_SNAKE. Substitute them for your project when adopting a prompt or template —
manually, or via your agent during Phase 1. Where a token mirrors a `workflow.config.json`
field, the mapping is noted.

| Token                    | Meaning                                                            | Example value                   | workflow.config field |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------- | --------------------- |
| `{{PROJECT_NAME}}`       | Your project's name as used in prose                               | `acme-platform`                 | —                     |
| `{{BASE_BRANCH}}`        | Merge target for feature work                                      | `main`                          | `branches.base`       |
| `{{ID_PREFIX}}`          | Work-item id prefix                                                | `PRD`                           | `idPattern.prefix`    |
| `{{CMD_CHECK_TYPES}}`    | Type-check command                                                 | `pnpm check-types`              | `commands.checkTypes` |
| `{{CMD_LINT}}`           | Lint command                                                       | `pnpm lint`                     | `commands.lint`       |
| `{{CMD_TEST}}`           | Test command                                                       | `pnpm test`                     | `commands.test`       |
| `{{CMD_TEST_SCOPED}}`    | Test command scoped to affected packages                           | `pnpm test --filter <pkg>`      | —                     |
| `{{CMD_BUILD}}`          | Build command                                                      | `pnpm build`                    | `commands.build`      |
| `{{DOMAIN_CHECKS}}`      | Your project-specific review/readiness checklist block             | RBAC + tenancy checklist        | —                     |
| `{{TECH_STANDARDS}}`     | Your stack's coding-standards block (frameworks, patterns, layers) | backend/frontend/database rules | —                     |
| `{{ARCHITECTURE_DOC}}`   | Path to your architecture/memory document                          | `docs/ARCHITECTURE.md`          | —                     |
| `{{BEST_PRACTICES_DOC}}` | Path to your coding-standards document                             | `docs/BEST_PRACTICES.md`        | —                     |
| `{{DOCS_ROOT}}`          | Root of your knowledge base (wiki/ADRs/patterns)                   | `docs/knowledge`                | —                     |
| `{{MEMORY_ROOT}}`        | Root of your durable-memory record store                           | `_brain`                        | `memory.root`         |
| `{{REVIEW_TOOL}}`        | Your cross-model reviewer invocation                               | `codex review`                  | —                     |
| `{{ENV_NOTES}}`          | What "real environment" means for your integration tests           | `local PostgreSQL via compose`  | —                     |

Rules:

- A token not in this table must not appear in any shipped prompt or template
  (enforced by `test/content-placeholders.test.ts`).
- Substituted values that become §11 verification commands must satisfy the command
  safety gate: allowlisted prefix, no shell metachars, single line, no pipes inside a
  markdown table cell.
