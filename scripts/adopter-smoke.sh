#!/usr/bin/env bash
# Adopter smoke — the delivery gate self-hosting cannot be.
#
# Installs the CLI the way an adopter does (a packed tarball, npm, no workspace
# link) into a plain npm + tsc single-package repo this tool has never seen, then
# drives one PRD from `gate init` to a merged local close. Packaging is not
# delivering: every gate in this repository reads the source tree, so nothing here
# can observe what an install actually hands someone.
#
#   pnpm smoke:adopter                    # pack the local package (the CI shape)
#   pnpm smoke:adopter -- --from-npm      # install the published `latest` instead
#   pnpm smoke:adopter -- --from-npm 0.3.0
#   KEEP=1 pnpm smoke:adopter             # keep the fixture repo for inspection
#
# Known-red assertions are declared in KNOWN_RED below with the work item that
# owns them. A known-red assertion that PASSES fails the run: an allowlist that
# never expires is a permanent bypass (_brain: known-red-ledger-must-expire).
set -uo pipefail

# The fixture runs its OWN `gate run` in its own workspace. Inherited from a
# §11 row, this repository's re-entry sentinel would refuse that as a nested
# run (_brain: runner-sentinel-blocks-cli-spawning-tests) — the fixture close is
# a different workspace, not a nested one.
unset PROVEGATE_RUN_ACTIVE

MODE="--from-source"
VERSION="latest"
case "${1:-}" in
  --from-npm) MODE="--from-npm"; VERSION="${2:-latest}" ;;
  --from-source|'') ROOT_ARG="${2:-}" ;;
  *) echo "usage: $0 [--from-source | --from-npm [VERSION]]" >&2; exit 2 ;;
esac

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORK="$(mktemp -d "${TMPDIR:-/tmp}/provegate-adopter.XXXXXX")"
FAILURES=0
STALE=0

# id → the work item that owns the defect. Keep the id and the reason together;
# a bare id here is a hiding place.
known_red() {
  case "$1" in
    terminal-status)  echo "PRD-041 — no code path writes the terminal status at close" ;;
    clean-tree)       echo "PRD-041 — lease cleanup lands after the land commit" ;;
    handoff-prose)    echo "PRD-040 — a prose handoff bullet counts 0 operator rows" ;;
    handoff-table)    echo "PRD-040 — a 1-row handoff table counts its header row" ;;
    ledger-operator)  echo "PRD-040 — a ledger row with Result 'operator' counts 0" ;;
    lint-refuses)     echo "board deferral 'unfilled PRD passes the lint' — PRD-042 FR-2 resolves the §11 commands at creation, so the unsafe-placeholder refusal that used to catch an unfilled template no longer fires" ;;
    *) echo "" ;;
  esac
}

step() { printf '\n== %s\n' "$1"; }
ok()   { printf '  PASS       %s\n' "$1"; }
bad()  { printf '  FAIL       %s\n' "$1"; FAILURES=$((FAILURES + 1)); }
red()  { printf '  KNOWN-RED  %s\n             ↳ %s\n' "$1" "$2"; }
fixed() {
  printf '  STALE      %s\n             ↳ known-red entry now PASSES — delete it from KNOWN_RED\n' "$1"
  STALE=$((STALE + 1))
}

# assert <id> <description> <condition-result 0|1>
assert() {
  local id="$1" desc="$2" held="$3" owner
  owner="$(known_red "$id")"
  if [ "$held" -eq 0 ]; then
    if [ -n "$owner" ]; then fixed "$desc"; else ok "$desc"; fi
  else
    if [ -n "$owner" ]; then red "$desc" "$owner"; else bad "$desc"; fi
  fi
}
eq()       { [ "$1" = "$2" ] && echo 0 || echo 1; }
contains() { printf '%s' "$1" | grep -qF -- "$2" && echo 0 || echo 1; }

cleanup() {
  if [ "${KEEP:-0}" = "1" ]; then printf '\n   fixture kept: %s\n' "$WORK"; else rm -rf "$WORK"; fi
}
trap cleanup EXIT

step "workspace: $WORK"

# ------------------------------------------------------------- what we install
if [ "$MODE" = "--from-source" ]; then
  if [ ! -f "$ROOT/packages/provegate/dist/cli.js" ]; then
    echo "  building packages/provegate (no dist yet)"
    ( cd "$ROOT" && pnpm --filter provegate build ) >/dev/null 2>&1 || {
      echo "  FAIL  cannot build packages/provegate — run 'pnpm --filter provegate build' first" >&2
      exit 1
    }
  fi
  TARBALL="$(cd "$ROOT/packages/provegate" && npm pack --pack-destination "$WORK" 2>/dev/null | tail -1)"
  SPEC="$WORK/$TARBALL"
else
  SPEC="provegate@$VERSION"
fi
printf '  installing: %s\n' "$SPEC"

