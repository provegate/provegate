import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
export const REPO_ROOT = resolve(dirname(__filename), "..");
export const STATE_PATH = resolve(REPO_ROOT, "_state/prds.json");

/** Main checkout root — stable when invoked from a linked git worktree. */
export function mainRepoRoot() {
  try {
    const commonDir = execFileSync("git", ["rev-parse", "--git-common-dir"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    if (commonDir && commonDir !== ".git") {
      return dirname(resolve(REPO_ROOT, commonDir));
    }
  } catch {
    // fall through
  }
  return REPO_ROOT;
}

const ARTIFACTS = [
  { key: "prd", dir: "_prds", prefix: "prd" },
  { key: "readiness", dir: "_readiness", prefix: "readiness" },
  { key: "tasks", dir: "_tasks", prefix: "tasks" },
  { key: "summary", dir: "_docs", prefix: "summary" },
];

const STATUS_VALUES = new Map([
  ["draft", "Draft"],
  ["proposed", "Draft"],
  ["in review", "In Review"],
  ["approved", "Approved"],
  ["in progress", "In Progress"],
  ["code complete", "Code Complete"],
  ["operator verification", "Operator Verification"],
  ["ship verified", "Ship Verified"],
  ["superseded", "Superseded"],
  ["archived", "Archived"],
  ["blocked", "Blocked"],
  ["deferred", "Deferred"],
  ["complete", "Ship Verified"],
  ["completed", "Ship Verified"],
  ["done", "Ship Verified"],
  ["not started", "Not Started"],
]);

export function toRepoPath(pathname) {
  return relative(REPO_ROOT, pathname).split(sep).join("/");
}

export function readText(pathname) {
  return readFileSync(pathname, "utf8");
}

export function writeJson(pathname, data) {
  writeFileSync(pathname, `${JSON.stringify(data, null, 2)}\n`);
}

export function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === ".next") continue;
      out.push(...listMarkdownFiles(full));
    } else if (entry.endsWith(".md")) {
      out.push(full);
    }
  }
  return out.sort((a, b) => toRepoPath(a).localeCompare(toRepoPath(b)));
}

export function stripMarkdown(value) {
  return value
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/<br\s*\/?>/gi, " ")
    .trim();
}

export function normalizeStatus(value, fallback = "Unknown") {
  if (!value) return fallback;
  const cleaned = stripMarkdown(value).split("|")[0].trim().toLowerCase();
  const direct = STATUS_VALUES.get(cleaned);
  if (direct) return direct;
  // Annotated statuses ("Ship Verified — operator checks accepted 2026-06-01")
  // must not silently degrade to Unknown; match the head before the annotation.
  const head = cleaned.split(/\s*(?:—|–|;|\(|\s-\s)\s*/)[0].trim();
  return STATUS_VALUES.get(head) ?? fallback;
}

const AUTONOMOUS_CLOSE_VALUES = new Set(["eligible", "operator-gated"]);

// Autonomous Close meta (PRD-248). The template ships a placeholder
// "eligible | operator-gated" line; a real PRD picks exactly one. Treat the
// pipe-joined placeholder (or anything not in the allowlist) as null so state
// never records a bogus eligibility.
export function normalizeAutonomousClose(value) {
  if (!value) return null;
  const cleaned = stripMarkdown(value).trim().toLowerCase();
  if (cleaned.includes("|")) return null;
  // If both tokens appear (e.g. a hedged "eligible operator-gated"), the SAFER value
  // wins — never silently land on the less-restrictive `eligible` (review finding).
  if (cleaned.includes("operator-gated")) return "operator-gated";
  if (cleaned.includes("eligible")) return "eligible";
  return null;
}

export function parseArtifactName(prefix, filePath) {
  const name = filePath.split(sep).at(-1) ?? "";
  const match = name.match(new RegExp(`^${prefix}-(\\d{3})-(.+)\\.md$`));
  if (!match) return null;
  return {
    number: Number.parseInt(match[1], 10),
    slug: match[2],
  };
}

export function getMetaValue(content, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^>\\s*\\*\\*${escaped}\\*\\*\\s*:?\\s*([^\\n]+)$`, "im"),
    new RegExp(`^>\\s*\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)$`, "im"),
    new RegExp(`^${escaped}\\s*:?\\s*([^\\n]+)$`, "im"),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return stripMarkdown(match[1]);
  }
  return null;
}

export function getTableValue(content, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^\\|\\s*${escaped}\\s*\\|\\s*([^|]+)\\|`, "im");
  const match = content.match(pattern);
  return match ? stripMarkdown(match[1]) : null;
}

