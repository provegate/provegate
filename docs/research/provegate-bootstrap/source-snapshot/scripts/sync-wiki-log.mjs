#!/usr/bin/env node
/**
 * Auto-append shipped PRDs to docs/ai-context/wiki/log.md ("Ship log (auto)"
 * section). Replaces the manual Phase 4 "append to wiki/log.md" ritual, which
 * rotted whenever agents forgot it. Idempotent: a PRD already listed in the
 * auto section is never re-added. Manual long-form entries above the auto
 * section stay untouched (structural wiki operations are still hand-written).
 *
 * Runs inside `pnpm ship:pre` after state:sync; if it appends, commit log.md.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, buildPrdState, ok, readText } from "./prd-state-utils.mjs";

const LOG_PATH = resolve(REPO_ROOT, "docs/ai-context/wiki/log.md");
const SECTION_HEADING = "## Ship log (auto)";
const SECTION_NOTE = "<!-- managed by scripts/sync-wiki-log.mjs — do not edit manually -->";
// Auto-logging covers PRD-184+ (the wip set when this script landed) — ships
// land out of number order, so the cutoff must sit below the oldest open PRD.
// Older ships are documented in summary files and git history.
const START_FROM = 184;

const state = buildPrdState();
const shipped = state.records.filter(
  (record) =>
    record.number >= START_FROM &&
    ["Ship Verified", "Archived"].includes(record.status) &&
    record.artifactStates.summary === "completed",
);

let content = readText(LOG_PATH);
let section = "";
let sectionStart = content.indexOf(SECTION_HEADING);
if (sectionStart === -1) {
  content = `${content.trimEnd()}\n\n${SECTION_HEADING}\n\n${SECTION_NOTE}\n`;
  sectionStart = content.indexOf(SECTION_HEADING);
}
section = content.slice(sectionStart);

const missing = shipped.filter((record) => !section.includes(record.prd));
if (missing.length === 0) {
  ok(`[wiki-log] ok - ship log up to date (${shipped.length} auto entr${shipped.length === 1 ? "y" : "ies"})`);
  process.exit(0);
}

const lines = missing
  .sort((a, b) => a.number - b.number)
  .map(
    (record) =>
      `- ${record.lastUpdated ?? "????-??-??"} — ${record.prd} \`${record.slug}\` — ${record.status} (\`${record.artifacts.summary}\`)`,
  );

writeFileSync(LOG_PATH, `${content.trimEnd()}\n${lines.join("\n")}\n`);
ok(`[wiki-log] appended ${missing.length} entr${missing.length === 1 ? "y" : "ies"} to docs/ai-context/wiki/log.md — commit it`);
