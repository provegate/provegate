import { existsSync, lstatSync, readFileSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, posix, resolve, sep } from 'node:path';
import { DEFAULT_CONFIG } from './defaults.js';
import type { ConfigIssue, PartialWorkflowConfig, WorkflowConfig } from './types.js';
import { validateConfig, validateResolvedConfig } from './validate.js';

export const CONFIG_FILENAME = 'workflow.config.json';

export class ConfigError extends Error {
  readonly issues: ConfigIssue[];

  constructor(message: string, issues: ConfigIssue[] = []) {
    const detail = issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n');
    super(detail.length > 0 ? `${message}\n${detail}` : message);
    this.name = 'ConfigError';
    this.issues = issues;
  }
}

/**
 * Walk up from `cwd` to the repo root: the nearest directory containing
 * `workflow.config.json` or `.git`. An installed package cannot root itself
 * from its own file location, so discovery starts at the caller's cwd.
 */
export function findRepoRoot(cwd: string = process.cwd()): string {
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(resolve(dir, CONFIG_FILENAME)) || existsSync(resolve(dir, '.git'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new ConfigError(
        `no ${CONFIG_FILENAME} or .git found walking up from ${resolve(cwd)} — run inside a repository or create a ${CONFIG_FILENAME}`,
      );
    }
    dir = parent;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Plain objects merge recursively; arrays and scalars replace wholesale. */
/**
 * Is this volume case-insensitive? Probed, not assumed: `process.platform` is a
 * proxy that is wrong in both directions — a case-SENSITIVE volume on macOS, a
 * case-insensitive one mounted on Linux — and getting it wrong either accepts an
 * outside path or rejects a contained one.
 */
function volumeIsCaseInsensitive(root: string): boolean {
  const flipped = join(
    dirname(root),
    basename(root)
      .split('')
      .map((c) => (c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()))
      .join(''),
  );
  if (flipped === root) return false; // nothing to flip (digits, symbols)
  try {
    const a = statSync(root);
    const b = statSync(flipped);
    return a.ino === b.ino && a.dev === b.dev;
  } catch {
    return false;
  }
}

/**
 * The canonical form of `path`, or null when it cannot be determined. Resolves
 * the longest EXISTING prefix through `realpath` — which follows symlinked
 * PARENTS, the case a segment-by-segment walk gets wrong — and re-attaches the
 * not-yet-created tail lexically.
 */
function canonicalOrNull(path: string): string | null {
  let existing = path;
  const tail: string[] = [];
  for (;;) {
    try {
      const real = realpathSync(existing);
      return tail.length === 0 ? real : join(real, ...tail);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return null;
      const parent = dirname(existing);
      if (parent === existing) return null;
      tail.unshift(basename(existing));
      existing = parent;
    }
  }
}

/** Where a symlink chain starting at `path` ends, or null when it cannot be read. */
function chainEnd(path: string): string | null {
  let current = path;
  for (let hops = 0; hops < 40; hops++) {
    let info;
    try {
      info = lstatSync(current);
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT' ? current : null;
    }
    if (!info.isSymbolicLink()) return current;
    const target = readlinkSync(current);
    current = isAbsolute(target) ? target : resolve(dirname(current), target);
  }
  return null; // a loop, or a chain long enough to be one
}

/**
 * Filesystem containment for configured memory paths — the store, its index, and
 * the agent entrypoints. Unlike a watch glob, these ARE dereferenced: something
 * reads them. They are also single concrete paths with no wildcards, so the
 * question is decidable and worth asking properly.
 *
 * Four cases a simpler version missed, each found in review: a symlink resolving
 * outside; a DANGLING symlink, whose `realpath` raises ENOENT exactly like an
 * ordinary missing path; a CHAIN whose first hop points at an in-repo name that
 * itself points outside; and a symlinked PARENT, where the final component is
 * not a link and the lexical spelling still names something else entirely.
 * Anything that is not a clean "does not exist yet" fails closed.
 */
/**
 * The filesystem containment primitive both configured-path checks share:
 * resolve each entry under the workspace root and report the ones that escape.
 *
 * Extracted for PRD-029 with the callers' decisions left where they were. Each
 * caller still owns its own enabled-guard and its own entry list, because those
 * are the decisions `strictness-added-during-extraction-is-a-behavior-change`
 * warns about relocating. Nothing here is stricter than what
 * `memoryPathsContained` did before the extraction, and the memory suite passes
 * unmodified — that is the proof, not this comment.
 */
function resolveContainedPaths(
  root: string,
  entries: [string, string][],
): { issues: ConfigIssue[]; resolved: Map<string, string>; under: Under | null } {
  const issues: ConfigIssue[] = [];
  const resolved = new Map<string, string>();
  let rootReal: string;
  try {
    rootReal = realpathSync(resolve(root));
  } catch {
    return { issues, resolved, under: null }; // an unreadable root is not this check's failure to report
  }

  const insensitive = volumeIsCaseInsensitive(rootReal);
  const norm = (value: string): string => (insensitive ? value.toLowerCase() : value);
  const under = (candidate: string, base: string): boolean =>
    norm(candidate) === norm(base) || norm(candidate).startsWith(norm(base) + sep);

  /** The canonical destination of `value` under `rootReal`, or a verdict. */
  const destination = (value: string): { path: string } | { fail: 'outside' | 'unresolvable' } => {
    let current = rootReal;
    for (const segment of value.split(/[/\\]/).filter((s) => s.length > 0 && s !== '.')) {
      current = resolve(current, segment);
      // A dangling link resolves to nothing, so read the chain itself; a live
      // one is canonicalized below, which also follows symlinked parents.
      const end = chainEnd(current);
      if (end === null) return { fail: 'unresolvable' };
      if (!under(end, rootReal)) return { fail: 'outside' };
      const canonical = canonicalOrNull(current);
      if (canonical === null) return { fail: 'unresolvable' };
      if (!under(canonical, rootReal)) return { fail: 'outside' };
      current = canonical;
    }
    return { path: current };
  };

  for (const [path, value] of entries) {
    if (value.length === 0 || isAbsolute(value)) continue; // lexical rules own these
    const outcome = destination(value);
    if ('fail' in outcome) {
      issues.push({
        path,
        message:
          outcome.fail === 'outside'
            ? 'resolves outside the workspace through a symlink'
            : 'could not be resolved to a contained path',
      });
      continue;
    }
    resolved.set(path, outcome.path);
  }
  return { issues, resolved, under };
}

/** `(candidate, base) => candidate is at or below base`, volume-case aware. */
type Under = (candidate: string, base: string) => boolean;

function memoryPathsContained(root: string, config: WorkflowConfig): ConfigIssue[] {
  const memory = config.memory;
  // Only for an ENABLED store. Running this on the merged defaults meant a
  // repository that never opted in — but whose `_brain` happens to be a symlink —
  // failed every config load: a default-off violation introduced by the fix for
  // the symlink hole itself. The lexical rules still apply while disabled; they
  // are pure and cannot punish a filesystem someone else built.
  if (memory === undefined || !memory.enabled) return [];
  const { issues, resolved, under } = resolveContainedPaths(root, [
    ['memory.root', memory.root],
    ['memory.index', memory.index],
    ...memory.entrypoints.map((e, i): [string, string] => [`memory.entrypoints[${i}]`, e]),
  ]);
  if (under === null) return issues;

  // The index must resolve under the STORE, not merely inside the repository:
  // a link that leaves the store makes the scanner and the loader address two
  // different sets of records.
  const storeReal = resolved.get('memory.root');
  const indexReal = resolved.get('memory.index');
  if (storeReal !== undefined && indexReal !== undefined && !under(indexReal, storeReal)) {
    issues.push({ path: 'memory.index', message: 'resolves outside memory.root' });
  }
  return issues;
}

/**
 * Filesystem containment for the configured protocol store (PRD-029 FR-1).
 *
 * `prompts.dir` does not exist on a first install, which is the case a literal
 * realpath-both-sides check refuses. The shared primitive walks the longest
 * existing prefix and reattaches the missing tail, so a not-yet-created
 * `.provegate` passes while a symlink escaping the workspace does not.
 */
function promptsPathContained(root: string, config: WorkflowConfig): ConfigIssue[] {
  const prompts = config.prompts;
  // Enabled-only, for the reason the memory guard above records: a disabled
  // block must not fail a config load over a filesystem nobody opted into.
  if (prompts === undefined || !prompts.enabled) return [];
  return resolveContainedPaths(root, [['prompts.dir', prompts.dir]]).issues;
}

/**
 * `DEFAULT_CONFIG` merged with a parsed config — with ONE keyed exception.
 *
 * `deepMerge` recurses into plain objects, which is what every config key wants
 * except `valueScoring`. There, `axes` is an array (replaced wholesale) while
 * `weights` is an object (merged), so a three-axis override would arrive at
 * validation carrying the five DEFAULT weight keys and fail its own
 * set-equality rule. Every legal custom-axis config would be an error.
 *
 * So when a config declares `axes`, its `valueScoring` replaces the default
 * outright and nothing is filled in for it. Declaring `weights` ALONE is a
 * different case and stays an ordinary recursive merge: that is an adopter
 * retuning the default axes — moving MF to .30 and UI to .20 while leaving the
 * rest — which is a normal thing to want, and the sum-to-1 rule is what catches
 * an incoherent partial rather than a blanket refusal.
 *
 * `deepMerge` itself is untouched; the exception lives here, where the merge is
 * decided, and not in validation, which runs afterwards and cannot see what the
 * adopter actually wrote.
 */
function mergeConfig(parsed: PartialWorkflowConfig): WorkflowConfig {
  const merged = deepMerge(DEFAULT_CONFIG, parsed);
  const declaredAxes = parsed.valueScoring?.axes;
  if (declaredAxes !== undefined) {
    return { ...merged, valueScoring: parsed.valueScoring as WorkflowConfig['valueScoring'] };
  }
  return merged;
}

export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    out[key] = key in base ? deepMerge((base as Record<string, unknown>)[key], value) : value;
  }
  return out as T;
}

