import { mkdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Workspace mutex for multi-process critical sections (id allocation, lease
 * claims). A `wx`-created marker file is the lock; the holder's pid+timestamp
 * are its content. Same-machine only — which is the lock domain that matters:
 * leases and artifact dirs live on one checkout.
 *
 * Staleness: a marker older than STALE_MS (crashed holder) is broken and
 * re-contended. Acquisition busy-waits with short sleeps, bounded.
 */

const STALE_MS = 30_000;
const ATTEMPTS = 100;
const SPIN_MS = 50;

function sleepSync(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

export function withWorkspaceMutex<T>(mutexPath: string, body: () => T): T {
  mkdirSync(dirname(mutexPath), { recursive: true });
  let acquired = false;
  for (let attempt = 0; attempt < ATTEMPTS && !acquired; attempt += 1) {
    try {
      writeFileSync(mutexPath, `${process.pid} ${new Date().toISOString()}\n`, { flag: 'wx' });
      acquired = true;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
      let age: number;
      try {
        age = Date.now() - statSync(mutexPath).mtimeMs;
      } catch {
        continue; // holder released between write-attempt and stat — retry now
      }
      if (age > STALE_MS) {
        // Crashed holder: break the stale lock and re-contend (the wx above
        // decides the new winner).
        try {
          unlinkSync(mutexPath);
        } catch {
          /* someone else broke it first */
        }
        continue;
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
    try {
      unlinkSync(mutexPath);
    } catch {
      /* already gone (stale-broken by a rival after our crash-length pause) */
    }
  }
}