function parseScore(content) {
  const raw = getTableValue(content, "Score");
  if (!raw) return null;
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match ? Number.parseFloat(match[1]) : null;
}

function parseTier(raw) {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered.includes("high")) return "high";
  if (lowered.includes("medium")) return "medium";
  if (lowered.includes("fast")) return "fast";
  return null;
}

function artifactState(pathname) {
  if (!pathname) return "missing";
  if (pathname.includes("/completed/")) return "completed";
  if (pathname.includes("/wip/")) return "wip";
  if (pathname.includes("/deferred/")) return "deferred";
  return "missing";
}

function countTaskChecks(content) {
  const checkedCount = (content.match(/^\s*-\s*\[[xX]\]/gm) ?? []).length;
  const uncheckedCount = (content.match(/^\s*-\s*\[\s\]/gm) ?? []).length;
  return { checkedCount, uncheckedCount };
}

function sectionAfter(content, heading) {
  const pattern = new RegExp(`^##\\s+${heading}\\s*$`, "im");
  const match = pattern.exec(content);
  if (!match) return "";
  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function countOperatorHandoff(content) {
  const section = sectionAfter(content, "Operator Handoff");
  if (!section) return 0;
  return section
    .split("\n")
    .filter((line) => line.trim().startsWith("|"))
    .filter((line) => !/^\|\s*-+/.test(line))
    .filter((line) => !/^\|\s*Task\s*\|/i.test(line))
    .filter((line) => line.split("|").some((cell) => cell.trim().length > 0)).length;
}

function parseSummaryReadiness(content) {
  const section = sectionAfter(content, "Ship Readiness");
  return normalizeStatus(section.match(/(Superseded|Ship Verified|Operator Verification|Code Complete|Blocked)/i)?.[1], "Unknown");
}

function collectArtifactFiles() {
  const result = [];
  for (const artifact of ARTIFACTS) {
    for (const state of ["wip", "completed", "deferred"]) {
      const dir = resolve(REPO_ROOT, artifact.dir, state);
      for (const file of listMarkdownFiles(dir)) {
        const parsed = parseArtifactName(artifact.prefix, file);
        if (!parsed) continue;
        result.push({ ...artifact, ...parsed, file, state });
      }
    }
  }
  return result;
}

function emptyRecord(number, slug) {
  return {
    prd: `PRD-${String(number).padStart(3, "0")}`,
    number,
    slug,
    status: "Unknown",
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: null,
    artifacts: {
      prd: "",
      readiness: "",
      tasks: "",
      summary: "",
    },
    artifactStates: {
      prd: "missing",
      readiness: "missing",
      tasks: "missing",
      summary: "missing",
    },
    readiness: {
      score: null,
      verdict: null,
      modelTierExecution: null,
      modelTierAudit: null,
    },
    task: {
      status: "Unknown",
      checkedCount: 0,
      uncheckedCount: 0,
      operatorHandoffCount: 0,
    },
    summary: {
      shipReadiness: "Unknown",
    },
    lastUpdated: null,
  };
}

export function buildPrdState({ generatedAt = new Date().toISOString() } = {}) {
  const records = new Map();
  for (const item of collectArtifactFiles()) {
    const key = `${item.number}:${item.slug}`;
    if (!records.has(key)) records.set(key, emptyRecord(item.number, item.slug));
    const record = records.get(key);
    record.artifacts[item.key] = toRepoPath(item.file);
    record.artifactStates[item.key] = item.state;

    const content = readText(item.file);
    const updated = getMetaValue(content, "Updated");
    if (updated && (!record.lastUpdated || updated > record.lastUpdated)) {
      record.lastUpdated = updated;
    }

    if (item.key === "prd") {
      record.status = normalizeStatus(getMetaValue(content, "Status"), record.status);
      record.cyclePhase = getMetaValue(content, "Cycle Phase");
      record.operatorAcceptance = getMetaValue(content, "Operator Acceptance");
      // Autonomous Close eligibility (PRD-248): "eligible" | "operator-gated".
      // Normalize to the first bare token so a template's "eligible | operator-gated"
      // placeholder line degrades to null rather than a bogus value.
      record.autonomousClose = normalizeAutonomousClose(getMetaValue(content, "Autonomous Close"));
    }

    if (item.key === "readiness") {
      record.readiness.score = parseScore(content);
      const verdict = getTableValue(content, "Verdict");
      record.readiness.verdict = verdict?.match(/PASS|ITERATE|REJECT/i)?.[0].toUpperCase() ?? null;
      record.readiness.modelTierExecution = parseTier(getTableValue(content, "Model Tier (Execution)"));
      record.readiness.modelTierAudit = parseTier(getTableValue(content, "Model Tier (Audit)"));
    }

    if (item.key === "tasks") {
      record.task.status = normalizeStatus(getMetaValue(content, "Status"), record.task.status);
      Object.assign(record.task, countTaskChecks(content));
      record.task.operatorHandoffCount = countOperatorHandoff(content);
    }

    if (item.key === "summary") {
      record.summary.shipReadiness = parseSummaryReadiness(content);
    }
  }

  const sortedRecords = [...records.values()].sort((a, b) => a.number - b.number || a.slug.localeCompare(b.slug));
  return {
    schemaVersion: 1,
    generatedAt,
    records: sortedRecords,
  };
}

export function readCurrentState() {
  if (!existsSync(STATE_PATH)) return null;
  return JSON.parse(readText(STATE_PATH));
}

export function writePrdState(state, path = STATE_PATH) {
  writeFileSync(path, `${JSON.stringify(state, null, 2)}\n`);
}

function splitTableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|") || trimmed.length < 2) return null;
  return trimmed.slice(1, -1).split("|").map((cell) => cell.trim());
}

