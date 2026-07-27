import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';

/**
 * PRD-029 — the rendered protocol store.
 *
 * This module is PURE with respect to the filesystem it writes: it reads the
 * shipped package corpus and returns a path→content map. Nothing here writes,
 * deletes, reads the clock, or reaches the network. `init.ts` owns the writing,
 * under the installer's existing additive-only contract.
 *
 * The store is a ONE-WAY install. There is no receipt, no reconciliation, no
 * upgrade path and no `sync`. Reinstalling is deleting every path the command
 * printed and running it again. That boundary is the scope, not an omission —
 * four independent readiness rounds put every mechanism defect in the layer
 * this module deliberately does not have.
 */

// --- package corpus ---------------------------------------------------------

/** Shipped corpus root. Same package-root walk as the practices-pack resolver:
 * dist/ is flat while src/ is nested, so walk up until the marker appears. */
export function promptsPackageDir(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    try {
      readFileSync(resolve(dir, 'prompts/PLACEHOLDERS.md'));
      return resolve(dir);
    } catch {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error('shipped prompts/ corpus not found — package layout broken');
      }
      dir = parent;
    }
  }
}

/** One source file, addressed by its path relative to the package root, always
 * with forward slashes so the disposition rules read the same on every OS. */
interface SourceFile {
  /** e.g. `prompts/adapters/codex-starter.md` */
  rel: string;
  /** absolute path on this machine */
  abs: string;
  isSymlink: boolean;
}

function walkSource(packageDir: string, top: string): SourceFile[] {
  const out: SourceFile[] = [];
  const root = resolve(packageDir, top);
  const visit = (dir: string): void => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // a directory the package does not ship is not this walk's failure
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
      const abs = join(dir, entry.name);
      // `withFileTypes` reports a symlink as a symlink, which is what rule 1
      // needs — a symlink is refused, never followed and never skipped, so we
      // must not stat through it here either.
      if (entry.isSymbolicLink()) {
        out.push({ rel: toPosix(relative(packageDir, abs)), abs, isSymlink: true });
        continue;
      }
      if (entry.isDirectory()) {
        visit(abs);
        continue;
      }
      if (entry.isFile()) {
        out.push({ rel: toPosix(relative(packageDir, abs)), abs, isSymlink: false });
      }
    }
  };
  visit(root);
  return out;
}

const toPosix = (value: string): string => value.split(sep).join(posix.sep);

// --- dispositions (FR-2) ----------------------------------------------------

export type Disposition = 'refuse' | 'omit' | 'verbatim' | 'render' | 'input';

interface Rule {
  /** Human name, used verbatim in the unmatched-file diagnostic. */
  readonly label: string;
  readonly disposition: Disposition;
  readonly matches: (file: SourceFile) => boolean;
  /** Destination under the store, or null when nothing is emitted. */
  readonly destination: ((rel: string) => string) | null;
}

const underPrompts = (rel: string): string | null =>
  rel.startsWith('prompts/') ? rel.slice('prompts/'.length) : null;

/**
 * The ordered disposition list. **First match wins, exact paths precede
 * patterns, and a file matching NO rule fails the plan by name.** That refusal
 * is what makes the domain total — no finite rule list covers a directory
 * anyone may add a file to, so the totality lives in the failure, not the list.
 */
export const DISPOSITIONS: readonly Rule[] = [
  {
    label: '1: any symlink — refused',
    disposition: 'refuse',
    matches: (f) => f.isSymlink,
    destination: null,
  },
  {
    label: '2: prompts/README.md, templates/README.md — not emitted',
    disposition: 'omit',
    matches: (f) => f.rel === 'prompts/README.md' || f.rel === 'templates/README.md',
    destination: null,
  },
  {
    label: '3: prompts/PLACEHOLDERS.md — copied verbatim, exempt from the token check',
    disposition: 'verbatim',
    matches: (f) => f.rel === 'prompts/PLACEHOLDERS.md',
    destination: () => 'prompts/PLACEHOLDERS.md',
  },
  {
    // BEFORE rule 5, deliberately: fragments are render INPUTS and must never
    // be reachable as outputs.
    label: '4: prompts/_fragments/** — render input, not emitted',
    disposition: 'input',
    matches: (f) => f.rel.startsWith('prompts/_fragments/'),
    destination: null,
  },
  {
    label: '5: prompts/**/*.md — rendered, relative path preserved',
    disposition: 'render',
    matches: (f) => underPrompts(f.rel) !== null && f.rel.endsWith('.md'),
    destination: (rel) => `prompts/${underPrompts(rel)!}`,
  },
  {
    // Direct children only, so nothing flattens and no basename can collide.
    label: '6: templates/*-template.md (direct children) — rendered',
    disposition: 'render',
    matches: (f) =>
      f.rel.startsWith('templates/') &&
      !f.rel.slice('templates/'.length).includes('/') &&
      f.rel.endsWith('-template.md'),
    destination: (rel) => `templates/${basename(rel)}`,
  },
];

