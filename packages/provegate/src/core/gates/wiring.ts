import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { manifestCommands, type GatesManifest } from './manifest.js';

/**
 * Wire-or-delete audit: a gate that exists but runs nowhere is a declared
 * guarantee that isn't one. Two directions:
 *  1. every manifest command that names a package.json script must name one
 *     that exists (a typo'd gate is a silent no-op);
 *  2. every package.json script matching `verifyScriptPattern` must be wired
 *     (manifest, CI executing text) or carry a shrink-only exception; a stale
 *     exception (script wired meanwhile, or gone) fails.
 */

/** Executing text of a workflow YAML: `run:` step bodies (incl. block
 * scalars), from jobs not disabled with `if: false`. Comments and step names
 * never count as wiring. */
export function yamlRunText(content: string): string[] {
  const lines = content.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^ {2}[\w-]+:\s*$/.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const out: string[] = [];
  for (const block of blocks) {
    if (block.some((line) => /^\s*if:\s*(\$\{\{\s*)?false\s*(\}\})?\s*$/.test(line))) continue;
    let runIndent: number | null = null;
    for (const line of block) {
      const runMatch = /^(\s*)(?:-\s*)?run:\s*(.*)$/.exec(line);
      if (runMatch) {
        const body = runMatch[2]!.trim();
        if (body && !/^[|>][+-]?$/.test(body)) out.push(body);
        runIndent = runMatch[1]!.length;
        continue;
      }
      if (runIndent !== null) {
        const indent = line.length - line.trimStart().length;
        if (line.trim().length > 0 && indent > runIndent) {
          out.push(line.trim());
        } else if (line.trim().length > 0) {
          runIndent = null;
        }
      }
    }
  }
  return out;
}

export interface WiringReport {
  ok: boolean;
  issues: string[];
}

/** Manager subcommands that are NOT package.json script invocations. */
const NON_SCRIPT_SUBCOMMANDS = new Set([
  'exec',
  'dlx',
  'x',
  'create',
  'init',
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'update',
  'up',
  'ci',
  'publish',
  'pack',
  'link',
  'unlink',
  'audit',
  'outdated',
  'why',
  'config',
  'store',
  'setup',
  'help',
  'login',
  'logout',
  'version',
]);

/**
 * Which package.json script does this command invoke, if any?
 * Parses the real grammar of pnpm/npm/yarn/bun instead of a happy-path
 * prefix — `pnpm run ghost`, `npm test`, `yarn ghost`, and `bun test` all
 * resolve to their script name; installs/execs/dlx do not; a `--filter`ed
 * command targets another package's scripts and is out of this audit's
 * scope (the root package.json cannot answer for it).
 */
/** Manager options that consume the NEXT token as their value. */
const VALUE_FLAGS = new Set([
  '--dir',
  '-C',
  '--prefix',
  '--cwd',
  '--loglevel',
  '--reporter',
  '--config',
  '--userconfig',
]);

/** Modes that make the command exit without running the script. */
const NON_EXECUTING_FLAGS = new Set([
  '--help',
  '-h',
  '--version',
  '-v',
  '--dry-run',
  '--if-present',
]);

