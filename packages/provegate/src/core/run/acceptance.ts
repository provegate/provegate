import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import type { StateRecord } from '../state/build.js';

/**
 * Operator-acceptance guard: work with operator-owned handoff rows may only
 * close autonomously when an owner-signed acceptance entry exists. Owners are
 * config role identities — never person names.
 */

export interface AcceptanceEntry {
  prd: string;
  owner: string;
  items: string[];
  reason: string;
  date: string;
  method: string;
}

export const ACCEPTANCES_FILENAME = 'acceptances.json';

/** The acceptance store's REPO-RELATIVE path, for callers that must ask git
 * about it rather than the filesystem. */
export function acceptancesRelativePath(config: WorkflowConfig): string {
  const stateDir = config.dirs.stateFile.split('/').slice(0, -1).join('/') || '_state';
  return `${stateDir}/${ACCEPTANCES_FILENAME}`;
}

function acceptancesPath(config: WorkflowConfig, root: string): string {
  const stateDir = config.dirs.stateFile.split('/').slice(0, -1).join('/') || '_state';
  return resolve(root, stateDir, ACCEPTANCES_FILENAME);
}

/** The store shape §12 defines: `schemaVersion: 1`, an `acceptances` array, and
 * nothing else at the top level. */
const ACCEPTANCE_SCHEMA_VERSION = 1;

/** The fields an entry must carry, and the only ones it may. */
const ENTRY_FIELDS = ['prd', 'owner', 'items', 'reason', 'date', 'method'] as const;

/**
 * Why the acceptance STORE is not the documented one, or null when it is.
 *
 * The method snapshot's `verify-acceptances.mjs` enforces this, but a gate may
 * not depend on the adopter having wired that script — and this store is the
 * evidence a weakening waiver rests on. Reading a store the schema rejects and
 * calling the entry inside it an owner decision is a false green with a signature
 * on it.
 */
function storeProblem(data: unknown): string | null {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'the acceptance store is not an object';
  }
  const store = data as Record<string, unknown>;
  if (store.schemaVersion !== ACCEPTANCE_SCHEMA_VERSION) {
    return `schemaVersion must be ${ACCEPTANCE_SCHEMA_VERSION} (got ${JSON.stringify(store.schemaVersion)})`;
  }
  if (!Array.isArray(store.acceptances)) return 'acceptances must be an array';
  for (const key of Object.keys(store)) {
    if (key !== 'schemaVersion' && key !== 'acceptances') {
      return `unexpected top-level field "${key}" in the acceptance store`;
    }
  }
  return null;
}

/**
 * Why one entry is not a well-formed acceptance, or null when it is.
 *
 * Presence is not shape. Checking only that the keys exist accepted
 * `date: 123`, `method: null` and `items: [42, '_brain/learnings/x.md']` — and
 * that last one still authorized the path beside the number, so a store nobody
 * could validate signed off on a removal.
 */
function entryProblem(entry: unknown): string | null {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    return 'the acceptance entry is not an object';
  }
  const record = entry as Record<string, unknown>;
  for (const field of ENTRY_FIELDS) {
    if (record[field] === undefined) return `the acceptance entry is missing \`${field}\``;
  }
  for (const key of Object.keys(record)) {
    if (!(ENTRY_FIELDS as readonly string[]).includes(key)) {
      return `unexpected field "${key}" in the acceptance entry`;
    }
  }
  for (const field of ['prd', 'owner', 'reason', 'date', 'method'] as const) {
    const value = record[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `the acceptance entry's \`${field}\` must be a non-empty string`;
    }
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    return "the acceptance entry's `items` must be a non-empty array";
  }
  if (record.items.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    return "every element of the acceptance entry's `items` must be a non-empty string";
  }
  // The COMMITTED schema says `YYYY-MM-DD`. `Date.parse` accepts
  // "July 25, 2026" and a dozen other spellings, so "parseable" was a different
  // rule from the one the store is validated against elsewhere — and a waiver
  // may not rest on a looser reading of its own schema.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date as string)) {
    return "the acceptance entry's `date` must be an ISO `YYYY-MM-DD` date";
  }
  // ROUND-TRIP, not merely parseable. `2026-02-30` satisfies the ISO shape and
  // `Date.parse` normalizes it to March 2 — a date the owner did not write,
  // silently accepted as the one they did.
  const parsedDate = new Date(`${record.date as string}T00:00:00Z`);
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== (record.date as string)
  ) {
    return "the acceptance entry's `date` is not a real calendar date";
  }
  return null;
}

export function loadAcceptance(
  config: WorkflowConfig,
  root: string,
  id: string,
): AcceptanceEntry | null {
  return loadAcceptanceChecked(config, root, id).entry;
}

