import {
  chmodSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
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
  /** File mode for the `wx` write (git hooks need the exec bit). */
  mode?: number;
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

/** Shipped practices-pack root. Same package-root walk as the PRD template
 * resolver: dist/ is flat while src/ is nested, so walk up until the pack's
 * marker file appears. */
export function practicesPackDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = resolve(dir, 'practices/NEXT_STEPS.md');
    try {
      readFileSync(candidate);
      return resolve(dir, 'practices');
    } catch {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error('shipped practices/ pack not found — package layout broken');
      }
      dir = parent;
    }
  }
}

const HOOK_MODE = 0o755;

/** Pack file → repo destination. Explicit table, not a glob walk: every
 * destination is reviewable here, and a stray file added to the pack can
 * never silently install itself. `learnings/` is the ONLY enumerated dir,
 * and it is guarded: only `.md` files install, and the fixture pins the
 * count to the INDEX pointer count. */
const PACK_MAP: ReadonlyArray<{ src: string; dest: string; mode?: number }> = [
  { src: 'brain/PROTOCOL.md', dest: '_brain/PROTOCOL.md' },
  { src: 'brain/README.md', dest: '_brain/README.md' },
  { src: 'brain/INDEX.md', dest: '_brain/INDEX.md' },
  { src: 'brain/_templates/learning.md', dest: '_brain/_templates/learning.md' },
  { src: 'brain/_templates/adr.md', dest: '_brain/_templates/adr.md' },
  // npm strips .gitignore files from packed tarballs, so the pack ships it
  // under a plain name and init writes the real dotfile.
  { src: 'brain/private-gitignore', dest: '_brain/private/.gitignore' },
  { src: 'templates/AGENT_BOOTSTRAP.template.md', dest: 'AGENT_BOOTSTRAP.md' },
  { src: 'templates/STATUS.template.md', dest: 'STATUS.md' },
  { src: 'templates/commitlint.config.template.mjs', dest: 'commitlint.config.mjs' },
  { src: 'templates/review-artifact.template.md', dest: '_docs/review-artifact.template.md' },
  { src: 'templates/retros-README.md', dest: '_docs/retros/README.md' },
  { src: 'templates/known-red-verifies.json', dest: '_state/known-red-verifies.json' },
  { src: 'hooks/pre-commit', dest: '.githooks/pre-commit', mode: HOOK_MODE },
  { src: 'hooks/commit-msg', dest: '.githooks/commit-msg', mode: HOOK_MODE },
  { src: 'scripts/base-branch-guard.mjs', dest: 'scripts/base-branch-guard.mjs' },
  { src: 'scripts/secret-scan.mjs', dest: 'scripts/secret-scan.mjs' },
  { src: 'verify/lib.mjs', dest: 'scripts/verify/lib.mjs' },
  { src: 'verify/verify-brain.mjs', dest: 'scripts/verify/verify-brain.mjs' },
  { src: 'verify/verify-review-artifact.mjs', dest: 'scripts/verify/verify-review-artifact.mjs' },
  {
    src: 'verify/verify-durable-artifacts.mjs',
    dest: 'scripts/verify/verify-durable-artifacts.mjs',
  },
  { src: 'verify/verify-deferred.mjs', dest: 'scripts/verify/verify-deferred.mjs' },
  {
    src: 'verify/verify-test-task-coverage.mjs',
    dest: 'scripts/verify/verify-test-task-coverage.mjs',
  },
  { src: 'verify/verify-gates-wired.mjs', dest: 'scripts/verify/verify-gates-wired.mjs' },
  {
    src: 'verify/verify-dependency-audit.mjs',
    dest: 'scripts/verify/verify-dependency-audit.mjs',
  },
  { src: 'verify/verify-workflow.mjs', dest: 'scripts/verify/verify-workflow.mjs' },
  { src: 'verify/gates-wired-exceptions.json', dest: 'scripts/verify/gates-wired-exceptions.json' },
  { src: 'verify/test-task-allowlist.json', dest: 'scripts/verify/test-task-allowlist.json' },
  { src: 'verify/audit-allowlist.json', dest: 'scripts/verify/audit-allowlist.json' },
];

