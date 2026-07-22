import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import type { WorkflowState } from './build.js';

/**
 * Main checkout root — stable when invoked from a linked git worktree. Locks
 * live here so worktree cleanup cannot orphan active claims. The state
 * snapshot deliberately does NOT use this: state stays checkout-local because
 * it snapshots the current checkout's artifact tree.
 */
export function mainRepoRoot(root: string): string {
  try {
    const commonDir = execFileSync('git', ['rev-parse', '--git-common-dir'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    if (commonDir && commonDir !== '.git') {
      return dirname(resolve(root, commonDir));
    }
  } catch {
    // Not a git checkout (or git missing) — fall through to the given root.
  }
  return root;
}

export function statePath(config: WorkflowConfig, root: string): string {
  return resolve(root, config.dirs.stateFile);
}

export function readState(config: WorkflowConfig, root: string): WorkflowState | null {
  const path = statePath(config, root);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as WorkflowState;
}

/** Write the snapshot (2-space JSON + trailing newline), creating its
 * directory. Write-to-temp + rename so concurrent writers produce one intact
 * snapshot or the other — never an interleaved torso. */
export function writeState(config: WorkflowConfig, root: string, state: WorkflowState): string {
  const path = statePath(config, root);
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(state, null, 2)}\n`);
  renameSync(tmp, path);
  return path;
}
