import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deepMerge, type WorkflowConfig } from '../config/index.js';

/**
 * The gates manifest — user-owned gate membership and policy. Split from
 * workflow.config deliberately: config is near-static repo shape, the manifest
 * is expected to churn per project as gates are added.
 */

export const MANIFEST_FILENAME = 'gates.manifest.json';

export interface ClassRule {
  /** Optional condition: rule applies when any changed file matches a glob. */
  when?: { diffMatches: string[] };
  run: string[];
}

export interface HardCap {
  id: string;
  /** Fires when any FR target path matches one of these globs... */
  when: { targetsMatch: string[] };
  /** ...and this regex (source form) finds no match in the PRD content. */
  requireLine: string;
  message: string;
}

export interface GatesManifest {
  /** Phase key (`"4"`, `"6"`, `"7"`) → command chain run in that phase. */
  phases: Record<string, string[]>;
  /** Class name → conditional extra gates for phase 4. */
  classDefaults: Record<string, ClassRule[]>;
  hardCaps: HardCap[];
  /** Gates re-run on the base checkout after the local merge. */
  postMerge: string[];
  /** Wiring-audit exceptions: gate/script name → justification. Shrink-only. */
  wiringExceptions: Record<string, string>;
}

export interface ManifestIssue {
  path: string;
  message: string;
}

export class ManifestError extends Error {
  readonly issues: ManifestIssue[];

  constructor(message: string, issues: ManifestIssue[] = []) {
    const detail = issues.map((issue) => `  - ${issue.path}: ${issue.message}`).join('\n');
    super(detail.length > 0 ? `${message}\n${detail}` : message);
    this.name = 'ManifestError';
    this.issues = issues;
  }
}