export class PromptsError extends Error {
  constructor(
    message: string,
    readonly details: string[] = [],
  ) {
    super(details.length > 0 ? `${message}\n  ${details.join('\n  ')}` : message);
    this.name = 'PromptsError';
  }
}

interface PlannedFile {
  source: SourceFile;
  rule: Rule;
  /** Store-relative destination, e.g. `prompts/phase-1-prd-generator.md`. */
  storeRel: string;
}

/** Apply the ordered rules to the whole source domain. Throws on an unmatched
 * file, a symlink, or a destination collision. */
export function planStore(packageDir: string): PlannedFile[] {
  const files = [...walkSource(packageDir, 'prompts'), ...walkSource(packageDir, 'templates')];

  const symlinks: string[] = [];
  const unmatched: string[] = [];
  const planned: PlannedFile[] = [];

  for (const file of files) {
    const rule = DISPOSITIONS.find((r) => r.matches(file));
    if (rule === undefined) {
      unmatched.push(file.rel);
      continue;
    }
    if (rule.disposition === 'refuse') {
      symlinks.push(file.rel);
      continue;
    }
    if (rule.destination === null) continue;
    planned.push({ source: file, rule, storeRel: rule.destination(file.rel) });
  }

  if (symlinks.length > 0) {
    throw new PromptsError(
      'the shipped corpus contains a symlink, which is neither followed nor skipped',
      symlinks.map((s) => `${s} — replace it with a regular file`),
    );
  }
  if (unmatched.length > 0) {
    throw new PromptsError(
      'a package file matches no disposition rule; give it one before it can ship',
      [...unmatched, 'available dispositions:', ...DISPOSITIONS.map((r) => `  ${r.label}`)],
    );
  }
  assertNoCollision(planned);
  return planned;
}

/** Destinations are compared case-folded and Unicode-normalised (NFC): two
 * sources that differ only by case or normalisation would overwrite each other
 * on a case-insensitive or normalising volume. */
export function assertNoCollision(planned: PlannedFile[]): void {
  const seen = new Map<string, string>();
  const clashes: string[] = [];
  for (const item of planned) {
    const key = item.storeRel.normalize('NFC').toLowerCase();
    const previous = seen.get(key);
    if (previous !== undefined) {
      clashes.push(`${previous} and ${item.source.rel} both resolve to ${item.storeRel}`);
      continue;
    }
    seen.set(key, item.source.rel);
  }
  if (clashes.length > 0) {
    throw new PromptsError('two source files resolve to one destination', clashes);
  }
}

// --- token grammar (FR-3) ---------------------------------------------------

/**
 * Two candidate classes, and the ESCAPE class is matched first. That order is
 * load-bearing: under a token-only rule `{{!NAME}}` is not a candidate at all
 * and the escape below would be unreachable by its own grammar.
 *
 * Text in neither class — `{{lowercase}}`, `{{ spaced }}`, `{{1}}` — is prose
 * and passes through untouched. Treating every `{{` as a token would make the
 * render hostile to documents it was never meant to interpret.
 *
 * The escape class is `\{\{(!+)([^\n{}]*)\}\}`. It has no constant of its own
 * because `substituteOnce` must match both classes in ONE alternation to keep
 * the escape ordered first; a second pass would reintroduce the order bug.
 */
const TOKEN_CANDIDATE = /\{\{([A-Z][^\n{}]*?)\}\}/g;
/** A candidate is a TOKEN when its identifier matches this, on one line. */
const TOKEN_NAME = /^[A-Z][A-Z0-9_]*$/;
/** An unterminated candidate: `{{` plus `!`s or an uppercase letter, with no
 * closing `}}` before the end of the line. */
