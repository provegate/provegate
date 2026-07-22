#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  REPO_ROOT,
  fail,
  getChangedFiles,
  getMetaValue,
  normalizeAutonomousClose,
  normalizeStatus,
  ok,
  readText,
  toRepoPath,
} from "./prd-state-utils.mjs";
import { parseVerificationCommands } from "./prd-command-safety.mjs";

const ESCAPE_WORDS = /\b(TBD|TODO|to be decided|maybe|optional|nice-to-have|\?\?\?)\b/i;

const PRD_CLASSES = new Set(["feature", "test-hardening", "hotfix", "infra"]);

// Match `> **PRD Class**: <value>` in the header metadata block. Extract
// the first whitespace-delimited token after the colon and lowercase
// it. Default to `feature` when absent or malformed. PRD-193 lessons
// learned roll-up promoted this from an ad-hoc convention to a
// first-class field.
function parsePrdClass(content) {
  const match = /^>\s*\*\*PRD Class\*\*\s*:\s*([^\s|`(]+)/im.exec(content);
  if (!match) return "feature";
  const raw = match[1].toLowerCase().trim();
  return PRD_CLASSES.has(raw) ? raw : "feature";
}

function section(content, headingPattern) {
  const match = new RegExp(`^##\\s+${headingPattern}\\s*$`, "im").exec(content);
  if (!match) return "";
  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function collectPrdFiles(args) {
  if (args.includes("--changed")) {
    return getChangedFiles().filter((file) => /^_prds\/(wip|completed)\/prd-\d{3}-.+\.md$/.test(file));
  }
  return args.filter((arg) => arg.endsWith(".md"));
}

function lineAllowsMissingTarget(line) {
  // new/create: file appears during execution; delete/remove/drop: file is
  // gone after execution — both legitimately absent when the lint runs.
  return /\b(new|create|created|migration|generated|delete|deleted|remove|removed|drop|dropped)\b/i.test(line);
}

// Calibration 2026-06-10: inside the PASS band the decimal score has zero
// predictive power; these wiring-level caps are what discriminate. Enforced
// mechanically from PRD-199 (earlier PRDs grandfathered — re-linting archived
// artifacts on wip→completed moves must not retro-fail them).
const HARD_CAP_FROM_PRD = 199;
const TEST_PATH_IN_LINE = /`[^`]*\.(?:spec|test|e2e-spec)\.tsx?`/i;

// PRD-248 Gate Contract checks (Autonomous Close, per-FR verification command,
// Durable Artifacts) are gated from PRD-248 onward — same grandfather pattern as
// HARD_CAP_FROM_PRD so re-linting archived pre-248 PRDs on wip→completed moves
// never retro-fails them.
const ENFORCE_FROM_PRD = 248;
const RUNNABLE_COMMAND_IN_LINE = /`(?:pnpm |node |tsx |vitest |playwright |psql |curl |test |grep )/i;

function parsePrdNumber(filePath) {
  const match = /prd-(\d{3})-/.exec(filePath);
  return match ? Number.parseInt(match[1], 10) : null;
}

function collectTargetPaths(content) {
  const functionalRequirements = section(content, ".*Functional Requirements.*") || content;
  return [...functionalRequirements.matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith("pnpm ") && !value.startsWith("curl "))
    .map((value) => value.split("::")[0].trim())
    .filter((value) => value.includes("/"));
}

function validateHardCaps(content, issues, prdClass, prdNumber) {
  if (prdNumber === null || prdNumber < HARD_CAP_FROM_PRD) return;
  if (prdClass === "test-hardening") return;
  const targets = collectTargetPaths(content);
  const lines = content.split("\n");

  const touchesRoute = targets.some((target) => /^apps\/backend\/.*controller/i.test(target));
  if (touchesRoute) {
    const named = lines.some((line) => /cross-tenant/i.test(line) && TEST_PATH_IN_LINE.test(line));
    if (!named) {
      issues.push(
        'MT&S hard cap: PRD touches a route (controller target) but names no runnable cross-tenant-deny test — add a line like "Cross-tenant test: `apps/backend/src/.../x.e2e-spec.ts` — <test name>" or record a written waiver in the readiness report',
      );
    }
  }

  const touchesPayload = targets.some((target) => /\/dto\/|\.dto\.ts$|\.schema\.ts$|packages\/types\/src\//i.test(target));
  const touchesFrontend = targets.some((target) => /^apps\/(consumer|account|admin|native)\//.test(target));
  if (touchesPayload && touchesFrontend) {
    const named = lines.some((line) => /contract test/i.test(line) && TEST_PATH_IN_LINE.test(line));
    if (!named) {
      issues.push(
        'Contract hard cap: PRD introduces an FE→BE payload (dto/schema + frontend targets) but names no round-trip contract test — add "Contract test: `path/to/x.spec.ts`" or record a written waiver in the readiness report',
      );
    }
  }
}

function validateTargets(content, issues) {
  const functionalRequirements = section(content, ".*Functional Requirements.*");
  const lines = (functionalRequirements || content).split("\n");
  const frLines = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (/\bFR-\d+\b/.test(lines[index])) frLines.push(index);
  }

  if (frLines.length === 0) {
    issues.push("No FR-* functional requirements found");
    return;
  }

  for (let i = 0; i < frLines.length; i += 1) {
    const start = frLines[i];
    const end = frLines[i + 1] ?? lines.length;
    const block = lines.slice(start, end).join("\n");
    const label = lines[start].match(/\bFR-\d+\b/)?.[0] ?? `FR at line ${start + 1}`;
    if (!/\*\*Targets?:\*\*/i.test(block)) {
      issues.push(`${label}: missing Targets block`);
      continue;
    }

    const targetMatches = [...block.matchAll(/`([^`]+)`/g)]
      .map((match) => match[1])
      .filter((value) => !value.startsWith("pnpm ") && !value.startsWith("curl "));
    if (targetMatches.length === 0) {
      issues.push(`${label}: Targets block has no backticked file paths`);
      continue;
    }

    for (const target of targetMatches) {
      const pathOnly = target.split("::")[0].trim();
      if (!pathOnly.includes("/")) continue;
      if (pathOnly.startsWith("/") || pathOnly.startsWith("@")) continue;
      if (pathOnly.includes("*") || pathOnly.includes("\n")) continue;
      const full = resolve(REPO_ROOT, pathOnly);
      const targetLine = block.split("\n").find((line) => line.includes(`\`${target}\``)) ?? "";
      if (!existsSync(full) && !lineAllowsMissingTarget(targetLine)) {
        issues.push(`${label}: target ${pathOnly} does not exist and is not marked new`);
      }
    }
  }
}

