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
export interface StrictArtifacts {
  paths: string[];
  /**
   * The section is declared more than once, so nothing can be parsed from it.
   *
   * Carried as a FLAG, never as a sentinel path. The first attempt returned a
   * placeholder string for the gate to fail on, and git permits a file named
   * exactly that — an error encoded as data is an error that can be satisfied.
   */
  ambiguous: boolean;
}

export function declaredArtifactsStrict(content: string): StrictArtifacts {
  const { count, body } = contractSection(contractView(content), 'Durable Artifacts');
  // An AMBIGUOUS section is not an empty one: "nothing to check" is the
  // permissive reading of a document nobody can parse.
  if (count > 1) return { paths: [], ambiguous: true };
  if (count === 0) return { paths: [], ambiguous: false };
  return { paths: artifactPaths(body), ambiguous: false };
}

function artifactPaths(section: string): string[] {
  const paths: string[] = [];
  for (const line of section.split('\n')) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/\bnone\b/i.test(line) && !line.includes('`')) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      // A ROOT-LEVEL artifact is still an artifact. Requiring a `/` silently
      // dropped every `RELEASING.md`, so a PRD could promise one and close
      // without touching it — and with memory enabled the same list is what a
      // Memory Output must appear in, so the drop reaches the close gate too.
      // The `/`-less tokens this was written to skip are prose words, and those
      // do not end in a file extension.
      if (!value.includes('/') && !/\.[A-Za-z0-9]+$/.test(value)) continue;
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
