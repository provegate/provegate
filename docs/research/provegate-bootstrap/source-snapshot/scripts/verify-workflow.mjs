#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { REPO_ROOT, fail, ok } from "./prd-state-utils.mjs";
// PRD-392 FR-5 — known-red manifest reader (append-only class; new imports only).
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const checks = [
  ["verify:prd-state", ["pnpm", ["verify:prd-state"]]],
  // PRD-418 — operator-acceptance store schema + owner-allowlist gate.
  ["verify:acceptances", ["pnpm", ["verify:acceptances"]]],
  ["verify:agent-locks", ["pnpm", ["verify:agent-locks"]]],
  // PRD-368 — turbo cache correctness invariants (shape + env isolation are cheap dry-runs).
  ["verify:turbo-task-shape", ["pnpm", ["verify:turbo-task-shape"]]],
  ["verify:turbo-env-isolation", ["pnpm", ["verify:turbo-env-isolation"]]],
  // PRD-369 — paket-sınırı invariant'ları (cycle ratchet + boundaries tags + types format).
  ["verify:package-cycles", ["pnpm", ["verify:package-cycles"]]],
  ["verify:boundaries-tags", ["pnpm", ["verify:boundaries-tags"]]],
  ["verify:types-module-format", ["pnpm", ["verify:types-module-format"]]],
  // PRD-335 P2-2 — el-yazımı semantic.ts ↔ jeneratör-SSOT değer-eşitliği.
  ["verify:token-semantic-parity", ["pnpm", ["verify:token-semantic-parity"]]],
  // PRD-370 — root-task inputs kapsam denetimi (bayat-yeşil cache koruması).
  ["verify:root-task-inputs", ["pnpm", ["verify:root-task-inputs"]]],
  ["verify:branch-isolation", ["pnpm", ["verify:branch-isolation"]]],
  // PRD-312 FR-1 — path-level conflict gate: two ACTIVE execution-phase locks
  // declaring overlapping source globs (ownedPaths) fail before they collide at
  // merge. Static lock + git ls-files scan (no build/DB).
  ["verify:path-conflicts", ["pnpm", ["verify:path-conflicts"]]],
  ["verify:status-sync", ["pnpm", ["verify:status-sync"]]],
  // PRD-312 FR-3 — the generated "Mevcut durum" panel cells must match machine
  // truth (closes the silent-rot hole status-sync never covered). Deterministic
  // prds.json-vs-_STATUS scan (no lock/build/DB).
  ["verify:status-panel", ["pnpm", ["verify:status-panel"]]],
  ["verify:deferred", ["pnpm", ["verify:deferred"]]],
  ["verify:memory-drift", ["pnpm", ["verify:memory-drift"]]],
  // PRD-248 Phase 7 (Learning) gate — declared Durable Artifacts for any changed
  // PRD must be present in the change set. Pre-248 PRDs have no section, so they
  // declare nothing and pass; no PRD-number grandfather needed.
  ["verify:durable-artifacts", ["pnpm", ["verify:durable-artifacts", "--changed"]]],
  ["verify:doc-bloat", ["pnpm", ["verify:doc-bloat"]]],
  // PRD-223 — API contract CI guards. The snapshot guard boots the compiled
  // backend in preview mode (no DB/Redis); it auto-builds dist if missing.
  ["verify:v1-semantics", ["pnpm", ["verify:v1-semantics"]]],
  ["verify:api-wiring", ["pnpm", ["verify:api-wiring"]]],
  ["verify:openapi-snapshot", ["pnpm", ["verify:openapi-snapshot"]]],
  // PRD-327 FR-6 — dev-sdk resource-coverage gate: every v1 operation in the
  // frozen snapshot must have a generated accessor (RESOURCE_OPERATION_INVENTORY
  // in resources.ts). Atomic-land: wired here in the SAME PR that ships full
  // coverage, so it never turns `development` red for parallel agents. Static
  // snapshot-vs-generated-file scan (no build/DB), so the local bundle is home.
  ["verify:dev-sdk-coverage", ["pnpm", ["verify:dev-sdk-coverage"]]],
  // PRD-200 FR-5 — multi-tenant naming/role guards (wire-or-delete; wired here so
  // gates-wired sees them and they run with every workflow gate).
  ["verify:convex-org-naming", ["pnpm", ["verify:convex-org-naming"]]],
  ["verify:org-role-literals", ["pnpm", ["verify:org-role-literals"]]],
  // PRD-280 — product authz must use usePermission/Can, not the BetterAuth
  // client AC hasPermission (which lacks decision-plane policyVersion).
  ["verify:no-client-ac-authz", ["pnpm", ["verify:no-client-ac-authz"]]],
  // PRD-291 — @SkipOrgValidation allowlist must stay reconciled to reality
  // (no missing/stale), every entry plane-labeled (ADR-037), and the derived
  // `_state/skip-org-plane-inventory.json` byte-fresh. Static source/JSON scan
  // (no build/DB), so the local workflow bundle is its home. Already wired into
  // ci.yml (lint job) — this adds it to the local chain too (wire-or-delete).
  ["verify:skip-org", ["pnpm", ["verify:skip-org"]]],
  // PRD-292 — scope-plane coverage ratchet (ADR-037 R7). Static scan of the
  // PRD-291 plane inventory vs the @Plane declarations (no build/DB). PR gate is
  // ci.yml's lint job; this adds it to the local chain too (wire-or-delete).
  ["verify:plane-coverage", ["pnpm", ["verify:plane-coverage"]]],
  // PRD-293 — cross-domain import-boundary ratchet. `madge`+tsconfig resolution
  // over apps/backend (alias+relative edges) classified against each domain's
  // MODULE.md `publicSurface` + the shrink-only domain-boundaries-baseline.json.
  // Static import-graph scan (no DB) — local workflow bundle is its home; the PR
  // gate is ci.yml's lint job (self-test + ratchet), next to verify:plane-coverage.
  ["verify:domain-boundaries", ["pnpm", ["verify:domain-boundaries"]]],
  // PRD-374 FR-3/FR-4 — shrink-only forwardRef ratchet + @Global() allowlist
  // growth-block. Static source scans (no build/DB), so the local workflow
  // bundle is their home (wire-or-delete, PRD-200 FR-5).
  ["verify:forwardref-baseline", ["pnpm", ["verify:forwardref-baseline"]]],
  ["verify:global-allowlist", ["pnpm", ["verify:global-allowlist"]]],
  // PRD-302 — MODULE.md ownedTables/planes accuracy (companion to domain-boundaries).
  ["verify:manifest-accuracy", ["pnpm", ["exec", "turbo", "run", "//#verify:manifest-accuracy"]]], // PRD-370 cache yolu
  // PRD-359 — pilot telemetry coverage guard (Phase-1 allowlist mode). Static
  // source scan: contract-name shape, SDK mirror sync, allowlisted surface
  // emit coverage (no build/DB) — local workflow bundle is its home; the PR
  // gate is ci.yml's lint job (wire-or-delete, PRD-200 FR-5).
  [
    "verify:pilot-telemetry-coverage",
    ["pnpm", ["verify:pilot-telemetry-coverage"]],
  ],
  // PRD-306 — org-purge registry drift guard: a tenant column not named `org_id`
  // (purge would miss it) or a stale retain/exception allowlist entry. Introspects
  // the built @emofy/db dist (no DB), like the authz-snapshot scans above.
  ["verify:org-purge-coverage", ["pnpm", ["exec", "turbo", "run", "//#verify:org-purge-coverage"]]], // PRD-370 cache yolu
  // PRD-278 — authorization leaf-package guards (wire-or-delete, PRD-200 FR-5).
  // The cycle guard + vocabulary drift gate are lightweight literal/data scans
  // (no build), so the local workflow bundle is their home.
  ["verify:authz-no-types-import", ["pnpm", ["verify:authz-no-types-import"]]],
  ["verify:authorization-vocabulary", ["pnpm", ["verify:authorization-vocabulary"]]],
  // PRD-286 — audit capture-completeness guard: the sampling branch must not
  // bypass denial/high-risk/sensitive-resource allows. Static mutation scan
  // (no build/DB), so the local workflow bundle is its home (wire-or-delete).
  ["verify:authz-audit-capture", ["pnpm", ["verify:authz-audit-capture"]]],
  // PRD-287 — missing-invalidation guard: every registered fact-mutating
  // service must bump the per-org version OR call invalidate (no TTL-only
  // revoke, ADR-034 item 28). Static registry/source scan (no build/DB).
  ["verify:authz-cache-invalidation", ["pnpm", ["verify:authz-cache-invalidation"]]],
  // PRD-288 — list-scoping contract adoption guard: every enforced list
  // controller (feed/tasks/members v1) must route through filterResources/
  // ListScopeService or carry a method-level `// authz-filter-exempt: <reason>`.
  // Static source scan (no build/DB), so the local workflow bundle is its home.
  ["verify:authz-filter-scope", ["pnpm", ["verify:authz-filter-scope"]]],
  // PRD-273 — authorization fact-store drift guards (DB-backed; skip without a
  // DB URL, so safe in the local workflow bundle + CI).
  ["verify:authorization-policy-schema", ["pnpm", ["verify:authorization-policy-schema"]]],
  ["verify:authorization-profile-orphans", ["pnpm", ["verify:authorization-profile-orphans"]]],
  // PRD-277 — GitOps policy rollout guards (snapshot schema/determinism, golden
  // decision-fixture parity, decision-audit shape, committed-snapshot drift).
  // Pure scans over the built @emofy/authz dist (no DB) — local workflow bundle.
  ["verify:authorization-policy-snapshot", ["pnpm", ["verify:authorization-policy-snapshot"]]],
  ["verify:authorization-decision-fixtures", ["pnpm", ["verify:authorization-decision-fixtures"]]],
  ["verify:authorization-audit-shape", ["pnpm", ["verify:authorization-audit-shape"]]],
  ["verify:authorization-policy-snapshot-committed", ["pnpm", ["verify:authorization-policy-snapshot-committed"]]],
  // PRD-261 — docs generated-reference freshness + removed-role `.mdx` scan
  // (extends org-role-literals, which is .ts/.tsx/.mjs-only, to docs content).
  ["verify:docs-drift", ["pnpm", ["verify:docs-drift"]]],
  // PRD-260 follow-up (wired here under PRD-261): verify:legal-parity shipped
  // declared-but-unwired, so verify:gates-wired (below) failed on the base.
  // Wire-or-delete invariant (PRD-200 FR-5) — the gate is lightweight and
  // self-contained (no build), so the local workflow bundle is its home.
  ["verify:legal-parity", ["pnpm", ["exec", "turbo", "run", "//#verify:legal-parity"]]], // PRD-370 cache yolu
  // PRD-323 FR-6 — işleme envanteri ↔ DATA_CLASSIFICATION drift gate'i.
  ["verify:processing-inventory", ["pnpm", ["verify:processing-inventory"]]],
  // PRD-309 — event publish-coverage ratchet: every enumerated `*.event.ts`
  // class must be in the event-catalog SSOT or the shrink-only backlog allowlist
  // (membership, not reachability — PRD-303 failure mode forbidden). Static
  // glob/source scan (no build/DB), so the local workflow bundle is its home.
  ["verify:event-publish-coverage", ["pnpm", ["verify:event-publish-coverage"]]],
  // PRD-328 §FR-8 — EMA event-type codegen drift gate: `events.generated.ts` must
  // be byte-identical to a fresh generation from the registry `requiredScope`
  // DATA. Deterministic source scan (no build/DB), so the local bundle is home.
  ["verify:ema-event-types", ["pnpm", ["verify:ema-event-types"]]],
  // PRD-389 FR-6 — event-handler idempotency gate: every @EventsHandler under the
  // scan roots carries a seam marker (HandlerIdempotencyService /
  // ProcessedEventRepository) or a justified allowlist entry (shrink-only +
  // deny-any-new). Static decorator/source scan (no build/DB), so the local
  // workflow bundle is its home (wire-or-delete, PRD-200 FR-5).
  ["verify:event-handler-idempotency", ["pnpm", ["verify:event-handler-idempotency"]]],
  // PRD-329 — search index-wiring drift gate: every index has a reindex loader
  // (7/7), role-transition doc-move + C4 exclusion + freshness backstop declared.
  // Static source scan (no build/DB), so the local workflow bundle is its home.
  ["verify:search-index-wiring", ["pnpm", ["verify:search-index-wiring"]]],
  // PRD-332 FR-4 — security-header drift gate: the shared SSOT carries every
  // mandatory header and all 6 app configs stay wired to it (report-only CSP
  // rollout preserved). Static source scan (no build/DB), so the local workflow
  // bundle is its home. (verify:dependency-audit lives in its own CI workflow —
  // dependency-audit.yml — not here, per PRD §12 DO-NOT.)
  ["verify:security-headers", ["pnpm", ["exec", "turbo", "run", "//#verify:security-headers"]]], // PRD-370 cache yolu
  // PRD-384 FR-6 (ADR-077 K6) — EMA/developer-api resource-authz coverage gate:
  // every @Public V1/EMA controller carries an umbrella composite (⇒
  // V1ResourceAuthzGuard + ownershipModel) or a justified shrink-only allowlist
  // entry. Static decorator-source scan (no build/DB), so the local workflow
  // bundle is its home (wire-or-delete, PRD-200 FR-5).
  ["verify:ema-authz-coverage", ["pnpm", ["verify:ema-authz-coverage"]]],
  // PRD-249 — register gate scripts (autorun Phase 4/6 runs full checks with PRD context).
  ["verify:gates-wired", ["pnpm", ["verify:gates-wired"]]],
  ["verify:affected-tests", ["node", ["--check", "scripts/verify-affected-tests.mjs"]]],
  ["verify:review-artifact", ["node", ["--check", "scripts/verify-review-artifact.mjs"]]],
  // PRD-392 FR-3 — feature-flag hygiene reporter, wired here as a weekly warn-mode
  // reporter (it ALWAYS exits 0: no DB / no pg driver / stale flags all → notice +
  // exit 0, KARAR-1), so it cannot redden the chain. Resolves the orphan gate
  // (wire-or-delete, PRD-200 FR-5); the enforce-mode flip stays a separate decision.
  ["verify:flag-hygiene", ["pnpm", ["verify:flag-hygiene"]]],
];

