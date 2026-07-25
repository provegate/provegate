import { readFileSync } from 'node:fs';
import { containedPath } from '../run/init.js';

/**
 * The supported record format (addendum A1 §10.6): an explicitly documented
 * subset, not general YAML. Four forms exist in the frontmatter and no others —
 * scalar, folded scalar, inline list, and comment — so anything else fails with
 * a tagged message instead of being guessed.
 *
 * The subset is small on purpose. A record is read by two implementations that
 * cannot import each other (this one, and the stdlib validator that runs where
 * the package is not installed), and every form either of them tolerates is a
 * form they can disagree about. Guessing is how they drift.
 */

export const LEARNING_TYPES = ['gotcha', 'convention', 'reference', 'decision'] as const;
export const SCOPES = ['workflow', 'project'] as const;
export const STATUSES = ['active', 'superseded'] as const;
/** ADRs carry a decision lifecycle, learnings a validity one — two vocabularies
 * that predate this parser and must not be silently merged into one. */
export const ADR_STATUSES = ['proposed', 'accepted', 'superseded'] as const;

export type LearningType = (typeof LEARNING_TYPES)[number];
export type Scope = (typeof SCOPES)[number];
export type Status = (typeof STATUSES)[number] | (typeof ADR_STATUSES)[number];

/** A problem with one record, tagged `<file>:<field>` so it can be repaired. */
export interface RecordIssue {
  path: string;
  message: string;
}

export interface MemoryRecord {
  /** Slug; must equal the filename without `.md`. */
  name: string;
  description: string;
  type: LearningType;
  scope: Scope;
  status: Status;
  links: string[];
  /** Where a seeded record came from; absent for repo-authored records. */
  provenance?: string;
  supersededBy?: string;
  tags?: string[];
  /** Globs whose change makes this record worth re-reading. */
  watch?: string[];
  /** Body after the frontmatter fence. */
  body: string;
}

/**
 * YAML's comment rule, not a house variant: a `#` opens a comment when
 * whitespace precedes it or when it opens the value, so `token#fragment` stays
 * part of the value while `>- # note` is a fold marker with a note after it.
 * Both implementations must agree on where a value ends, and borrowing the rule
 * everyone already knows is cheaper than inventing one they must learn.
 */
/** Host-independent: absolute, home-relative, drive-letter, UNC, or `..`. */
function escapesLexically(probe: string): boolean {
  if (probe.startsWith('~')) return true;
  if (/^[/\\]/.test(probe) || /^[A-Za-z]:[/\\]/.test(probe)) return true;
  return probe.split(/[/\\]/).includes('..');
}