const UNTERMINATED = /\{\{(?:!+|[A-Z])[^\n{}]*$/gm;

export type DiagnosticKind = 'malformed' | 'undeclared' | 'unresolved' | 'unused';

export interface Diagnostic {
  kind: DiagnosticKind;
  /** Source file the finding is in, or `workflow.config.json` for `unused`. */
  file: string;
  /** 1-indexed line, or null for a whole-config finding. */
  line: number | null;
  message: string;
}

interface Occurrence {
  token: string;
  line: number;
}

/** Every token occurrence in `text`, collected BEFORE any replacement. */
export function scanTokens(text: string, file: string): { found: Occurrence[]; bad: Diagnostic[] } {
  const found: Occurrence[] = [];
  const bad: Diagnostic[] = [];
  const lineOf = (index: number): number => text.slice(0, index).split('\n').length;

  for (const m of text.matchAll(UNTERMINATED)) {
    bad.push({
      kind: 'malformed',
      file,
      line: lineOf(m.index),
      message: `\`${m[0].slice(0, 24)}\` opens a token that does not close on the same line`,
    });
  }

  for (const m of text.matchAll(TOKEN_CANDIDATE)) {
    // `noUncheckedIndexedAccess` is on: a capture group is `string | undefined`
    // to the compiler even when the pattern guarantees it. Narrow rather than
    // assert — §12 forbids `any`, and a non-null assertion is the same evasion.
    const name = m[1];
    if (name === undefined) continue;
    if (TOKEN_NAME.test(name)) {
      found.push({ token: name, line: lineOf(m.index) });
      continue;
    }
    bad.push({
      kind: 'malformed',
      file,
      line: lineOf(m.index),
      message: `\`{{${name}}}\` is not a token: an identifier is \`[A-Z][A-Z0-9_]*\``,
    });
  }
  return { found, bad };
}

/**
 * One pass over the source. Every occurrence is located first, then each is
 * replaced exactly once with its value treated as OPAQUE: a configured value
 * containing `{{X}}` is emitted as-is and never re-scanned, so replacement
 * order cannot change the output.
 *
 * The escape is applied in the same pass and is recursive: `{{!NAME}}` renders
 * `{{NAME}}` and `{{!!NAME}}` renders `{{!NAME}}`, so any literal a document
 * needs can be written.
 */
export function substituteOnce(text: string, values: ReadonlyMap<string, string>): string {
  const out: string[] = [];
  let cursor = 0;
  const combined = /\{\{(!+)([^\n{}]*)\}\}|\{\{([A-Z][A-Z0-9_]*)\}\}/g;
  for (const m of text.matchAll(combined)) {
    out.push(text.slice(cursor, m.index));
    const bangs = m[1];
    const escaped = m[2];
    const token = m[3];
    if (bangs !== undefined && escaped !== undefined) {
      // Escape: drop exactly one `!` and emit the rest literally, which makes
      // the escape recursive — `{{!!NAME}}` renders `{{!NAME}}`.
      out.push(`{{${bangs.slice(1)}${escaped}}}`);
    } else if (token !== undefined) {
      // The value is OPAQUE: emitted as-is and never re-scanned.
      out.push(values.get(token) ?? m[0]);
    } else {
      out.push(m[0]);
    }
    cursor = m.index + m[0].length;
  }
  out.push(text.slice(cursor));
  return out.join('');
}

// --- banner (FR-3) ----------------------------------------------------------

export const GENERATED_BANNER = (version: string): string =>
  `<!-- GENERATED by provegate ${version} — \`gate init --prompts\`. Do not edit.\n` +
  `     This store installs ONE WAY: to reinstall, delete every path the command\n` +
  `     printed and run it again. -->`;

/**
 * Banner first, EXCEPT where the format requires frontmatter on line 1, where
 * it follows the closing `---`. Every `.cursor/rules/*.mdc` in this repository
 * and in the source snapshot opens with `---`; a banner above it moves the
 * frontmatter and the rule may not attach.
 */
export function bannerFor(content: string, version: string): string {
  const banner = GENERATED_BANNER(version);
  if (!content.startsWith('---\n')) return `${banner}\n\n${content}`;
  const end = content.indexOf('\n---\n', 4);
  if (end === -1) return `${banner}\n\n${content}`;
  const cut = end + '\n---\n'.length;
  return `${content.slice(0, cut)}\n${banner}\n${content.slice(cut)}`;
}