function validateOpenQuestions(content, issues) {
  const openQuestions = section(content, ".*Open Questions.*");
  if (!openQuestions) return;
  const unresolved = openQuestions
    .split("\n")
    .filter((line) => /^\s*-\s*\[\s\]/.test(line))
    .filter((line) => !/\b(none|n\/a)\b/i.test(line));
  for (const line of unresolved) {
    issues.push(`Unresolved open question: ${line.trim()}`);
  }
}

function validateVerification(content, issues) {
  const verification = section(content, ".*Verification Commands.*");
  if (!verification.trim()) {
    issues.push("Missing Verification Commands section");
    return;
  }
  if (!/pnpm |curl |node |tsx |vitest |playwright |psql /i.test(verification)) {
    issues.push("Verification Commands section has no runnable command");
  }
}

function validateDoNot(content, issues, prdClass, prdNumber) {
  const doNot = section(content, ".*DO NOT.*");
  if (!doNot.trim()) {
    issues.push("Missing DO NOT / Anti-Patterns section");
    return;
  }
  // `any` is universal — every class forbids unsafe TypeScript.
  // The OrgScopedRepository / "owner" / PERMISSION_MATRIX trio protects
  // production data paths. Only `test-hardening` is exempt (no production
  // code by definition). `hotfix` lost its exemption from PRD-199: a hotfix
  // touches production code by definition, and the Phase 2 weight table
  // already acknowledges hotfixes can be auth-adjacent (MT&S at 10%).
  const required = ["any"];
  const hotfixStrict = prdClass === "hotfix" && prdNumber !== null && prdNumber >= HARD_CAP_FROM_PRD;
  if (prdClass === "feature" || prdClass === "infra" || hotfixStrict) {
    required.push("OrgScopedRepository", "owner", "PERMISSION_MATRIX");
  }
  for (const term of required) {
    if (!doNot.includes(term)) {
      issues.push(`DO NOT section missing project-wide guard: ${term}`);
    }
  }
}

