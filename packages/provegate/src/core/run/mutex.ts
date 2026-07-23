import { mkdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/**
 * Workspace mutex for multi-process critical sections (id allocation, lease
 * claims). A `wx`-created marker file is the lock; its content is a unique
 * ownership token. Same-machine only — which is the lock domain that matters:
 * leases and artifact dirs live on one checkout.
 *
 * Ownership rules (overlap-proof):
 * - release deletes the marker ONLY while it still carries our token — a
 *   marker stale-broken and re-won by a successor is never torn down by the
 *   previous holder's `finally`;
 * - stale-breaking requires the holder to be BOTH old (mtime) and dead
 *   (`process.kill(pid, 0)` fails) — a live long-running holder is waited
 *   out, never broken.
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
        // Old AND dead: crashed holder. Break and re-contend (the wx above
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
    // Token-checked release: delete only what is still OURS.
    try {
      if (readFileSync(mutexPath, 'utf8').trim() === token) unlinkSync(mutexPath);
    } catch {
      /* marker gone or unreadable — nothing of ours to release */
    }
  }
}
