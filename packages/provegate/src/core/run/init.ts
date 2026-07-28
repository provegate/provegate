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
import {
  generatedPaths,
  packageVersion,
  parseRegistry,
  planStore,
  renderPrompts,
  requiredValues,
  type RenderConfig,
} from './prompts.js';
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
 * file teaches its own surface; everything else falls back to defaults.
 *
 * With the practices pack, `memory.enabled` is written explicitly. That is
 * configuration, not detection (invariant 4): the same run installs the record
 * store, so the opt-in is recorded in the file rather than inferred later from
 * a directory existing. A repository that scaffolds without the pack gets no
 * memory key at all and keeps the default-off behavior. */
function starterConfig(config: WorkflowConfig, memory: boolean): string {
  return `${JSON.stringify(
    {
      branches: { base: config.branches.base },
      idPattern: config.idPattern,
      // `entrypoints` ships WITH the switch. Enabled memory rejects an empty
      // list, and the default list is empty, so writing only `enabled: true`
      // produced a repository whose very next command failed configuration
      // validation — the pack installed a config that cannot load.
      ...(memory
        ? {
            memory: {
              enabled: true,
              entrypoints: ['AGENT_BOOTSTRAP.md', 'CLAUDE.md'],
            },
          }
        : {}),
    },
    null,
    2,
  )}\n`;
}

/** The validator the pack installs, wired where it belongs: Phase 7, after
 * capture (`verify-check-phase-placement`). */
const PACK_BRAIN_GATE = 'node scripts/verify/verify-brain.mjs';

/** The plan: every dir and file init would create for this config. With
 * `memory`, the scaffold is the practices one: the config opts in and the
 * manifest wires the packed validator. */
