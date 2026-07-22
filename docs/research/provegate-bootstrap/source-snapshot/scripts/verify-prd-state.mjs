#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  REPO_ROOT,
  STATE_PATH,
  buildPrdState,
  fail,
  getMetaValue,
  ok,
  readCurrentState,
  readText,
} from "./prd-state-utils.mjs";
import { REVIEW_SCHEMA_FROM_PRD, validateReviewArtifactFile } from "./review-artifact-utils.mjs";
import { loadAcceptanceOwners } from "./lib/acceptance-owners.mjs";

function comparable(state) {
  return {
    schemaVersion: state.schemaVersion,
    records: state.records,
  };
}

// Operator Acceptance is an owner decision, not an agent convenience. It waives
// the unchecked-task / operator-handoff gates. The legacy path is a PRD meta
// line "<owner> <YYYY-MM-DD> — <what was accepted>" with an allowlisted owner.
// SSOT: scripts/allowlists/acceptance-owners.json (shared with prd-accept.mjs).
const ACCEPTANCE_OWNERS = loadAcceptanceOwners();
const ACCEPTANCE_PATTERN = /^(\S+)\s+(\d{4}-\d{2}-\d{2})\s+(?:—|–|-)\s+\S.*$/;

// From this PRD on, the waiver must be backed by an owner-gated entry in
// _state/acceptances.json (written by `pnpm prd:accept`), not just a meta line
// an agent can author itself. Older PRDs stay on the grandfathered meta path.
// Closes the self-attestation hole from the 2026-06-11 workflow audit.
const ACCEPTANCE_STORE_FROM_PRD = 248;
const ACCEPT_PATH = resolve(REPO_ROOT, "_state/acceptances.json");

function loadAcceptances() {
  if (!existsSync(ACCEPT_PATH)) return new Map();
  try {
    const data = JSON.parse(readText(ACCEPT_PATH));
    return new Map((data.acceptances ?? []).map((a) => [a.prd, a]));
  } catch {
    return new Map();
  }
}

function validStoreEntry(entry) {
  return Boolean(
    entry &&
      typeof entry.owner === "string" &&
      ACCEPTANCE_OWNERS.has(entry.owner.toLowerCase()) &&
      Array.isArray(entry.items) &&
      entry.items.length > 0 &&
      typeof entry.reason === "string" &&
      entry.reason.trim().length >= 5 &&
      typeof entry.date === "string" &&
      !Number.isNaN(Date.parse(entry.date)),
  );
}

function validateMetaAcceptance(record, issues) {
  if (!record.operatorAcceptance) return false;
  const match = ACCEPTANCE_PATTERN.exec(record.operatorAcceptance);
  if (!match) {
    issues.push(
      `${record.prd}: Operator Acceptance meta is malformed — expected "<owner> <YYYY-MM-DD> — <what was accepted>" (got "${record.operatorAcceptance}"); waiver NOT applied`,
    );
    return false;
  }
  const [, owner, date] = match;
  if (!ACCEPTANCE_OWNERS.has(owner.toLowerCase())) {
    issues.push(
      `${record.prd}: Operator Acceptance owner "${owner}" is not in the allowlist (${[...ACCEPTANCE_OWNERS].join(", ")}); waiver NOT applied`,
    );
    return false;
  }
  if (Number.isNaN(Date.parse(date))) {
    issues.push(`${record.prd}: Operator Acceptance date "${date}" is not a valid date; waiver NOT applied`);
    return false;
  }
  return true;
}

function validateOperatorAcceptance(record, acceptances, issues) {
  const storeOk = validStoreEntry(acceptances.get(record.prd));

  if (record.number >= ACCEPTANCE_STORE_FROM_PRD) {
    if (storeOk) return true;
    if (record.operatorAcceptance) {
      issues.push(
        `${record.prd}: Operator Acceptance meta present but no valid _state/acceptances.json entry — record it with \`pnpm prd:accept ${record.prd} --owner <name> --items ... --reason "..."\` (self-written meta is not sufficient for PRD >= ${ACCEPTANCE_STORE_FROM_PRD})`,
      );
    }
    return false;
  }

  // Grandfathered PRDs: an owner-gated store entry counts, else the meta path.
  return storeOk || validateMetaAcceptance(record, issues);
}

// Stricter rules that only apply going forward (older artifacts are
// grandfathered; they are archived and never re-promoted).
const STRICT_STATUS_FROM_PRD = 198;

