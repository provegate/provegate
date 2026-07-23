import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Workspace mutex for multi-process critical sections (id allocation, lease
 * claims). A `wx`-created marker file is the lock; its content is a unique
 * ownership token. Same-machine only — which is the lock domain that matters:
 * leases and artifact dirs live on one checkout.
 *
 * Stale markers FAIL CLOSED. Automatic lock-breaking cannot be made race-free
 * with plain files (any break decision is made on a read that may already be
 * stale, so a breaker can destroy a successor's live marker — the exact
 * overlap the mutex exists to prevent). A marker whose holder pid is dead and
 * whose mtime is old therefore throws with explicit manual-recovery
 * instructions instead of being silently broken. Live holders are waited out.
 */

const STALE_MS = 30_000;
const ATTEMPTS = 200;
const SPIN_MS = 50;

let tokenCounter = 0;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function pidAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM = exists but not ours: alive. ESRCH = gone.
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export function withWorkspaceMutex<T>(mutexPath: string, body: () => T): T {
  mkdirSync(dirname(mutexPath), { recursive: true });
  tokenCounter += 1;
  const token = `${process.pid}:${tokenCounter}:${new Date().toISOString()}`;
  let acquired = false;
  for (let attempt = 0; attempt < ATTEMPTS && !acquired; attempt += 1) {
    try {
      writeFileSync(mutexPath, `${token}\n`, { flag: 'wx' });
      acquired = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      let age: number;
      let holderPid: number;
      try {
        age = Date.now() - statSync(mutexPath).mtimeMs;
        holderPid = Number.parseInt(readFileSync(mutexPath, 'utf8'), 10);
      } catch {
        continue; // holder released between attempt and inspection — retry now
      }
      if (age > STALE_MS && !pidAlive(holderPid)) {
        throw new Error(
          `stale workspace mutex ${mutexPath} (holder pid ${holderPid} is gone) — ` +
            `verify no gate process is running, then delete that file manually and re-run`,
          { cause: err },
        );
      }
      sleepSync(SPIN_MS);
    }
  }
  if (!acquired) {
    throw new Error(`could not acquire workspace mutex ${mutexPath} — is another gate running?`);
  }
  try {
    return body();
  } finally {
    // Token-checked release: delete only what is still OURS.
    try {
      if (readFileSync(mutexPath, 'utf8').trim() === token) unlinkSync(mutexPath);
    } catch {
      /* marker gone or unreadable — nothing of ours to release */
    }
  }
}