/**
 * The entry for `id`, plus why the store or the entry is unusable.
 *
 * A caller that treats an acceptance as AUTHORIZATION must read `problem` —
 * `loadAcceptance` returning null and returning a schema-invalid entry are
 * different facts, and only this shape tells them apart.
 */
export function loadAcceptanceChecked(
  config: WorkflowConfig,
  root: string,
  id: string,
): { entry: AcceptanceEntry | null; problem: string | null } {
  const path = acceptancesPath(config, root);
  if (!existsSync(path)) return { entry: null, problem: null };
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return { entry: null, problem: 'the acceptance store is not valid JSON' };
  }
  const invalid = storeProblem(data);
  if (invalid !== null) return { entry: null, problem: invalid };
  const entries = (data as { acceptances: unknown[] }).acceptances;
  // EVERY entry, not just the selected one. A store holding one malformed entry
  // is a store the documented schema rejects, and a valid-looking neighbour
  // inside it is not evidence of anything — the file as a whole is what an owner
  // is taken to have signed.
  const owners = new Set(config.owners.map((o) => o.toLowerCase()));
  // The prefix is DATA, not a pattern. Interpolating it raw let a configured
  // `P.D` match `PXD-001`, so a store entry naming a work item that does not
  // exist read as an owner decision about one that does.
  const idPattern = new RegExp(
    `^${config.idPattern.prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{${config.idPattern.width}}$`,
  );
  for (const [index, entry] of entries.entries()) {
    const bad = entryProblem(entry);
    if (bad !== null) return { entry: null, problem: `acceptances[${index}]: ${bad}` };
    // Shape is not identity. An entry naming an owner outside the allowlist, or
    // a `prd` that is not a work-item id at all, is not an owner decision about
    // anything — and it sat in a store the weakening gate treated as signed.
    const record = entry as Record<string, unknown>;
    if (!owners.has(String(record.owner).toLowerCase())) {
      return {
        entry: null,
        problem: `acceptances[${index}]: '${String(record.owner)}' is not a configured owner`,
      };
    }
    if (!idPattern.test(String(record.prd))) {
      return {
        entry: null,
        problem: `acceptances[${index}]: '${String(record.prd)}' is not a work-item id`,
      };
    }
  }
  const found = entries.find((a) => (a as { prd?: unknown }).prd === id);
  if (found === undefined) return { entry: null, problem: null };
  return { entry: found as AcceptanceEntry, problem: null };
}

export function validAcceptance(config: WorkflowConfig, entry: AcceptanceEntry | null): boolean {
  const owners = new Set(config.owners.map((o) => o.toLowerCase()));
  return Boolean(
    entry &&
    typeof entry.owner === 'string' &&
    owners.has(entry.owner.toLowerCase()) &&
    Array.isArray(entry.items) &&
    entry.items.length > 0 &&
    typeof entry.reason === 'string' &&
    entry.reason.trim().length >= 5,
  );
}

export interface OperatorGateResult {
  ok: boolean;
  waived?: boolean;
  why?: string;
}

export function operatorGateOk(
  config: WorkflowConfig,
  root: string,
  record: StateRecord,
  /** Reads a committed blob, so the gate can tell working-tree evidence from
   * evidence the merge will actually carry. Absent in callers that have no git
   * context, and then the check degrades to the old behaviour. */
  readCommitted?: (repoRelativePath: string) => string | null,
): OperatorGateResult {
  const operatorRows = record.task.operatorHandoffCount;
  if (operatorRows === 0) return { ok: true };

  // The acceptance must be COMMITTED, exactly as the weakening waiver requires.
  // `ensureCheckoutClean` resets tracked coordination paths on the way to the
  // merge and an untracked one is simply not in the source commit, so an
  // acceptance that lives only in the working tree authorized a merge whose
  // landed history then contains no authorization at all.
  if (readCommitted !== undefined) {
    const rel = acceptancesRelativePath(config);
    const committed = readCommitted(rel);
    let working: string | null;
    try {
      working = readFileSync(resolve(root, rel), 'utf8');
    } catch {
      working = null;
    }
    if (working !== committed) {
      return {
        ok: false,
        why:
          `${operatorRows} operator-owned row(s), and \`${rel}\` is not committed as it ` +
          `stands — the merge lands the COMMITTED copy, so commit the acceptance that ` +
          `authorizes this close and re-run`,
      };
    }
  }

  const acceptance = loadAcceptance(config, root, record.prd);
  if (validAcceptance(config, acceptance)) {
    return {
      ok: true,
      waived: true,
      why: `${operatorRows} operator row(s) waived via ${ACCEPTANCES_FILENAME} (${acceptance!.owner})`,
    };
  }

  return {
    ok: false,
    why: `${operatorRows} operator-owned row(s) (Autonomous Close: ${record.autonomousClose}) — record an owner acceptance entry in ${ACCEPTANCES_FILENAME} or clear the rows before autonomous merge`,
  };
}
