#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, fail, ok, readCurrentState, readText } from "./prd-state-utils.mjs";

const TARGETS = [
  "_STATUS.md",
  "docs/ai-context/MEMORY.md",
  "docs/ai-context/wiki/current-state.md",
  ".serena/memories/project/current-state.md",
];

function implementedRecords(state) {
  return state.records.filter((record) => {
    if (["Code Complete", "Operator Verification", "Ship Verified", "Archived"].includes(record.status)) return true;
    if (record.artifactStates.prd === "completed") return true;
    if (record.artifactStates.summary !== "missing") return true;
    return false;
  });
}

function extractCounts(content) {
  const counts = [];
  const patterns = [
    /Toplam PRD[^0-9]{0,40}(\d+)/gi,
    /(?:Toplam PRD|Completed Work|Completed|completed|tamamlandı)[^0-9]{0,40}(\d+)\s+PRD/gi,
    /(\d+)\s+PRDs?\s+(?:completed|tamamlandı)/gi,
  ];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      counts.push(Number.parseInt(match[1], 10));
    }
  }
  return [...new Set(counts)].filter((count) => Number.isFinite(count));
}

function extractThroughPrd(content) {
  const matches = [...content.matchAll(/through PRD-(\d{3})|PRD-(\d{3})[^.\n]{0,80}(?:code-complete|completed|archived|tamamlandı)/gi)]
    .map((match) => Number.parseInt(match[1] ?? match[2], 10))
    .filter((value) => Number.isFinite(value));
  return matches.length > 0 ? Math.max(...matches) : null;
}

const state = readCurrentState();
if (!state) {
  fail("[verify:memory-drift] missing _state/prds.json", ["Run `pnpm state:sync` first."]);
}

const implemented = implementedRecords(state);
const expectedCount = implemented.length;
const expectedLatest = implemented.length > 0 ? Math.max(...implemented.map((record) => record.number)) : null;
const issues = [];

for (const target of TARGETS) {
  const path = resolve(REPO_ROOT, target);
  if (!existsSync(path)) {
    issues.push(`${target}: file missing`);
    continue;
  }
  const content = readText(path);
  const counts = extractCounts(content);
  if (counts.length > 0 && !counts.includes(expectedCount)) {
    issues.push(`${target}: PRD count ${counts.join(", ")} does not include state count ${expectedCount}`);
  }
  const through = extractThroughPrd(content);
  if (through !== null && expectedLatest !== null && through !== expectedLatest) {
    issues.push(`${target}: latest implemented PRD ${through} does not match state latest ${expectedLatest}`);
  }
  // No marker at all means a rewording silently disabled the guard for this
  // file — fail loudly instead of passing blind.
  if (counts.length === 0 && through === null) {
    issues.push(
      `${target}: no recognizable PRD-count or "through PRD-NNN" marker — drift guard cannot see this file; restore a parseable marker (e.g. "synced through PRD-${String(expectedLatest ?? 0).padStart(3, "0")}")`,
    );
  }
}

if (issues.length > 0) {
  fail("[verify:memory-drift] memory drift detected", issues);
}

ok(`[verify:memory-drift] ok - count ${expectedCount}, latest PRD-${String(expectedLatest ?? 0).padStart(3, "0")}`);
