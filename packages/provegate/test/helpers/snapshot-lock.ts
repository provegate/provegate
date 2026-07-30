import { mkdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

/**
 * Cross-worker mutex over the REAL source-snapshot tree. Two test files touch
 * it concurrently — the frozen-digest walk (content-prompts) and the
 * stale-probe plant (verify-test-inputs, whose script run also writes its own
 * probe at the real root) — and vitest runs them in parallel workers, so a
 * probe planted mid-walk reads as an extra frozen file. mkdir is the atomic
 * primitive; a lock older than 60s belongs to a crashed worker and is stolen
 * rather than waited on forever.
 */
const LOCK_DIR = join(
  tmpdir(),
  // Keyed by this helper's own absolute path: unique per checkout, and not a
  // repo read — the test-inputs boundary refuses process.cwd() here.
  `pg-snapshot-lock-${createHash('sha256').update(fileURLToPath(import.meta.url)).digest('hex').slice(0, 12)}`,
);

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function withSnapshotLock<T>(fn: () => T | Promise<T>): Promise<T> {
  for (;;) {
    try {
      mkdirSync(LOCK_DIR);
      break;
    } catch {
      try {
        if (Date.now() - statSync(LOCK_DIR).mtimeMs > 60_000) {
          rmSync(LOCK_DIR, { recursive: true, force: true });
          continue;
        }
      } catch {
        continue; // vanished between mkdir and stat — retry immediately
      }
      await sleep(25);
    }
  }
  try {
    return await fn();
  } finally {
    rmSync(LOCK_DIR, { recursive: true, force: true });
  }
}
