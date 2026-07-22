#!/usr/bin/env node
// Defer a parked PRD: wip → deferred moves + Status: Deferred + state sync.
// Mirror of prd-archive, but for work that is shelved (not shipped): no summary
// stub, no Ship Verified. The PRD/tasks keep their re-open context; moving them
// out of wip/ keeps the active queue honest. Re-open = move back to wip/ + reset
// status, then `pnpm prd:start`.
//
//   pnpm prd:defer PRD-XXX [--slug=<slug>] [--reason "<why>"] [--dry-run]
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { REPO_ROOT, fail, ok, readCurrentState, readText } from "./prd-state-utils.mjs";

const padNum = (n) => String(n).padStart(3, "0");

// Defer moves the three authored artifacts; summaries are a post-ship concept.
const ARTIFACTS = [
  { dir: "_prds", prefix: "prd" },
  { dir: "_readiness", prefix: "readiness" },
  { dir: "_tasks", prefix: "tasks" },
];

function artifactPaths(number, slug) {
  const n = padNum(number);
  const paths = {};
  for (const a of ARTIFACTS) {
    paths[a.prefix] = {
      wip: `${a.dir}/wip/${a.prefix}-${n}-${slug}.md`,
      deferred: `${a.dir}/deferred/${a.prefix}-${n}-${slug}.md`,
    };
  }
  return paths;
}

function moveIfExists(root, relFrom, relTo) {
  const from = resolve(root, relFrom);
  if (!existsSync(from)) return null;
  const to = resolve(root, relTo);
  mkdirSync(dirname(to), { recursive: true });
  renameSync(from, to);
  return relTo;
}

// Set `> **Status**: Deferred` (PRD blockquote meta) or `status: Deferred`
// (task/readiness frontmatter), whichever the file uses.
function setStatusDeferred(root, relPath) {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) return;
  let content = readFileSync(abs, "utf8");
  if (/^>\s*\*\*Status\*\*:/m.test(content)) {
    content = content.replace(/^(>\s*\*\*Status\*\*:).*$/m, "$1 Deferred");
  }
  content = content.replace(/^(status:).*$/m, "$1 Deferred");
  writeFileSync(abs, content);
}

const args = process.argv.slice(2);
const prdArg = args.find((a) => /^PRD-\d{3}$/i.test(a));
if (!prdArg) fail("[prd:defer] usage: pnpm prd:defer PRD-XXX [--slug=<slug>] [--reason \"<why>\"] [--dry-run]");
const prdId = prdArg.toUpperCase();
const number = Number.parseInt(prdId.slice(4), 10);
const dryRun = args.includes("--dry-run");
const reason = args.find((a) => a.startsWith("--reason="))?.slice("--reason=".length)
  ?? (args.includes("--reason") ? args[args.indexOf("--reason") + 1] : null);

let slug = args.find((a) => a.startsWith("--slug="))?.slice("--slug=".length);
if (!slug) {
  const state = readCurrentState();
  slug = state?.records?.find((r) => r.number === number)?.slug ?? null;
}
if (!slug) fail(`[prd:defer] could not resolve slug for ${prdId} — pass --slug=<slug>`);

const paths = artifactPaths(number, slug);
const moved = [];
for (const a of ARTIFACTS) {
  const p = paths[a.prefix];
  if (dryRun) {
    if (existsSync(resolve(REPO_ROOT, p.wip))) moved.push(`${p.wip} → ${p.deferred}`);
    continue;
  }
  const dest = moveIfExists(REPO_ROOT, p.wip, p.deferred);
  if (dest) {
    setStatusDeferred(REPO_ROOT, dest);
    moved.push(dest);
  }
}

if (dryRun) {
  ok(`[prd:defer] (dry-run) ${prdId} would move ${moved.length} artifact(s):\n  ${moved.join("\n  ")}`);
  process.exit(0);
}
if (moved.length === 0) fail(`[prd:defer] no wip artifacts found for ${prdId} (slug=${slug})`);

// Best-effort state resync so prds.json reflects the Deferred record.
try {
  execSync("pnpm state:sync", { cwd: REPO_ROOT, stdio: "pipe" });
} catch (error) {
  process.stderr.write(`[prd:defer] warn: state:sync failed: ${error.message}\n`);
}

ok(
  `[prd:defer] ${prdId} deferred (${moved.length} artifact(s) → deferred/, Status: Deferred)` +
    (reason ? `\n  reason: ${reason}` : "") +
    `\n  re-open: move back to wip/ + reset Status, then \`pnpm prd:start ${prdId}\``,
);
