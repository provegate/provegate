#!/usr/bin/env node
// PRD-248/249 deterministic orchestration runner (Phase 4-7 + local merge + cleanup).
//
// SUBSTRATE SPLIT: gate + merge half — pure Node, deterministic. Agent phases
// (code, tests, reviewer panel) run per orchestration-runner.md; this runner
// verifies machine-checkable artifacts. NEVER pushes.
import { execFileSync, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { relative, resolve } from "node:path";
import {
  collectDiffFiles,
  getClassDefaultGates,
  mergeGateCommands,
  parsePrdClass,
} from "./prd-class-gates.mjs";
import { isSafeCommand, parseVerificationCommands } from "./prd-command-safety.mjs";
import { archivePrdArtifacts } from "./prd-archive.mjs";
import { recordPrdMetric } from "./prd-metrics.mjs";
import { REPO_ROOT, fail, ok, readCurrentState, readText } from "./prd-state-utils.mjs";
import { validateTasksReviewRow } from "./review-artifact-utils.mjs";

const ACCEPT_PATH = resolve(REPO_ROOT, "_state/acceptances.json");
const ACCEPTANCE_OWNERS = new Set(["owner", "rayvaz", "operator"]);

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fromPhaseRaw = args.find((a) => a.startsWith("--from-phase="))?.slice("--from-phase=".length) ?? null;
const prdArg = args.find((a) => /^PRD-\d{3}$/i.test(a));
if (!prdArg) {
  fail(
    "[prd:autorun] usage: pnpm prd:autorun -- [--dry-run] [--from-phase=4|5|6|7|merge] PRD-XXX",
  );
}
const prdNumber = Number.parseInt(prdArg.slice(4), 10);

try {
  execSync("pnpm state:sync", { cwd: REPO_ROOT, stdio: "ignore" });
} catch {
  /* fall back to on-disk state */
}

const state = readCurrentState();
const record = state?.records?.find((r) => r.number === prdNumber);
if (!record) fail(`[prd:autorun] no state record for ${prdArg} — run \`pnpm state:sync\` first`);

const prdPath = record.artifacts.prd;
const tasksPath = record.artifacts.tasks;
if (!prdPath) fail(`[prd:autorun] ${prdArg} has no PRD artifact in state`);
const prdContent = readText(resolve(REPO_ROOT, prdPath));
const tasksContent = tasksPath ? readText(resolve(REPO_ROOT, tasksPath)) : "";
const prdClass = parsePrdClass(prdContent);
const changedFiles = collectDiffFiles("development");

function loadAcceptance(prd) {
  if (!existsSync(ACCEPT_PATH)) return null;
  try {
    const data = JSON.parse(readText(ACCEPT_PATH));
    return (data.acceptances ?? []).find((a) => a.prd === prd) ?? null;
  } catch {
    return null;
  }
}

function validAcceptance(entry) {
  return Boolean(
    entry &&
      typeof entry.owner === "string" &&
      ACCEPTANCE_OWNERS.has(entry.owner.toLowerCase()) &&
      Array.isArray(entry.items) &&
      entry.items.length > 0 &&
      typeof entry.reason === "string" &&
      entry.reason.trim().length >= 5,
  );
}

function reviewLedgerOk() {
  if (!tasksContent) {
    return { ok: false, why: "no tasks file — independent-review ledger missing" };
  }
  const check = validateTasksReviewRow(tasksContent, prdNumber);
  if (!check.ok) return { ok: false, why: check.issues.join("; ") };
  return { ok: true, artifact: check.artifact };
}

function operatorGateOk() {
  const operatorRows = record.task?.operatorHandoffCount ?? 0;
  if (operatorRows === 0) return { ok: true };

  const acceptance = loadAcceptance(prdArg);
  if (validAcceptance(acceptance)) {
    return {
      ok: true,
      waived: true,
      why: `${operatorRows} operator row(s) waived via _state/acceptances.json (${acceptance.owner})`,
    };
  }

  return {
    ok: false,
    why: `${operatorRows} operator-owned row(s) (Autonomous Close: ${record.autonomousClose}) — record \`pnpm prd:accept ${prdArg}\` or clear rows before autonomous merge`,
  };
}

const trusted = (cmd) => ({ cmd, safe: true });
const phase5 = parseVerificationCommands(prdContent);
const classGates = getClassDefaultGates(prdClass, changedFiles);
const phase4Base = [
  "pnpm check-types",
  "pnpm lint",
  "pnpm build",
  `pnpm verify:affected-tests -- --retry=2 --class=${prdClass}`,
  ...classGates,
];

const gateChain = [
  { phase: "4 Implementation", cmds: mergeGateCommands(phase4Base, []).map(trusted) },
  { phase: "5 Testing", cmds: phase5 },
  { phase: "6 Final Auditing", fn: reviewLedgerOk, label: "independent-review ledger + schema" },
  { phase: "6 Final Auditing", cmds: ["pnpm verify:workflow"].map(trusted) },
  {
    phase: "7 Learning",
    cmds: [`pnpm verify:durable-artifacts -- ${prdPath}`].map(trusted),
  },
  { phase: "merge gate", fn: operatorGateOk, label: "operator-gated guard + acceptances.json" },
];

const results = [];

function parseFromPhase(raw) {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered === "merge") return "merge";
  const n = Number.parseInt(lowered, 10);
  if (Number.isFinite(n) && n >= 4 && n <= 7) return n;
  fail(`[prd:autorun] invalid --from-phase=${raw} (use 4, 5, 6, 7, or merge)`);
}

