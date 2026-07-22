# prompts/

The method's phase protocols, operationalized for agents. Paste the relevant prompt
into your agent at each phase; substitute the placeholder tokens per `PLACEHOLDERS.md`.

| File                                        | Phase / role                                                |
| ------------------------------------------- | ----------------------------------------------------------- |
| `phase-1-prd-generator.md`                  | 1 — Product Architect                                       |
| `phase-2-readiness-scorer.md`               | 2 — Senior Staff Engineer (calibrated scoring core)         |
| `phase-3-task-generator.md`                 | 3 — Technical Lead                                          |
| `phase-4-implementation.md`                 | 4 — Senior Implementation Engineer                          |
| `phase-5-testing.md`                        | 5 — Adversarial Test Engineer                               |
| `phase-6-final-auditing.md`                 | 6 — Quality Assurance Lead (independent review)             |
| `phase-7-learning.md`                       | 7 — Memory Steward                                          |
| `orchestration-runner.md`                   | The agent-driver half of the runner (pairs with `gate run`) |
| `knowledge-ingest.md` / `knowledge-lint.md` | Knowledge-base upkeep                                       |
| `adapters/`                                 | Tool-shaped entry points (Cursor, Codex)                    |

The scoring weights, class tables, hard caps, and review quorum inside these prompts
are calibrated against 143 post-ship findings — localize the wording, keep the numbers.
