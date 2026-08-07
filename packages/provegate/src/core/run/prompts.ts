import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { basename, dirname, join, posix, relative, resolve, sep } from 'node:path';
import { volumeIsCaseInsensitive } from '../config/load.js';

/**
 * PRD-029 — the rendered protocol store; PRD-034 — its reconciliation.
 *
 * This module WRITES nothing and reads no clock: the render returns a
 * path→content map (`init.ts` owns the writing, under the installer's
 * additive-only contract), and the reconciliation reads planned paths and
 * returns typed findings — the caller supplies today's date where expiry needs
 * one.
 *
 * The store is a ONE-WAY install. There is no receipt, no upgrade path and no
 * `sync`. Reinstalling is deleting every path the command printed and running
 * it again. Divergence DETECTION exists since PRD-034: `reconcilePrompts`
 * recomputes the planned set and compares bytes (`gate check --prompts` is the
 * command surface) — it reports, and repairs nothing.
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

export interface PlannedFile {
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
/**
 * `{{A{B}}` — a candidate whose identifier contains a brace. It matches neither
 * candidate class, so without this it was emitted untouched and diagnosed as
 * nothing. §12 says a candidate whose identifier leaves the charset is
 * malformed; a brace is outside the charset.
 *
 * `[^\n}]*` before the `{` is load-bearing and was learned the expensive way:
 * with `[^\n]*?` there, this pattern spanned two ADJACENT VALID TOKENS —
 * `{{CMD_CHECK_TYPES}} + {{CMD_TEST}}` matched as one malformed candidate — and
 * refused four files of the shipped corpus. A guard added for an adversarial
 * input broke routine ones, which is exactly what
 * `strictness-added-during-extraction-is-a-behavior-change` warns about.
 */
