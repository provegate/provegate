#!/usr/bin/env node
// Post-ship archival: wip → completed moves, summary stub, state/wiki sync.
import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { REPO_ROOT, fail, ok, readCurrentState, readText } from "./prd-state-utils.mjs";

const SUMMARY_TEMPLATE = `# Development Summary: {{title}}

> **PRD**: [prd-{{num}}-{{slug}}.md](../../_prds/completed/prd-{{num}}-{{slug}}.md)
> **Tasks**: [tasks-{{num}}-{{slug}}.md](../../_tasks/completed/tasks-{{num}}-{{slug}}.md)
> **Ship Readiness**: Ship Verified (prd:autorun)
> **Completed**: {{date}}
> **Author**: prd:autorun

---

## Overview

Autonomous close via \`pnpm prd:autorun\`. Expand this summary with implementation notes, key files, and test evidence.

---

## Key Features

- (agent: fill from PRD goals)

---

## Technical Implementation

- (agent: fill from diff / tasks Relevant Files)

---

## Testing

- Gate chain: Phase 4–7 + merge smoke recorded in \`_state/prd-metrics.jsonl\`

---

## References

- PRD: \`_prds/completed/prd-{{num}}-{{slug}}.md\`
- Tasks: \`_tasks/completed/tasks-{{num}}-{{slug}}.md\`
`;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function padNum(n) {
  return String(n).padStart(3, "0");
}

function artifactPaths(num, slug) {
  const n = padNum(num);
  const s = slug;
  return {
    prd: { wip: `_prds/wip/prd-${n}-${s}.md`, done: `_prds/completed/prd-${n}-${s}.md` },
    readiness: { wip: `_readiness/wip/readiness-${n}-${s}.md`, done: `_readiness/completed/readiness-${n}-${s}.md` },
    tasks: { wip: `_tasks/wip/tasks-${n}-${s}.md`, done: `_tasks/completed/tasks-${n}-${s}.md` },
    summary: { wip: `_docs/wip/summary-${n}-${s}.md`, done: `_docs/completed/summary-${n}-${s}.md` },
  };
}

function moveIfExists(root, relFrom, relTo) {
  const from = resolve(root, relFrom);
  const to = resolve(root, relTo);
  if (!existsSync(from)) return null;
  mkdirSync(dirname(to), { recursive: true });
  if (existsSync(to)) {
    fail(`[prd:archive] destination exists: ${relTo}`);
  }
  renameSync(from, to);
  return relTo;
}

function setMetaLine(content, key, value) {
  const patterns = [
    [new RegExp(`^(>\\s*\\*\\*${key}\\*\\*\\s*:?\\s*)([^\\n]+)$`, "im"), `$1${value}`],
    [new RegExp(`^(>\\s*\\*\\*${key}:\\*\\*\\s*)([^\\n]+)$`, "im"), `$1${value}`],
    [new RegExp(`^(\\*\\*${key}\\*\\*\\s*:?\\s*)([^\\n]+)$`, "im"), `$1${value}`],
  ];
  for (const [pattern, repl] of patterns) {
    if (pattern.test(content)) return content.replace(pattern, repl);
  }
  return content;
}

function updatePrdMeta(root, relPath, { status, cyclePhase, updated }) {
  const full = resolve(root, relPath);
  if (!existsSync(full)) return;
  let content = readText(full);
  content = setMetaLine(content, "Status", status);
  if (cyclePhase) content = setMetaLine(content, "Cycle Phase", cyclePhase);
  content = setMetaLine(content, "Updated", updated);
  writeFileSync(full, content);
}

function updateTasksMeta(root, relPath, updated) {
  const full = resolve(root, relPath);
  if (!existsSync(full)) return;
  let content = readText(full);
  content = setMetaLine(content, "Status", "Ship Verified");
  content = setMetaLine(content, "Updated", updated);
  content = content.replace(
    /(\[prd-\d{3}-[^\]]+\]\()\.\.\/\.\.\/_prds\/wip\//,
    "$1../../_prds/completed/",
  );
  writeFileSync(full, content);
}

function titleFromPrd(root, prdRel) {
  const full = resolve(root, prdRel);
  if (!existsSync(full)) return "PRD";
  const first = readText(full).split("\n").find((l) => l.startsWith("# "));
  return first ? first.replace(/^#\s+PRD-\d+:\s*/, "").trim() : "PRD";
}

function createSummaryStub(root, paths, num, slug, title) {
  const body = SUMMARY_TEMPLATE.replace(/\{\{title\}\}/g, title)
    .replace(/\{\{num\}\}/g, padNum(num))
    .replace(/\{\{slug\}\}/g, slug)
    .replace(/\{\{date\}\}/g, todayIso());
  const full = resolve(root, paths.summary.done);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, body);
  return paths.summary.done;
}

