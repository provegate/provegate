import { isSafeCommand } from '../gates/safety.js';
import type { ConfigIssue, WorkflowConfig } from './types.js';

/**
 * Hand-rolled structural validation (zero dependencies by design). The spec
 * tree below mirrors `WorkflowConfig`; unknown keys are issues so a typo in
 * `workflow.config.json` fails loud instead of silently keeping a default.
 */

type Spec =
  | { kind: 'string' }
  | { kind: 'number' }
  | { kind: 'countOrZero' }
  | { kind: 'boolean' }
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
const bool: Spec = { kind: 'boolean' };
/** A cadence: a count where 0 is a legal value meaning "off", unlike `num`. */
const countOrZero: Spec = { kind: 'countOrZero' };

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
  memory: obj({
    enabled: bool,
    root: str,
    index: str,
    entrypoints: strArr,
    verifyCommand: strOrEmpty,
    retroAfterCompleted: countOrZero,
  }),
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
    case 'boolean':
      if (typeof value !== 'boolean') {
        issues.push({ path, message: 'must be a boolean' });
      }
      return;
    case 'countOrZero':
      // A fractional or negative cadence is a typo, and `true` coerces to 1 in
      // arithmetic — both must fail here rather than silently arm a warning.
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        issues.push({ path, message: 'must be a non-negative integer (0 disables it)' });
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
  commands?: { allowedPrefixes: string[] };
  memory?: {
    enabled: boolean;
    root: string;
    index: string;
    entrypoints: string[];
    verifyCommand: string;
  };
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

  if (config.memory !== undefined) validateMemory(config, issues);

  return issues;
}

/**
 * Why a configured path is not usable as a repo-relative path, or null when it
 * is. Lexical only: a symlink that escapes the workspace still resolves to a
 * legal-looking relative path, so the runtime resolver checks that separately.
 * Both checks are needed — this one refuses what should never be written, the
 * runtime one refuses what the filesystem actually points at.
 */
function unsafeRelPath(value: string): string | null {
  if (value.length === 0) return 'must not be empty';
  if (value.startsWith('~')) return 'must not start with ~ (home-relative)';
  if (/^[/\\]/.test(value) || /^[A-Za-z]:[/\\]/.test(value)) return 'must be repo-relative';
  const segments = value.split(/[/\\]/);
  if (segments.includes('..')) return 'must not contain a `..` segment';
  return null;
}

function validateMemory(
  config: {
    memory?: {
      enabled: boolean;
      root: string;
      index: string;
      entrypoints: string[];
      verifyCommand: string;
    };
    commands?: { allowedPrefixes: string[] };
  },
  issues: ConfigIssue[],
): void {
  const memory = config.memory;
  if (memory === undefined) return;

  // Containment is checked whether or not memory is enabled: a typo parked in a
  // disabled block is a trap that springs on the day someone flips the switch.
  const paths: [string, string][] = [
    ['memory.root', memory.root],
    ['memory.index', memory.index],
    ...memory.entrypoints.map((e, i): [string, string] => [`memory.entrypoints[${i}]`, e]),
  ];
  for (const [path, value] of paths) {
    const reason = unsafeRelPath(value);
    if (reason !== null) issues.push({ path, message: reason });
  }

  // The index is the store's own entry point; one living outside the store
  // would be indexed by nothing and validated by nothing.
  const root = memory.root.replace(/\/+$/, '');
  if (unsafeRelPath(memory.root) === null && unsafeRelPath(memory.index) === null) {
    if (!memory.index.startsWith(`${root}/`)) {
      issues.push({ path: 'memory.index', message: `must live under memory.root (${root}/)` });
    }
  }

  if (memory.verifyCommand.length > 0 && config.commands !== undefined) {
    // Same allowlist as a §11 gate command — a validator invoked by the runner
    // is a user-gate command, and it gets no weaker check for being configured.
    if (!isSafeCommand({ commands: config.commands } as WorkflowConfig, memory.verifyCommand)) {
      issues.push({
        path: 'memory.verifyCommand',
        message: 'is not a safe command (shell metacharacter, or a non-allowlisted prefix)',
      });
    }
  }

  if (!memory.enabled) return;

  // Enabled means something must be able to load a record. An empty entrypoint
  // list is legal while disabled and meaningless once enabled.
  if (memory.entrypoints.length === 0) {
    issues.push({
      path: 'memory.entrypoints',
      message: 'must name at least one agent entrypoint when memory is enabled',
    });
  }
}
