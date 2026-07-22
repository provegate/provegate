import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { escapeRegExp, getMetaValue } from '../state/markdown.js';
import { formatId } from '../state/artifacts.js';

/**
 * Independent-review artifact gate. The metadata block is the machine surface:
 * PRD / Verdict / Reviewer / Base SHA / Critical / Quorum. The schema is
 * ALWAYS required — the parent's per-number grandfather window is not ported.
 */

export interface ReviewMeta {
  prd: string | null;
  verdict: string | null;
  reviewer: string | null;
  baseSha: string | null;
  critical: number | null;
  quorum: string | null;
}

export interface ReviewCheck {
  ok: boolean;
  issues: string[];
  meta?: ReviewMeta;
  artifact?: string;
}

function parseSeverityCount(content: string, label: string): number | null {
  const raw = getMetaValue(content, label);
  if (!raw) return null;
  // Strict: the whole value must be a non-negative integer. `-1` or
  // `0 forged` must not satisfy the pass ⇒ Critical=0 contract.
  if (!/^\d+$/.test(raw.trim())) return null;
  return Number.parseInt(raw, 10);
}

export function validateReviewArtifact(
  content: string,
  { expectedId }: { expectedId?: string } = {},
): ReviewCheck {
  const issues: string[] = [];
  const prd = getMetaValue(content, 'PRD');
  const verdict = getMetaValue(content, 'Verdict')?.toLowerCase() ?? null;
  const reviewer = getMetaValue(content, 'Reviewer');
  const baseSha = getMetaValue(content, 'Base SHA');
  const critical = parseSeverityCount(content, 'Critical');
  const quorum = getMetaValue(content, 'Quorum');

  if (!prd) issues.push('missing `> **PRD:** <id>` metadata');
  if (!verdict || !/^(pass|fail)$/.test(verdict)) {
    issues.push('missing or invalid `> **Verdict:** pass|fail` metadata');
  }
  if (!reviewer || reviewer.length < 2) {
    issues.push('missing `> **Reviewer:** <tool/model>` metadata');
  }
  if (!baseSha || baseSha.length < 7) issues.push('missing `> **Base SHA:** <git sha>` metadata');
  if (critical === null) issues.push('missing numeric `> **Critical:** N` metadata');
  if (!quorum) {
    issues.push('missing `> **Quorum:** N/M pass` metadata');
  } else {
    // Quorum arithmetic (closes the PRD-003 governed deferral): strict `N/M pass`
    // with N <= M, M >= 1; a `pass` verdict requires the calibrated panel gate
    // N/M >= 3/5, in integer math. `1/1` passes as the degenerate full-quorum
    // case; `2/5` is mechanically impossible to pass.
    // Annotated heads are legal ("3/5 pass (one abstention)") — the arithmetic
    // reads the head, the annotation is prose. Same discipline as status parsing.
    const m = /^(\d+)\/(\d+) pass\b/.exec(quorum.trim());
    if (!m) {
      issues.push(`Quorum "${quorum}" is malformed — expected \`N/M pass\``);
    } else {
      const n = Number.parseInt(m[1]!, 10);
      const total = Number.parseInt(m[2]!, 10);
      if (total < 1 || n > total) {
        issues.push(`Quorum "${quorum}" is invalid — need N <= M and M >= 1`);
      } else if (verdict === 'pass' && n * 5 < total * 3) {
        issues.push(
          `Verdict is pass but quorum ${n}/${total} is below the 3/5 panel gate`,
        );
      }
    }
  }

  if (expectedId && prd) {
    // Exact-token match: substring matching would accept PRD-0020 as
    // evidence for PRD-002.
    const idRe = new RegExp(`(^|[^\\w-])${escapeRegExp(expectedId)}([^\\w-]|$)`, 'i');
    if (!idRe.test(prd)) {
      issues.push(`PRD metadata "${prd}" does not match expected ${expectedId}`);
    }
  }
  if (verdict === 'pass' && critical !== null && critical > 0) {
    issues.push(`Verdict is pass but Critical=${critical} — fix findings or set Verdict to fail`);
  }

  return {
    ok: issues.length === 0,
    issues,
    meta: { prd, verdict, reviewer, baseSha, critical, quorum },
  };
}

/** Review-artifact path pattern derived from config (reviews dir + id width). */
function artifactPattern(config: WorkflowConfig): RegExp {
  return new RegExp(
    `${escapeRegExp(config.dirs.reviewsDir)}/review-\\d{${config.idPattern.width}}[\\w-]*\\.md`,
  );
}

export function extractReviewArtifactPath(
  config: WorkflowConfig,
  tasksContent: string,
): string | null {
  const row = tasksContent.split('\n').find((l) => /independent-review/i.test(l) && /\|/.test(l));
  if (!row) return null;
  return row.match(artifactPattern(config))?.[0] ?? null;
}

export function validateReviewArtifactFile(
  config: WorkflowConfig,
  root: string,
  artifactPath: string,
  options: { expectedId?: string } = {},
): ReviewCheck {
  const full = resolve(root, artifactPath);
  if (!existsSync(full)) {
    return { ok: false, issues: [`review artifact not found: ${artifactPath}`] };
  }
  return validateReviewArtifact(readFileSync(full, 'utf8'), options);
}

/** The Phase 6 fn-gate: ledger row must be `passed` and its artifact valid. */
export function validateTasksReviewRow(
  config: WorkflowConfig,
  root: string,
  tasksContent: string,
  prdNumber: number,
): ReviewCheck {
  const row = tasksContent.split('\n').find((l) => /independent-review/i.test(l) && /\|/.test(l));
  if (!row) return { ok: false, issues: ['no independent-review ledger row'] };
  if (/\bfailed\b/i.test(row))
    return { ok: false, issues: ['independent-review verdict is failed'] };
  if (!/\bpassed\b/i.test(row)) {
    return { ok: false, issues: ['independent-review verdict not passed'] };
  }

  const artifact = extractReviewArtifactPath(config, tasksContent);
  if (!artifact) {
    return { ok: false, issues: ['independent-review row names no review artifact path'] };
  }

  const expectedId = formatId(config.idPattern, prdNumber);
  const fileCheck = validateReviewArtifactFile(config, root, artifact, { expectedId });
  if (!fileCheck.ok) return fileCheck;
  return { ok: true, issues: [], artifact };
}