function validateEscapeWords(content, issues) {
  const relevant = `${section(content, ".*Functional Requirements.*")}\n${section(content, ".*Technical.*")}`;
  for (const [index, line] of relevant.split("\n").entries()) {
    if (ESCAPE_WORDS.test(line) && !/\bNon-Goals\b/i.test(line)) {
      issues.push(`Ambiguous wording near technical spec line ${index + 1}: ${line.trim()}`);
    }
  }
}

// PRD-248: every PRD must declare autonomous-close eligibility. The template
// ships a "eligible | operator-gated" placeholder; normalizeAutonomousClose
// returns null for the unfilled placeholder, so it fails until the author picks one.
function validateAutonomousClose(content, issues, prdNumber) {
  if (prdNumber === null || prdNumber < ENFORCE_FROM_PRD) return;
  const raw = getMetaValue(content, "Autonomous Close");
  if (!raw) {
    issues.push("missing `Autonomous Close` header field (eligible | operator-gated)");
    return;
  }
  if (!normalizeAutonomousClose(raw)) {
    issues.push(`Autonomous Close must be 'eligible' or 'operator-gated' (got: ${raw.trim()})`);
  }
}

// PRD-248: Faz 5 (Testing) gate is machine-checkable only if every FR maps to a
// runnable verification command. test-hardening is relaxed (its tasks are the
// test itself, and §11 commands repeat). Collect FR-N from §4 and require each to
// appear in a §11 table row carrying a backticked runnable command.
function validatePerFrVerification(content, issues, prdClass, prdNumber) {
  if (prdNumber === null || prdNumber < ENFORCE_FROM_PRD) return;
  if (prdClass === "test-hardening") return;
  const frSection = section(content, ".*Functional Requirements.*");
  // Only DEFINED FRs (bold `**FR-N**`), not incidental prose cross-references like
  // "supersedes FR-99 of PRD-201" — those would otherwise demand a spurious §11 row.
  const frNumbers = new Set([...frSection.matchAll(/\*\*FR-(\d+)\*\*/g)].map((m) => m[1]));
  if (frNumbers.size === 0) return; // validateTargets already reports the missing FRs

  const verification = section(content, ".*Verification Commands.*");
  const covered = new Set();
  for (const line of verification.split("\n")) {
    const rowMatch = /^\s*\|\s*FR-(\d+)\b/.exec(line);
    if (rowMatch && RUNNABLE_COMMAND_IN_LINE.test(line)) covered.add(rowMatch[1]);
  }
  for (const fr of [...frNumbers].sort((a, b) => Number(a) - Number(b))) {
    if (!covered.has(fr)) {
      issues.push(`FR-${fr}: no Verification Command row in §11 with a runnable backticked command`);
    }
  }
}

// PRD-248: Faz 7 (Learning) gate reads the Durable Artifacts section. Require it
// to exist and carry at least one declaration (a literal `none` is allowed —
// "nothing learned" must be explicit, not absent).
function validateDurableArtifacts(content, issues, prdNumber) {
  if (prdNumber === null || prdNumber < ENFORCE_FROM_PRD) return;
  const durable = section(content, "Durable Artifacts");
  if (!durable.trim()) {
    issues.push("missing `## Durable Artifacts` section (Faz 7 learning gate); write `none` if nothing");
    return;
  }
  const hasDeclaration = durable
    .split("\n")
    .some((line) => /^\s*-\s+\S/.test(line) || /\bnone\b/i.test(line));
  if (!hasDeclaration) {
    issues.push("`## Durable Artifacts` section is empty — list wiki/ADR/pattern paths or write `none`");
  }
}

