#!/usr/bin/env node
import { STATE_PATH, buildPrdState, ok, writePrdState } from "./prd-state-utils.mjs";
import { syncStatusPanel } from "./sync-status-panel.mjs";

const state = buildPrdState();
writePrdState(state);

// PRD-312 FR-3 — re-emit the machine-derivable "Mevcut durum" panel cells from the
// rebuilt state, so the human panel can never silently rot again.
syncStatusPanel(state.records);

ok(`[state:sync] wrote ${STATE_PATH} with ${state.records.length} PRD record(s)`);
