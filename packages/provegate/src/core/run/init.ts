import { mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
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
  // Explicit empty floors, not `{}`: a bare object would inherit the default
  // pnpm gate commands, which a fresh (possibly non-node) scaffold cannot
  // resolve — and the wiring audit would rightly flag that. The scaffold
  // starts honest: no gates until the adopter wires their own.
  actions.push({
    path: MANIFEST_FILENAME,
    kind: 'file',
    content: `${JSON.stringify({ phases: { '4': [] }, postMerge: [] }, null, 2)}\n`,
  });
  return actions;
}

/** Root containment: config-controlled paths must stay inside `root` — no
 * absolute paths, no `..` escapes, and no symlinked parent that resolves
 * outside the repository. Throws instead of writing anywhere surprising. */
function containedPath(root: string, rel: string): string {
  if (isAbsolute(rel)) {
    throw new Error(`init refuses absolute path from config: ${rel}`);
  }
  const rootAbs = resolve(root);
  const full = resolve(rootAbs, rel);
  // Lexical containment first (no fs involved): `..` segments must not climb
  // out of root. Compared lexically-to-lexically — mixing in realpath here
  // would false-positive on symlinked roots like macOS /var -> /private/var.
  if (relative(rootAbs, full).startsWith('..')) {
    throw new Error(`init refuses path escaping the workspace root: ${rel}`);
  }
  const rootReal = realpathSync(rootAbs);
  // Walk to the nearest existing ancestor and resolve its symlinks: a
  // symlinked directory inside root must not point the write outside it.
  let ancestor = dirname(full);
  for (;;) {
    try {
      const real = realpathSync(ancestor);
      if (real !== rootReal && relative(rootReal, real).startsWith('..')) {
        throw new Error(`init refuses symlinked path escaping the workspace root: ${rel}`);
      }
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
      const parent = dirname(ancestor);
      if (parent === ancestor) break;
      ancestor = parent;
    }
  }
  return full;
}

/** Execute the plan. Existing paths are skipped, never touched: file writes
 * use the `wx` flag so create-vs-skip is atomic — no exists/write race can
 * truncate a concurrently created file. */
export function initWorkspace(
  config: WorkflowConfig,
  root: string,
  { dryRun = false }: { dryRun?: boolean } = {},
): InitReport {
  const report: InitReport = { created: [], skipped: [] };
  const rootAbs = resolve(root);
  // Validate the WHOLE plan before writing anything: a config with one bad
  // path must not leave a partial scaffold behind.
  const planned = planInit(config).map((action) => ({
    ...action,
    full: containedPath(rootAbs, action.path),
  }));
  for (const action of planned) {
    const full = action.full;
    if (dryRun) {
      // Plan-only: report what a live run would attempt (existing paths are
      // still reported as created here; the live run's `wx`/EEXIST is the
      // authoritative skip signal).
      try {
        realpathSync(full);
        report.skipped.push(action.path);
      } catch {
        report.created.push(action.path);
      }
      continue;
    }
    if (action.kind === 'dir') {
      try {
        realpathSync(full);
        report.skipped.push(action.path);
      } catch {
        mkdirSync(full, { recursive: true });
        report.created.push(action.path);
      }
    } else {
      try {
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, action.content ?? '', { flag: 'wx' });
        report.created.push(action.path);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        report.skipped.push(action.path);
      }
    }
  }
  return report;
}
