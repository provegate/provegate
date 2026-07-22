#!/usr/bin/env node
/**
 * verify:status-panel — the committed "Mevcut durum" panel cells must match
 * machine truth (PRD-312 FR-3). Recomputes the two generated cells from
 * _state/prds.json (the SAME statusPanelMetrics the generator uses, so they cannot
 * disagree) and asserts exact equality. No lock dependency → deterministic in CI.
 * Reads _STATUS.md at the local REPO_ROOT, matching the generator's write-root.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, fail, getTableValue, ok, readCurrentState, statusPanelMetrics } from "./prd-state-utils.mjs";

const STATUS_PATH = resolve(REPO_ROOT, "_STATUS.md");

function main() {
  if (!existsSync(STATUS_PATH)) fail("[verify:status-panel] _STATUS.md not found at REPO_ROOT");
  const state = readCurrentState();
  if (!state) fail("[verify:status-panel] missing _state/prds.json", ["Run `pnpm state:sync` first."]);
  const content = readFileSync(STATUS_PATH, "utf8");
  const metrics = statusPanelMetrics(state.records);
  const issues = [];
  for (const [label, expected] of Object.entries(metrics)) {
    const actual = getTableValue(content, label);
    if (actual === null) continue; // label row absent → nothing to guard
    if (actual !== expected) issues.push(`${label}: committed "${actual}" != machine "${expected}"`);
  }
  if (issues.length > 0) {
    fail("[verify:status-panel] Mevcut durum panel out of sync", [
      ...issues,
      "Fix: pnpm state:sync && pnpm state:status-panel (then commit _STATUS.md)",
    ]);
  }
  ok("[verify:status-panel] ok - panel cells match machine truth");
}

if (process.argv[1]?.endsWith("verify-status-panel.mjs")) main();