// ── PRD-392 FR-5 — known-red manifest (append-only class; helpers + one read) ──
const KNOWN_RED_PATH = resolve(REPO_ROOT, "scripts/allowlists/known-red-verifies.json");

/** @returns {{policy?: unknown, entries?: unknown}|null} manifest, or null when absent. */
function readKnownRedManifest() {
  if (!existsSync(KNOWN_RED_PATH)) return null; // absent ⇒ status-quo-ante (every red fails)
  return JSON.parse(readFileSync(KNOWN_RED_PATH, "utf8")); // parse error throws → caught by caller
}

/** Validate the manifest shape (inline; no separate .schema.json).
 * @param {unknown} manifest
 * @returns {string[]} schema problems (empty = valid). */
function validateKnownRedManifest(manifest) {
  const problems = [];
  if (typeof manifest !== "object" || manifest === null || Array.isArray(manifest)) {
    return ["known-red manifest must be a JSON object with { policy, entries }"];
  }
  const m = /** @type {{policy?: unknown, entries?: unknown}} */ (manifest);
  if (typeof m.policy !== "string" || m.policy.trim().length === 0) {
    problems.push("known-red manifest: `policy` must be a non-empty string");
  }
  if (!Array.isArray(m.entries)) {
    problems.push("known-red manifest: `entries` must be an array");
    return problems;
  }
  const seen = new Set();
  m.entries.forEach((entry, i) => {
    if (typeof entry !== "object" || entry === null) {
      problems.push(`known-red entry[${i}] must be an object`);
      return;
    }
    for (const field of ["gate", "reason", "owner", "recordedAt", "resolveWhen"]) {
      if (typeof entry[field] !== "string" || entry[field].trim().length === 0) {
        problems.push(`known-red entry[${i}] field \`${field}\` must be a non-empty string`);
      }
    }
    if (typeof entry.gate === "string") {
      if (seen.has(entry.gate)) problems.push(`known-red manifest: duplicate gate ${entry.gate}`);
      seen.add(entry.gate);
    }
    if (typeof entry.recordedAt === "string" && !/^\d{4}-\d{2}-\d{2}$/.test(entry.recordedAt)) {
      problems.push(`known-red entry[${i}] \`recordedAt\` must be YYYY-MM-DD`);
    }
  });
  return problems;
}