const BRACED_CANDIDATE = /\{\{[A-Z][^\n}]*\{[^\n]*?\}\}/g;
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

  for (const m of text.matchAll(BRACED_CANDIDATE)) {
    bad.push({
      kind: 'malformed',
      file,
      line: lineOf(m.index),
      message: `\`${m[0].slice(0, 24)}\` is not a token: an identifier is \`[A-Z][A-Z0-9_]*\``,
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

// --- the registry, one authority (FR-4) -------------------------------------

export interface RegistryRow {
  token: string;
  meaning: string;
  /** Dotted `WorkflowConfig` path that supplies this token, or null. */
  configField: string | null;
  /** Whether `''` is a legal value for this token. */
  emptyAllowed: boolean;
  /** Legal values when the token is enumerated, else null. */
  enumerated: string[] | null;
}

const CELL_TOKEN = /^`\{\{([A-Z][A-Z0-9_]*)\}\}`$/;
const unset = (cell: string): boolean => cell === '' || cell === '—' || cell === '-';
const unbacktick = (cell: string): string => cell.replace(/^`|`$/g, '');

/**
 * `PLACEHOLDERS.md` is the SINGLE authority for token metadata: which tokens
 * exist, which resolve from config, where `''` is legal, and which are
 * enumerated. Deriving all four from one table is what keeps a second reader
 * from disagreeing with it — `two-parsers-wrong-together` is about exactly the
 * shape this avoids.
 */
export function parseRegistry(text: string): RegistryRow[] {
  const rows: RegistryRow[] = [];
  for (const line of text.split('\n')) {
    if (!line.startsWith('| `{{')) continue;
    const cells = line
      .trim()
      .replace(/^\||\|$/g, '')
      .split('|')
      .map((c) => c.trim());
    const first = cells[0];
    if (first === undefined) continue;
    const match = CELL_TOKEN.exec(first);
    if (match === null) continue;
    const token = match[1];
    if (token === undefined) continue;
    const configCell = cells[3] ?? '';
    const emptyCell = cells[4] ?? '';
    const enumCell = cells[5] ?? '';
    rows.push({
      token,
      meaning: cells[1] ?? '',
      configField: unset(configCell) ? null : unbacktick(configCell),
      emptyAllowed: emptyCell === 'allowed',
      enumerated: unset(enumCell)
        ? null
        : unbacktick(enumCell)
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v.length > 0),
    });
  }
  return rows;
}

/** Read a dotted path out of the resolved config. Returns null when the path
 * does not exist, which a package test turns into a build-time failure for the
 * registry rather than a silent unresolved token at render time. */
export function readConfigPath(config: unknown, dotted: string): string | null {
  let current: unknown = config;
  for (const segment of dotted.split('.')) {
    if (typeof current !== 'object' || current === null) return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === 'string' ? current : null;
}

// --- values and enumerated tokens (FR-4) ------------------------------------

export interface PromptsLike {
  enabled: boolean;
  dir: string;
  adapters: string[];
  values: Record<string, string | null>;
}

/** Config shape this module needs. Narrower than `WorkflowConfig` on purpose:
 * the render reads a handful of fields and must not acquire a dependency on
 * the whole surface. */
export interface RenderConfig {
  prompts: PromptsLike;
  [key: string]: unknown;
}

/** Tokens the RENDERED corpus consumes, in first-appearance order. */
export function corpusTokens(packageDir: string, planned: PlannedFile[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const item of planned) {
    if (item.rule.disposition !== 'render') continue;
    const { found } = scanTokens(readFileSync(item.source.abs, 'utf8'), item.source.rel);
    for (const occurrence of found) {
      if (seen.has(occurrence.token)) continue;
      seen.add(occurrence.token);
      order.push(occurrence.token);
    }
  }
  return order;
}

/**
 * The values an adopter must supply: the tokens the RENDERED corpus consumes,
 * minus those a config field resolves.
 *
 * Derived from the corpus, never from the registry. The registry also covers
 * `practices/templates/`, which the store does not render, so four of its rows
 * would otherwise become questions an adopter answers to no effect. A
 * requirement derived from the catalogue rather than from what the consumer
 * reads produces refusals nobody can satisfy meaningfully.
 */
export function requiredValues(
  packageDir: string,
  planned: PlannedFile[],
  registry: RegistryRow[],
): RegistryRow[] {
  const backed = new Set(registry.filter((r) => r.configField !== null).map((r) => r.token));
  const consumed = new Set(corpusTokens(packageDir, planned));
  return registry.filter((r) => consumed.has(r.token) && !backed.has(r.token));
}

/** `prompts/_fragments/<TOKEN>.<value>.md`, the package-relative source of an
 * enumerated token's text. The config supplies the KEY; the prose stays in the
 * package, where the provenance rule can see it. */
export const fragmentRel = (token: string, value: string): string =>
  `prompts/_fragments/${token}.${value}.md`;

/**
 * Fragments are TERMINAL, and it is enforced rather than assumed: a fragment
 * containing a token candidate would survive into the output unresolved,
 * because substitution is one pass and re-scanning would break the opacity
 * guarantee that makes replacement order irrelevant.
 *
 * Enforced at render time and by a package test — NOT "at build time". The
 * package's `build` is a single `tsup` invocation with no content validation,
 * and an adopter does not build package content at install; a requirement
 * wired to a boundary that does not exist is the `gate-wire-or-delete` failure.
 */
export function assertFragmentTerminal(rel: string, text: string): void {
  const { found, bad } = scanTokens(text, rel);
  if (found.length === 0 && bad.length === 0) return;
  throw new PromptsError(`fragment ${rel} is not terminal`, [
    ...found.map((f) => `line ${f.line}: {{${f.token}}}`),
    ...bad.map((b) => `line ${b.line ?? '?'}: ${b.message}`),
    'a fragment is substituted into a rendered file and is never itself scanned',
  ]);
}

// --- the render (FR-3, FR-4) ------------------------------------------------

export interface RenderResult {
  /** Store-relative path → content. `init.ts` prefixes `prompts.dir`. */
  files: Map<string, string>;
  /** The rows an adopter must supply, for the block the command prints. */
  required: RegistryRow[];
}

function packageVersion(packageDir: string): string {
  try {
    const raw: unknown = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'));
    if (typeof raw === 'object' && raw !== null) {
      const version = (raw as Record<string, unknown>)['version'];
      if (typeof version === 'string') return version;
    }
  } catch {
    /* a corpus without a manifest still renders; the banner says `unknown` */
  }
  return 'unknown';
}

/**
 * Render the store. PURE with respect to the target filesystem — it reads the
 * shipped corpus and returns a path→content map, and `init.ts` does the
 * writing under the installer's additive-only contract.
 *
 * Throws `PromptsError` carrying every diagnostic at once, so an adopter fixes
 * one round of problems rather than one problem per run.
 */
export function renderPrompts(packageDir: string, config: RenderConfig): RenderResult {
  const planned = planStore(packageDir);
  const version = packageVersion(packageDir);

  const registryFile = planned.find((p) => p.rule.disposition === 'verbatim');
  if (registryFile === undefined) {
    throw new PromptsError('the shipped corpus has no placeholder registry');
  }
  const registryText = readFileSync(registryFile.source.abs, 'utf8');
  const registry = parseRegistry(registryText);
  const byToken = new Map(registry.map((r) => [r.token, r]));

  const required = requiredValues(packageDir, planned, registry);
  const supplied = config.prompts.values;
  const diagnostics: Diagnostic[] = [];

  // Resolution, one map, built before any file is touched.
  const values = new Map<string, string>();
  for (const row of registry) {
    if (row.configField !== null) {
      const resolved = readConfigPath(config, row.configField);
      if (resolved !== null) values.set(row.token, resolved);
      continue;
    }
    const given = supplied[row.token];
    if (given === undefined || given === null) continue; // unset; diagnosed below
    if (given === '' && !row.emptyAllowed) {
      diagnostics.push({
        kind: 'unresolved',
        file: 'workflow.config.json',
        line: null,
        message: `prompts.values.${row.token} is empty, which this token does not allow — ${row.meaning}`,
      });
      continue;
    }
    if (row.enumerated !== null) {
      if (!row.enumerated.includes(given)) {
        diagnostics.push({
          kind: 'unresolved',
          file: 'workflow.config.json',
          line: null,
          message: `prompts.values.${row.token} is \`${given}\`; legal values are ${row.enumerated.join(', ')}`,
        });
        continue;
      }
      const rel = fragmentRel(row.token, given);
      let text: string;
      try {
        text = readFileSync(resolve(packageDir, rel), 'utf8');
      } catch {
        throw new PromptsError(`enumerated token ${row.token} declares \`${given}\``, [
          `but ${rel} does not exist in the package`,
        ]);
      }
      assertFragmentTerminal(rel, text);
      values.set(row.token, text.trimEnd());
      continue;
    }
    values.set(row.token, given);
  }

  // `unused`: a supplied key no rendered token consumes. This is a RENDER
  // diagnostic and not a config-load one — the legal key set is the corpus,
  // which is package Markdown the config loader must not read.
  const consumed = new Set(corpusTokens(packageDir, planned));
  const configBacked = new Set(registry.filter((r) => r.configField !== null).map((r) => r.token));
  for (const key of Object.keys(supplied)) {
    // A config-backed token IS consumed by the corpus, so occurrence alone
    // cannot see this case — and it is the one class of dead key the registry
    // actively invites an adopter to set.
    if (configBacked.has(key)) {
      const row = byToken.get(key);
      diagnostics.push({
        kind: 'unused',
        file: 'workflow.config.json',
        line: null,
        message: `prompts.values.${key} is ignored — this token resolves from \`${row?.configField ?? ''}\``,
      });
      continue;
    }
    if (consumed.has(key)) continue;
    diagnostics.push({
      kind: 'unused',
      file: 'workflow.config.json',
      line: null,
      message: `prompts.values.${key} is consumed by no rendered protocol${
        byToken.has(key)
          ? ' (the registry declares it, but only for a file the store does not render)'
          : ''
      }`,
    });
  }

  const files = new Map<string, string>();
  for (const item of planned) {
    const source = readFileSync(item.source.abs, 'utf8');
    if (item.rule.disposition === 'verbatim') {
      // No banner and no substitution: rendering the registry would consume the
      // very tokens it documents, and the refusal explaining the failure would
      // fire on the explanation.
      files.set(item.storeRel, source);
      continue;
    }
    const { found, bad } = scanTokens(source, item.source.rel);
    diagnostics.push(...bad);
    for (const occurrence of found) {
      if (!byToken.has(occurrence.token)) {
        diagnostics.push({
          kind: 'undeclared',
          file: item.source.rel,
          line: occurrence.line,
          message: `{{${occurrence.token}}} is in no registry row — declare it, or escape it as {{!${occurrence.token}}}`,
        });
        continue;
      }
      if (values.has(occurrence.token)) continue;
      const row = byToken.get(occurrence.token);
      diagnostics.push({
        kind: 'unresolved',
        file: item.source.rel,
        line: occurrence.line,
        message: `{{${occurrence.token}}} has no value — set prompts.values.${occurrence.token} (${row?.meaning ?? ''})`,
      });
    }
    files.set(item.storeRel, bannerFor(substituteOnce(source, values), version));
  }

  if (diagnostics.length > 0) {
    const order: DiagnosticKind[] = ['malformed', 'undeclared', 'unresolved', 'unused'];
    const seen = new Set<string>();
    const details = diagnostics
      .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
      .map((d) => `[${d.kind}] ${d.file}${d.line === null ? '' : `:${d.line}`} — ${d.message}`)
      .filter((line) => (seen.has(line) ? false : (seen.add(line), true)));
    throw new PromptsError('the protocol store cannot be rendered', details);
  }

  files.set('README.md', storeReadme(version));
  return { files, required };
}

const storeReadme = (version: string): string =>
  [
    `<!-- GENERATED by provegate ${version} — \`gate init --prompts\`. Do not edit. -->`,
    '',
    '# Protocol store',
    '',
    'Every file here is generated from the installed `provegate` package and this',
    "repository's `workflow.config.json`. Edits are overwritten by nothing and",
    'preserved by nothing — the tool never rewrites this tree.',
    '',
    '## Reinstalling',
    '',
    'This store installs **one way**. There is no upgrade path and no `sync` —',
    'nothing repairs or syncs automatically. To reinstall after a package upgrade:',
    '',
    '1. Run `gate init --prompts` and read the generated path set it prints.',
    '2. Delete **every path in that set** — this directory *and* the adapter',
    '   destinations outside it, which a delete-this-directory instruction would',
    '   leave behind at the previous version.',
    '3. Run `gate init --prompts` again.',
    '',
    '## Staleness detection',
    '',
    'Run `gate check --prompts`: it recomputes this store from the installed',
    'package and your config, compares bytes, and reports `stale`, `modified`,',
    '`missing` and `unattributable` paths. It repairs nothing and deletes',
    'nothing — reinstalling stays the manual procedure above.',
    '',
  ].join('\n');

// --- adapters (FR-6) --------------------------------------------------------

/** The seven phase protocols, in phase order, discovered from the plan rather
 * than hardcoded — a corpus that gains a phase gains a command. */
function phaseProtocols(files: ReadonlyMap<string, string>): { phase: string; store: string }[] {
  const out: { phase: string; store: string }[] = [];
  for (const storeRel of files.keys()) {
    const match = /^prompts\/phase-(\d+)-[a-z0-9-]+\.md$/.exec(storeRel);
    if (match === null) continue;
    const phase = match[1];
    if (phase === undefined) continue;
    out.push({ phase, store: storeRel });
  }
  return out.sort((a, b) => Number(a.phase) - Number(b.phase));
}

/** The one directive an adapter is allowed to carry. Everything else in a
 * generated adapter is a path or a heading. */
const DIRECTIVE = 'Read the protocol below and follow it verbatim; do not summarise it.';

/**
 * `globs` for the Cursor rule, derived EXACTLY: each `dirs.artifacts` entry in
 * declared key order, as `<entry.dir>/**\/*.md`, joined with `, ` into a single
 * unquoted scalar on one line. That is the form the source snapshot's own
 * `rules/prd-workflow.mdc` uses. The `prefix` field is not used.
 */
export function artifactGlobs(config: RenderConfig): string {
  const dirs = (config as { dirs?: { artifacts?: Record<string, { dir?: string }> } }).dirs;
  const artifacts = dirs?.artifacts ?? {};
  return Object.keys(artifacts)
    .map((key) => artifacts[key]?.dir)
    .filter((dir): dir is string => typeof dir === 'string' && dir.length > 0)
    .map((dir) => `${dir}/**/*.md`)
    .join(', ');
}

/**
 * Generated adapters. Each carries a PATH and no protocol prose — the whole
 * point is one protocol in one place, so a corrected rule cannot survive in a
 * stale restatement.
 *
 * TWO OF THE THREE DESTINATIONS ARE OUTSIDE THE STORE. That is the reinstall
 * unit's definition and the reason FR-5 prints the full set on every run: a
 * "delete the store directory" instruction leaves `.claude/commands/*` and
 * `.cursor/rules/prd-workflow.mdc` at the previous package version, with stale
 * banners and stale store paths, while the adopter believes they reinstalled.
 */
export function renderAdapters(
  config: RenderConfig,
  files: ReadonlyMap<string, string>,
  version: string,
): Map<string, string> {
  const dir = config.prompts.dir;
  const out = new Map<string, string>();
  const phases = phaseProtocols(files);
  const banner = GENERATED_BANNER(version);
  const table = [
    '| Phase | Protocol |',
    '| --- | --- |',
    ...phases.map((p) => `| ${p.phase} | \`${dir}/${p.store}\` |`),
  ].join('\n');

  for (const adapter of config.prompts.adapters) {
    if (adapter === 'claude-code') {
      for (const p of phases) {
        // Claude Code lists a command by its FIRST LINE (PRD-029's measured
        // operator finding, closed by PRD-032 FR-7): prose first, banner
        // below it — still present and parseable (`bannerFor` proved the
        // parser never required line 1; attribution reads it anywhere).
        const slug = /^prompts\/phase-\d+-([a-z0-9-]+)\.md$/.exec(p.store)?.[1] ?? 'protocol';
        const listing = `Phase ${p.phase} of the gated PRD workflow — ${slug.replaceAll('-', ' ')}.`;
        out.set(
          `.claude/commands/prd-${p.phase}.md`,
          `${listing}\n\n${banner}\n\n# Phase ${p.phase}\n\n${DIRECTIVE}\n\n\`\`\`\n${dir}/${p.store}\n\`\`\`\n`,
        );
      }
      continue;
    }
    if (adapter === 'cursor') {
      // Frontmatter FIRST — every `.cursor/rules/*.mdc` here and in the source
      // snapshot opens with `---`, and a banner above it may stop the rule
      // attaching at all.
      out.set(
        '.cursor/rules/prd-workflow.mdc',
        [
          '---',
          'description: The gated PRD workflow — phase protocols for this repository',
          `globs: ${artifactGlobs(config)}`,
          'alwaysApply: false',
          '---',
          '',
          banner,
          '',
          '## Phase protocols',
          '',
          table,
          '',
        ].join('\n'),
      );
      continue;
    }
    if (adapter === 'codex') {
      // A SNIPPET, never a write to AGENTS.md. `planPractices` states that
      // agent-entrypoint files are deliberately absent so an existing entrypoint
      // is never touched or shadowed; a provegate-namespaced generated adapter
      // is a different class, and the adopter pastes this one themselves.
      out.set(`${dir}/AGENTS.md.provegate.snippet`, `## Phase protocols\n\n${table}\n`);
    }
  }
  return out;
}

/** Store-relative render output plus the adapters, as repo-relative paths.
 * This IS the reinstall unit, and the set `gate init --prompts` prints. */
export function generatedPaths(
  config: RenderConfig,
  result: RenderResult,
  version: string,
): Map<string, string> {
  const dir = config.prompts.dir;
  const out = new Map<string, string>();
  for (const [storeRel, body] of result.files) out.set(`${dir}/${storeRel}`, body);
  for (const [repoRel, body] of renderAdapters(config, result.files, version)) {
    out.set(repoRel, body);
  }
  return out;
}

export { packageVersion };

// --- reconciliation (PRD-034) ------------------------------------------------

export type PromptFindingKind = 'missing' | 'current' | 'stale' | 'modified' | 'unattributable';

export interface PromptFinding {
  /** Canonical repo-relative POSIX spelling — every legal `prompts.dir`
   * converges to one clean form here, `.` included. */
  path: string;
  kind: PromptFindingKind;
  /** Version parsed from the on-disk banner — ATTRIBUTION only, never
   * detection. Null when no banner is parseable, which includes the two
   * deliberately unbannered planned paths and any banner a human stripped. */
  bannerVersion: string | null;
  /** What a fresh render would write: the installed package's version. */
  installedVersion: string;
}

/** The banner's version, wherever the banner sits (after frontmatter in
 * `.mdc`). Attribution only: detection compares bytes, never versions. */
const BANNER_VERSION_RE = /<!-- GENERATED by provegate (\S+) /;

/** The one parsing authority for the banner's version (attribution). */
export function bannerVersion(content: string): string | null {
  return BANNER_VERSION_RE.exec(content)?.[1] ?? null;
}

/** Realpath of the nearest EXISTING ancestor of `path`, or null when none
 * resolves. Lets a missing leaf still prove its parents stay contained. */
function nearestRealAncestor(path: string): string | null {
  let current = dirname(path);
  for (;;) {
    try {
      return realpathSync(current);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return null;
      const parent = dirname(current);
      if (parent === current) return null;
      current = parent;
    }
  }
}

/** Does ANYTHING sit at `path` (a dangling symlink included)? */
function lstatExists(path: string): boolean {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * The deepest component on `path`'s chain that lstat SEES but realpath cannot
 * resolve — a dangling symlink at the leaf OR anywhere among the parents — or
 * null when the missing tail is genuine absence. A leaf-only lstat check
 * missed the dangling-parent case: lstat follows parent links, so a dangling
 * parent makes the leaf read as absent while a link still sits on the chain.
 */
function danglingOnChain(path: string): string | null {
  let current = path;
  for (;;) {
    if (lstatExists(current)) {
      try {
        realpathSync(current);
        return null; // resolvable from here up — nothing dangling
      } catch {
        return current;
      }
    }
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

/**
 * The reconciliation primitive (FR-1). Recomputes the generated set —
 * `generatedPaths()` from the INSTALLED package and the CURRENT config, the
 * same pure function the installer uses — and compares bytes on disk. No
 * stored state is read (`recompute-beats-recorded-state`), and NOTHING is
 * written (the model's T7 boundary).
 *
 * The classification is total over every path it examines, and it examines
 * exactly the planned set: one read per member of `generatedPaths()`, no
 * directory listing, no walk, no filesystem contract (owner narrowing after
 * readiness iteration 5; the model's limits 4-6 are consequences, pinned as
 * no-finding fixtures rather than solved).
 *
 * Read-error contract: `ENOENT` is `missing`; any other read failure fails the
 * run closed naming the path and the error; a planned path is read only when
 * its full realpath — leaf symlink or symlinked parent alike — stays inside
 * the repository's canonical containment, else it fails closed naming the
 * escape.
 */
export function reconcilePrompts(
  config: RenderConfig,
  root: string,
  packageDir: string = promptsPackageDir(),
): PromptFinding[] {
  const version = packageVersion(packageDir);
  const fresh = generatedPaths(config, renderPrompts(packageDir, config), version);

  let rootReal: string;
  try {
    rootReal = realpathSync(resolve(root));
  } catch (error) {
    throw new PromptsError('reconcile cannot resolve the repository root', [
      `${root} — ${String(error)}`,
    ]);
  }
  // Volume-aware containment, the same probe the config resolver uses: on a
  // case-insensitive volume an in-repository symlink target spelled with
  // different casing is still inside — a case-sensitive compare would refuse
  // a contained path (round-4 advisory).
  const caseFold = volumeIsCaseInsensitive(rootReal)
    ? (value: string): string => value.toLowerCase()
    : (value: string): string => value;
  const insideRoot = (candidate: string): boolean =>
    caseFold(candidate) === caseFold(rootReal) ||
    caseFold(candidate).startsWith(caseFold(rootReal) + sep);

  const findings: PromptFinding[] = [];
  for (const [joined, expected] of fresh) {
    // Canonical report spelling: POSIX-normalize the joined `dir + '/' + rel` —
    // repeated separators collapse, a leading `./` drops. No backslash can
    // survive here because `prompts.dir` refuses backslashes at config load.
    const canonical = posix.normalize(joined);
    const abs = resolve(rootReal, canonical);

    let real: string;
    try {
      real = realpathSync(abs);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // ENOENT from realpath is 'missing' ONLY when nothing sits anywhere on
        // the missing tail and the resolvable ancestors stay contained. Three
        // escapes hide behind this code: a DANGLING leaf symlink, a DANGLING
        // parent symlink (lstat follows parents, so the leaf reads absent
        // while a link still sits on the chain), and a missing leaf beneath a
        // parent that resolves OUTSIDE. All fail closed rather than inviting
        // a reinstall over a chain this check cannot vouch for.
        const dangling = danglingOnChain(abs);
        if (dangling !== null) {
          throw new PromptsError('a planned path is an unresolvable symlink', [
            `${canonical} — a link at ${dangling} cannot be resolved`,
          ]);
        }
        const ancestorReal = nearestRealAncestor(abs);
        if (ancestorReal === null) {
          throw new PromptsError('reconcile cannot resolve a planned path', [
            `${canonical} — no resolvable ancestor`,
          ]);
        }
        if (!insideRoot(ancestorReal)) {
          throw new PromptsError('a planned path resolves outside the repository', [
            `${canonical} — its nearest existing ancestor resolves to ${ancestorReal}`,
          ]);
        }
        findings.push({
          path: canonical,
          kind: 'missing',
          bannerVersion: null,
          installedVersion: version,
        });
        continue;
      }
      throw new PromptsError('reconcile cannot read a planned path', [
        `${canonical} — ${String(error)}`,
      ]);
    }
    if (!insideRoot(real)) {
      throw new PromptsError('a planned path resolves outside the repository', [
        `${canonical} — resolves to ${real}`,
      ]);
    }

    let onDisk: Buffer;
    try {
      // Read the VALIDATED resolution, not the mutable planned path: between
      // the containment check and this read, a symlink swap at `abs` would
      // redirect a re-open — reading `real` keeps the bytes bound to the
      // location containment approved. (The residual swap-of-`real` race is
      // the adversarial concurrent-writer class the PRD-022 deferral records;
      // same posture here, noted in the task file.)
      onDisk = readFileSync(real);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // It existed when realpath resolved it and is gone at read time:
        // concurrent mutation mid-run. Never classified — fail closed; a
        // stable tree cannot produce this.
        throw new PromptsError('a planned path changed during the run', [
          `${canonical} — resolved to ${real}, which vanished before it could be read`,
        ]);
      }
      // A directory where a file was planned, a permission failure, an I/O
      // error — never skipped into a class.
      throw new PromptsError('reconcile cannot read a planned path', [
        `${canonical} — ${String(error)}`,
      ]);
    }

    if (onDisk.equals(Buffer.from(expected, 'utf8'))) {
      findings.push({
        path: canonical,
        kind: 'current',
        bannerVersion: null,
        installedVersion: version,
      });
      continue;
    }
    const parsedBannerVersion = bannerVersion(onDisk.toString('utf8'));
    findings.push({
      path: canonical,
      kind:
        parsedBannerVersion === null
          ? 'unattributable'
          : parsedBannerVersion === version
            ? 'modified'
            : 'stale',
      bannerVersion: parsedBannerVersion,
      installedVersion: version,
    });
  }
  return findings;
}

/** An exception entry as the config carries it (FR-2). Config load owns the
 * full semantic validation; the evaluator trusts the shape and re-judges only
 * what depends on the run: expiry against today, staleness against findings. */
export interface PromptExceptionLike {
  path: string;
  reason: string;
  owner: string;
  expires: string;
}

export interface PromptReconciliationReport {
  /** True iff nothing falls outside `current`/`excepted` and no entry problem. */
  ok: boolean;
  /** One line per finding that is not `current`, plus the T2 remedy when any
   * path is `stale`. `current` paths are otherwise silent. */
  lines: string[];
  /** Exactly one summary line naming every count. */
  summary: string;
  /** Expired and stale exception entries — each fails the run by name. */
  problems: string[];
}

/** The model's T2 remedy, printed verbatim wherever `stale` is reported. The
 * adopter deletes and reinstalls; no command performs either step. */
export const PROMPT_STALE_REMEDY: readonly string[] = [
  'upgrade remedy (state model T2): run `gate init --prompts` to print the reinstall unit,',
  'delete every path it prints, then run `gate init --prompts` again — this command deletes nothing.',
];

/**
 * The shared evaluator (FR-5): verdict and report lines from findings. Both
 * `gate check --prompts` and the packed `verify-prompts.mjs` consume THIS
 * function through the installed package, so the interpretation cannot drift
 * (`two-parsers-wrong-together`).
 *
 * Suppression is scoped to `modified` and nothing else: `stale`, `missing` and
 * `unattributable` are never exceptable — an unattributable divergence might
 * be an undelivered upgrade, and suppressing it would hide T2. No entry ever
 * authorizes a write. `todayUtc` is the caller's `YYYY-MM-DD`: this module
 * reads no clock, and an entry is valid THROUGH its `expires` date.
 */
export function evaluatePromptReconciliation(
  findings: PromptFinding[],
  { exceptions = [], todayUtc }: { exceptions?: readonly PromptExceptionLike[]; todayUtc: string },
): PromptReconciliationReport {
  const modifiedPaths = new Set(findings.filter((f) => f.kind === 'modified').map((f) => f.path));
  const suppressed = new Map<string, string>();
  const problems: string[] = [];
  for (const entry of exceptions) {
    if (entry.expires < todayUtc) {
      problems.push(
        `prompts.exceptions entry for ${entry.path} expired ${entry.expires} — remove it, or renew it as a recorded decision`,
      );
      continue;
    }
    if (!modifiedPaths.has(entry.path)) {
      problems.push(
        `prompts.exceptions entry for ${entry.path} is stale — the path is not currently modified, and only a modified finding is exceptable`,
      );
      continue;
    }
    suppressed.set(entry.path, entry.expires);
  }

  const counts = { current: 0, excepted: 0, stale: 0, modified: 0, missing: 0, unattributable: 0 };
  const lines: string[] = [];
  let anyStale = false;
  for (const f of findings) {
    switch (f.kind) {
      case 'current':
        counts.current += 1;
        break;
      case 'missing':
        counts.missing += 1;
        lines.push(
          `${f.path}: missing — planned by the installed package and the current config, absent on disk`,
        );
        break;
      case 'stale':
        counts.stale += 1;
        anyStale = true;
        lines.push(
          `${f.path}: stale — banner ${f.bannerVersion ?? '?'}, installed ${f.installedVersion}`,
        );
        break;
      case 'modified': {
        const expires = suppressed.get(f.path);
        if (expires !== undefined) {
          counts.excepted += 1;
          lines.push(`${f.path}: excepted (expires ${expires})`);
          break;
        }
        counts.modified += 1;
        lines.push(
          `${f.path}: modified — bytes differ at the installed version (a hand edit or a config-value change; the two are indistinguishable)`,
        );
        break;
      }
      case 'unattributable':
        counts.unattributable += 1;
        lines.push(
          `${f.path}: unattributable — bytes differ from the fresh render and no banner is parseable`,
        );
        break;
    }
  }
  if (anyStale) lines.push(...PROMPT_STALE_REMEDY);

  const summary =
    `${counts.current} current, ${counts.excepted} excepted, ${counts.stale} stale, ` +
    `${counts.modified} modified, ${counts.missing} missing, ${counts.unattributable} unattributable`;
  const ok =
    problems.length === 0 &&
    counts.stale + counts.modified + counts.missing + counts.unattributable === 0;
  return { ok, lines, summary, problems };
}

/** The disabled note (FR-3): a named production surface, tested verbatim. It
 * names what was NOT exercised and carries the model's two T6 consequences —
 * and it must not imply nothing is discoverable. */
export const PROMPTS_DISABLED_NOTE = [
  'prompts is not enabled in this repository — the planned-set reconciliation was NOT exercised.',
  'If you removed the prompts block: clear `templates.prd` in the same change, or `gate new` reads a path that no longer exists.',
  'Generated files already on disk stay readable by agents until a human deletes them; this pass says nothing about what a content search would find.',
].join('\n');

/**
 * The check's shared preflight: disabled and absent-store handling live HERE
 * so the CLI and the packed twin cannot answer those two cases differently.
 * Enabled with the store directory absent is a FINDING, never not-configured
 * (`false-green-on-missing-file`; the model's T6).
 */
export function promptsCheckPreflight(
  config: RenderConfig,
  root: string,
): { kind: 'disabled'; note: string } | { kind: 'absent'; problem: string } | { kind: 'ready' } {
  if (!config.prompts.enabled) return { kind: 'disabled', note: PROMPTS_DISABLED_NOTE };
  if (!existsSync(resolve(root, config.prompts.dir))) {
    return {
      kind: 'absent',
      problem:
        `prompts.enabled is true and the store directory ${config.prompts.dir} does not exist — ` +
        'run `gate init --prompts`, or remove the prompts block (and clear `templates.prd` in the same change)',
    };
  }
  return { kind: 'ready' };
}