function stripComment(rawValue: string): string {
  const trimmed = rawValue.trim();
  if (trimmed.startsWith('#')) return '';
  return trimmed.replace(/\s+#.*$/, '').trim();
}

// Kebab-case means segments joined by single hyphens: `-`, `foo-`, and `--`
// are not slugs, and a bare `[a-z0-9-]+` accepts all three.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADR_NAME = /^ADR-\d{4}-[a-z0-9-]+$/;
const PLACEHOLDER = /<[^>]*>|\bTBD\b|\bTODO\b|\?{3,}/;

/** Frontmatter keys the subset knows. An unknown key is a typo, not an extension. */
const KNOWN_KEYS = new Set([
  'name',
  'description',
  'type',
  'scope',
  'status',
  'links',
  'provenance',
  'superseded-by',
  'tags',
  'watch',
]);

export interface ParsedFrontmatter {
  values: Map<string, string | string[]>;
  body: string;
  issues: RecordIssue[];
}

/**
 * Parse the frontmatter subset. Returns issues rather than throwing so a
 * validator can report every problem in a file at once; an unparseable form is
 * itself an issue, never a silently dropped line.
 */
export function parseFrontmatter(content: string, file: string): ParsedFrontmatter {
  const issues: RecordIssue[] = [];
  const values = new Map<string, string | string[]>();
  const at = (field: string): string => `${file}:${field}`;

  const fence = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (!fence) {
    issues.push({ path: file, message: 'missing frontmatter fence' });
    return { values, body: content, issues };
  }
  const body = content.slice(fence[0].length);
  const lines = (fence[1] ?? '').split('\n');

  let pendingFold: { key: string; parts: string[] } | null = null;
  const flush = (): void => {
    if (pendingFold === null) return;
    values.set(pendingFold.key, pendingFold.parts.join(' ').trim());
    pendingFold = null;
  };

  for (const [i, line] of lines.entries()) {
    const lineNo = `line ${i + 1}`;
    if (line.trim().length === 0) {
      // A blank line inside a folded scalar is a paragraph break in YAML; the
      // subset has no paragraphs, so treat it as the end of the fold.
      flush();
      continue;
    }
    if (/^\s*#/.test(line)) continue;

    if (/^\s/.test(line)) {
      if (pendingFold === null) {
        issues.push({
          path: at(lineNo),
          message: `indented line outside a folded scalar — nested maps and block lists are not supported: ${line.trim()}`,
        });
        continue;
      }
      pendingFold.parts.push(line.trim());
      continue;
    }

    flush();

    if (line.startsWith('- ')) {
      issues.push({
        path: at(lineNo),
        message: 'block list is not supported — use an inline list `key: [a, b]`',
      });
      continue;
    }

    const kv = /^([A-Za-z][A-Za-z0-9-]*):(.*)$/.exec(line);
    if (!kv) {
      issues.push({ path: at(lineNo), message: `unparseable frontmatter line: ${line}` });
      continue;
    }
    const key = kv[1]!;
    // Strip the comment BEFORE classifying the value's form. Doing it after
    // meant a commented fold marker (`description: >-  # …`) read as a scalar
    // and its continuation line then failed as an orphan indent — which is
    // exactly the shape the shipped template hands an author to copy.
    const raw = stripComment(kv[2]!);

    if (values.has(key)) {
      // Last-wins is the classic silent corruption: two descriptions, one read.
      issues.push({ path: at(key), message: 'duplicate key' });
      continue;
    }
    if (!KNOWN_KEYS.has(key)) {
      issues.push({ path: at(key), message: 'unknown key' });
      continue;
    }

    if (raw === '>-' || raw === '>') {
      pendingFold = { key, parts: [] };
      continue;
    }
    if (raw === '|' || raw === '|-') {
      issues.push({
        path: at(key),
        message: 'literal block scalar (`|`) is not supported — use a folded scalar (`>-`)',
      });
      continue;
    }
    const list = /^\[(.*)\]$/.exec(raw);
    if (list) {
      values.set(
        key,
        list[1]!
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      );
      continue;
    }
    values.set(key, raw);
  }
  flush();

  return { values, body, issues };
}

const asString = (v: string | string[] | undefined): string | null =>
  typeof v === 'string' ? v : null;
const asList = (v: string | string[] | undefined): string[] | null => (Array.isArray(v) ? v : null);

export interface ValidateOptions {
  /** Repo root, for `watch` containment. Omit to skip the filesystem check. */
  root?: string;
  /** True when the file lives in the ADR directory. */
  isAdr?: boolean;
}

/**
 * Validate one record against the schema in addendum A1. `slug` is the filename
 * without `.md`; the record is returned only when it is completely valid, so a
 * caller can never half-consume a broken record.
 */
export function validateRecord(
  content: string,
  file: string,
  slug: string,
  options: ValidateOptions = {},
): { record: MemoryRecord | null; issues: RecordIssue[] } {
  const { values, body, issues } = parseFrontmatter(content, file);
  const at = (field: string): string => `${file}:${field}`;
  const isAdr = options.isAdr === true;

  const name = asString(values.get('name'));
  const description = asString(values.get('description'));
  const type = asString(values.get('type'));
  const scope = asString(values.get('scope'));
  const status = asString(values.get('status'));

  for (const [key, value] of [
    ['name', name],
    ['description', description],
    ['type', type],
    ['scope', scope],
    ['status', status],
  ] as const) {
    if (value === null || value.length === 0) {
      // An empty folded description reaches here as '' — the case the previous
      // validator accepted because it never read the fold at all.
      issues.push({ path: at(key), message: 'missing or empty' });
    } else if (PLACEHOLDER.test(value)) {
      issues.push({ path: at(key), message: `placeholder text is not a value: ${value}` });
    }
  }

  if (name !== null && name !== slug) {
    issues.push({
      path: at('name'),
      message: `'${name}' does not match the filename slug '${slug}'`,
    });
  }
  if (isAdr) {
    if (!ADR_NAME.test(slug)) {
      issues.push({ path: at('name'), message: 'ADR filename must match ADR-NNNN-<slug>' });
    }
    if (type !== null && type !== 'decision') {
      issues.push({ path: at('type'), message: `an ADR must be type: decision, not '${type}'` });
    }
  } else if (!SLUG.test(slug)) {
    issues.push({ path: at('name'), message: 'filename slug must be kebab-case' });
  }

  if (type !== null && !LEARNING_TYPES.includes(type as LearningType)) {
    issues.push({
      path: at('type'),
      message: `'${type}' is not one of ${LEARNING_TYPES.join('|')}`,
    });
  }
  if (scope !== null && !SCOPES.includes(scope as Scope)) {
    issues.push({ path: at('scope'), message: `'${scope}' is not one of ${SCOPES.join('|')}` });
  }
  const allowedStatuses: readonly string[] = isAdr ? ADR_STATUSES : STATUSES;
  if (status !== null && !allowedStatuses.includes(status)) {
    issues.push({
      path: at('status'),
      message: `'${status}' is not one of ${allowedStatuses.join('|')}`,
    });
  }

  const provenanceRaw = values.get('provenance');
  if (provenanceRaw !== undefined) {
    if (typeof provenanceRaw !== 'string' || provenanceRaw.length === 0) {
      issues.push({ path: at('provenance'), message: 'must be a non-empty scalar' });
    } else if (PLACEHOLDER.test(provenanceRaw)) {
      issues.push({ path: at('provenance'), message: 'placeholder text is not a value' });
    }
  }

  const supersededByRaw = values.get('superseded-by');
  if (supersededByRaw !== undefined && typeof supersededByRaw !== 'string') {
    // A list here was silently ignored: `asString` returned null and the
    // superseded checks below then read it as absent.
    issues.push({ path: at('superseded-by'), message: 'must be a scalar slug, not a list' });
  }
  const supersededBy = asString(values.get('superseded-by'));
  if (status === 'superseded' && (supersededBy === null || supersededBy.length === 0)) {
    issues.push({ path: at('superseded-by'), message: 'required when status is superseded' });
  }
  if (supersededBy !== null && supersededBy.length > 0 && status !== 'superseded') {
    issues.push({ path: at('superseded-by'), message: 'set, but status is not superseded' });
  }
  if (supersededBy !== null && supersededBy.length > 0) {
    // The standalone validator rejects a malformed target in its referenced-slug
    // pass, so accepting it here made one implementation stricter than the other
    // end to end, even though the shared helper agreed.
    if (!SLUG.test(supersededBy) && !ADR_NAME.test(supersededBy)) {
      issues.push({
        path: at('superseded-by'),
        message: `'${supersededBy}' is not a valid record slug`,
      });
    }
  }

  for (const key of ['links', 'tags', 'watch'] as const) {
    if (!values.has(key)) continue;
    const list = asList(values.get(key));
    if (list === null) {
      issues.push({ path: at(key), message: 'must be an inline list `[a, b]`' });
      continue;
    }
    // `links: []` is meaningful (a record with no relations); `tags: []` and
    // `watch: []` are not — an empty selector claims a capability it lacks.
    if (key !== 'links' && list.length === 0) {
      issues.push({ path: at(key), message: 'must not be empty when present' });
    }
    if (key !== 'watch') {
      for (const entry of list) {
        if (!SLUG.test(entry) && !ADR_NAME.test(entry)) {
          issues.push({ path: at(key), message: `'${entry}' is not a valid record slug` });
        }
      }
    }
  }

  const watch = asList(values.get('watch'));
  if (watch !== null) {
    for (const glob of watch) {
      // A glob is not a path, but its non-magic prefix is: `../secrets/**` must
      // be refused for the same reason a plain `../secrets` would be.
      //
      // The lexical check runs unconditionally and is host-independent. Making
      // it conditional on `root` meant the default call accepted an escaping
      // watch that the standalone validator rejected, and `isAbsolute` alone
      // let `C:\…` through on POSIX — two ways for the same record to be valid
      // here and invalid there. `root` now only buys the extra symlink check,
      // which the lexical rule cannot see.
      const literal = glob.split(/[*?[]/)[0]!;
      const probe = literal.endsWith('/') ? literal.slice(0, -1) : literal;
      if (probe.length === 0) continue;
      if (escapesLexically(probe)) {
        issues.push({ path: at('watch'), message: `'${glob}' escapes the workspace` });
        continue;
      }
      if (options.root === undefined) continue;
      try {
        containedPath(options.root, probe);
      } catch {
        issues.push({ path: at('watch'), message: `'${glob}' escapes the workspace` });
      }
    }
  }

  // Rationale sections are what make a record actionable rather than a note.
  // Two exemptions: `reference`, because a pointer to an external resource has
  // no `why`; and an ADR, whose four required sections below ARE its rationale —
  // demanding both shapes would make every ADR carry the same argument twice.
  if (type !== null && type !== 'reference' && !isAdr) {
    if (!/\*\*Why:\*\*/.test(body)) {
      issues.push({ path: at('body'), message: `type '${type}' requires a **Why:** section` });
    }
    if (!/\*\*How to apply:\*\*/.test(body)) {
      issues.push({
        path: at('body'),
        message: `type '${type}' requires a **How to apply:** section`,
      });
    }
  }
  if (isAdr) {
    for (const heading of ['Context', 'Decision', 'Consequences', 'Alternatives']) {
      if (!new RegExp(`^##\\s+${heading}`, 'mi').test(body)) {
        issues.push({ path: at('body'), message: `ADR requires a '## ${heading}' section` });
      }
    }
  }

  if (issues.length > 0) return { record: null, issues };

  const record: MemoryRecord = {
    name: name!,
    description: description!,
    type: type as LearningType,
    scope: scope as Scope,
    status: status as Status,
    links: asList(values.get('links')) ?? [],
    body,
  };
  const provenance = asString(values.get('provenance'));
  if (provenance !== null && provenance.length > 0) record.provenance = provenance;
  if (supersededBy !== null && supersededBy.length > 0) record.supersededBy = supersededBy;
  const tags = asList(values.get('tags'));
  if (tags !== null) record.tags = tags;
  if (watch !== null) record.watch = watch;
  return { record, issues: [] };
}

/** Read and validate a record file. */
export function readRecord(
  file: string,
  slug: string,
  options: ValidateOptions = {},
): { record: MemoryRecord | null; issues: RecordIssue[] } {
  return validateRecord(readFileSync(file, 'utf8'), file, slug, options);
}
