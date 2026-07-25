import { contractSection, contractView } from '../memory/artifacts.js';
import { sectionAfter } from '../state/markdown.js';

/**
 * Durable-artifacts gate (Phase 7): every path a PRD declares as durable
 * knowledge must be touched in the merge-range diff — learning lands in the
 * same merge or the merge does not happen.
 */

/** Backticked paths declared in `## Durable Artifacts`; `none` and template
 * tokens dropped (same discipline as the Conflict Surface parser). */
export function declaredArtifacts(content: string): string[] {
  return artifactPaths(sectionAfter(content, 'Durable Artifacts'));
}

/**
 * The same list, read the way the memory contract reads its own sections: from
 * the executable view of the document, with the exact heading predicate, and
 * refusing an ambiguous section.
 *
 * Two functions rather than one hardened one, for the reason the `frTargets`
 * split exists: `declaredArtifacts` is the Phase 7 gate for EVERY repository,
 * and PRD-018 promises a memory-disabled repository behaves exactly as before.
 * A fenced example above the real section changes which paths that gate demands,
 * so hardening it in place would have changed a disabled repo's close. Migrating
 * the legacy reader is recorded as a deferral.
 */
export function declaredArtifactsStrict(content: string): string[] {
  const { count, body } = contractSection(contractView(content), 'Durable Artifacts');
  // An AMBIGUOUS section is not an empty one. Collapsing "declared twice" to
  // `[]` would tell the gate there is nothing to check, which is the permissive
  // reading of a document nobody can parse.
  if (count > 1) return [AMBIGUOUS_DURABLE];
  if (count === 0) return [];
  return artifactPaths(body);
}

/** A path no diff can ever contain, so an ambiguous section always refuses and
 * says why. */
export const AMBIGUOUS_DURABLE =
  '<Durable Artifacts is declared more than once — exactly one section is parseable>';

function artifactPaths(section: string): string[] {
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