/** The practices plan: pack content → repo files. Additive-only like the base
 * plan; agent-entrypoint files (CLAUDE.md, AGENTS.md, cursor rules) are
 * deliberately ABSENT — shims stay in the pack and are pasted by the adopter
 * (NEXT_STEPS.md), so an existing entrypoint is never touched or shadowed. */
export function planPractices(packDir: string): InitAction[] {
  const actions: InitAction[] = [
    { path: '_brain/adr', kind: 'dir' },
    { path: '_brain/learnings', kind: 'dir' },
  ];
  const readPack = (rel: string) => readFileSync(join(packDir, rel), 'utf8');
  for (const { src, dest, mode } of PACK_MAP) {
    actions.push({ path: dest, kind: 'file', content: readPack(src), ...(mode ? { mode } : {}) });
  }
  for (const f of readdirSync(join(packDir, 'brain', 'learnings')).sort()) {
    if (!f.endsWith('.md')) continue;
    actions.push({
      path: join('_brain/learnings', f),
      kind: 'file',
      content: readPack(join('brain/learnings', f)),
    });
  }
  return actions;
}

/** True when `target` lies outside `base`. A bare `startsWith('..')` would
 * false-positive on contained names like `..cache` — the escape marker is the
 * exact `..` segment (or a cross-root/absolute relative on Windows). */
function escapesBase(base: string, target: string): boolean {
  const rel = relative(base, target);
  return rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel);
}

/** Root containment: config-controlled paths must stay inside `root` — no
 * absolute paths, no `..` escapes, and no symlinked parent that resolves
 * outside the repository. Throws instead of writing anywhere surprising.
 * Shared by every config-driven write path (init, new, open). */
export function containedPath(root: string, rel: string): string {
  if (isAbsolute(rel)) {
    throw new Error(`init refuses absolute path from config: ${rel}`);
  }
  const rootAbs = resolve(root);
  const full = resolve(rootAbs, rel);
  // Lexical containment first (no fs involved): `..` segments must not climb
  // out of root. Compared lexically-to-lexically — mixing in realpath here
  // would false-positive on symlinked roots like macOS /var -> /private/var.
  if (escapesBase(rootAbs, full)) {
    throw new Error(`init refuses path escaping the workspace root: ${rel}`);
  }
  const rootReal = realpathSync(rootAbs);
  // Walk to the nearest existing ancestor and resolve its symlinks: a
  // symlinked directory inside root must not point the write outside it.
  let ancestor = dirname(full);
  for (;;) {
    try {
      const real = realpathSync(ancestor);
      if (real !== rootReal && escapesBase(rootReal, real)) {
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
  { dryRun = false, extra = [] }: { dryRun?: boolean; extra?: InitAction[] } = {},
): InitReport {
  const report: InitReport = { created: [], skipped: [] };
  const rootAbs = resolve(root);
  // Validate the WHOLE plan before writing anything: a config with one bad
  // path must not leave a partial scaffold behind.
  const planned = [...planInit(config), ...extra].map((action) => ({
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
        writeFileSync(full, action.content ?? '', {
          flag: 'wx',
          ...(action.mode !== undefined ? { mode: action.mode } : {}),
        });
        // writeFileSync's mode is masked by the process umask — a umask
        // carrying exec bits would strip them from a hook. chmod to the
        // exact declared mode right after the successful create (EEXIST
        // skips never reach here, so an adopter's own file is never touched).
        if (action.mode !== undefined) chmodSync(full, action.mode);
        report.created.push(action.path);
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
        report.skipped.push(action.path);
      }
    }
  }
  return report;
}
