# templates/

Artifact templates for the seven phases. Every metadata shape here is byte-compatible
with the gate parsers (`gate check`, `gate run`, `gate status`) — vitest round-trips in
this package enforce it, so template↔engine drift is a red test, not silent rot.

| File                       | Artifact                          | Machine consumer               |
| -------------------------- | --------------------------------- | ------------------------------ |
| `prd-template.md`          | The spec (Phase 1)                | `gate check`, state builder    |
| `readiness-template.md`    | Scoring report (Phase 2)          | state builder (score/verdict)  |
| `tasks-template.md`        | Implementation contract (Phase 3) | runner review-ledger gate      |
| `review-template.md`       | Independent review (Phase 6)      | review schema gate             |
| `summary-template.md`      | Close-out summary (Phase 7)       | state builder (ship readiness) |
| `doc-template.md`          | Durable knowledge document        | —                              |
| `status-board-template.md` | Optional human coordination board | panel metric labels            |

Substitute the placeholder tokens per `../prompts/PLACEHOLDERS.md`.
