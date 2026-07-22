import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';

/**
 * Local gate metrics: append-only JSONL the user owns. No accounts, no
 * network, gitignored by default. A metrics write failure must never fail a
 * gate — best-effort with a stderr note.
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
  const path = resolve(root, config.dirs.metricsFile);
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
