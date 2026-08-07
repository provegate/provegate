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
    // A bullet that OPENS with `none` declares nothing, whatever it quotes
    // later. The old rule only skipped it when the line held no backticks, so
    // `- none — revisit in a \`follow-up\`` declared an artifact named
    // "follow-up" and refused every close until a file by that name changed.
    if (/^\s*-\s+none\b/i.test(line)) continue;
    // Only the segment BEFORE the em dash. Every real bullet is
    // `- \`path\`[, \`path\`…] — prose`, and the prose quotes things freely:
    // `run`/`land`/`check`, `gate new`, `--worktree`, `workflow.config.json`.
    // Taking every backticked token made each of those a promised file and
    // refused the close until a file by that name changed. Measured across this
    // repository: fourteen real bullets carry an explanation token, and the one
    // bullet with several real paths lists them all before the dash.
    const declared = line.split('—')[0]!;
    for (const match of declared.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      // A ROOT-LEVEL artifact is still an artifact. Requiring a `/` silently
      // dropped every `RELEASING.md`, so a PRD could promise one and close
      // without touching it — and with memory enabled the same list is what a
      // Memory Output must appear in, so the drop reaches the close gate too.
      // A ROOT-LEVEL artifact is still an artifact, and the extension test alone
      // was the wrong discriminator: `LICENSE`, `Makefile` and `CODEOWNERS` are
      // root files with no extension, and a PRD promising one closed without
      // touching it. Accepting every `/`-less token instead swept in prose —
      // `- none — \`nothing\` durable here` declared an artifact called
      // "nothing". A leading capital is what separates the two: repository root
      // files are spelled that way and prose in these bullets is not.
      // Inside a REAL declaration bullet, a backticked token is the artifact the
      // author named. Guessing which bare words are paths cost two rounds: an
      // extension test dropped `LICENSE`, a leading capital dropped `justfile`,
      // and a named allowlist dropped `BUILD` and `WORKSPACE` while admitting
      // prose. The `none` bullet is filtered above, which is the only place
      // prose appears in this section, so shape is all that is left to check.
      if (!/^[^\s`]+$/.test(value)) continue;
      if (/[{}]/.test(value)) continue;
      // PRD-026 FR-2, the reconciled divergence: an unfilled template
      // placeholder may be a glob, so a value containing `*` is not a claim —
      // the deleted script excluded it and the package now agrees.
      if (value.includes('*')) continue;
      // The EXACT token, not a substring: `_docs/none.md` and `none-file` are
      // real paths, and dropping them hid a promised output entirely.
      if (/^none$/i.test(value)) continue;
      paths.push(value);
    }
  }
  return [...new Set(paths)];
}

/**
 * PRD-026 FR-2: the declaration lint the deleted script's lint mode had and
 * the package did not. A wip PRD must DECLARE its durable artifacts at
 * readiness: the section holds at least one bullet, and every bullet is
 * either an explicit `none` or extracts at least one path under the
 * reconciled parser. Mixing is legal — a `none` beside real claims means
 * "this axis has no durable output", not "this section is empty".
 * Returns the issue string, or null when the declaration satisfies the rule.
 */
export function durableDeclarationIssue(content: string): string | null {
  const section = sectionAfter(content, 'Durable Artifacts');
  if (section.trim().length === 0) {
    return 'Durable Artifacts: section missing or empty — declare paths or an explicit `none`';
  }
  const bullets = section.split('\n').filter((line) => /^\s*-\s+\S/.test(line));
  if (bullets.length === 0) {
    return 'Durable Artifacts: no bullets — declare paths or an explicit `none`';
  }
  for (const bullet of bullets) {
    const declared = bullet.split('—')[0]!;
    // The corpus writes `none` two ways: a bullet OPENING with the word
    // (artifactPaths' own skip rule) and a labelled axis whose only claim is
    // the backticked token — `- Decision: \`none\` — …`. Both declare nothing,
    // deliberately.
    if (/^\s*-\s+none\b/i.test(declared)) continue;
    if (/`none`/i.test(declared)) continue;
    if (artifactPaths(bullet).length > 0) continue;
    // The deleted script's documented rule, kept: placeholder paths containing
    // `{`, `}`, or `*` are ignored until filled in — a template-shaped bullet
    // is not-yet-filled, not invalid. Without this, `gate new`'s own template
    // fails the lint it ships beside.
    if ([...declared.matchAll(/`([^`]+)`/g)].some((m) => /[{}*]/.test(m[1]!))) continue;
    return `Durable Artifacts: bullet is neither a \`none\` nor a path-bearing claim: ${bullet.trim().slice(0, 80)}`;
  }
  return null;
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
