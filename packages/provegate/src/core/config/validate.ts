import type { ConfigIssue } from './types.js';

/**
 * Hand-rolled structural validation (zero dependencies by design). The spec
 * tree below mirrors `WorkflowConfig`; unknown keys are issues so a typo in
 * `workflow.config.json` fails loud instead of silently keeping a default.
 */

type Spec =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'stringArray' }
  | { kind: 'stringRecord' }
  | { kind: 'maybeEmptyString' }
  | { kind: 'object'; children: Record<string, Spec> };

const str: Spec = { kind: 'string' };
const num: Spec = { kind: 'number' };
const strArr: Spec = { kind: 'stringArray' };
const strRec: Spec = { kind: 'stringRecord' };
const obj = (children: Record<string, Spec>): Spec => ({ kind: 'object', children });
const strOrEmpty: Spec = { kind: 'maybeEmptyString' };

const artifactKind = obj({ dir: str, prefix: str });

const CONFIG_SPEC = obj({
  dirs: obj({
    artifacts: obj({
      prd: artifactKind,
      readiness: artifactKind,
      tasks: artifactKind,
      summary: artifactKind,
    }),
    states: strArr,
    stateRoles: obj({ wip: str, completed: str, deferred: str }),
    stateFile: str,
    locksDir: str,
    reviewsDir: str,
    metricsFile: str,
  }),
  idPattern: obj({ prefix: str, width: num }),
  statusVocab: obj({
    canonical: strArr,
    aliases: strRec,
    active: strArr,
    implemented: strArr,
    ready: strArr,
    blocked: strArr,
    reviewing: strArr,
  }),
  branches: obj({
    base: str,
    protected: strArr,
    featurePattern: str,
    allowedDirectPrefixes: strArr,
    allowedDirectFiles: strArr,
  }),
  commands: obj({ checkTypes: str, lint: str, test: str, build: str, allowedPrefixes: strArr }),
  owners: strArr,
  worktree: obj({ dir: str }),
  executionPhases: strArr,
  sharedAppendOnly: strArr,
  classes: strArr,
  verifyScriptPattern: str,
  templates: obj({ prd: strOrEmpty }),
});

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function walk(spec: Spec, value: unknown, path: string, issues: ConfigIssue[]): void {
  switch (spec.kind) {
    case 'string':
      if (typeof value !== 'string' || value.length === 0) {
        issues.push({ path, message: 'must be a non-empty string' });
      }
      return;
    case 'maybeEmptyString':
      if (typeof value !== 'string') {
        issues.push({ path, message: 'must be a string' });
      }
      return;
    case 'number':
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
        issues.push({ path, message: 'must be a positive integer' });
      }
      return;
    case 'stringArray':
      if (!Array.isArray(value) || value.some((v) => typeof v !== 'string' || v.length === 0)) {
        issues.push({ path, message: 'must be an array of non-empty strings' });
      }
      return;
    case 'stringRecord':
      if (
        !isPlainObject(value) ||
        Object.values(value).some((v) => typeof v !== 'string' || v.length === 0)
      ) {
        issues.push({ path, message: 'must be an object mapping strings to non-empty strings' });
      }
      return;
    case 'object': {
      if (!isPlainObject(value)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }
      for (const key of Object.keys(value)) {
        if (!(key in spec.children)) {
          issues.push({ path: path === '' ? key : `${path}.${key}`, message: 'unknown key' });
        }
      }
      for (const [key, childSpec] of Object.entries(spec.children)) {
        if (key in value) {
          walk(childSpec, value[key], path === '' ? key : `${path}.${key}`, issues);
        }
      }
      return;
    }
  }
}

/**
 * Validate a (possibly partial) config value. Absent keys are fine — they fall
 * back to defaults at merge time; present keys must have the right shape.
 */
export function validateConfig(value: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  walk(CONFIG_SPEC, value, '', issues);
  return issues;
}

/**
 * Semantic cross-checks on the MERGED (complete) config — shape checks alone
 * let a typo like `ready: ["Approvd"]` silently break queue semantics.
 */
export function validateResolvedConfig(config: {
  dirs: { states: string[]; stateRoles: Record<string, string> };
  statusVocab: {
    canonical: string[];
    aliases: Record<string, string>;
    active: string[];
    implemented: string[];
    ready: string[];
    blocked: string[];
    reviewing: string[];
  };
  executionPhases: string[];
  classes?: string[];
}): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (config.dirs.states.length === 0) {
    issues.push({ path: 'dirs.states', message: 'must not be empty' });
  }
  for (const [role, state] of Object.entries(config.dirs.stateRoles)) {
    if (!config.dirs.states.includes(state)) {
      issues.push({
        path: `dirs.stateRoles.${role}`,
        message: `"${state}" is not one of dirs.states`,
      });
    }
  }

  const canonical = new Set(config.statusVocab.canonical);
  for (const [alias, target] of Object.entries(config.statusVocab.aliases)) {
    if (!canonical.has(target)) {
      issues.push({
        path: `statusVocab.aliases.${alias}`,
        message: `maps to "${target}" which is not in statusVocab.canonical`,
      });
    }
  }
  for (const set of ['active', 'implemented', 'ready', 'blocked', 'reviewing'] as const) {
    for (const status of config.statusVocab[set]) {
      if (!canonical.has(status)) {
        issues.push({
          path: `statusVocab.${set}`,
          message: `"${status}" is not in statusVocab.canonical`,
        });
      }
    }
  }

  if (config.executionPhases.length === 0) {
    issues.push({ path: 'executionPhases', message: 'must not be empty' });
  }

  if (config.classes !== undefined && config.classes.length === 0) {
    issues.push({ path: 'classes', message: 'must not be empty' });
  }

  return issues;
}