/** The raw config bytes the LAST resolveConfig parsed, per repo root. A
 * caller proving "the checkout carries the config this claim ran on" must
 * hash these exact bytes — re-reading the path leaves a window in which the
 * file can be restored to its committed form (codex prd-007 r22 P1). */
const configSourceByRoot = new Map<string, string>();

/** The bytes resolveConfig parsed for `root`, or null when the repo has no
 * config file (defaults in effect). */
export function configSourceFor(root: string): string | null {
  return configSourceByRoot.get(resolve(root)) ?? null;
}

/** Resolve the effective config for a repo root. Absent file = pure defaults. */
export function resolveConfig(root: string): WorkflowConfig {
  const file = resolve(root, CONFIG_FILENAME);
  if (!existsSync(file)) {
    configSourceByRoot.delete(resolve(root));
    return DEFAULT_CONFIG;
  }

  let parsed: unknown;
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
    parsed = JSON.parse(source);
  } catch (error) {
    throw new ConfigError(
      `${CONFIG_FILENAME} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const issues = validateConfig(parsed);
  if (issues.length > 0) {
    throw new ConfigError(`${CONFIG_FILENAME} is invalid`, issues);
  }
  configSourceByRoot.set(resolve(root), source);
  const merged = mergeConfig(parsed as PartialWorkflowConfig);
  const semanticIssues = [
    ...validateResolvedConfig(merged),
    ...memoryPathsContained(root, merged),
    ...promptsPathContained(root, merged),
  ];
  if (semanticIssues.length > 0) {
    throw new ConfigError(`${CONFIG_FILENAME} is semantically invalid`, semanticIssues);
  }
  return merged;
}

/** Discover the repo root from `cwd` and resolve its config. */
export function loadConfig(cwd: string = process.cwd()): { root: string; config: WorkflowConfig } {
  const root = findRepoRoot(cwd);
  return { root, config: resolveConfig(root) };
}

/** The configured worktree dir in canonical relative spelling: `./.worktrees`
 * and `.worktrees/` both mean `.worktrees`. Every consumer — lease stamps,
 * schema validation, exclude entries, dirt-path prefixes, containment bases —
 * must agree on ONE spelling or a valid noncanonical config produces
 * schema-invalid leases and refused closes (codex prd-007 r8/r9). */
export function normalizedWorktreeDir(config: WorkflowConfig): string {
  // Canonical repo-relative paths are POSIX-separated on EVERY platform: the
  // spelling is compared against git porcelain output and written into
  // leases and ignore patterns, all of which use `/`. Separator conversion
  // happens BEFORE normalization so a shared Windows-style spelling
  // (`.\\.worktrees\\`) canonicalizes on POSIX too (codex prd-007 r10/r11).
  const flat = posix.normalize(config.worktree.dir.replaceAll('\\', '/'));
  return flat.endsWith('/') ? flat.slice(0, -1) : flat;
}
