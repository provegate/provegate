<!--
Generic §11 template snippet for a spec/PRD — wave 2, part A.
The parser reads ONLY table rows starting `| FR-N` and runs the backtick command in them.
Constraints authors MUST know (enforced by the safety filter):
  • The command must start with an allowlisted tool (npm/node/tsx/vitest/playwright/psql/curl/test/grep).
  • A single `|` is treated as a shell pipe — do NOT use `|` alternation inside a grep pattern.
    Use separate rows, or point at a dedicated assert script.
  • Content-negation (`! grep …`) is inexpressible — a "pattern must NOT appear" check must
    call a dedicated assert-absent script (e.g. `node scripts/assert-absent.mjs …`), not a
    negated grep. FILE absence IS expressible in-row: `test ! -f path` (allowlisted prefix).
  • Put the command in the Command column only. Do not put runnable backtick commands in Notes.
-->

## 11. Verification Commands

Every FR declared in the requirements section needs ≥1 row here carrying a runnable,
backticked command. Orchestration verifies each FR against its matching command; a phase
does not pass until every command exits 0 in a real environment.

| FR   | Command / Check                          | Scope        | Notes |
| ---- | ---------------------------------------- | ------------ | ----- |
| FR-1 | `npm run test -- path/to/feature.spec`   | unit         |       |
| FR-2 | `node scripts/assert-absent.mjs 'X' src` | absence      | must-not-exist check via dedicated script |
| FR-3 | `test -f dist/artifact.json`             | build output |       |

### Baselines (every change runs these)
- `npm run check-types`
- `npm run lint`
- `npm run test`
- `npm run build`

### Hard caps (named required tests — force ITERATE regardless of readiness score)
- <Domain rule cap:> any change to `<risky area>` must name a runnable test that proves the
  guard holds. (See `02` practice 08.)