/** Built-in floor: phase 4 runs the four config commands; merge re-checks two. */
export function defaultManifest(config: WorkflowConfig): GatesManifest {
  return {
    phases: {
      '4': [
        config.commands.checkTypes,
        config.commands.lint,
        config.commands.build,
        config.commands.test,
      ],
    },
    classDefaults: {},
    hardCaps: [],
    postMerge: [config.commands.checkTypes, config.commands.build],
    wiringExceptions: {},
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCommandArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string' && v.trim().length > 0);
}

/** Non-empty string array — vacuous `[]` must not satisfy rule/glob slots. */
function isNonEmptyCommandArray(value: unknown): value is string[] {
  return isCommandArray(value) && value.length > 0;
}

const KNOWN_KEYS = new Set([
  'phases',
  'classDefaults',
  'hardCaps',
  'postMerge',
  'wiringExceptions',
]);

/** Shape + semantic validation of a (partial) manifest value. */
export function validateManifest(config: WorkflowConfig, value: unknown): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  if (!isPlainObject(value)) {
    return [{ path: '', message: 'manifest must be a JSON object' }];
  }
  for (const key of Object.keys(value)) {
    if (!KNOWN_KEYS.has(key)) issues.push({ path: key, message: 'unknown key' });
  }

  const phases = value['phases'];
  if (phases !== undefined) {
    if (!isPlainObject(phases)) {
      issues.push({ path: 'phases', message: 'must be an object of phase → command list' });
    } else {
      for (const [phase, cmds] of Object.entries(phases)) {
        if (!isCommandArray(cmds)) {
          issues.push({
            path: `phases.${phase}`,
            message: 'must be an array of non-empty commands',
          });
        }
      }
    }
  }

  const classDefaults = value['classDefaults'];
  if (classDefaults !== undefined) {
    if (!isPlainObject(classDefaults)) {
      issues.push({ path: 'classDefaults', message: 'must be an object of class → rule list' });
    } else {
      for (const [cls, rules] of Object.entries(classDefaults)) {
        if (!config.classes.includes(cls)) {
          issues.push({
            path: `classDefaults.${cls}`,
            message: `"${cls}" is not one of workflow.config classes`,
          });
        }
        if (!Array.isArray(rules)) {
          issues.push({ path: `classDefaults.${cls}`, message: 'must be an array of rules' });
          continue;
        }
        rules.forEach((rule, i) => {
          if (!isPlainObject(rule) || !isNonEmptyCommandArray(rule['run'])) {
            issues.push({
              path: `classDefaults.${cls}[${i}]`,
              message: 'rule must have a non-empty `run` command array',
            });
            return;
          }
          const when = rule['when'];
          if (when !== undefined) {
            if (!isPlainObject(when) || !isNonEmptyCommandArray(when['diffMatches'])) {
              issues.push({
                path: `classDefaults.${cls}[${i}].when`,
                message: 'when.diffMatches must be a non-empty glob array',
              });
            }
          }
          for (const key of Object.keys(rule)) {
            if (key !== 'when' && key !== 'run') {
              issues.push({ path: `classDefaults.${cls}[${i}].${key}`, message: 'unknown key' });
            }
          }
        });
      }
    }
  }

  const hardCaps = value['hardCaps'];
  if (hardCaps !== undefined) {
    if (!Array.isArray(hardCaps)) {
      issues.push({ path: 'hardCaps', message: 'must be an array' });
    } else {
      hardCaps.forEach((cap, i) => {
        if (!isPlainObject(cap)) {
          issues.push({ path: `hardCaps[${i}]`, message: 'must be an object' });
          return;
        }
        if (typeof cap['id'] !== 'string' || cap['id'].length === 0) {
          issues.push({ path: `hardCaps[${i}].id`, message: 'must be a non-empty string' });
        }
        const when = cap['when'];
        if (!isPlainObject(when) || !isNonEmptyCommandArray(when['targetsMatch'])) {
          issues.push({
            path: `hardCaps[${i}].when`,
            message: 'when.targetsMatch must be a non-empty glob array',
          });
        }
        if (typeof cap['requireLine'] !== 'string' || cap['requireLine'].length === 0) {
          issues.push({
            path: `hardCaps[${i}].requireLine`,
            message: 'must be a regex source string',
          });
        } else {
          try {
            new RegExp(cap['requireLine']);
          } catch {
            issues.push({ path: `hardCaps[${i}].requireLine`, message: 'is not a valid regex' });
          }
        }
        if (typeof cap['message'] !== 'string' || cap['message'].length === 0) {
          issues.push({ path: `hardCaps[${i}].message`, message: 'must be a non-empty string' });
        }
      });
    }
  }

  const postMerge = value['postMerge'];
  if (postMerge !== undefined && !isCommandArray(postMerge)) {
    issues.push({ path: 'postMerge', message: 'must be an array of non-empty commands' });
  }

  const exceptions = value['wiringExceptions'];
  if (exceptions !== undefined) {
    if (
      !isPlainObject(exceptions) ||
      Object.values(exceptions).some((v) => typeof v !== 'string' || v.length === 0)
    ) {
      issues.push({
        path: 'wiringExceptions',
        message: 'must map gate/script names to non-empty justification strings',
      });
    }
  }

  return issues;
}

/** Load the manifest for a repo root. Absent file = pure defaults. */
export function loadManifest(config: WorkflowConfig, root: string): GatesManifest {
  const file = resolve(root, MANIFEST_FILENAME);
  const defaults = defaultManifest(config);
  if (!existsSync(file)) return defaults;

  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new ManifestError(
      `${MANIFEST_FILENAME} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const issues = validateManifest(config, parsed);
  if (issues.length > 0) {
    throw new ManifestError(`${MANIFEST_FILENAME} is invalid`, issues);
  }
  return deepMerge(defaults, parsed);
}

/** Every command the manifest can ever run (phases ∪ classDefaults ∪ postMerge). */
export function manifestCommands(manifest: GatesManifest): string[] {
  const out = new Set<string>();
  for (const cmds of Object.values(manifest.phases)) for (const cmd of cmds) out.add(cmd);
  for (const rules of Object.values(manifest.classDefaults)) {
    for (const rule of rules) for (const cmd of rule.run) out.add(cmd);
  }
  for (const cmd of manifest.postMerge) out.add(cmd);
  return [...out];
}