const fromPhase = parseFromPhase(fromPhaseRaw);

function gatePhaseNumber(gate) {
  if (gate.phase === "merge gate") return 8;
  const n = Number.parseInt(gate.phase, 10);
  return Number.isFinite(n) ? n : 0;
}

function shouldSkipGate(gate) {
  if (!fromPhase) return false;
  if (fromPhase === "merge") return true;
  return gatePhaseNumber(gate) < fromPhase;
}

function printPlan() {
  ok(`[prd:autorun] ${dryRun ? "DRY-RUN " : ""}plan for ${prdArg} (${record.slug}) class=${prdClass}`);
  if (fromPhase) ok(`  Resume from: phase ${fromPhase}`);
  ok(`  Autonomous Close: ${record.autonomousClose ?? "(unset)"} | operator rows: ${record.task?.operatorHandoffCount ?? 0}`);
  for (const gate of gateChain) {
    if (shouldSkipGate(gate)) continue;
    process.stdout.write(`  ── Phase ${gate.phase}\n`);
    if (gate.fn) process.stdout.write(`       • gate: ${gate.label}\n`);
    for (const { cmd, safe } of gate.cmds ?? []) process.stdout.write(`       • ${cmd}${safe ? "" : "  ⚠ UNSAFE — would STOP"}\n`);
  }
  process.stdout.write("  ── Archive wip→completed + summary stub (pre-merge)\n");
  process.stdout.write("  ── Merge feat → LOCAL development (no-ff), post-merge check-types+build, then prd:stop\n");
  process.stdout.write("  ── Handoff card → HUMAN runs `git push` (runner never pushes)\n");
}

function runGateCommand(phase, cmd, safe) {
  if (!safe) handoffAndExit(phase, `unsafe §11 command refused (shell metachar or non-allowlisted segment): ${cmd}`);
  const started = Date.now();
  try {
    execSync(cmd, { cwd: REPO_ROOT, stdio: "inherit" });
    const durationMs = Date.now() - started;
    results.push([`${phase}: ${cmd}`, "passed"]);
    recordPrdMetric({ prd: prdArg, phase, gate: cmd, result: "passed", durationMs });
  } catch {
    const durationMs = Date.now() - started;
    results.push([`${phase}: ${cmd}`, "FAILED"]);
    recordPrdMetric({ prd: prdArg, phase, gate: cmd, result: "failed", durationMs });
    handoffAndExit(phase, `command failed: ${cmd}`);
  }
}

if (dryRun) {
  printPlan();
  ok("[prd:autorun] dry-run complete — nothing executed, nothing merged, nothing pushed");
  process.exit(0);
}

