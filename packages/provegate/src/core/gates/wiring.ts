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
    const m = /^(?:pnpm|npm run|yarn|bun run)\s+([\w:.-]+)/.exec(cmd);
    if (!m) continue;
    const script = m[1]!;
    if (['run', 'exec', 'dlx', '--filter'].includes(script)) continue;
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
  const wiredIn = (script: string): boolean => wiringText.some((text) => text.includes(script));

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
