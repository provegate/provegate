import type { MemoryConfig, WorkflowConfig } from '../config/index.js';
import { activeRecords, canonicalPath, loadMemoryStore, watchMatches } from './artifacts.js';
import type { LearningType, Scope } from './parse.js';

/**
 * `gate memory find` — DETERMINISTIC local recall.
 *
 * Deterministic, not relevant. That distinction is the whole design and it is
 * stated here so Phase 6 does not relitigate it: this ranks by rules an author
 * can predict and reproduce, it does not estimate semantic similarity. There is
 * no embedding, no index, no model, and no network — the same run over the same
 * store returns the same bytes, on any machine, forever.
 *
 * The consequence is accepted rather than hidden: a record that IS relevant but
 * shares no watched path, no exact name or tag, and no description token will
 * not be found. `memory-index-vs-detail` is why that is tolerable — find
 * AUGMENTS the small always-loaded INDEX, it does not replace reading it. An
 * agent that only ever greps has already skipped the step that works.
 *
 * Every result carries the REASONS it matched, which is the honesty mechanism:
 * an author can see that a hit came from a shared watch glob rather than from
 * the tool understanding their question.
 */

export interface FindSelectors {
  /** Free text matched against name and description tokens, case-insensitively. */
  query?: string;
  /** Repo-relative paths; a record whose `watch` covers one of them ranks first. */
  paths?: string[];
  /** Exact tag or record name. */
  tag?: string;
  /** 1–1000; 20 when absent. */
  limit?: number;
}

export type MatchReason =
  | 'watch'
  | 'exact-name'
  | 'exact-tag'
  | 'description-token'
  | 'name-token';

export interface FindHit {
  slug: string;
  type: LearningType;
  scope: Scope;
  description: string;
  /** Pointer as the index writes it, e.g. `learnings/foo.md`. */
  path: string;
  /** Why this record is here, in the order the ranking considered them. */
  reasons: MatchReason[];
  /** Watched paths that actually overlapped a `--paths` selector. */
  matchedPaths: string[];
}

export interface FindResult {
  ok: boolean;
  hits: FindHit[];
  /** Why the request was refused. Absent on success. */
  problem?: string;
  /** What to do about a refusal. */
  remedy?: string;
  /** Records considered after the active-and-indexed filter. */
  searched: number;
  limit: number;
}

export const FIND_DEFAULT_LIMIT = 20;
export const FIND_MAX_LIMIT = 1000;

/** Words worth matching on. Splitting on non-word characters keeps `gate-open`
 * and `gate open` searchable the same way. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

function refuse(problem: string, remedy: string, limit: number): FindResult {
  return { ok: false, hits: [], problem, remedy, searched: 0, limit };
}

export function memoryFind(
  config: WorkflowConfig,
  root: string,
  selectors: FindSelectors,
): FindResult {
  const limit = selectors.limit ?? FIND_DEFAULT_LIMIT;

  // Bounds are checked BEFORE anything is computed, so an out-of-range request
  // costs nothing and gets the same answer whatever the store contains.
  if (!Number.isInteger(limit) || limit < 1 || limit > FIND_MAX_LIMIT) {
    return refuse(
      `--limit must be an integer between 1 and ${FIND_MAX_LIMIT} (got ${String(selectors.limit)})`,
      `omit it for the default of ${FIND_DEFAULT_LIMIT}`,
      FIND_DEFAULT_LIMIT,
    );
  }

  // Disabled memory REFUSES. Returning an empty list would read as "nothing
  // relevant", which is a lie about a store that was never consulted — the same
  // false-green shape `false-green-on-missing-file` describes.
  if (!config.memory.enabled) {
    return refuse(
      'the memory contract is disabled, so there is no store to search',
      'set `memory.enabled: true` in workflow.config.json, or run `gate doctor --memory`',
      limit,
    );
  }

  const query = selectors.query?.trim() ?? '';
  const tag = selectors.tag?.trim() ?? '';
  const paths = (selectors.paths ?? []).map((p) => p.trim()).filter((p) => p.length > 0);
  if (query.length === 0 && tag.length === 0 && paths.length === 0) {
    // A selectorless find would return the whole store in slug order, which is
    // `cat INDEX.md` with extra steps and teaches the wrong habit.
    return refuse(
      'no selector given',
      'pass at least one of --query, --paths, or --tag',
      limit,
    );
  }

  // Path selectors are validated the same way a configured path is: repo-
  // relative, no escape. A `..` selector cannot match anything the store
  // watches, so accepting it would return an empty list for a question that was
  // actually malformed.
  for (const path of paths) {
    if (path.startsWith('/') || /^[A-Za-z]:/.test(path) || path.split(/[/\\]/).includes('..')) {
      return refuse(
        `--paths entry '${path}' is not a repo-relative path`,
        'watch globs are repo-relative, so a selector must be too',
        limit,
      );
    }
  }

  const memory: MemoryConfig = config.memory;
  const store = loadMemoryStore(root, memory);
  // ACTIVE and INDEXED only, decided before ranking. Recall must never surface a
  // record the validator would reject: an agent acting on a superseded or
  // unreadable record is worse off than one that found nothing.
  const candidates = activeRecords(store);
  const canonicalSelectors = paths.map(canonicalPath);

  const scored: { hit: FindHit; rank: number[] }[] = [];
  for (const indexed of candidates) {
    const record = indexed.record;
    const reasons: MatchReason[] = [];
    let matchedPaths: string[] = [];

    if (canonicalSelectors.length > 0 && record.watch !== undefined && record.watch.length > 0) {
      matchedPaths = watchMatches(record.watch, canonicalSelectors);
      if (matchedPaths.length > 0) reasons.push('watch');
    }
    if (tag.length > 0) {
      if (record.name.toLowerCase() === tag.toLowerCase()) reasons.push('exact-name');
      if ((record.tags ?? []).some((t) => t.toLowerCase() === tag.toLowerCase())) {
        reasons.push('exact-tag');
      }
    }
    if (query.length > 0) {
      const wanted = tokenize(query);
      const inDescription = tokenize(record.description);
      const inName = tokenize(record.name);
      if (wanted.some((w) => inDescription.includes(w))) reasons.push('description-token');
      if (wanted.some((w) => inName.includes(w))) reasons.push('name-token');
    }
    if (reasons.length === 0) continue;

    // The rank vector IS the specified order, most significant first. Lower
    // sorts earlier, so each entry is 0 when the stronger signal is present.
    // The lexical slug tie-break at the end is what makes a run byte-stable:
    // without it, two records with identical signals would come back in
    // whatever order the index happened to list them.
    scored.push({
      hit: {
        slug: indexed.slug,
        type: record.type,
        scope: record.scope,
        description: record.description,
        path: indexed.pointer,
        reasons,
        matchedPaths,
      },
      rank: [
        reasons.includes('watch') ? 0 : 1,
        reasons.includes('exact-name') || reasons.includes('exact-tag') ? 0 : 1,
        reasons.includes('description-token') ? 0 : 1,
        reasons.includes('name-token') ? 0 : 1,
      ],
    });
  }

  scored.sort((a, b) => {
    for (let i = 0; i < a.rank.length; i += 1) {
      const diff = (a.rank[i] ?? 0) - (b.rank[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return a.hit.slug.localeCompare(b.hit.slug);
  });

  return {
    ok: true,
    hits: scored.slice(0, limit).map((s) => s.hit),
    searched: candidates.length,
    limit,
  };
}
