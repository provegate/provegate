#!/usr/bin/env node
/**
 * state:status-panel — regenerate the two machine-derivable "Mevcut durum" panel
 * cells (Implemented PRD, Latest Ship Verified) in _STATUS.md from _state/prds.json
 * (PRD-312 FR-3). Closes the silent-rot hole: verify:status-sync only guards the
 * lock-bound "Aktif Agent'lar" table, never this prose panel.
 *
 * ROOT: _STATUS.md is a TRACKED, branch-specific file (unlike the gitignored
 * locks), so this writes + the gate reads at the LOCAL REPO_ROOT — the worktree
 * owns its own panel update and merges cleanly to development. The lock-bound
 * agent table deliberately uses mainRepoRoot(); do NOT unify the two roots or the
 * worktree split-brain returns (PRD-312 FR-3 / readiness M2).
 *
 * WRITE GRANULARITY: per-row value-cell replacement by label (writeTableValue) —
 * NOT a whole-table re-emit, which would delete the ungated "Latest Code Complete"
 * / "Aktif worktree" rows that share the Metrik|Değer table.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, fail, ok, readCurrentState, statusPanelMetrics, writeTableValue } from "./prd-state-utils.mjs";

const STATUS_PATH = resolve(REPO_ROOT, "_STATUS.md");

/** Pure: rewrite only the generated value cells, leaving every sibling row intact. */
export function regenerate(content, records) {
  let out = content;
  for (const [label, value] of Object.entries(statusPanelMetrics(records))) {
    out = writeTableValue(out, label, value);
  }
  return out;
}

/** Read _STATUS.md, regenerate the panel cells, write if changed. Returns true when
 * the file changed. Reused by state:sync so every machine rebuild re-emits the panel. */
export function syncStatusPanel(records) {
  if (!existsSync(STATUS_PATH)) return false;
  const before = readFileSync(STATUS_PATH, "utf8");
  const after = regenerate(before, records);
  if (after !== before) {
    writeFileSync(STATUS_PATH, after);
    return true;
  }
  return false;
}

function main() {
  if (!existsSync(STATUS_PATH)) fail("[state:status-panel] _STATUS.md not found at REPO_ROOT");
  const state = readCurrentState();
  if (!state) fail("[state:status-panel] missing _state/prds.json", ["Run `pnpm state:sync` first."]);
  const changed = syncStatusPanel(state.records);
  ok(`[state:status-panel] panel cells ${changed ? "synced" : "already in sync"} from _state/prds.json`);
}

if (process.argv[1]?.endsWith("sync-status-panel.mjs")) main();
