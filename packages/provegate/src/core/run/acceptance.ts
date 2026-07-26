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
  if (!Number.isFinite(Date.parse(record.date as string))) {
    return "the acceptance entry's `date` is not a parseable date";
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
  for (const [index, entry] of entries.entries()) {
    const bad = entryProblem(entry);
    if (bad !== null) return { entry: null, problem: `acceptances[${index}]: ${bad}` };
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
): OperatorGateResult {
  const operatorRows = record.task.operatorHandoffCount;
  if (operatorRows === 0) return { ok: true };

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
