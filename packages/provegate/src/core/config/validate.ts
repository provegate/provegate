import { isSafeCommand } from '../gates/safety.js';
import type { ConfigIssue, WorkflowConfig } from './types.js';

/**
 * Hand-rolled structural validation (zero dependencies by design). The spec
 * tree below mirrors `WorkflowConfig`; unknown keys are issues so a typo in
 * `workflow.config.json` fails loud instead of silently keeping a default.
 */

type Spec =
  | { kind: 'string' }
  | { kind: 'cutoff' }
  | { kind: 'number' }
  | { kind: 'countOrZero' }
  | { kind: 'boolean' }
  | { kind: 'stringArray' }
  | { kind: 'stringRecord' }
  | { kind: 'stringOrNullRecord' }
  | { kind: 'numberRecord' }
  | { kind: 'maybeEmptyString' }
  | { kind: 'exceptionArray' }
  | { kind: 'object'; children: Record<string, Spec> };

const str: Spec = { kind: 'string' };
const num: Spec = { kind: 'number' };
const strArr: Spec = { kind: 'stringArray' };
const strRec: Spec = { kind: 'stringRecord' };
/** Values may be `null` (unset) or any string, including `''`. NOT `stringRecord`,
 * which rejects both — the two values PRD-029 FR-4 declares legal. */
const strOrNullRec: Spec = { kind: 'stringOrNullRecord' };
const numRec: Spec = { kind: 'numberRecord' };
const obj = (children: Record<string, Spec>): Spec => ({ kind: 'object', children });
const strOrEmpty: Spec = { kind: 'maybeEmptyString' };
const bool: Spec = { kind: 'boolean' };
/** A cadence: a count where 0 is a legal value meaning "off", unlike `num`. */
const countOrZero: Spec = { kind: 'countOrZero' };
/** A cutoff id: a non-negative integer where 0 means "enforce everywhere" — the
 * OPPOSITE of `countOrZero`'s 0. Reusing that spec produced a validation error
 * telling an adopter `0 disables it`, which is exactly backwards and would have
 * shipped as advice. */
const cutoff: Spec = { kind: 'cutoff' };

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
  valueScoring: obj({ axes: strArr, weights: numRec, enforceFrom: cutoff }),
  prompts: obj({
    enabled: bool,
    dir: str,
    adapters: strArr,
    values: strOrNullRec,
    // PRD-034 FR-2: array of { path, reason, owner, expires } records. Shape
    // here; the semantic contract (path grammar, dates, duplicates) lives in
    // load.ts beside the config's other semantic checks.
    exceptions: { kind: 'exceptionArray' },
  }),
  memory: obj({
    enabled: bool,
    root: str,
    index: str,
    entrypoints: strArr,
    verifyCommand: strOrEmpty,
    retroAfterCompleted: countOrZero,
  }),
  wiring: obj({ scriptsDir: str, hooksDir: str, bundlePath: str }),
});

/** The adapters this package can generate. A closed set by design: an adapter
 * is code, not configuration, so an unrecognised name is always a typo. */