# --------------------------------------------------- the adopter's own project
REPO="$WORK/acme-utils"
mkdir -p "$REPO/src" "$REPO/test" "$REPO/scripts"
cd "$REPO" || exit 1
git init -q -b main
git config user.name "Adopter Dev"
git config user.email "dev@acme.test"
git config commit.gpgsign false

cat > package.json <<'JSON'
{
  "name": "acme-utils",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "check-types": "npx tsc --noEmit",
    "lint": "node scripts/lint.mjs",
    "test": "node --test \"test/**/*.test.js\"",
    "build": "npx tsc"
  }
}
JSON
cat > tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022", "module": "NodeNext", "moduleResolution": "NodeNext",
    "strict": true, "outDir": "dist", "rootDir": "src"
  },
  "include": ["src"]
}
JSON
cat > scripts/lint.mjs <<'JS'
import { readdirSync, readFileSync } from 'node:fs';
let bad = 0;
for (const f of readdirSync('src').filter((n) => n.endsWith('.ts'))) {
  if (readFileSync(`src/${f}`, 'utf8').includes('TODO')) {
    console.error(`lint: TODO left in src/${f}`);
    bad++;
  }
}
process.exit(bad === 0 ? 0 : 1);
JS
cat > src/slug.ts <<'TS'
export function slugify(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
TS
cat > test/slug.test.js <<'JS'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugify } from '../dist/slug.js';

test('slugify', () => {
  assert.equal(slugify('  Hello World! '), 'hello-world');
});
JS
printf 'node_modules\ndist\n' > .gitignore
npm install --silent typescript@5 >/dev/null 2>&1
npm run build >/dev/null 2>&1
git add -A && git commit -qm "chore: bootstrap acme-utils"

step "install"
npm install --silent --save-dev "$SPEC" >/dev/null 2>&1
INSTALLED="$(node -p "require('$REPO/node_modules/provegate/package.json').version" 2>/dev/null)"
assert cli-runs "the installed CLI runs" "$(eq "$(npx gate --version 2>&1)" "$INSTALLED")"
assert zero-deps "the package ships zero runtime dependencies" \
  "$(eq "$(node -p "JSON.stringify(require('$REPO/node_modules/provegate/package.json').dependencies || {})")" "{}")"

step "gate init"
INIT="$(npx gate init 2>&1)"
assert init-configs "init writes the starter configs" "$(contains "$INIT" "workflow.config.json")"
MISSING=""
for d in _prds/wip _readiness/wip _tasks/wip _docs/reviews _state/locks; do
  [ -d "$d" ] || MISSING="$MISSING $d"
done
assert init-tree "init scaffolds the artifact tree" "$([ -z "$MISSING" ] && echo 0 || echo 1)"

step "wire the floor (the QUICKSTART single-package recipe)"
cat > gates.manifest.json <<'JSON'
{
  "phases": { "4": ["npm run check-types", "npm run lint", "npm run test", "npm run build"] },
  "postMerge": ["npm run check-types", "npm run build"]
}
JSON
assert wiring "the wiring check is green" "$(contains "$(npx gate check --wiring 2>&1)" "ok")"

step "gate new + readiness lint"
assert new-allocates "gate new allocates PRD-001" "$(contains "$(npx gate new fix-slug-unicode --class=hotfix 2>&1)" "PRD-001")"
assert lint-refuses "an unfilled template fails the lint" "$(contains "$(npx gate check PRD-001 2>&1)" "not ready")"

# The fill script's exit code is CHECKED. It failed silently for one round —
# the memory sections it looked for are now omitted by design — and the smoke
# carried on with an unfilled PRD, reporting four downstream failures instead of
# the one real cause.
if ! node "$ROOT/scripts/adopter-smoke-fill.mjs" _prds/wip/prd-001-fix-slug-unicode.md; then
  echo "  FAIL       the fill script could not fill the PRD (see its message above)"
  FAILURES=$((FAILURES + 1))
fi
assert lint-passes "the filled PRD passes the lint" \
  "$(contains "$(npx gate check PRD-001 2>&1)" "passes the readiness lint")"

step "gate open (lease)"
git add -A && git commit -qm "docs(prd): prd-001 draft"
assert lease "the lease claims the declared surface" "$(contains "$(npx gate open PRD-001 2>&1)" "claimed PRD-001")"

step "implement on a feature branch"
git checkout -qb feat/prd-001-fix-slug-unicode
cat > src/slug.ts <<'TS'
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
TS
cat >> test/slug.test.js <<'JS'

test('slugify folds accented latin letters', () => {
  assert.equal(slugify('Merhaba Dünya'), 'merhaba-dunya');
});
JS
npm run build >/dev/null 2>&1
git add -A && git commit -qm "fix(slug): fold accented latin letters"

