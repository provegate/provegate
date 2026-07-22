#!/usr/bin/env node
// Wave-plan pairwise validator (PRD-312 tooling companion).
//
// Reads the fenced ```json wave block from a plan doc, re-derives the live
// overlap graph via query-prd-state.mjs, and fails if any same-wave pair
// (different lanes) shares a conflict surface. Serial entries inside one lane
// are exempt — serialization is how those conflicts are resolved.
//
// PRD-392 FR-3: registered as the root script `verify:wave-plan`, an on-demand
// prd:queue tooling companion that is intentionally chain-less (NOT in
// verify:workflow / CI); a justified verify:gates-wired exception documents the
// wire-or-delete decision. A 6-month non-use → delete decision is separate (PRD §9).
//
// Usage: node scripts/verify-wave-plan.mjs [_plans/prd-wave-plan-YYYY-MM-DD.md]
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const REPO_ROOT = resolve(new URL(".", import.meta.url).pathname, "..");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(
    [
      "verify:wave-plan — validate a wave plan against the live overlap graph.",
      "",
      "Usage:",
      "  pnpm verify:wave-plan [_plans/prd-wave-plan-YYYY-MM-DD.md]",
      "",
      "On-demand prd:queue tooling; NOT part of the verify:workflow chain (PRD-392 FR-3).",
      "Fails (exit 1) when a same-wave cross-lane pair shares a conflict surface,",
      "a before-constraint is violated, or a READY PRD is unplanned.",
    ].join("\n"),
  );
  process.exit(0);
}

const planPath = resolve(REPO_ROOT, process.argv[2] ?? "_plans/prd-wave-plan-2026-07-16.md");

const planText = readFileSync(planPath, "utf8");
const jsonMatch = planText.match(/```json\n([\s\S]*?)```/);
if (!jsonMatch) {
  console.error(`[verify-wave-plan] no \`\`\`json wave block in ${planPath}`);
  process.exit(1);
}
const plan = JSON.parse(jsonMatch[1]);

const queueRaw = execFileSync("node", ["scripts/query-prd-state.mjs", "queue", "--json"], {
  cwd: REPO_ROOT,
  encoding: "utf8",
});
const queue = JSON.parse(queueRaw.slice(queueRaw.indexOf("{")));
const overlapKey = (a, b) => [a, b].sort().join("|");
const overlaps = new Map(queue.readyOverlaps.map((w) => [overlapKey(w.a, w.b), w.shared]));

const errors = [];
const waveOf = new Map();

for (const wave of plan.waves) {
  const flat = wave.lanes.flat();
  for (const prd of flat) {
    if (waveOf.has(prd)) errors.push(`${prd} appears in ${waveOf.get(prd)} and ${wave.id}`);
    waveOf.set(prd, wave.id);
  }
  // cross-lane pairs must be conflict-free; same-lane (serial) pairs are exempt
  for (let i = 0; i < wave.lanes.length; i++) {
    for (let j = i + 1; j < wave.lanes.length; j++) {
      for (const a of wave.lanes[i]) {
        for (const b of wave.lanes[j]) {
          const shared = overlaps.get(overlapKey(a, b));
          if (shared) errors.push(`${wave.id}: ${a} ∥ ${b} conflict → ${shared.join(", ")}`);
        }
      }
    }
  }
}

const waveIndex = new Map(plan.waves.map((w, i) => [w.id, i]));
const inFlight = new Set(queue.inFlight.map((r) => r.prd));
const readySet = new Set(queue.ready.map((r) => r.prd));
for (const [before, after] of plan.before ?? []) {
  if (inFlight.has(before)) continue; // in-flight counts as wave 0
  if (!readySet.has(before) && !waveOf.has(before)) continue; // landed → satisfied
  const wb = waveOf.get(before);
  const wa = waveOf.get(after);
  if (!wb || !wa) {
    errors.push(`before-constraint ${before}→${after}: not in any wave (landed PRD'yi listeden düş)`);
    continue;
  }
  if (waveIndex.get(wb) >= waveIndex.get(wa)) {
    errors.push(`before-constraint violated: ${before} (${wb}) must land before ${after} (${wa})`);
  }
}

const planned = new Set(waveOf.keys());
const ready = queue.ready.map((r) => r.prd);
const missing = ready.filter((p) => !planned.has(p));
const stale = [...planned].filter((p) => !ready.includes(p));
if (missing.length) errors.push(`READY but unplanned: ${missing.join(", ")}`);
if (stale.length) console.warn(`[verify-wave-plan] planned but not READY (landed/in-flight/blocked?): ${stale.join(", ")}`);

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`[verify-wave-plan] OK — ${plan.waves.length} waves, ${planned.size} PRDs, 0 same-wave conflicts, before-constraints hold`);