/**
 * Locates a markdown table by its header cells, tolerant of column padding
 * (prettier re-pads tables; byte-exact header matching broke prd:stop and
 * verify:status-sync on 2026-06-11). Returns character offsets compatible
 * with the previous indexOf-based bounds, or null when not found.
 */
export function findMarkdownTable(content, headerCells) {
  const lines = content.split("\n");
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const cells = splitTableCells(line);
    if (
      cells !== null &&
      cells.length === headerCells.length &&
      cells.every((cell, idx) => cell === headerCells[idx])
    ) {
      const sepLine = lines[i + 1];
      const sepCells = sepLine === undefined ? null : splitTableCells(sepLine);
      if (sepCells === null || sepCells.length === 0 || !sepCells.every((cell) => /^:?-+:?$/.test(cell))) {
        return null;
      }
      const afterSep = offset + line.length + 1 + sepLine.length;
      let rowsEnd = content.indexOf("\n---", afterSep);
      if (rowsEnd === -1) rowsEnd = content.length;
      return { headerIdx: offset, afterSep, rowsEnd };
    }
    offset += line.length + 1;
  }
  return null;
}

export function getChangedFiles() {
  const candidates = [];
  const baseRef = process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null;
  if (baseRef) candidates.push(["diff", "--name-only", `${baseRef}...HEAD`]);
  candidates.push(["diff", "--name-only", "--cached"]);
  candidates.push(["diff", "--name-only"]);
  const files = new Set();
  for (const args of candidates) {
    try {
      const output = execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8" });
      for (const line of output.split("\n")) {
        if (line.trim()) files.add(line.trim());
      }
    } catch {
      // Ignore git failures; local worktrees may not have the requested base.
    }
  }
  return [...files].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// PRD-312 — parallel-agent orchestration shared helpers.
// Promoted here so the ready-queue (query-prd-state), the panel generator/gate
// (sync-status-panel / verify-status-panel), and the branch/conflict gates share
// ONE derivation — no drifting copy.
// ─────────────────────────────────────────────────────────────────────────────

/** Phases that write code (a worktree is mandatory). Mirrors WORKFLOW.md; the
 * source of truth that verify:branch-isolation, prd-worktree and
 * verify:path-conflicts all import (PRD-312 FR-1f). */
export const EXECUTION_PHASES = new Set(["Phase 2b", "Phase 3", "Phase 4", "Maintenance"]);

const IMPLEMENTED_STATUSES = new Set(["Code Complete", "Operator Verification", "Ship Verified", "Archived"]);

/** A PRD is "implemented" once it is code-complete-or-later, its PRD artifact is
 * archived, or a summary exists. Single source of truth for the queue + panel. */
export function isImplemented(record) {
  if (IMPLEMENTED_STATUSES.has(record.status)) return true;
  if (record.artifactStates?.prd === "completed") return true;
  if (record.artifactStates?.summary && record.artifactStates.summary !== "missing") return true;
  return false;
}

/** Highest PRD number that is implemented, or null. Display-only — never a queue
 * filter (the old serial high-water-mark masked out-of-order ready PRDs). */
export function latestImplemented(records) {
  const numbers = records.filter(isImplemented).map((record) => record.number);
  return numbers.length > 0 ? Math.max(...numbers) : null;
}

/** Highest-numbered record whose status is exactly `status`, as `PRD-NNN`, or null. */
export function latestByStatus(records, status) {
  const numbers = records.filter((record) => record.status === status).map((record) => record.number);
  return numbers.length > 0 ? `PRD-${String(Math.max(...numbers)).padStart(3, "0")}` : null;
}

/** The two robustly machine-derivable "Mevcut durum" panel cells (PRD-312 FR-3).
 * Pinned formats: Implemented PRD = integer count; Latest Ship Verified = PRD-NNN.
 * "Latest Code Complete" / "Aktif worktree" are NOT generated (the Code-Complete
 * status is carried only by stale ghosts; Aktif worktree is lock-derived). Used by
 * BOTH the generator and the freshness gate so they cannot disagree. */
export function statusPanelMetrics(records) {
  return {
    "Implemented PRD": String(records.filter(isImplemented).length),
    "Latest Ship Verified": latestByStatus(records, "Ship Verified") ?? "—",
  };
}

/** Manifests / append-only registration files every PRD appends to. Excluded
 * from exclusive path-overlap (a git union merge-driver resolves them); never
 * declared in a `## Conflict Surface` (PRD-312 FR-1e). */
export const SHARED_APPEND_ONLY = new Set([
  "package.json",
  "pnpm-lock.yaml",
  "commitlint.config.js",
  "docs/ai-context/WORKFLOW.md",
  "scripts/verify-workflow.mjs",
  "_STATUS.md",
  "CLAUDE.md",
  "AGENTS.md",
]);

/** Parse a `## Conflict Surface` section into the globs a PRD claims exclusive
 * write-ownership of. Mirrors declaredArtifacts() but KEEPS `*` (globs are
 * intentional here); drops `{ }` template tokens and `none` (PRD-312 FR-1a). */
export function declaredGlobs(content) {
  const section = sectionAfter(content, "Conflict Surface");
  const globs = [];
  for (const line of section.split("\n")) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/\bnone\b/i.test(line) && !line.includes("`")) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1].trim();
      if (!value.includes("/")) continue;
      if (/[{}]/.test(value)) continue;
      if (/\bnone\b/i.test(value)) continue;
      globs.push(value);
    }
  }
  return [...new Set(globs)];
}