/**
 * Partition `failures` in place: splice out gates listed in the known-red
 * manifest (they are reported, not fatal) and push manifest-integrity problems
 * (invalid schema, unknown gate, or a stale entry that ran green) back onto
 * `failures` so the existing fail-block still exits 1. Missing manifest ⇒
 * status-quo-ante (returns []; every red stays fatal).
 * @param {string[]} failures  mutated in place
 * @param {string[]} chainLabels  every gate label declared in `checks`
 * @returns {Array<{gate: string, owner: string, resolveWhen: string}>} downgraded known-reds
 */
function partitionKnownRed(failures, chainLabels) {
  let manifest;
  try {
    manifest = readKnownRedManifest();
  } catch (error) {
    failures.push(`known-red manifest is not valid JSON — ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
  if (manifest === null) return [];
  const schemaProblems = validateKnownRedManifest(manifest);
  if (schemaProblems.length > 0) {
    failures.push(...schemaProblems);
    return []; // fail-closed: an invalid manifest never downgrades a red
  }
  const knownRed = [];
  for (const entry of manifest.entries) {
    if (!chainLabels.includes(entry.gate)) {
      failures.push(`unknown gate in known-red manifest: ${entry.gate} is not a verify:workflow chain gate — remove it`);
      continue;
    }
    const idx = failures.indexOf(entry.gate);
    if (idx === -1) {
      failures.push(`stale known-red entry: ${entry.gate} ran green — remove it from known-red-verifies.json (resolveWhen: ${entry.resolveWhen})`);
      continue;
    }
    failures.splice(idx, 1); // downgrade: no longer a hard failure
    knownRed.push(entry);
  }
  return knownRed;
}

const failures = [];

for (const [label, [command, args]] of checks) {
  try {
    execFileSync(command, args, { cwd: REPO_ROOT, stdio: "inherit" });
  } catch {
    failures.push(label);
  }
}

// PRD-392 FR-5 — exit-code partition (append-only insert; splices `failures` in
// place so the existing fail-block below sees only UNKNOWN reds + manifest
// integrity problems). A manifest-listed gate's red is reported as known-red and
// does NOT fail the chain; a manifest gate that ran green, an unknown gate, or an
// invalid manifest FAILS (anti-rot — PRD-392 DO NOT #7).
const knownRed = partitionKnownRed(
  failures,
  checks.map(([label]) => label),
);
if (knownRed.length > 0) {
  ok(
    `[verify:workflow] known-red: ${knownRed.length} gate(s) — ${knownRed
      .map((entry) => `${entry.gate} (${entry.owner}; ${entry.resolveWhen})`)
      .join(", ")}`,
  );
}

if (failures.length > 0) {
  fail("[verify:workflow] one or more workflow checks failed", failures);
}

ok("[verify:workflow] ok - workflow state, locks, status sync, deferrals, memory drift, doc-bloat, and API-contract guards passed");
