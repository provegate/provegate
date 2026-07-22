import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

/** Resolve the effective config for a repo root. Absent file = pure defaults. */
export function resolveConfig(root: string): WorkflowConfig {
  const file = resolve(root, CONFIG_FILENAME);
  if (!existsSync(file)) return DEFAULT_CONFIG;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ConfigError(
      `${CONFIG_FILENAME} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const issues = validateConfig(parsed);
  if (issues.length > 0) {
    throw new ConfigError(`${CONFIG_FILENAME} is invalid`, issues);
  }
  const merged = deepMerge(DEFAULT_CONFIG, parsed as PartialWorkflowConfig);
  const semanticIssues = validateResolvedConfig(merged);
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