/** Zero-dep glob → anchored RegExp. `**` crosses `/`; `*` stays within one path
 * segment; `?` = one non-slash char. Full regex-metacharacter class escaped
 * (PRD-312 FR-1d; no glob lib resolves at root). */
export function globToRegExp(glob) {
  let out = "^";
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i];
    if (ch === "*") {
      if (glob[i + 1] === "*") {
        i += 1;
        if (glob[i + 1] === "/") i += 1; // `a/**/b` and `a/**` collapse the slash
        out += ".*";
      } else {
        out += "[^/]*";
      }
    } else if (ch === "?") {
      out += "[^/]";
    } else if (".+()[]{}$^|\\".includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return new RegExp(`${out}$`);
}

/** Replace ONLY the value cell of the `| <label> | <value> |` row, leaving every
 * sibling row byte-untouched (a whole-table re-emit would delete ungated rows).
 * Returns the original content unchanged when the label row is absent
 * (PRD-312 FR-3). */
export function writeTableValue(content, label, value) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`^(\\|\\s*${escaped}\\s*\\|)\\s*[^|]*?\\s*(\\|)`, "im");
  if (!pattern.test(content)) return content;
  return content.replace(pattern, (_match, pre, post) => `${pre} ${value} ${post}`);
}

/** Validate an optional `lock.ownedPaths` field. Returns an array of issue
 * strings (empty when absent or well-formed). This is the REAL shape gate — no
 * ajv validator loads agent-lock.schema.json; verify:agent-locks calls this so a
 * malformed surface fails loud instead of crashing verify:path-conflicts
 * (PRD-312 FR-1b). */
export function validateOwnedPaths(lock) {
  const issues = [];
  const value = lock?.ownedPaths;
  if (value === undefined) return issues; // opt-in: absent = no surface
  if (!Array.isArray(value)) {
    issues.push("ownedPaths must be an array of glob strings when set");
    return issues;
  }
  value.forEach((glob, index) => {
    if (typeof glob !== "string" || glob.length === 0) {
      issues.push(`ownedPaths[${index}] must be a non-empty string`);
    }
  });
  return issues;
}

export function fail(message, details = []) {
  process.stderr.write(`${message}\n`);
  for (const detail of details) process.stderr.write(`  - ${detail}\n`);
  process.exit(1);
}

export function ok(message) {
  process.stdout.write(`${message}\n`);
}