// normalizeStatus maps "complete"/"completed"/"done" to Ship Verified for
// legacy artifacts — for new PRDs that aliasing is a typo-escalation: writing
// "Status: Completed" self-declares Ship Verified and inverts the gate order.
const SHIP_VERIFIED_ALIASES = new Set(["complete", "completed", "done"]);

function checkStatusAlias(record, issues) {
  if (!record.artifacts.prd) return;
  let raw;
  try {
    raw = getMetaValue(readText(resolve(REPO_ROOT, record.artifacts.prd)), "Status");
  } catch {
    return; // missing PRD artifact is reported separately
  }
  if (!raw) return;
  const head = raw.split(/\s*(?:—|–|;|\(|\s-\s)\s*/)[0].trim().toLowerCase();
  if (SHIP_VERIFIED_ALIASES.has(head)) {
    issues.push(
      `${record.prd}: PRD status "${raw}" is an alias that silently maps to Ship Verified — write the canonical status explicitly`,
    );
  }
}

// Ship Verified requires the independent adversarial review (WORKFLOW.md
// Phase 4 §1.6). The ledger row is the evidence trail; a Ship Verified tasks
// file without an `independent-review` row means the review was skipped or
// went unrecorded — both are gate violations.
//
// From PRD-200 (FR-7), PRD ≥ 199 additionally needs the review ARTIFACT:
// a `passed`/`failed` independent-review row must name a
// `_docs/reviews/review-XXX-*.md` path that exists on disk. A `skipped`
// row stays legal without an artifact when it carries a written waiver
// (class waiver per WORKFLOW.md 2026-06-10 calibration addendum — the
// tasks-193 precedent), so legitimate waivers are not flagged.
const REVIEW_ARTIFACT_FROM_PRD = 199;
const REVIEW_ARTIFACT_PATTERN = /_docs\/reviews\/review-\d{3}[\w-]*\.md/;

function checkReviewEvidence(record, issues) {
  if (!["Ship Verified", "Archived"].includes(record.status)) return;
  if (!record.artifacts.tasks) return;
  let content;
  try {
    content = readText(resolve(REPO_ROOT, record.artifacts.tasks));
  } catch {
    return; // missing tasks artifact is reported separately
  }
  if (!/independent-review/i.test(content)) {
    issues.push(
      `${record.prd}: status ${record.status} but tasks file has no \`independent-review\` ledger row (tool, diff range, verdict) — see WORKFLOW.md Phase 4 §1.6`,
    );
    return;
  }

  if (record.number < REVIEW_ARTIFACT_FROM_PRD) return;

  const rows = content
    .split("\n")
    .filter((line) => line.trim().startsWith("|") && /independent-review/i.test(line));
  if (rows.length === 0) {
    issues.push(
      `${record.prd}: \`independent-review\` appears in the tasks file but not as a ledger table row — record it as one (PRD-200 FR-7)`,
    );
    return;
  }

  for (const row of rows) {
    const cells = row.split("|").slice(1, -1).map((cell) => cell.trim());
    const result = (cells.find((cell) =>
      /^(pending|passed|failed|partial|skipped|operator|blocked)$/i.test(cell),
    ) ?? "").toLowerCase();

    if (result === "skipped") {
      const waiver = cells.slice(cells.findIndex((c) => c.toLowerCase() === "skipped") + 1).join(" ").trim();
      // A real waiver is a sentence, not a dash — require some substance
      // (review-200 P3: a lone "-" must not satisfy the gate).
      const letters = waiver.replace(/[^\p{L}]/gu, "");
      if (waiver.length < 10 || letters.length < 5) {
        issues.push(
          `${record.prd}: independent-review row is skipped without a written waiver — class waivers need a one-line justification (PRD-200 FR-7)`,
        );
      }
      continue;
    }

    const artifact = row.match(REVIEW_ARTIFACT_PATTERN)?.[0];
    if (!artifact) {
      issues.push(
        `${record.prd}: independent-review row (${result || "no result"}) names no \`_docs/reviews/review-XXX-*.md\` artifact (PRD-200 FR-7)`,
      );
    } else if (!existsSync(resolve(REPO_ROOT, artifact))) {
      issues.push(
        `${record.prd}: independent-review artifact ${artifact} does not exist on disk (PRD-200 FR-7)`,
      );
    } else if (record.number >= REVIEW_SCHEMA_FROM_PRD && result === "passed") {
      const schema = validateReviewArtifactFile(artifact, {
        prdNumber: record.number,
        requireSchema: true,
      });
      for (const msg of schema.issues ?? []) {
        issues.push(`${record.prd}: review artifact ${artifact}: ${msg}`);
      }
    }
  }
}

function collectIssues(state) {
  const issues = [];
  const seenNumbers = new Map();
  const strictFromPrd = 170;
  const acceptances = loadAcceptances();

  for (const record of state.records) {
    if (!seenNumbers.has(record.number)) seenNumbers.set(record.number, []);
    seenNumbers.get(record.number).push(record.slug);

    if (record.number < strictFromPrd) continue;

    const states = record.artifactStates;
    if (states.prd === "missing") {
      issues.push(`${record.prd}: missing PRD artifact`);
    }

    if (record.status === "Unknown" && states.prd !== "missing") {
      issues.push(`${record.prd}: status is Unknown — add a parseable \`> **Status**:\` line to the PRD`);
    }

    if (
      states.readiness === "missing" &&
      !["Draft", "In Review", "Superseded", "Deferred"].includes(record.status)
    ) {
      issues.push(`${record.prd}: readiness report missing after status ${record.status}`);
    }

    if (states.tasks === "missing" && ["Approved", "In Progress", "Code Complete", "Operator Verification", "Ship Verified", "Archived"].includes(record.status)) {
      issues.push(`${record.prd}: task file missing after status ${record.status}`);
    }

    if (
      states.prd === "completed" &&
      states.tasks !== "completed" &&
      record.status !== "Superseded"
    ) {
      issues.push(`${record.prd}: PRD is completed but tasks are ${states.tasks}`);
    }

    if (states.tasks === "completed" && states.summary !== "completed") {
      issues.push(`${record.prd}: tasks are completed but summary is ${states.summary}`);
    }

    // `Operator Acceptance` PRD meta records an explicit owner decision to ship
    // with operator-owned checks accepted-but-not-run; it waives the two rules below.
    const operatorAccepted = validateOperatorAcceptance(record, acceptances, issues);

    if (record.task.uncheckedCount > 0 && ["Ship Verified", "Archived"].includes(record.status) && !operatorAccepted) {
      issues.push(`${record.prd}: status ${record.status} but ${record.task.uncheckedCount} unchecked task item(s) remain`);
    }

    if (record.task.operatorHandoffCount > 0 && record.status === "Ship Verified" && !operatorAccepted) {
      issues.push(`${record.prd}: Ship Verified with ${record.task.operatorHandoffCount} operator handoff row(s)`);
    }

    // PRD-248 (FR-3): `Autonomous Close: eligible` asserts there is no operator-owned
    // work. If the PRD declares eligible but carries operator handoff rows, that is a
    // contradiction the orchestration's operator gate would otherwise be asked to honor —
    // fail it here so the inconsistency is caught at the source, not at merge time.
    if (record.number >= 248 && record.autonomousClose === "eligible" && record.task.operatorHandoffCount > 0) {
      issues.push(
        `${record.prd}: declares \`Autonomous Close: eligible\` but has ${record.task.operatorHandoffCount} operator handoff row(s) — set it to \`operator-gated\``,
      );
    }

    if (record.readiness.score !== null && record.readiness.score < 8 && ["Approved", "In Progress", "Code Complete", "Operator Verification", "Ship Verified", "Archived"].includes(record.status)) {
      issues.push(`${record.prd}: status ${record.status} but readiness score is ${record.readiness.score}`);
    }

    if (record.number >= STRICT_STATUS_FROM_PRD) {
      checkStatusAlias(record, issues);
      checkReviewEvidence(record, issues);
    }
  }

  for (const [number, slugs] of seenNumbers.entries()) {
    if (number < strictFromPrd) continue;
    const unique = [...new Set(slugs)];
    if (unique.length > 1) {
      issues.push(`PRD-${String(number).padStart(3, "0")}: multiple slugs detected (${unique.join(", ")})`);
    }
  }

  return issues;
}

const current = readCurrentState();
if (!current) {
  fail(`[verify:prd-state] missing ${STATE_PATH}`, ["Run `pnpm state:sync` and commit the generated state file."]);
}

const generated = buildPrdState({ generatedAt: current.generatedAt });
if (JSON.stringify(comparable(current)) !== JSON.stringify(comparable(generated))) {
  fail("[verify:prd-state] _state/prds.json is stale", ["Run `pnpm state:sync` and review the diff."]);
}

const issues = collectIssues(current);
if (issues.length > 0) {
  fail("[verify:prd-state] workflow state issues detected", issues);
}

if (!existsSync(STATE_PATH)) {
  fail(`[verify:prd-state] ${STATE_PATH} was not found`);
}

ok(`[verify:prd-state] ok - ${current.records.length} PRD record(s) validated`);