function appendStatusActivity(root, prdId, slug) {
  const statusPath = resolve(root, "_STATUS.md");
  if (!existsSync(statusPath)) return;
  const line = `- **${todayIso()}** (prd:autorun) ${prdId} **Ship Verified** — archived via autorun; expand \`summary-${padNum(Number.parseInt(prdId.slice(4), 10))}-${slug}.md\`.`;
  let content = readText(statusPath);
  const anchor = "## Son aktiviteler";
  const idx = content.indexOf(anchor);
  if (idx === -1) return;
  const after = content.indexOf("\n", idx) + 1;
  const skip = content.slice(after).search(/\n- \*\*/);
  const insertAt = skip === -1 ? after : after + skip;
  if (content.includes(`${prdId} **Ship Verified** — archived via autorun`)) return;
  content = `${content.slice(0, insertAt)}${line}\n${content.slice(insertAt)}`;
  content = content.replace(
    /> \*\*Son güncelleme:\*\* \d{4}-\d{2}-\d{2}/,
    `> **Son güncelleme:** ${todayIso()}`,
  );
  writeFileSync(statusPath, content);
}

/**
 * Archive PRD artifacts on the given checkout root (typically local development).
 * @returns {{ moved: string[], summary: string }}
 */
export function archivePrdArtifacts({ root, prdId, number, slug, dryRun = false }) {
  const paths = artifactPaths(number, slug);
  const moved = [];
  const date = todayIso();

  if (dryRun) {
    const plan = Object.entries(paths)
      .map(([k, p]) => `${k}: ${existsSync(resolve(root, p.wip)) ? p.wip : "(skip)"} → ${p.done}`)
      .join("\n");
    return { moved: [], summary: plan, dryRun: true };
  }

  for (const [kind, p] of Object.entries(paths)) {
    if (kind === "summary") continue;
    const dest = moveIfExists(root, p.wip, p.done);
    if (dest) moved.push(dest);
  }

  const prdDone = paths.prd.done;
  if (existsSync(resolve(root, prdDone))) {
    updatePrdMeta(root, prdDone, {
      status: "Ship Verified",
      cyclePhase: "Archived",
      updated: date,
    });
  }

  const tasksDone = paths.tasks.done;
  if (existsSync(resolve(root, tasksDone))) {
    updateTasksMeta(root, tasksDone, date);
  }

  let summaryPath = paths.summary.done;
  if (existsSync(resolve(root, paths.summary.wip))) {
    const dest = moveIfExists(root, paths.summary.wip, paths.summary.done);
    if (dest) {
      summaryPath = dest;
      moved.push(dest);
    }
  } else if (!existsSync(resolve(root, summaryPath))) {
    const title = titleFromPrd(root, prdDone);
    summaryPath = createSummaryStub(root, paths, number, slug, title);
    moved.push(summaryPath);
  }

  appendStatusActivity(root, prdId, slug);

  try {
    execSync("pnpm state:sync", { cwd: root, stdio: "pipe" });
  } catch (error) {
    process.stderr.write(`[prd:archive] warn: state:sync failed: ${error.message}\n`);
  }
  try {
    execSync("node scripts/sync-wiki-log.mjs", { cwd: root, stdio: "pipe" });
  } catch {
    /* wiki log is best-effort */
  }

  return { moved, summary: summaryPath };
}

const isCli = process.argv[1]?.endsWith("prd-archive.mjs");
if (isCli) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const prdArg = args.find((a) => /^PRD-\d{3}$/i.test(a));
  if (!prdArg) fail("[prd:archive] usage: pnpm prd:archive PRD-XXX [--dry-run]");
  const prdId = prdArg.toUpperCase();
  const number = Number.parseInt(prdId.slice(4), 10);
  const slugFlag = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
  let slug = slugFlag;
  if (!slug) {
    const state = readCurrentState();
    slug = state?.records?.find((r) => r.number === number)?.slug ?? null;
  }
  if (!slug) fail(`[prd:archive] could not resolve slug for ${prdId} — pass --slug=...`);
  const root = args.find((a) => a.startsWith("--root="))?.slice("--root=".length) ?? REPO_ROOT;
  const result = archivePrdArtifacts({ root, prdId, number, slug, dryRun });
  if (dryRun) {
    ok(`[prd:archive] dry-run ${prdId}:\n${result.summary}`);
  } else {
    ok(`[prd:archive] ${prdId} archived (${result.moved.length} path(s)); summary: ${result.summary}`);
  }
}
