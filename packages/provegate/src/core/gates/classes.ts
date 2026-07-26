import { execFileSync } from 'node:child_process';
import type { WorkflowConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
import type { GatesManifest } from './manifest.js';

/** Parse the PRD Class header field; unknown/absent → the first configured class. */
export function parsePrdClass(config: WorkflowConfig, content: string): string {
  const fallback = config.classes[0] ?? 'feature';
  const match = /^>\s*\*\*PRD Class\*\*\s*:\s*([^\s|`(]+)/im.exec(content);
  if (!match) return fallback;
  const raw = match[1]!.toLowerCase().trim();
  return config.classes.includes(raw) ? raw : fallback;
}

function gitLines(root: string, args: string[]): string[] {
  const output = execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  return output
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

/**
 * Changed files vs the base branch: merge-base against the LOCAL `<base>`, then
 * `origin/<base>`, then a plain working-diff fallback. Array-arg git only.
 *
 * The local base comes first because that is what the close is about: `gate
 * land` merges into the LOCAL branch, and the origin range answers a different
 * question. When the local base is behind its remote and the feature is based on
 * the remote tip, the origin-based range OMITS the commits the merge is about to
 * introduce — so a watched file changed by one of them raised no obligation, and
 * a record promised by one of them read as this PRD's capture. Both fail open.
 */
export function collectDiffFiles(root: string, base: string): string[] {
  for (const ref of [base, `origin/${base}`]) {
    try {
      const mergeBase = execFileSync('git', ['merge-base', 'HEAD', ref], {
        cwd: root,
        encoding: 'utf8',
      }).trim();
      return gitLines(root, ['diff', '--name-only', `${mergeBase}...HEAD`]);
    } catch {
      // try next ref
    }
  }
  try {
    return gitLines(root, ['diff', '--name-only', 'HEAD']);
  } catch {
    return [];
  }
}

/** Extra phase-4 gates for a class: unconditional rules always apply; a
 * `when.diffMatches` rule applies when any changed file matches a glob. */
export function resolveClassGates(
  manifest: GatesManifest,
  prdClass: string,
  changedFiles: string[],
): string[] {
  const rules = manifest.classDefaults[prdClass] ?? [];
  const out: string[] = [];
  for (const rule of rules) {
    if (rule.when !== undefined) {
      const regexes = rule.when.diffMatches.map(globToRegExp);
      const hit = changedFiles.some((file) => regexes.some((re) => re.test(file)));
      if (!hit) continue;
    }
    out.push(...rule.run);
  }
  return [...new Set(out)];
}

/** Order-preserving dedupe of gate command lists. */
export function mergeGateCommands(base: string[], extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cmd of [...base, ...extra]) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    out.push(cmd);
  }
  return out;
}
