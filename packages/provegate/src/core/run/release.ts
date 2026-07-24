import { readFileSync, unlinkSync } from 'node:fs';
import type { WorkflowConfig } from '../config/index.js';
import { listLockFiles, validateLock } from '../locks/lease.js';
import { claimMutexPath } from './open.js';
import { withWorkspaceMutex } from './mutex.js';

/**
 * `gate release` — the fourth mutation of the lock domain (claim, steal, migrate
 * exist). It drops a PRD's lease(s) under the SAME `.gate-open.mutex`, so a
 * release racing a claim can never unlink a lease the claim just refreshed:
 * every candidate is re-read inside the hold and its identity re-checked against
 * the parsed snapshot immediately before the unlink (the steal discipline in
 * `open.ts`). Releasing a lease held by a DIFFERENT agent requires `force` and
 * names the victim — never silent.
 */

/** Fields that pin a lease's identity; a change between parse and unlink means a
 * rival replaced or refreshed it, and the release of THAT lease aborts. Mirrors
 * `IDENTITY_FIELDS` in `open.ts`'s steal path. */
const IDENTITY_FIELDS = ['lockId', 'prd', 'agent', 'startedAt', 'expiresAt'] as const;

export interface ReleaseOptions {
  force?: boolean;
  agent?: string;
  /** Test seam (mirrors `ClaimOptions.raceWindow`): invoked under the mutex
   * after leases are parsed but before the identity re-check + unlink, so a test
   * can simulate a rival refreshing the lease in that window. */
  raceWindow?: () => void;
}

export interface ReleasedLease {
  prd: string;
  agent: string;
  expiresAt: string;
  file: string;
  /** True when the released lease belonged to a different agent (force path). */
  foreign: boolean;
}

export interface ReleaseResult {
  ok: boolean;
  id: string;
  /** Leases actually unlinked. */
  released: ReleasedLease[];
  /** Refusals, fail-closed guidance, or skipped-race notes. */
  issues: string[];
}

/** Resolve the acting agent identity exactly like `claimPrd`'s `leaseAgent`:
 * trimmed `--agent`, else the first configured owner, else `operator`. */
function resolveAgent(config: WorkflowConfig, agent?: string): string {
  const trimmed = agent?.trim();
  return trimmed !== undefined && trimmed !== '' ? trimmed : (config.owners[0] ?? 'operator');
}

export function releaseLease(
  config: WorkflowConfig,
  root: string,
  id: string,
  options: ReleaseOptions = {},
): ReleaseResult {
  const normalized = id.toUpperCase();
  const actingAgent = resolveAgent(config, options.agent);
  const force = options.force ?? false;
  const namePrefix = `${normalized.toLowerCase()}-`;

  return withWorkspaceMutex(claimMutexPath(config, root), (): ReleaseResult => {
    const entries = listLockFiles(config, root);

    // Fail CLOSED: a lease that is FOR this id (by filename convention, even when
    // its bytes are unreadable) but malformed blocks the release — ownership is
    // unknowable, so no unlink happens and repair is named. Filename matching is
    // what lets an unreadable lease still be attributed to the id.
    const malformed = entries.filter((e) => {
      if (!e.name.startsWith(namePrefix)) return false;
      if (!e.data) return true;
      return validateLock(config, e.data, { now: 0 }).length > 0;
    });
    if (malformed.length > 0) {
      return {
        ok: false,
        id: normalized,
        released: [],
        issues: [
          ...malformed.map(
            (e) => `malformed lease ${e.name} (fail closed): ${e.error ?? 'shape invalid'}`,
          ),
          `repair or delete the malformed lease file(s) explicitly, then re-run \`gate release ${normalized}\``,
        ],
      };
    }

    // Readable leases whose parsed `prd` is this id. (Filename and content agree
    // in practice; content is authoritative for the agent guard below.)
    const mine = entries.filter((e) => e.data && String(e.data['prd']) === normalized);
    if (mine.length === 0) {
      return {
        ok: true,
        id: normalized,
        released: [],
        issues: [`nothing to release — no lease found for ${normalized}`],
      };
    }

    const foreign = mine.filter((e) => String(e.data!['agent']) !== actingAgent);
    if (foreign.length > 0 && !force) {
      return {
        ok: false,
        id: normalized,
        released: [],
        issues: [
          ...foreign.map(
            (e) =>
              `lease of ${normalized} is held by agent "${String(e.data!['agent'])}" (expires ${String(e.data!['expiresAt'])}) — not yours`,
          ),
          `re-run with --force to release a foreign lease (the takeover is reported, never silent)`,
        ],
      };
    }

    options.raceWindow?.();

    // Unlink under the hold. Before each unlink, re-read the file and re-check
    // identity against the snapshot we parsed above: a rival that refreshed or
    // replaced the lease between parse and unlink must abort THAT unlink, not be
    // silently clobbered (W1 — release race).
    const released: ReleasedLease[] = [];
    const issues: string[] = [];
    for (const entry of mine) {
      const snapshot = entry.data!;
      const identical = ((): boolean => {
        try {
          const fresh = JSON.parse(readFileSync(entry.path, 'utf8')) as Record<string, unknown>;
          return IDENTITY_FIELDS.every((f) => String(fresh[f] ?? '') === String(snapshot[f] ?? ''));
        } catch {
          return false; // vanished or unreadable now — treat as changed
        }
      })();
      if (!identical) {
        issues.push(
          `skipped ${entry.name}: the lease changed since it was read (refreshed or replaced) — re-run to release the current lease`,
        );
        continue;
      }
      const foreignLease = String(snapshot['agent']) !== actingAgent;
      unlinkSync(entry.path);
      released.push({
        prd: normalized,
        agent: String(snapshot['agent']),
        expiresAt: String(snapshot['expiresAt']),
        file: entry.path,
        foreign: foreignLease,
      });
    }

    return { ok: released.length > 0 || issues.length === 0, id: normalized, released, issues };
  });
}