printPlan();
for (const gate of gateChain) {
  if (shouldSkipGate(gate)) continue;
  if (gate.fn) {
    const started = Date.now();
    const r = gate.fn();
    const durationMs = Date.now() - started;
    results.push([`${gate.phase}: ${gate.label}`, r.ok ? "passed" : "FAILED"]);
    recordPrdMetric({
      prd: prdArg,
      phase: gate.phase,
      gate: gate.label,
      result: r.ok ? "passed" : "failed",
      durationMs,
      why: r.why ?? null,
    });
    if (!r.ok) handoffAndExit(gate.phase, r.why);
    continue;
  }
  if (!gate.cmds || gate.cmds.length === 0) {
    handoffAndExit(gate.phase, "no runnable §11 FR-row commands parsed — PRD gap");
  }
  for (const { cmd, safe } of gate.cmds) {
    runGateCommand(gate.phase, cmd, safe);
  }
}

maybeArchiveBeforeMerge();
mergeToLocalDevelopment();

function maybeArchiveBeforeMerge() {
  const n = String(prdNumber).padStart(3, "0");
  const wipPrd = resolve(REPO_ROOT, `_prds/wip/prd-${n}-${record.slug}.md`);
  if (!existsSync(wipPrd)) {
    ok(`[prd:autorun] archive skipped — no wip PRD at ${relative(REPO_ROOT, wipPrd)}`);
    return;
  }
  const started = Date.now();
  try {
    const result = archivePrdArtifacts({
      root: REPO_ROOT,
      prdId: prdArg,
      number: prdNumber,
      slug: record.slug,
    });
    const dirty = execSync("git status --porcelain", { cwd: REPO_ROOT, encoding: "utf8" }).trim();
    if (dirty) {
      execFileSync(
        "git",
        ["add", "_prds", "_tasks", "_readiness", "_docs", "_STATUS.md", "_state/prds.json", "docs/ai-context/wiki/log.md"],
        { cwd: REPO_ROOT, stdio: "ignore" },
      );
      const archiveMsg = `chore(workflow): archive ${prdArg} artifacts`;
      execSync(`git commit -m "${archiveMsg}"`, { cwd: REPO_ROOT, stdio: "inherit" });
    }
    results.push(["archive: wip→completed", "passed"]);
    recordPrdMetric({
      prd: prdArg,
      phase: "7",
      gate: "archive",
      result: "passed",
      durationMs: Date.now() - started,
      why: result.summary,
    });
    ok(`[prd:autorun] archived ${result.moved.length} path(s); summary: ${result.summary}`);
  } catch (error) {
    recordPrdMetric({
      prd: prdArg,
      phase: "7",
      gate: "archive",
      result: "failed",
      durationMs: Date.now() - started,
      why: error.message,
    });
    handoffAndExit("7 Learning", `archive failed: ${error.message}`);
  }
}

function gitOut(cmd) {
  return execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
}

function mergeToLocalDevelopment() {
  const base = "development";
  const branch = gitOut("git rev-parse --abbrev-ref HEAD");
  if (branch === base) {
    handoffAndExit("merge", `current branch is '${base}' — run prd:autorun from the feat worktree, not the base checkout`);
  }
  const worktrees = gitOut("git worktree list --porcelain");
  const blocks = worktrees.split("\n\n");
  let baseDir = null;
  for (const block of blocks) {
    const dir = block.match(/^worktree (.+)$/m)?.[1];
    const br = block.match(/^branch refs\/heads\/(.+)$/m)?.[1];
    if (br === base && dir) baseDir = dir;
  }
  if (!baseDir) handoffAndExit("merge", `no checkout has '${base}' checked out — merge it manually`);
  ensureBaseCheckoutClean(baseDir);

  try {
    execSync("git fetch --quiet", { cwd: baseDir });
  } catch {
    /* offline ok */
  }
  const mergeMsg = `chore(workflow): land ${prdArg} via prd-autorun`;
  execSync(`git merge --no-ff ${branch} -m "${mergeMsg}"`, {
    cwd: baseDir,
    stdio: "inherit",
  });

  const postMergeGates = ["pnpm check-types", "pnpm build"];
  for (const cmd of postMergeGates) {
    try {
      execSync(cmd, { cwd: baseDir, stdio: "inherit" });
      results.push([`post-merge: ${cmd}`, "passed"]);
      recordPrdMetric({ prd: prdArg, phase: "merge", gate: cmd, result: "passed" });
    } catch {
      execSync("git reset --hard HEAD~1", { cwd: baseDir, stdio: "inherit" });
      recordPrdMetric({ prd: prdArg, phase: "merge", gate: cmd, result: "failed" });
      handoffAndExit("merge", `post-merge ${cmd} failed — merge reverted; worktree intact`);
    }
  }

  execSync(`pnpm prd:stop ${prdArg} --force`, { cwd: REPO_ROOT, stdio: "inherit" });
  handoffCard(baseDir, base, branch);
}