// PRD-249: dry-run §11 commands through the same safety filter prd:autorun uses.
function validateSection11CommandSafety(content, issues, prdNumber) {
  if (prdNumber === null || prdNumber < ENFORCE_FROM_PRD) return;
  for (const { cmd, safe } of parseVerificationCommands(content)) {
    if (!safe) {
      issues.push(`§11 unsafe command (prd:autorun would STOP): \`${cmd}\``);
    }
  }
}

// Next-wave triage rubric (2026-07-07 review): the V-Skor line must equal the
// weighted sum of its own declared dims. The SSOT analysis shipped 19/55 rows
// where the stated score did not match its dims (all upward — threshold-survival
// bias). Presence-triggered: only PRDs carrying a `**V-Skor:**` line are checked,
// so pre-triage PRDs are never retro-failed. Weights: VA .25 / UE .25 / TK .20 /
// MO .15 / RU .15.
const V_SCORE_WEIGHTS = [0.25, 0.25, 0.2, 0.15, 0.15];
function validateVScore(content, issues) {
  // Tolerant of `— TIER A` between the number and the dims, and of extra text
  // after the dims (e.g. `; 2 tur genişletme: …`): capture the number and the 5
  // dims, don't anchor on the closing paren.
  const match =
    /\*\*V-Skor:\*\*\s*([0-9]+(?:\.[0-9]+)?)[^(]*\(VA\/UE\/TK\/MO\/RU:\s*([0-5])\/([0-5])\/([0-5])\/([0-5])\/([0-5])/i.exec(
      content,
    );
  if (!match) return false;
  const stated = Number(match[1]);
  const dims = match.slice(2, 7).map(Number);
  const computed =
    Math.round(
      dims.reduce((sum, d, i) => sum + d * V_SCORE_WEIGHTS[i], 0) * 100,
    ) / 100;
  if (Math.abs(stated - computed) > 0.005) {
    issues.push(
      `V-Skor arithmetic: stated ${stated.toFixed(2)} != weighted sum ${computed.toFixed(2)} of dims ${dims.join("/")} (fix the V-Skor line)`,
    );
  }
  return true;
}

// Every FR Target path must be covered by the PRD's Conflict Surface — otherwise
// `verify:path-conflicts` (which only compares declared surfaces) is blind to a
// real file-level collision when the batch runs in parallel. The triage found
// ~15 such undeclared conflicts. Only enforced for scored next-wave PRDs
// (hasVScore) so older PRDs are not retro-failed. Conflict Surface entries are
// globs (`dir/**`); a Target is covered if it sits under one glob's prefix.
function collectFrTargetPaths(content) {
  const fr = section(content, ".*Functional Requirements.*");
  const lines = (fr || content).split("\n");
  const paths = [];
  let inTargets = false;
  for (const line of lines) {
    if (/\*\*Targets?:\*\*/i.test(line)) inTargets = true;
    else if (/^\s*-\s*\*\*[A-Za-z]/.test(line) || /^\s*###?\s/.test(line))
      inTargets = false;
    if (!inTargets) continue;
    for (const m of line.matchAll(/`([^`]+)`/g)) {
      const p = m[1].split("::")[0].trim();
      if (!p.includes("/")) continue;
      // Mirror validateTargets' exclusions: absolute/endpoint paths (`/api/...`),
      // scoped packages (`@emofy/...`), globs, and HTTP-verb endpoint notations
      // (`GET /api/x`) are not workspace files and can't sit in a Conflict Surface.
      if (p.startsWith("/") || p.startsWith("@") || p.includes("*")) continue;
      if (p.includes(" ")) continue;
      paths.push(p);
    }
  }
  return [...new Set(paths)];
}

function globPrefix(entry) {
  const star = entry.indexOf("*");
  const base = star === -1 ? entry : entry.slice(0, star);
  return base.replace(/\/+$/, "");
}

// Append-only / shared manifests and docs are never declared in a Conflict
// Surface (the template forbids it — git union-merge resolves them, and docs go
// in Durable Artifacts). Exclude them from the coverage requirement so the check
// only demands declaration of exclusively-owned SOURCE files.
const CONFLICT_SURFACE_EXEMPT =
  /(^docs\/|(^|\/)(package\.json|pnpm-lock\.yaml|turbo\.json|commitlint\.config\.js|tsconfig[^/]*\.json|_STATUS\.md|CLAUDE\.md|AGENTS\.md)$|(^|\/)verify-workflow\.mjs$)/;

// Conflict-Surface-owning convention landed with PRD-312; enforce coverage for
// scored next-wave drafts (hasVScore, local-numbered) and every canonical PRD
// from 313 on. Pre-313 completed PRDs are never retro-failed.
const CONFLICT_SURFACE_FROM_PRD = 313;

function validateConflictSurfaceCoverage(content, issues, hasVScore, prdNumber) {
  const enforced =
    hasVScore ||
    (prdNumber != null && prdNumber >= CONFLICT_SURFACE_FROM_PRD);
  if (!enforced) return;
  const targets = collectFrTargetPaths(content).filter(
    (t) => !CONFLICT_SURFACE_EXEMPT.test(t),
  );
  const cs = section(content, "Conflict Surface");
  if (!cs.trim()) {
    if (targets.length)
      issues.push(
        "missing `## Conflict Surface` section — declare the surface every FR Target touches",
      );
    return;
  }
  const prefixes = [...cs.matchAll(/`([^`]+)`/g)]
    .map((m) => m[1])
    .filter((v) => v.includes("/"))
    .map(globPrefix)
    .filter(Boolean);
  for (const target of targets) {
    const tp = target.replace(/\/+$/, "");
    const covered = prefixes.some(
      (p) => tp === p || tp.startsWith(`${p}/`),
    );
    if (!covered) {
      issues.push(
        `Target not covered by Conflict Surface: ${target} (add it or a covering glob to \`## Conflict Surface\`)`,
      );
    }
  }
}

