import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, posix, resolve, sep } from 'node:path';
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
 * Symlink containment for configured memory paths. The lexical rule in
 * `validate.ts` is pure and cannot see the filesystem, but a repository symlink
 * pointing outside the workspace spells a perfectly contained relative path —
 * so the check that needs a real root lives here, where one exists.
 */
function memoryPathsContained(root: string, config: WorkflowConfig): ConfigIssue[] {
  const memory = config.memory;
  // Only for an ENABLED store. Running this on the merged defaults meant a
  // repository that never opted in — but whose `_brain` happens to be a symlink —
  // failed every config load: a default-off violation introduced by the fix for
  // the symlink hole itself. The lexical rules still apply while disabled; they
  // are pure and cannot punish a filesystem someone else built.
  if (memory === undefined || !memory.enabled) return [];
  const issues: ConfigIssue[] = [];
  let rootReal: string;
  try {
    rootReal = realpathSync(resolve(root));
  } catch {
    return issues; // an unreadable root is not this check's failure to report
  }
  const entries: [string, string][] = [
    ['memory.root', memory.root],
    ['memory.index', memory.index],
    ...memory.entrypoints.map((e, i): [string, string] => [`memory.entrypoints[${i}]`, e]),
  ];
  for (const [path, value] of entries) {
    if (value.length === 0 || isAbsolute(value)) continue; // lexical rules own these
    let target = resolve(rootReal, value);
    for (;;) {
      try {
        const real = realpathSync(target);
        if (real !== rootReal && !real.startsWith(rootReal + sep)) {
          issues.push({ path, message: 'resolves outside the workspace through a symlink' });
        }
        break;
      } catch (error) {
        // Only "missing" means keep walking. An ELOOP path never establishes
        // containment and is unusable as a store either way.
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          issues.push({ path, message: 'could not be resolved to a contained path' });
          break;
        }
        const parent = dirname(target);
        if (parent === target) break;
        target = parent;
      }
    }
  }
  return issues;
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
  const merged = deepMerge(DEFAULT_CONFIG, parsed as PartialWorkflowConfig);
  const semanticIssues = [...validateResolvedConfig(merged), ...memoryPathsContained(root, merged)];
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