step "the close refuses without its phase-6 artifact"
RUN1="$(npx gate run PRD-001 2>&1)"
RUN1_EXIT=$?
assert stop-exit "a missing review ledger stops the run" "$(eq "$RUN1_EXIT" "1")"
assert stop-phase "the stop names phase 6" "$(contains "$RUN1" "STOPPED at Phase 6")"

step "record the ledger and the review verdict"
cat > _tasks/wip/tasks-001-fix-slug-unicode.md <<'MD'
# Tasks: slugify drops accented letters

> **PRD**: [prd-001-fix-slug-unicode.md](../../_prds/wip/prd-001-fix-slug-unicode.md)
> **Status**: Code Complete

## Tasks

- [x] 1.0 Fold before filtering in `src/slug.ts`
- [x] 2.0 Pin the regression in `test/slug.test.js`

## Verification Ledger

| Gate               | Command / Check                                | Scope      | Result | Evidence     | Notes                      |
| ------------------ | ---------------------------------------------- | ---------- | ------ | ------------ | -------------------------- |
| FR-1               | `npm run build`                                | compile    | passed | tsc clean    | fold before filter         |
| FR-2               | `npm run test`                                 | regression | passed | tests green  | accented case pinned       |
| independent-review | `_docs/reviews/review-001-fix-slug-unicode.md` | repo       | passed | verdict pass | verdict pass, critical = 0 |
MD
BASE_SHA="$(git merge-base main HEAD)"
cat > _docs/reviews/review-001-fix-slug-unicode.md <<MD
# Independent Review: PRD-001 — slugify drops accented letters

> **PRD:** PRD-001
> **Verdict:** pass
> **Reviewer:** adopter smoke harness — not the implementing agent
> **Base SHA:** \`$BASE_SHA\`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass

## Summary

Two-file diff reviewed against the base tip: the fold precedes the character filter and the
ASCII path is unchanged.

## Findings

| #   | Sev | Finding | Resolution |
| --- | --- | ------- | ---------- |
| —   | —   | none    | —          |

## Post-fix verification

Floor commands green.
MD
git add -A && git commit -qm "docs(prd): tasks ledger and review artifact"

step "the gated close"
RUN2="$(npx gate run --from-phase=6 PRD-001 2>&1)"
RUN2_EXIT=$?
assert close-exit "the gated close succeeds" "$(eq "$RUN2_EXIT" "0")"
assert close-handoff "the handoff card leaves the push to the human" "$(contains "$RUN2" "READY TO PUSH")"
assert close-merge "the merge landed on the local base" "$(contains "$(git log --oneline -3 main)" "PRD-001")"
assert close-archive "the artifacts archived wip→completed" \
  "$([ -f _prds/completed/prd-001-fix-slug-unicode.md ] && echo 0 || echo 1)"
assert close-metrics "the run wrote its metrics" "$([ -f _state/prd-metrics.jsonl ] && echo 0 || echo 1)"

step "the state a closed item leaves behind"
STATUS_LINE="$(grep -m1 'Status' _prds/completed/prd-001-fix-slug-unicode.md 2>/dev/null)"
assert terminal-status "a closed PRD reads a terminal status, not Draft" \
  "$(printf '%s' "$STATUS_LINE" | grep -qv 'Draft' && echo 0 || echo 1)"
assert clean-tree "the close leaves the tree clean" "$(eq "$(git status --short | wc -l | tr -d ' ')" "0")"

step "which handoff shapes the acceptance gate can see"
SHAPES="$(node -e "
import('provegate').then((m) => {
  const f = m.countOperatorHandoff;
  const s = (b) => '## Operator Handoff\n\n' + b + '\n\n---\n';
  console.log(JSON.stringify({
    prose: f(s('- Owner confirms the rendered card.')),
    checkbox: f(s('- [ ] Owner confirms the rendered card.')),
    table: f(s('| Item | Owner |\n| --- | --- |\n| confirm the card | owner |')),
    ledger: f('## Verification Ledger\n\n| Gate | Result |\n| --- | --- |\n| operator | operator |\n'),
  }));
});" 2>/dev/null)"
printf '  shapes: %s\n' "$SHAPES"
assert handoff-checkbox "a checkbox handoff row counts 1" "$(contains "$SHAPES" '"checkbox":1')"
assert handoff-prose "a prose handoff bullet counts as an operator row" \
  "$(printf '%s' "$SHAPES" | grep -q '"prose":0' && echo 1 || echo 0)"
assert handoff-table "a 1-row handoff table counts 1, not its header too" "$(contains "$SHAPES" '"table":1')"
assert ledger-operator "a ledger row with Result 'operator' counts as an operator row" \
  "$(printf '%s' "$SHAPES" | grep -q '"ledger":0' && echo 1 || echo 0)"

printf '\n== %s failing · %s stale known-red\n' "$FAILURES" "$STALE"
[ "$FAILURES" -eq 0 ] && [ "$STALE" -eq 0 ]
