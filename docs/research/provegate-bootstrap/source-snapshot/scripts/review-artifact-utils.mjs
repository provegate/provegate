// Structured independent-review artifact schema (PRD-249).
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, readText } from "./prd-state-utils.mjs";

export const REVIEW_SCHEMA_FROM_PRD = 249;

const REVIEW_ARTIFACT_PATTERN = /_docs\/reviews\/review-\d{3}[\w-]*\.md/;

export function extractReviewArtifactPath(tasksContent) {
  const row = tasksContent.split("\n").find((l) => /independent-review/i.test(l) && /\|/.test(l));
  if (!row) return null;
  return row.match(REVIEW_ARTIFACT_PATTERN)?.[0] ?? null;
}

function metaValue(content, key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`^>\\s*\\*\\*${escaped}\\*\\*\\s*:?\\s*([^\\n]+)$`, "im"),
    new RegExp(`^>\\s*\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)$`, "im"),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function parseSeverityCount(content, label) {
  const raw = metaValue(content, label);
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

export function validateReviewArtifact(content, { prdNumber, requireSchema = true } = {}) {
  const issues = [];
  const prd = metaValue(content, "PRD");
  const verdict = metaValue(content, "Verdict")?.toLowerCase();
  const reviewer = metaValue(content, "Reviewer");
  const baseSha = metaValue(content, "Base SHA");
  const critical = parseSeverityCount(content, "Critical");
  const quorum = metaValue(content, "Quorum");

  if (requireSchema) {
    if (!prd) issues.push("missing `> **PRD:** PRD-XXX` metadata");
    if (!verdict || !/^(pass|fail)$/.test(verdict)) {
      issues.push("missing or invalid `> **Verdict:** pass|fail` metadata");
    }
    if (!reviewer || reviewer.length < 2) issues.push("missing `> **Reviewer:** <tool/model>` metadata");
    if (!baseSha || baseSha.length < 7) issues.push("missing `> **Base SHA:** <git sha>` metadata");
    if (critical === null) issues.push("missing numeric `> **Critical:** N` metadata");
    if (!quorum) issues.push("missing `> **Quorum:** N/M pass` metadata");
  }

  if (prdNumber && prd) {
    const expected = `PRD-${String(prdNumber).padStart(3, "0")}`;
    if (!prd.toUpperCase().includes(expected)) {
      issues.push(`PRD metadata "${prd}" does not match expected ${expected}`);
    }
  }

  if (verdict === "pass" && critical !== null && critical > 0) {
    issues.push(`Verdict is pass but Critical=${critical} — fix findings or set Verdict to fail`);
  }

  return { ok: issues.length === 0, issues, meta: { prd, verdict, reviewer, baseSha, critical, quorum } };
}

export function validateReviewArtifactFile(artifactPath, options = {}) {
  const full = resolve(REPO_ROOT, artifactPath);
  if (!existsSync(full)) {
    return { ok: false, issues: [`review artifact not found: ${artifactPath}`] };
  }
  return validateReviewArtifact(readText(full), options);
}

export function validateTasksReviewRow(tasksContent, prdNumber) {
  const row = tasksContent.split("\n").find((l) => /independent-review/i.test(l) && /\|/.test(l));
  if (!row) return { ok: false, issues: ["no independent-review ledger row"] };
  if (/\bfailed\b/i.test(row)) return { ok: false, issues: ["independent-review verdict is failed"] };
  if (!/\bpassed\b/i.test(row)) return { ok: false, issues: ["independent-review verdict not passed"] };

  const artifact = extractReviewArtifactPath(tasksContent);
  if (!artifact) return { ok: false, issues: ["independent-review row names no review artifact path"] };

  const requireSchema = prdNumber >= REVIEW_SCHEMA_FROM_PRD;
  const fileCheck = validateReviewArtifactFile(artifact, { prdNumber, requireSchema });
  if (!fileCheck.ok) return fileCheck;
  return { ok: true, issues: [], artifact };
}