export function packageScriptOf(cmd: string): string | null {
  const tokens = cmd.trim().split(/\s+/);
  const manager = tokens[0];
  if (!manager || !['pnpm', 'npm', 'yarn', 'bun'].includes(manager)) return null;
  let i = 1;
  let sawRun = false;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (
      tok === '--filter' ||
      tok === '-F' ||
      tok === '--workspace' ||
      tok === '-w' ||
      tok.startsWith('--filter=') ||
      tok.startsWith('-F=') ||
      tok.startsWith('--workspace=') ||
      tok.startsWith('-w=')
    ) {
      return null; // cross-package scope — root scripts cannot resolve it
    }
    // A mode that does NOT run the script is not an invocation of it.
    // `pnpm --help verify:brain` and `npm --dry-run verify:brain` exit
    // successfully and run nothing, and both counted as wiring and as a
    // validator.
    if (NON_EXECUTING_FLAGS.has(tok) || NON_EXECUTING_FLAGS.has(tok.split('=')[0] ?? tok)) {
      return null;
    }
    if (tok.startsWith('-')) {
      // Options that take a SEPARATE value consume it, or the value is read as
      // the script name: `pnpm --dir . run verify:brain` resolved to `.`.
      if (VALUE_FLAGS.has(tok)) {
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (!sawRun && (tok === 'run' || tok === 'run-script')) {
      sawRun = true;
      i += 1;
      continue;
    }
    if (!sawRun && NON_SCRIPT_SUBCOMMANDS.has(tok)) return null;
    return tok; // script name: bare shorthand, lifecycle alias, or after `run`
  }
  return null;
}

export function auditWiring(
  config: WorkflowConfig,
  manifest: GatesManifest,
  root: string,
): WiringReport {
  const issues: string[] = [];

  const pkgPath = resolve(root, 'package.json');
  const hasPkg = existsSync(pkgPath);
  const pkg = hasPkg
    ? (JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> })
    : {};
  const scripts = pkg.scripts ?? {};
  const scriptNames = new Set(Object.keys(scripts));

  // Direction 1: manifest commands naming pnpm/npm scripts must exist.
  // With no package.json, a fresh non-node scaffold has nothing to audit
  // against — but a manifest that still references package-manager scripts is
  // mis-wired by shape, not exempt: those commands cannot resolve anywhere.
  // Repo shape must not buy silence, so that case is flagged, not skipped.
  // (For node repos this audit is wiring hygiene, not the execution gate —
  // manifest commands still EXECUTE at gate run and fail loud.)
  for (const cmd of manifestCommands(manifest)) {
    const script = packageScriptOf(cmd);
    if (script === null) continue;
    if (!hasPkg) {
      issues.push(
        `manifest command "${cmd}" needs a package.json script "${script}" but the repo has no package.json`,
      );
    } else if (!scriptNames.has(script)) {
      issues.push(
        `manifest command "${cmd}" names package.json script "${script}" which does not exist`,
      );
    }
  }

  // Direction 2: verify-pattern scripts must be wired or excepted.
  const pattern = new RegExp(config.verifyScriptPattern);
  const wiringText: string[] = [...manifestCommands(manifest)];
  const workflowsDir = resolve(root, '.github/workflows');
  if (existsSync(workflowsDir)) {
    for (const name of readdirSync(workflowsDir)) {
      if (!/\.ya?ml$/.test(name)) continue;
      wiringText.push(...yamlRunText(readFileSync(resolve(workflowsDir, name), 'utf8')));
    }
  }
  // The script a COMMAND resolves to, decided by the same parser the rest of
  // this audit uses. Text matching failed both ways: `echo pnpm verify:brain`
  // counted as wiring because the regex began matching mid-line, and a genuine
  // `pnpm --silent run verify:brain` was called unwired because the flag sat
  // where the parser did not look. One command, one answer, one parser.
  const wiredScripts = new Set<string>();
  for (const text of wiringText) {
    for (const command of text.split(/[\n;]|&&|\|\|/)) {
      const script = packageScriptOf(command);
      if (script !== null) wiredScripts.add(script);
    }
  }
  const wiredIn = (script: string): boolean => wiredScripts.has(script);

  for (const script of scriptNames) {
    if (!pattern.test(script)) continue;
    const excepted = script in manifest.wiringExceptions;
    const wired = wiredIn(script);
    if (wired && excepted) {
      issues.push(`stale wiring exception: "${script}" is wired now — remove the exception`);
    } else if (!wired && !excepted) {
      issues.push(
        `gate script "${script}" is wired nowhere (manifest or CI) — wire it, delete it, or add a justified wiringExceptions entry`,
      );
    }
  }

  // Exceptions for scripts that no longer exist are stale too.
  for (const excepted of Object.keys(manifest.wiringExceptions)) {
    if (!scriptNames.has(excepted)) {
      issues.push(`stale wiring exception: "${excepted}" names no package.json script — remove it`);
    }
  }

  return { ok: issues.length === 0, issues };
}
