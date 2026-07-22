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
  | { kind: 'object'; children: Record<string, Spec> };

const str: Spec = { kind: 'string' };
const num: Spec = { kind: 'number' };
const strArr: Spec = { kind: 'stringArray' };
const strRec: Spec = { kind: 'stringRecord' };
const obj = (children: Record<string, Spec>): Spec => ({ kind: 'object', children });

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
    stateFile: str,
    locksDir: str,
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
  commands: obj({ checkTypes: str, lint: str, test: str, build: str }),
  owners: strArr,
  worktree: obj({ dir: str }),
  executionPhases: strArr,
  sharedAppendOnly: strArr,
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
