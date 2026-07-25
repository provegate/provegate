// Shared helpers for the verify:* library — wave 2.
// One module for every parser that two checks read (shared-module rule: two gates
// reading the same format must import one parser so they cannot drift).
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve, sep } from 'node:path';

/** Repo root: optional first positional arg (used by self-tests), else cwd. */
export function targetRoot() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  return arg ?? process.cwd();
}

/**
 * The supported record frontmatter subset (source addendum A1 §10.6). Four forms
 * exist and no others — scalar, folded scalar, inline list, comment — so anything
 * else produces an issue instead of being guessed.
 *
 * This file and the package's TypeScript parser cannot import each other: this one
 * runs where the package is not installed. A shared conformance corpus is their
 * only contract, which is why guessing is forbidden on both sides — a tolerant
 * parser and a strict one disagreeing about the same file is the failure mode.
 */
export function parseRecordFrontmatter(content) {
  const issues = [];
  const values = new Map();
  const fence = /^---\n([\s\S]*?)\n---\n?/.exec(content);
  if (!fence) {
    issues.push({ field: 'structure', message: 'missing frontmatter fence' });
    return { values, body: content, issues };
  }
  const body = content.slice(fence[0].length);
  const lines = (fence[1] ?? '').split('\n');

  let fold = null;
  const flush = () => {
    if (fold === null) return;
    values.set(fold.key, fold.parts.join(' ').trim());
    fold = null;
  };

  lines.forEach((line, i) => {
    const where = `line ${i + 1}`;
    if (line.trim().length === 0) return flush();
    if (/^\s*#/.test(line)) return;
    if (/^\s/.test(line)) {
      if (fold === null) {
        issues.push({
          field: 'structure',
          message: `${where}: indented line outside a folded scalar — nested maps and block lists are not supported`,
        });
        return;
      }
      fold.parts.push(line.trim());
      return;
    }
    flush();
    if (line.startsWith('- ')) {
      issues.push({
        field: 'structure',
        message: `${where}: block list is not supported — use an inline list \`key: [a, b]\``,
      });
      return;
    }
    const kv = /^([A-Za-z][A-Za-z0-9-]*):(.*)$/.exec(line);
    if (!kv) {
      issues.push({ field: 'structure', message: `${where}: unparseable frontmatter line` });
      return;
    }
    const key = kv[1];
    // Strip the comment BEFORE classifying the value's form: a commented fold
    // marker (`description: >-  # …`) would otherwise read as a scalar and its
    // continuation line fail as an orphan indent — the exact shape the shipped
    // template hands an author to copy.
    const raw = stripComment(kv[2]);
    if (values.has(key)) {
      issues.push({ field: key, message: 'duplicate key' });
      return;
    }
    if (!KNOWN_KEYS.has(key)) {
      issues.push({ field: key, message: 'unknown key' });
      return;
    }
    if (raw === '>-' || raw === '>') {
      fold = { key, parts: [] };
      return;
    }
    if (raw === '|' || raw === '|-') {
      issues.push({
        field: key,
        message: 'literal block scalar (`|`) is not supported — use a folded scalar (`>-`)',
      });
      return;
    }
    const list = /^\[(.*)\]$/.exec(raw);
    if (list) {
      values.set(
        key,
        list[1]
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
      );
      return;
    }
    values.set(key, raw);
  });
  flush();
  return { values, body, issues };
}

/** Back-compat shape for callers that just want the key/value bag. */
export function parseFrontmatter(content) {
  const { values, issues } = parseRecordFrontmatter(content);
  if (issues.some((i) => i.message === 'missing frontmatter fence')) return null;
  return Object.fromEntries(values);
}

// YAML's comment rule: a `#` opens a comment when whitespace precedes it or
// when it opens the value, so `token#fragment` stays part of the value.
function stripComment(rawValue) {
  const trimmed = rawValue.trim();
  if (trimmed.startsWith('#')) return '';
  return trimmed.replace(/\s+#.*$/, '').trim();
}

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
const LEARNING_TYPES = new Set(['gotcha', 'convention', 'reference', 'decision']);
const SCOPES = new Set(['workflow', 'project']);
const STATUSES = new Set(['active', 'superseded']);
// ADRs carry a decision lifecycle, learnings a validity one — two vocabularies
// that predate this validator and must not be silently merged into one.
const ADR_STATUSES = new Set(['proposed', 'accepted', 'superseded']);
// Kebab-case means segments joined by single hyphens: `-`, `foo-`, and `--`
// are not slugs, and a bare `[a-z0-9-]+` accepts all three.
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ADR_RE = /^ADR-\d{4}-[a-z0-9-]+$/;
const PLACEHOLDER_RE = /<[^>]*>|\bTBD\b|\bTODO\b|\?{3,}/;

/** A watch glob's literal prefix must stay inside the workspace. */
function watchEscapes(glob) {
  const literal = glob.split(/[*?[]/)[0] ?? '';
  const probe = literal.endsWith('/') ? literal.slice(0, -1) : literal;
  if (probe.length === 0) return false;
  if (probe.startsWith('~')) return true;
  if (/^[/\\]/.test(probe) || /^[A-Za-z]:[/\\]/.test(probe)) return true;
  return probe.split(/[/\\]/).includes('..');
}

/**
 * The lexical rule cannot see a symlink: `link/sub/**` where `link -> /outside`
 * spells a contained path. Only run when a root is known; without one, both
 * implementations do the lexical check alone and agree by construction.
 */
function watchEscapesRealpath(root, glob) {
  const literal = glob.split(/[*?[]/)[0] ?? '';
  const probe = literal.endsWith('/') ? literal.slice(0, -1) : literal;
  if (probe.length === 0) return false;
  try {
    const rootReal = realpathSync(resolve(root));
    let target = resolve(rootReal, probe);
    for (;;) {
      try {
        const real = realpathSync(target);
        return real !== rootReal && !real.startsWith(rootReal + sep);
      } catch (err) {
        if (err.code !== 'ENOENT') return false;
        const parent = dirname(target);
        if (parent === target) return false;
        target = parent;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Validate one record against the schema in the source addendum. Returns issues
 * tagged by FIELD, not by message text: the corpus asserts that both
 * implementations agree on what is wrong, and leaves them free to word it
 * differently.
 */
export function validateMemoryRecord(content, { slug, isAdr = false, root } = {}) {
  const { values, body, issues } = parseRecordFrontmatter(content);
  const str = (k) => (typeof values.get(k) === 'string' ? values.get(k) : null);
  const list = (k) => (Array.isArray(values.get(k)) ? values.get(k) : null);

  const name = str('name');
  const type = str('type');
  const status = str('status');

  for (const key of ['name', 'description', 'type', 'scope', 'status']) {
    const value = str(key);
    if (value === null || value.length === 0) {
      issues.push({ field: key, message: 'missing or empty' });
    } else if (PLACEHOLDER_RE.test(value)) {
      issues.push({ field: key, message: `placeholder text is not a value: ${value}` });
    }
  }

  if (name !== null && slug !== undefined && name !== slug) {
    issues.push({ field: 'name', message: `'${name}' does not match the filename slug '${slug}'` });
  }
  if (isAdr) {
    if (slug !== undefined && !ADR_RE.test(slug)) {
      issues.push({ field: 'name', message: 'ADR filename must match ADR-NNNN-<slug>' });
    }
    if (type !== null && type !== 'decision') {
      issues.push({ field: 'type', message: `an ADR must be type: decision, not '${type}'` });
    }
  } else if (slug !== undefined && !SLUG_RE.test(slug)) {
    issues.push({ field: 'name', message: 'filename slug must be kebab-case' });
  }

  if (type !== null && !LEARNING_TYPES.has(type)) {
    issues.push({ field: 'type', message: `'${type}' is not a known type` });
  }
  const scope = str('scope');
  if (scope !== null && !SCOPES.has(scope)) {
    issues.push({ field: 'scope', message: `'${scope}' is not a known scope` });
  }
  const allowedStatuses = isAdr ? ADR_STATUSES : STATUSES;
  if (status !== null && !allowedStatuses.has(status)) {
    issues.push({ field: 'status', message: `'${status}' is not a known status` });
  }

  const provenanceRaw = values.get('provenance');
  if (provenanceRaw !== undefined) {
    if (typeof provenanceRaw !== 'string' || provenanceRaw.length === 0) {
      issues.push({ field: 'provenance', message: 'must be a non-empty scalar' });
    } else if (PLACEHOLDER_RE.test(provenanceRaw)) {
      issues.push({ field: 'provenance', message: 'placeholder text is not a value' });
    }
  }

  const supersededByRaw = values.get('superseded-by');
  if (supersededByRaw !== undefined && typeof supersededByRaw !== 'string') {
    issues.push({ field: 'superseded-by', message: 'must be a scalar slug, not a list' });
  }
  const supersededBy = str('superseded-by');
  if (status === 'superseded' && (supersededBy === null || supersededBy.length === 0)) {
    issues.push({ field: 'superseded-by', message: 'required when status is superseded' });
  }
  if (supersededBy !== null && supersededBy.length > 0 && status !== 'superseded') {
    issues.push({ field: 'superseded-by', message: 'set, but status is not superseded' });
  }
  if (supersededBy !== null && supersededBy.length > 0) {
    if (!SLUG_RE.test(supersededBy) && !ADR_RE.test(supersededBy)) {
      issues.push({
        field: 'superseded-by',
        message: `'${supersededBy}' is not a valid record slug`,
      });
    }
  }

  for (const key of ['links', 'tags', 'watch']) {
    if (!values.has(key)) continue;
    const entries = list(key);
    if (entries === null) {
      issues.push({ field: key, message: 'must be an inline list `[a, b]`' });
      continue;
    }
    if (key !== 'links' && entries.length === 0) {
      issues.push({ field: key, message: 'must not be empty when present' });
    }
    if (key === 'watch') {
      for (const glob of entries) {
        if (watchEscapes(glob) || (root !== undefined && watchEscapesRealpath(root, glob))) {
          issues.push({ field: 'watch', message: `'${glob}' escapes the workspace` });
        }
      }
    } else {
      for (const entry of entries) {
        if (!SLUG_RE.test(entry) && !ADR_RE.test(entry)) {
          issues.push({ field: key, message: `'${entry}' is not a valid record slug` });
        }
      }
    }
  }

  // `reference` has no `why`; an ADR's four sections ARE its rationale.
  if (type !== null && type !== 'reference' && !isAdr) {
    if (!/\*\*Why:\*\*/.test(body)) {
      issues.push({ field: 'body', message: `type '${type}' requires a **Why:** section` });
    }
    if (!/\*\*How to apply:\*\*/.test(body)) {
      issues.push({
        field: 'body',
        message: `type '${type}' requires a **How to apply:** section`,
      });
    }
  }
  if (isAdr) {
    for (const heading of ['Context', 'Decision', 'Consequences', 'Alternatives']) {
      if (!new RegExp(`^##\\s+${heading}`, 'mi').test(body)) {
        issues.push({ field: 'body', message: `ADR requires a '## ${heading}' section` });
      }
    }
  }

  return { issues, values, body };
}

/** Parse `> **Key:** value` blockquote metadata (review artifacts). */
export function parseBlockquoteMeta(content) {
  const out = {};
  for (const m of content.matchAll(/^> \*\*([^:*]+):\*\*\s*(.*)$/gm)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

/** Slice a markdown section: from `## <heading>` to the next `## `. */
export function section(content, headingPattern) {
  const re = new RegExp(`^##\\s+.*${headingPattern}.*$`, 'im');
  const start = content.search(re);
  if (start === -1) return null;
  const rest = content.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Markdown files in a dir (non-recursive); empty list if the dir is absent. */
export function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

export const read = (p) => readFileSync(p, 'utf8');

/** Uniform reporter: collect failures + soft notes, exit non-zero on any failure. */
export function makeReporter(name) {
  const failures = [];
  const notes = [];
  return {
    fail: (msg) => failures.push(msg),
    note: (msg) => notes.push(msg),
    done: () => {
      for (const n of notes) console.log(`${name}: note — ${n}`);
      if (failures.length) {
        for (const f of failures) console.error(`${name}: FAIL — ${f}`);
        console.error(`${name}: ${failures.length} failure(s)`);
        process.exit(1);
      }
      console.log(`${name}: PASS`);
      process.exit(0);
    },
  };
}
