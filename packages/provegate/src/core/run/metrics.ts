import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { mainRepoRoot } from '../state/io.js';

/**
 * Local gate metrics: append-only JSONL the user owns. No accounts, no
 * network, gitignored by default. A metrics write failure must never fail a
 * gate — best-effort with a stderr note.
 *
 * Metrics live on the MAIN checkout like locks do: a run executed from a
 * claimed worktree must not write evidence into a tree the post-merge
 * cleanup is about to delete (codex r6 P1).
 */

export interface MetricEntry {
  prd: string;
  phase: string;
  gate: string;
  result: string;
  durationMs?: number;
  why?: string | null;
}

export function appendMetric(
  config: WorkflowConfig,
  root: string,
  entry: MetricEntry,
  { now = new Date() }: { now?: Date } = {},
): boolean {
  const path = resolve(mainRepoRoot(root), config.dirs.metricsFile);
  try {
    mkdirSync(dirname(path), { recursive: true });
    appendFileSync(path, `${JSON.stringify({ ts: now.toISOString(), ...entry })}\n`);
    return true;
  } catch (error) {
    process.stderr.write(
      `[metrics] append failed (${error instanceof Error ? error.message : String(error)}) — continuing\n`,
    );
    return false;
  }
}