/** Reset coordination-only dirt on base checkout so merge can proceed. */
function ensureBaseCheckoutClean(baseDir) {
  const dirty = execSync("git status --porcelain", { cwd: baseDir, encoding: "utf8" }).trim();
  if (!dirty) return;
  const paths = dirty
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const rest = line.replace(/^(?:[ MADRCU?!]{1,2})\s+/, "");
      return rest.split(" -> ")[0].trim();
    });
  const coordinationOnly = (p) =>
    p === "_STATUS.md" || p.startsWith("_state/") || p.startsWith("_plans/") || p.startsWith("_docs/wip/");
  if (!paths.every(coordinationOnly)) {
    handoffAndExit("merge", `'${baseDir}' checkout is dirty (non-coordination files) — commit or stash before merge`);
  }
  for (const p of paths) {
    execFileSync("git", ["checkout", "HEAD", "--", p], { cwd: baseDir, stdio: "ignore" });
  }
}

function aheadBehind(baseDir, base) {
  try {
    const out = gitOutIn(baseDir, `git rev-list --left-right --count origin/${base}...${base}`);
    const [behind, ahead] = out.split(/\s+/);
    return `local ${base} is ${ahead} ahead / ${behind} behind origin/${base}`;
  } catch {
    return `drift vs origin/${base} unknown (offline or no remote)`;
  }
}

function gitOutIn(dir, cmd) {
  return execSync(cmd, { cwd: dir, encoding: "utf8" }).trim();
}

function handoffCard(baseDir, base, branch) {
  const diffstat = gitOutIn(baseDir, `git diff --shortstat ${base}~1 ${base}`);
  process.stdout.write("\n┌─ HANDOFF CARD ─────────────────────────────────────────\n");
  process.stdout.write(`│ ${prdArg} (${record.slug})\n`);
  process.stdout.write(`│ merged: ${branch} → LOCAL ${base} (no-ff)\n`);
  process.stdout.write(`│ diff:   ${diffstat}\n`);
  process.stdout.write(`│ ${aheadBehind(baseDir, base)}\n`);
  process.stdout.write("│ gates:\n");
  for (const [label, res] of results) process.stdout.write(`│   ${res === "passed" ? "✓" : "✗"} ${label}\n`);
  process.stdout.write(`│ operator rows: ${record.task?.operatorHandoffCount ?? 0} | Autonomous Close: ${record.autonomousClose}\n`);
  process.stdout.write("│ metrics: main checkout _state/prd-metrics.jsonl (pnpm prd:metrics tail)\n");
  process.stdout.write("│ archive: wip→completed on feat branch (expand summary stub if needed)\n");
  process.stdout.write("│ → READY TO PUSH — run `git push` yourself (runner never pushes)\n");
  process.stdout.write("└────────────────────────────────────────────────────────\n");
  ok(`[prd:autorun] ${prdArg} merged to local ${base}; push is yours`);
}

function handoffAndExit(phase, why) {
  process.stderr.write(`\n┌─ STOPPED at Phase ${phase} ─────────────────────────────\n`);
  process.stderr.write(`│ ${prdArg}: ${why}\n`);
  for (const [label, res] of results) process.stderr.write(`│   ${res === "passed" ? "✓" : "✗"} ${label}\n`);
  process.stderr.write("│ worktree left intact — fix and re-run with --from-phase=N, or hand back to human\n");
  process.stderr.write("│ metrics: main checkout _state/prd-metrics.jsonl (pnpm prd:metrics tail)\n");
  process.stderr.write("└────────────────────────────────────────────────────────\n");
  recordPrdMetric({ prd: prdArg, phase, gate: "handoff", result: "stopped", why });
  process.exit(1);
}
