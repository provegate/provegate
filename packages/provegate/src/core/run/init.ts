import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { CONFIG_FILENAME } from '../config/index.js';
import { MANIFEST_FILENAME } from '../gates/manifest.js';

/**
 * `gate init` — scaffold the gated-workflow tree. ADDITIVE-ONLY, always:
 * nothing is ever overwritten or deleted; existing paths are reported as
 * skipped. Idempotent by construction.
 */

export interface InitAction {
  path: string;
  kind: 'dir' | 'file';
  content?: string;
}

export interface InitReport {
  created: string[];
  skipped: string[];
}

/** Starter config: the two highest-churn fields populated from defaults so the
 * file teaches its own surface; everything else falls back to defaults. */
function starterConfig(config: WorkflowConfig): string {
  return `${JSON.stringify(
    {
      branches: { base: config.branches.base },
      idPattern: config.idPattern,
    },
    null,
    2,
  )}\n`;
}

/** The plan: every dir and file init would create for this config. */
export function planInit(config: WorkflowConfig): InitAction[] {
  const actions: InitAction[] = [];
  for (const artifact of Object.values(config.dirs.artifacts)) {
    for (const state of config.dirs.states) {
      actions.push({ path: join(artifact.dir, state), kind: 'dir' });
      actions.push({ path: join(artifact.dir, state, '.gitkeep'), kind: 'file', content: '' });
    }
  }
  const stateDir = dirname(config.dirs.stateFile);
  actions.push({ path: stateDir, kind: 'dir' });
  actions.push({ path: config.dirs.locksDir, kind: 'dir' });
  actions.push({ path: join(config.dirs.locksDir, '.gitkeep'), kind: 'file', content: '' });
  actions.push({ path: config.dirs.reviewsDir, kind: 'dir' });
  actions.push({ path: join(config.dirs.reviewsDir, '.gitkeep'), kind: 'file', content: '' });
  actions.push({ path: CONFIG_FILENAME, kind: 'file', content: starterConfig(config) });
  actions.push({ path: MANIFEST_FILENAME, kind: 'file', content: '{}\n' });
  return actions;
}

/** Execute the plan. Existing paths are skipped, never touched. */
export function initWorkspace(
  config: WorkflowConfig,
  root: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): InitReport {
  const report: InitReport = { created: [], skipped: [] };
  for (const action of planInit(config)) {
    const full = resolve(root, action.path);
    if (existsSync(full)) {
      report.skipped.push(action.path);
      continue;
    }
    if (!dryRun) {
      if (action.kind === 'dir') {
        mkdirSync(full, { recursive: true });
      } else {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, action.content ?? '');
      }
    }
    report.created.push(action.path);
  }
  return report;
}