export const KNOWN_ADAPTERS: readonly string[] = ['claude-code', 'cursor', 'codex'];

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
    case 'cutoff':
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        issues.push({
          path,
          message: 'must be a non-negative work-item id (0 enforces from the very first item)',
        });
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
    case 'numberRecord':
      // Shape only. The weight SEMANTICS — two decimals, sum to 1, key set
      // equal to the axes — need the resolved config, so they live in
      // `validateResolvedConfig`. Rejecting a non-number here keeps that
      // function from having to re-check types it was handed.
      if (
        !isPlainObject(value) ||
        Object.values(value).some((v) => typeof v !== 'number' || !Number.isFinite(v))
      ) {
        issues.push({ path, message: 'must be an object mapping strings to finite numbers' });
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
    case 'stringOrNullRecord':
      // Shape only, and deliberately permissive. `null` means unset and `''` is
      // legal for the tokens the registry marks so; per-token legality is a
      // RENDER decision because it needs the registry, which this layer must not
      // read. Unknown keys are likewise not checked here — see PromptsConfig.
      if (
        !isPlainObject(value) ||
        Object.values(value).some((v) => v !== null && typeof v !== 'string')
      ) {
        issues.push({ path, message: 'must be an object mapping strings to a string or null' });
      }
      return;
    case 'exceptionArray': {
      // PRD-034 FR-2, structural half. Unknown fields are refused — an entry
      // is an owner's recorded decision, and a silently dropped field is a
      // decision the record no longer says.
      if (!Array.isArray(value)) {
        issues.push({ path, message: 'must be an array of { path, reason, owner, expires } records' });
        return;
      }
      const FIELDS = ['path', 'reason', 'owner', 'expires'];
      value.forEach((entry, i) => {
        const at = `${path}[${i}]`;
        if (!isPlainObject(entry)) {
          issues.push({ path: at, message: 'must be an object with exactly path, reason, owner, expires' });
          return;
        }
        for (const key of Object.keys(entry)) {
          if (!FIELDS.includes(key)) issues.push({ path: `${at}.${key}`, message: 'unknown key' });
        }
        for (const key of FIELDS) {
          if (!(key in entry)) {
            issues.push({ path: `${at}.${key}`, message: 'missing — every field is required' });
            continue;
          }
          if (typeof entry[key] !== 'string') {
            issues.push({ path: `${at}.${key}`, message: 'must be a string' });
          }
        }
      });
      return;
    }
    case 'object': {
      if (!isPlainObject(value)) {
        issues.push({ path, message: 'must be an object' });
        return;
      }
      for (const key of Object.keys(value)) {
        // `in` walks the prototype chain, so `constructor`, `toString`, and
        // `__proto__` read as known keys and the unknown-key promise quietly
        // fails for exactly the names worth catching.
        if (!Object.hasOwn(spec.children, key)) {
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
  prompts?: { enabled?: boolean; dir?: string; adapters?: string[] };
  dirs: {
    states: string[];
    stateRoles: Record<string, string>;
    stateFile?: string;
    locksDir?: string;
    reviewsDir?: string;
    metricsFile?: string;
  };
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
  valueScoring?: { axes: string[]; weights: Record<string, number>; enforceFrom?: number };
  wiring?: { scriptsDir?: string; hooksDir?: string; bundlePath?: string };
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

  // EVERY configured path, not only the memory ones. `unsafeRelPath` was written
  // for the memory block and applied there alone, so `dirs.stateFile:
  // '../victim/prds.json'` resolved and `writeState` overwrote a file outside
  // the repository — a configuration read at startup, a write with no gate in
  // front of it. Containment is a property of a configured path, not of which
  // feature happens to own it.
  const configuredPaths: [string, string | undefined][] = [
    ['dirs.stateFile', config.dirs.stateFile],
    ['dirs.locksDir', config.dirs.locksDir],
    ['dirs.reviewsDir', config.dirs.reviewsDir],
    ['dirs.metricsFile', config.dirs.metricsFile],
    ...config.dirs.states.map((v, i): [string, string] => [`dirs.states[${i}]`, v]),
    ...Object.entries(config.dirs.stateRoles).map(
      ([role, v]): [string, string] => [`dirs.stateRoles.${role}`, v],
    ),
    // PRD-029. The comment above is the reason this line exists: containment is
    // a property of a configured path, and `prompts.dir` did not join the list
    // when it was added. Without it `~/store` was accepted, a literal `./~`
    // directory was created, and the printed one-way reinstall set — whose
    // instruction is "delete EVERY path above" — expanded to the adopter's HOME.
    ['prompts.dir', config.prompts?.dir],
    // PRD-025: the wiring audit's three READ paths. Lexical only here — the
    // audit resolves each through the runtime containment check before it is
    // opened, because a symlink escape is invisible to this function.
    ['wiring.scriptsDir', config.wiring?.scriptsDir],
    ['wiring.hooksDir', config.wiring?.hooksDir],
    ['wiring.bundlePath', config.wiring?.bundlePath],
  ];
  for (const [path, value] of configuredPaths) {
    if (value === undefined) continue;
    const reason = unsafeRelPath(value);
    if (reason !== null) issues.push({ path, message: reason });
  }

  // PRD-034 FR-2's one strictness addition to an existing key, named as the
  // behavior change it is: `prompts.dir` refuses backslashes at load. The
  // check's canonical report spelling is POSIX, and with a backslash in the
  // value no spelling can both name the real disk destination and stay
  // backslash-free — the config surface tightens instead. The changeset
  // carries the migration procedure. Checked whether or not prompts is
  // enabled: config validity is not feature-scoped.
  const promptsDir = config.prompts?.dir;
  if (promptsDir !== undefined && promptsDir.includes('\\')) {
    issues.push({
      path: 'prompts.dir',
      message:
        'must not contain a backslash — the reconciliation report spelling is POSIX (a PRD-034 behavior change; the release note carries the migration procedure)',
    });
  }

  // FR-1 specifies `adapters` as an ordered subset of a closed set. `stringArray`
  // enforces the shape and nothing enforced the membership, so a typo — `claude`
  // for `claude-code` — silently produced a store with no agent bound to it and
  // an exit code of 0. An empty list stays legal; an unrecognised member does not.
  const adapters = config.prompts?.adapters;
  if (adapters !== undefined) {
    for (const [i, name] of adapters.entries()) {
      if (KNOWN_ADAPTERS.includes(name)) continue;
      issues.push({
        path: `prompts.adapters[${i}]`,
        message: `unknown adapter '${name}' — known adapters are ${KNOWN_ADAPTERS.join(', ')}`,
      });
    }
  }

  if (config.valueScoring !== undefined) {
    issues.push(...validateValueScoring(config.valueScoring));
  }

  return issues;
}

/** An axis identifier: a letter, then up to 15 more letters/digits/underscores.
 * The charset is load-bearing rather than cosmetic — the value-header pattern is
 * BUILT from these identifiers, so admitting `/` (the dimension separator),
 * whitespace, or a regex metacharacter would let a configured axis change the
 * meaning of the pattern it appears in. Validate before any pattern is built. */
const AXIS_ID = /^[A-Za-z][A-Za-z0-9_]{0,15}$/;

/** A weight's decimal form, tested LEXICALLY. `Number.isInteger(0.29 * 100)` is
 * false — 0.29 * 100 is 28.999999999999996 — so an arithmetic two-decimal test
 * rejects a legal weight. JS emits the shortest round-tripping form, so
 * `String(0.29) === '0.29'` and the string is the honest thing to measure. */
const WEIGHT_FORM = /^0(\.\d{1,2})?$|^1(\.0{1,2})?$/;

function validateValueScoring(vs: {
  axes: string[];
  weights: Record<string, number>;
  enforceFrom?: number;
}): ConfigIssue[] {
  const issues: ConfigIssue[] = [];
  const { axes, weights } = vs;

  if (axes.length < 2 || axes.length > 10) {
    issues.push({
      path: 'valueScoring.axes',
      message: 'must declare between 2 and 10 axes (a one-axis score is the dimension itself)',
    });
  }
  const seen = new Map<string, string>();
  axes.forEach((axis, i) => {
    if (!AXIS_ID.test(axis)) {
      issues.push({
        path: `valueScoring.axes[${i}]`,
        message: `"${axis}" must match ${AXIS_ID.source} — the header pattern is built from it`,
      });
      return;
    }
    // Case-INSENSITIVE uniqueness. The generated pattern is case-insensitive,
    // because the source snapshot's regex is, so `MF` and `mf` would be
    // indistinguishable in a header while validating as two distinct axes. The
    // ambiguity is resolved here rather than by diverging from the snapshot.
    const key = axis.toLowerCase();
    const first = seen.get(key);
    if (first !== undefined) {
      issues.push({
        path: `valueScoring.axes[${i}]`,
        message: `"${axis}" duplicates "${first}" — axis identifiers are unique ignoring case`,
      });
      return;
    }
    seen.set(key, axis);
  });

  // The weight key set must EXACTLY equal the axis set, in both directions.
  // Neither may be defaulted: silently supplying a weight for an axis the
  // adopter never declared is how a score stops meaning what they think it does.
  const axisSet = new Set(axes);
  for (const axis of axes) {
    if (!Object.hasOwn(weights, axis)) {
      issues.push({
        path: `valueScoring.weights.${axis}`,
        message: 'missing — every declared axis needs a weight',
      });
    }
  }
  for (const key of Object.keys(weights)) {
    if (!axisSet.has(key)) {
      issues.push({
        path: `valueScoring.weights.${key}`,
        message: 'names an axis that valueScoring.axes does not declare',
      });
    }
  }

  let hundredths = 0;
  let scalable = true;
  for (const [key, weight] of Object.entries(weights)) {
    if (weight <= 0) {
      issues.push({ path: `valueScoring.weights.${key}`, message: 'must be greater than 0' });
      scalable = false;
      continue;
    }
    if (!WEIGHT_FORM.test(String(weight))) {
      issues.push({
        path: `valueScoring.weights.${key}`,
        message: `${String(weight)} must be written with at most two decimal places`,
      });
      scalable = false;
      continue;
    }
    hundredths += Math.round(weight * 100);
  }
  // Compared in integer hundredths, never float equality. The shipped five
  // weights happen to sum to exactly 1 as doubles — an earlier version of this
  // comment claimed otherwise and was simply wrong — but plenty of legal sets
  // do not: 0.06 + 0.57 + 0.37 is 0.9999999999999999, and a `=== 1` test would
  // reject it. Only reported when every weight was scalable, so a bad decimal
  // form does not also produce a confusing sum error.
  if (scalable && Object.keys(weights).length > 0 && hundredths !== 100) {
    issues.push({
      path: 'valueScoring.weights',
      message: `must sum to exactly 1 (got ${(hundredths / 100).toFixed(2)})`,
    });
  }

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
  // `~/` is home-relative; `~state.json` is an ordinary filename these Node
  // APIs never expand. Refusing every leading tilde rejected a legal
  // configuration for a shell convention that does not apply here.
  if (value === '~' || value.startsWith('~/') || value.startsWith('~\\')) {
    return 'must not start with ~/ (home-relative)';
  }
  // `C:foo` is drive-RELATIVE: it resolves against that drive's working
  // directory, not against this repository, so the slash is not what makes a
  // drive path dangerous.
  if (/^[/\\]/.test(value) || /^[A-Za-z]:/.test(value)) return 'must be repo-relative';
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
  // Compare normalized SEGMENTS, not raw strings: `./_brain` and `_brain` name
  // one directory, and a string prefix says otherwise.
  const segments = (value: string): string[] =>
    value.split(/[/\\]/).filter((part) => part.length > 0 && part !== '.');
  if (unsafeRelPath(memory.root) === null && unsafeRelPath(memory.index) === null) {
    const rootParts = segments(memory.root);
    const indexParts = segments(memory.index);
    const under =
      indexParts.length > rootParts.length && rootParts.every((part, i) => indexParts[i] === part);
    if (!under) {
      issues.push({
        path: 'memory.index',
        message: `must live under memory.root (${rootParts.join('/') || '.'})`,
      });
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