export function planInit(config: WorkflowConfig, { memory = false } = {}): InitAction[] {
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
  actions.push({ path: CONFIG_FILENAME, kind: 'file', content: starterConfig(config, memory) });
  // Explicit empty floors, not `{}`: a bare object would inherit the default
  // pnpm gate commands, which a fresh (possibly non-node) scaffold cannot
  // resolve — and the wiring audit would rightly flag that. The scaffold
  // starts honest: no gates until the adopter wires their own.
  //
  // The practices manifest is the opposite case and the reason `phases.4` is
  // OMITTED rather than emptied there. Manifest load deep-merges over the
  // built-in floor, so `phases.4: []` would ERASE the four configured floor
  // commands, while an absent key leaves them intact. The pack ships a runnable
  // node validator, so Phase 7 can be wired immediately; Phase 4 stays whatever
  // the adopter's config says it is.
  actions.push({
    path: MANIFEST_FILENAME,
    kind: 'file',
    content: `${JSON.stringify(
      memory ? { phases: { '7': [PACK_BRAIN_GATE] } } : { phases: { '4': [] }, postMerge: [] },
      null,
      2,
    )}\n`,
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
  { src: 'verify/verify-deferred.mjs', dest: 'scripts/verify/verify-deferred.mjs' },
  {
    src: 'verify/verify-test-task-coverage.mjs',
    dest: 'scripts/verify/verify-test-task-coverage.mjs',
  },
  {
    src: 'verify/verify-dependency-audit.mjs',
    dest: 'scripts/verify/verify-dependency-audit.mjs',
  },
  { src: 'verify/verify-workflow.mjs', dest: 'scripts/verify/verify-workflow.mjs' },
  { src: 'verify/test-task-allowlist.json', dest: 'scripts/verify/test-task-allowlist.json' },
  { src: 'verify/audit-allowlist.json', dest: 'scripts/verify/audit-allowlist.json' },
];

/**
 * The practices plan: pack content → repo files. Additive-only like the base
 * plan; agent-entrypoint files (CLAUDE.md, AGENTS.md, `.cursor/rules/brain.mdc`)
 * are deliberately ABSENT — shims stay in the pack and are pasted by the adopter
 * (NEXT_STEPS.md), so an existing entrypoint is never touched or shadowed.
 *
 * NARROWED by PRD-029, and the distinction matters because this comment reads as
 * a blanket rule: what is absent is an **adopter's own entrypoint**. A file at a
 * provegate-namespaced path the adopter does not own — `.claude/commands/prd-*.md`,
 * `.cursor/rules/prd-workflow.mdc` — is a GENERATED ADAPTER, not an entrypoint,
 * and `gate init --prompts` writes those. It shadows nothing, because nothing
 * else claims those paths, and it still never touches the three named above.
 * See `_brain/adr/ADR-0002-agent-protocol-delivery.md`.
 */
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
  {
    dryRun = false,
    extra = [],
    // Defaults to "this run installs the pack". Derived from what is being
    // written now, never from what already exists on disk — an adopter's stray
    // `_brain` directory must not turn a plain `gate init` into a memory-enabled
    // one.
    //
    // NO LONGER SUFFICIENT ON ITS OWN. `extra` was the practices plan and
    // nothing else; PRD-029 also routes the prompt plan through it, so a caller
    // passing prompt actions without setting this flag would silently get a
    // memory-enabled starter config and a Phase-7 manifest. The CLI passes it
    // explicitly for that reason; any new caller must too.
    practices = extra.length > 0,
  }: { dryRun?: boolean; extra?: InitAction[]; practices?: boolean } = {},
): InitReport {
  const report: InitReport = { created: [], skipped: [] };
  const rootAbs = resolve(root);
  // Validate the WHOLE plan before writing anything: a config with one bad
  // path must not leave a partial scaffold behind.
  // ACTIVATION IS WRITTEN LAST. `workflow.config.json` with `memory.enabled` and
  // the Phase 7 manifest are what turn the contract on, and `extra` is the store
  // and validator they activate. Writing the switch first meant an interrupted
  // install — or any later write failure — left a repository that demands a
  // memory contract and has no `_brain` to satisfy it.
  const activation = new Set(['workflow.config.json', 'gates.manifest.json']);
  const scaffold = planInit(config, { memory: practices });
  const planned = [
    ...scaffold.filter((action) => !activation.has(action.path)),
    ...extra,
    ...scaffold.filter((action) => activation.has(action.path)),
  ].map((action) => ({
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

/**
 * The `--prompts` plan (PRD-029 FR-5).
 *
 * Ordinary `InitAction`s, so the store goes through `initWorkspace` under the
 * installer's EXISTING contract: `wx` writes, an existing path reported as
 * skipped, nothing overwritten. There is deliberately **no preflight and no
 * mismatch refusal** — this plan behaves like the base and practices plans,
 * which is what keeps `gate init`'s additive-only promise intact for every
 * caller rather than carving out an exception that would then have to be
 * scoped away from them.
 *
 * Throws `PromptsError` before producing a single action when a required value
 * is unresolved, so a refused run writes nothing at all: no store file, no
 * adapter, and no starter config.
 */
export function planPrompts(config: WorkflowConfig, packageDir: string): InitAction[] {
  const version = packageVersion(packageDir);
  const result = renderPrompts(packageDir, config as unknown as RenderConfig);
  const generated = generatedPaths(config as unknown as RenderConfig, result, version);
  const actions: InitAction[] = [];
  const dirs = new Set<string>();
  for (const path of generated.keys()) {
    const parent = dirname(path);
    if (parent !== '.' && !dirs.has(parent)) {
      dirs.add(parent);
      actions.push({ path: parent, kind: 'dir' });
    }
  }
  for (const [path, content] of generated) actions.push({ path, kind: 'file', content });
  return actions;
}

/** The `prompts` block to write or to print, with every required key present
 * and unset as `null`. Printing it is the ONLY activation path an adopter with
 * an existing `workflow.config.json` has, because that file is never edited. */
export function promptsConfigBlock(config: WorkflowConfig, packageDir: string): string {
  const planned = planStore(packageDir);
  const registry = parseRegistry(
    readFileSync(resolve(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8'),
  );
  const required = requiredValues(packageDir, planned, registry);
  const values: Record<string, null> = {};
  for (const row of required) values[row.token] = null;
  const block = {
    prompts: {
      enabled: true,
      dir: config.prompts.dir,
      adapters: config.prompts.adapters,
      values,
    },
    templates: { prd: `${config.prompts.dir}/templates/prd-template.md` },
  };
  const meanings = required.map((r) => `  ${r.token} — ${r.meaning}`).join('\n');
  return `${JSON.stringify(block, null, 2)}\n\nvalues:\n${meanings}\n`;
}
