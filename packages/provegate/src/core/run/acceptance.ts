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

export function loadAcceptance(
  config: WorkflowConfig,
  root: string,
  id: string,
): AcceptanceEntry | null {
  const path = acceptancesPath(config, root);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8')) as {
      acceptances?: AcceptanceEntry[];
    };
    return (data.acceptances ?? []).find((a) => a.prd === id) ?? null;
  } catch {
    return null;
  }
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