const files = collectPrdFiles(process.argv.slice(2));
if (files.length === 0) {
  ok("[verify:prd-ready] ok - no PRD files selected");
  process.exit(0);
}

const allIssues = [];
for (const file of files) {
  const full = resolve(REPO_ROOT, file);
  if (!existsSync(full)) {
    allIssues.push(`${file}: file not found`);
    continue;
  }
  const content = readText(full);
  // Superseded PRDs never execute; readiness lint gates execution-readiness,
  // so re-linting a historical record on every touch is pure friction.
  if (normalizeStatus(getMetaValue(content, "Status")) === "Superseded") {
    ok(`[verify:prd-ready] skip - ${toRepoPath(full)} is Superseded`);
    continue;
  }
  const prdClass = parsePrdClass(content);
  const prdNumber = parsePrdNumber(file);
  const issues = [];
  validateTargets(content, issues);
  validateOpenQuestions(content, issues);
  validateVerification(content, issues);
  validateDoNot(content, issues, prdClass, prdNumber);
  validateEscapeWords(content, issues);
  validateHardCaps(content, issues, prdClass, prdNumber);
  validateAutonomousClose(content, issues, prdNumber);
  validatePerFrVerification(content, issues, prdClass, prdNumber);
  validateDurableArtifacts(content, issues, prdNumber);
  validateSection11CommandSafety(content, issues, prdNumber);
  const hasVScore = validateVScore(content, issues);
  validateConflictSurfaceCoverage(content, issues, hasVScore, prdNumber);
  for (const issue of issues) allIssues.push(`${toRepoPath(full)}: ${issue}`);
}

if (allIssues.length > 0) {
  fail("[verify:prd-ready] PRD readiness lint failed", allIssues);
}

ok(`[verify:prd-ready] ok - ${files.length} PRD file(s) passed`);
