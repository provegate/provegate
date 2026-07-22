import { sectionAfter } from '../state/markdown.js';

/**
 * Durable-artifacts gate (Phase 7): every path a PRD declares as durable
 * knowledge must be touched in the merge-range diff — learning lands in the
 * same merge or the merge does not happen.
 */

/** Backticked paths declared in `## Durable Artifacts`; `none` and template
 * tokens dropped (same discipline as the Conflict Surface parser). */
export function declaredArtifacts(content: string): string[] {
  const section = sectionAfter(content, 'Durable Artifacts');
  const paths: string[] = [];
  for (const line of section.split('\n')) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/\bnone\b/i.test(line) && !line.includes('`')) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      if (!value.includes('/')) continue;
      if (/[{}]/.test(value)) continue;
      if (/\bnone\b/i.test(value)) continue;
      paths.push(value);
    }
  }
  return [...new Set(paths)];
}

export interface DurableGateResult {
  ok: boolean;
  why?: string;
  missing?: string[];
}

/** Every declared path must appear in the diff (exact file, or as a directory prefix). */
export function durableArtifactsOk(declared: string[], diffFiles: string[]): DurableGateResult {
  if (declared.length === 0) return { ok: true };
  const missing = declared.filter(
    (path) => !diffFiles.some((file) => file === path || file.startsWith(`${path}/`)),
  );
  if (missing.length === 0) return { ok: true };
  return {
    ok: false,
    missing,
    why: `declared durable artifact(s) untouched in the merge diff: ${missing.join(', ')}`,
  };
}
