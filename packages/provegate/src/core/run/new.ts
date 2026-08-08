import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, relative as relativePath, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WorkflowConfig } from '../config/index.js';
import { escapeRegExp } from '../state/markdown.js';
import { containedPath } from './init.js';
import { withWorkspaceMutex } from './mutex.js';

/**
 * `gate new <slug>` — instantiate the shipped PRD template as the next work
 * item. The only new logic in this module is id allocation and placeholder
 * substitution; everything downstream (state build, `gate check`) already
 * understands the result.
 */

export interface CreatePrdOptions {
  slug: string;
  /** Work-item class; must be one of `config.classes` when given. */
  cls?: string;
  /** Override the shipped template (a forked template stays supported). */
  templatePath?: string;
  /** Injectable clock for tests. */
  now?: Date;
  /** Test-only injection point: runs between the id scan and our write —
   * lets a test plant a rival inside the race window deterministically. */
  raceWindow?: (attemptPath: string) => void;
}

export interface CreatePrdResult {
  id: string;
  path: string;
  /** Relative path actually written (repo-root relative). */
  relPath: string;
  /** Tokens the configuration could not resolve, sorted and deduplicated
   * (PRD-042 FR-2). Reported to the author; never fatal. */
  unresolved: string[];
  /** True when parent directories had to be created (uninitialized repo, W2). */
  createdParents: boolean;
  /** Id-allocation retries taken to dodge a concurrent `gate new` (W1). */
  retries: number;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function shippedTemplatePath(name: string): string {
  // Robust against bundling: dist/ is flat while src/ is nested, so a fixed
  // relative hop is wrong in one of the two. Walk up from the module until
  // the shipped template appears (package root), both layouts covered.
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = resolve(dir, `templates/${name}`);
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error(`shipped templates/${name} not found — package layout broken`);
      }
      dir = parent;
    }
  }
}

function defaultTemplatePath(): string {
  return shippedTemplatePath('prd-template.md');
}

/** Highest allocated id number across ALL lifecycle states — completed and
 * deferred ids are never reused. */
export function highestPrdNumber(config: WorkflowConfig, root: string): number {
  const prdKind = config.dirs.artifacts.prd;
  // Configured prefixes are literals, not patterns: an unescaped metacharacter
  // (`prd+`) would stop the scan matching its own files — duplicate ids.
  const fileRe = new RegExp(
    `^${escapeRegExp(prdKind.prefix)}-(\\d{${config.idPattern.width}})-.+\\.md$`,
  );
  let max = 0;
  for (const state of config.dirs.states) {
    const dir = containedPath(root, `${prdKind.dir}/${state}`);
    let names: string[];
    try {
      names = readdirSync(dir);
    } catch {
      continue;
    }
    for (const name of names) {
      const m = fileRe.exec(name);
      if (m) max = Math.max(max, Number.parseInt(m[1]!, 10));
    }
  }
  return max;
}

/** The slug's current holder, if any lifecycle state already has it. */
export function slugHolder(config: WorkflowConfig, root: string, slug: string): string | null {
  const prdKind = config.dirs.artifacts.prd;
  const re = new RegExp(
    `^${escapeRegExp(prdKind.prefix)}-(\\d{${config.idPattern.width}})-${escapeRegExp(slug)}\\.md$`,
  );
  for (const state of config.dirs.states) {
    let names: string[];
    try {
      names = readdirSync(containedPath(root, `${prdKind.dir}/${state}`));
    } catch {
      continue;
    }
    for (const name of names) {
      const m = re.exec(name);
      if (m) return `${config.idPattern.prefix}-${m[1]!}`;
    }
  }
  return null;
}

/** Line indexes that sit inside a fenced code block. A template may legally
 * SHOW a heading or an anchor inside a fence — the quickstart does — and a
 * reader that cannot tell shown from meant will edit the wrong one. */
/** Fence spans as `[openIndex, closeIndex]` pairs. An open fence that never
 * closes runs to the end. Exported because the quickstart verifier needs the
 * same answer, and deriving "is this an opener" from the boolean map is wrong
 * whenever two fences are adjacent — a closer is fenced too (phase-6 round 5). */
export function fenceSpans(lines: string[]): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let open: { char: string; len: number; at: number } | null = null;
  lines.forEach((raw, i) => {
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!m) return;
    const run = m[1]!;
    const tail = m[2]!;
    const char = run[0]!;
    if (open === null) {
      if (char === '`' && tail.includes('`')) return;
      open = { char, len: run.length, at: i };
      return;
    }
    if (char === open.char && run.length >= open.len && /^[ \t]*$/.test(tail)) {
      spans.push([open.at, i]);
      open = null;
    }
  });
  if (open !== null) spans.push([(open as { at: number }).at, lines.length - 1]);
  return spans;
}

export function fencedLines(lines: string[]): boolean[] {
  const fenced: boolean[] = [];
  // CommonMark's rules, not an approximation (phase-6 round 2, High): the
  // opener may carry an info string, a CLOSER may not, and the closer's run
  // must be at least as long as the opener's. Treating any same-marker line as
  // a closer let a fence containing ```` ```still-open ```` read as closed, and
  // an anchor or a heading below it then counted as real.
  let open: { char: string; len: number } | null = null;
  for (const raw of lines) {
    // Callers split on `\n`, so a CRLF document leaves a trailing `\r` on every
    // line and the fence regex then matched nothing at all (phase-6 round 4,
    // High): a CRLF template's fenced anchor counted as real.
    const line = raw.endsWith('\r') ? raw.slice(0, -1) : raw;
    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (m) {
      const run = m[1]!;
      const tail = m[2]!;
      const char = run[0]!;
      if (open === null) {
        // A backtick opener's info string may not itself contain a backtick.
        if (char === '`' && tail.includes('`')) {
          fenced.push(false);
          continue;
        }
        open = { char, len: run.length };
        fenced.push(true);
        continue;
      }
      // Only spaces and tabs may follow a closer (phase-6 round 3, High):
      // `tail.trim()` also swallows NBSP and other Unicode whitespace, so
      // ```` ```<NBSP> ```` inside an open fence read as a closer and the
      // heading below it became real.
      if (char === open.char && run.length >= open.len && /^[ \t]*$/.test(tail)) {
        open = null;
        fenced.push(true);
        continue;
      }
      fenced.push(true);
      continue;
    }
    fenced.push(open !== null);
  }
  return fenced;
}

/**
 * The id anchor, as a CLOSED two-member alternation (PRD-042 FR-5): the raw
 * `{{ID_PREFIX}}` form, or exactly the configured prefix. A repository that
 * installs its own prompt store renders the token away, and `gate new` refused
 * its own template for it — every PRD here was hand-created because of this.
 *
 * The alternation is two literals and nothing else. A wildcard (`[A-Z]+-XXX`)
 * would turn drift detection into a heading search: a template whose id line
 * names ANOTHER project's prefix would then instantiate silently, which is the
 * drift this anchor exists to catch.
 */
function idAnchor(config: WorkflowConfig): RegExp {
  return new RegExp(`^# (?:\\{\\{ID_PREFIX\\}\\}|${escapeRegExp(config.idPattern.prefix)})-XXX: `, 'm');
}

/**
 * The id anchor must appear EXACTLY ONCE outside a fence (phase-6 round 1,
 * High). `String.replace` takes the first match, so a template with two id
 * headings instantiated silently against whichever came first, and a heading
 * shown inside a fence counted as the real one. Both are drift, and drift is
 * the thing this anchor exists to catch — a tool that picks for you has
 * replaced a question with a guess.
 */
function assertSingleIdAnchor(config: WorkflowConfig, content: string): number {
  const lines = content.split('\n');
  const fenced = fencedLines(lines);
  const anchor = new RegExp(idAnchor(config).source);
  // Any heading SHAPED like an id anchor, whatever prefix it names. A template
  // carrying `# RFC-XXX: …` beside the real anchor used to instantiate and keep
  // the foreign heading (phase-6 round 2, High) — the artifact then had two id
  // lines and only one of them meant anything.
  // Prefix-AGNOSTIC (phase-6 round 3, High): configuration accepts any
  // non-empty prefix, so `2FA`, `_RFC` and `RFC-ALT` are all legal ids
  // somewhere. The shape is "a heading whose first token ends in `-XXX:`",
  // which is what the anchor grammar means, rather than an ASCII-word guess.
  // A configured prefix may contain spaces (`AC ME`), so "first token" is the
  // wrong unit (phase-6 round 6, High). The shape is: a level-one heading whose
  // text begins with something ending in `-XXX:`.
  // The full ATX H1 shape (phase-6 round 7, High): up to three leading spaces,
  // `#`, then a space OR a tab. `#\tRFC-XXX:` and `   # RFC-XXX:` are headings
  // a renderer honours, and the guard has to see what the renderer sees.
  const shaped = /^ {0,3}#[ \t].*?-XXX:/;
  const canonical: number[] = [];
  const foreign: number[] = [];
  lines.forEach((line, i) => {
    if (fenced[i]) return;
    if (anchor.test(line)) canonical.push(i + 1);
    else if (shaped.test(line)) foreign.push(i + 1);
  });
  if (foreign.length > 0) {
    throw new Error(
      `template has id-shaped heading(s) that are not \`${config.idPattern.prefix}\` ` +
        `(lines ${foreign.join(', ')}) — one template, one id grammar; ` +
        'remove them or point `templates.prd` at the template you meant',
    );
  }
  if (canonical.length === 0) {
    throw new Error(`template anchor not found: ${idAnchor(config)} — template drifted from gate new`);
  }
  if (canonical.length > 1) {
    throw new Error(
      `template has ${canonical.length} id anchors (lines ${canonical.join(', ')}) — exactly one is required; ` +
        'resolve the duplicate rather than letting gate new pick one',
    );
  }
  return canonical[0]! - 1;
}

/** Tokens `gate new` can resolve from configuration, with their sources and
 * precedence (PRD-042 FR-2). CLOSED set: a token outside this table is never
 * substituted, however plausible its name, and adding one is a spec change.
 *
 * A source that is absent or empty is NOT a substitution — the token survives
 * and is reported. Silently writing an empty string would put a blank where a
 * command belongs, and `gate check` would then refuse a §11 row for being
 * unrunnable rather than for being unfilled. */
export function configuredTokens(config: WorkflowConfig): Map<string, string> {
  // An explicitly EMPTY prompts value is a decision, not an absence
  // (phase-6 round 5, Medium): FR-2 says an empty source is not a substitution,
  // so the token stays unresolved and reported — falling back would silently
  // overrule what the configuration said.
  const EMPTY = Symbol('empty');
  const promptValue = (key: string): string | undefined | typeof EMPTY => {
    const raw = config.prompts?.values?.[key];
    if (typeof raw !== 'string') return undefined;
    return raw === '' ? EMPTY : raw;
  };
  const resolved = (
    prompt: string | undefined | typeof EMPTY,
    fallback: string | undefined,
  ): string | undefined => (prompt === EMPTY ? undefined : (prompt ?? fallback));
  const nonEmpty = (value: string | undefined): string | undefined =>
    value !== undefined && value !== '' ? value : undefined;

  const pairs: Array<[string, string | undefined]> = [
    ['{{CMD_CHECK_TYPES}}', nonEmpty(config.commands.checkTypes)],
    ['{{CMD_LINT}}', nonEmpty(config.commands.lint)],
    ['{{CMD_TEST}}', nonEmpty(config.commands.test)],
    ['{{CMD_BUILD}}', nonEmpty(config.commands.build)],
    ['{{CMD_TEST_SCOPED}}', resolved(promptValue('CMD_TEST_SCOPED'), nonEmpty(config.commands.test))],
    ['{{MEMORY_ROOT}}', nonEmpty(config.memory.root)],
    ['{{DOCS_ROOT}}', resolved(promptValue('DOCS_ROOT'), nonEmpty(config.dirs.artifacts.summary.dir))],
  ];
  const out = new Map<string, string>();
  for (const [token, value] of pairs) if (value !== undefined) out.set(token, value);
  return out;
}

/** Every `{{TOKEN}}` left in the text, sorted and deduplicated. Reported to the
 * author rather than failing: an unresolved token is work for them, not a fault
 * of the command. */
export function unresolvedTokens(content: string): string[] {
  return [...new Set(content.match(/\{\{[A-Z0-9_]+\}\}/g) ?? [])].sort();
}

/** The configured token table, applied on its own for the companion artifacts.
 * In `instantiateTemplate` these rules join the single sweep instead.
 *
 * UNCONDITIONAL over the closed set, as FR-2 specifies. An earlier round tried
 * skipping lines that still carried an author placeholder, to keep
 * `` `{{DOCS_ROOT}}/[page].md` `` from becoming a plausible-looking declared
 * path — and the reviewer was right that the heuristic both over- and
 * under-fired: it skipped ordinary Markdown links (`[docs](…)`) whose tokens
 * SHOULD resolve, and let `[path/to/file]` through. A rule that cannot state
 * which lines it governs is not a rule.
 *
 * The scaffolding problem it was papering over is real and belongs to the
 * author: an unfilled Durable Artifacts section declares a path that does not
 * exist, and the Phase-7 gate refuses it BY NAME. That refusal is correct — a
 * PRD that never declared its durable knowledge is not ready to close — and it
 * is now what the executable quickstart demonstrates.
 */
function substituteConfiguredTokens(config: WorkflowConfig, content: string): string {
  const table = configuredTokens(config);
  // ONE pass, with a CALLBACK replacement (phase-6 round 2, Medium): a string
  // replacement interprets `$&` and friends, so a configured value like
  // `docs/$&` wrote `docs/{{DOCS_ROOT}}` — a token that stayed unresolved
  // because its own value re-inserted it. A single pass also means a value can
  // never be re-scanned as a token by a later iteration.
  return content.replace(/\{\{[A-Z0-9_]+\}\}/g, (match) => table.get(match) ?? match);
}

/**
 * Drop a `## <heading>` section — heading line through the last line before the
 * next `## ` at column zero, including that section's own trailing `---`
 * separator and nothing beyond it (PRD-042 FR-3).
 *
 * Absent heading = no-op: a forked template that never carried the section is
 * not drift, it is a template with fewer sections.
 */
function dropSection(content: string, heading: string): string {
  // The ORIGINAL lines are what gets rejoined; the CR-stripped copies are only
  // for comparison (phase-6 round 4, Medium). Rewriting the survivors would
  // have converted a whole CRLF template to LF — a change nobody asked this
  // command to make.
  const raw = content.split('\n');
  const lines = raw.map((l) => (l.endsWith('\r') ? l.slice(0, -1) : l));
  const fenced = fencedLines(lines);
  // A heading SHOWN inside a fence is not the section. Round 1 found that
  // taking the first textual match corrupted the fence and left the real
  // contract section standing — the worst of both outcomes.
  // EVERY unfenced occurrence, not the first (phase-6 round 4, Medium): a
  // template with two `## Memory Inputs` sections kept the second one, and a
  // contract section that survives an omission is the omission failing quietly.
  const starts: number[] = [];
  lines.forEach((l, i) => {
    if (!fenced[i] && l === `## ${heading}`) starts.push(i);
  });
  if (starts.length === 0) return content;
  const spans = starts.map((start) => {
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (!fenced[i] && lines[i]!.startsWith('## ')) {
        end = i;
        break;
      }
    }
    return [start, end] as const;
  });

  // The span runs THROUGH `end`: everything from the heading up to (not
  // including) the next heading goes, and the trailing blank line before that
  // heading is kept so the document still reads as separated sections. The
  // section's own `---` separator is inside the span and goes with it — round 1
  // found the previous walk-back left it standing.
  const dropped = new Set<number>();
  for (const [s, e] of spans) for (let i = s; i < e; i++) dropped.add(i);
  // Blank-line normalization is scoped to the SEAM (phase-6 round 6, Medium):
  // collapsing every triple blank in the document also reformatted fenced
  // examples the removal never touched.
  const seams = new Set(spans.map(([s]) => s));
  const out: string[] = [];
  raw.forEach((line, i) => {
    if (dropped.has(i)) return;
    const atSeam = seams.has(i) || (i > 0 && dropped.has(i - 1));
    if (
      atSeam &&
      line.trim() === '' &&
      out.length >= 2 &&
      out[out.length - 1]!.trim() === '' &&
      out[out.length - 2]!.trim() === ''
    ) {
      return;
    }
    out.push(line);
  });
  return out.join('\n');
}

/**
 * Apply every substitution in ONE sweep (phase-6 round 11, High).
 *
 * Ordering the passes only moved the problem: with the token pass first, the
 * identity substitutions read its output (a `DOCS_ROOT` of `{{ID_PREFIX}}/docs`
 * came back as `PRD/docs`); with it last, it read theirs. `String.replace` with
 * a global pattern scans the ORIGINAL string and never revisits what a callback
 * returned, so a single alternation over all the rules is the only arrangement
 * where no substitution can read another's output — in either direction.
 */
function applyOnce(text: string, rules: Array<[RegExp, (match: string) => string]>): string {
  if (rules.length === 0) return text;
  const combined = new RegExp(rules.map(([re]) => `(?:${re.source})`).join('|'), 'gm');
  return text.replace(combined, (match) => {
    for (const [re, fn] of rules) {
      if (new RegExp(`^(?:${re.source})$`).test(match)) return fn(match);
    }
    return match;
  });
}

export function instantiateTemplate(
  config: WorkflowConfig,
  templateInput: string,
  id: string,
  slug: string,
  cls: string | undefined,
  now: Date,
): string {
  const date = now.toISOString().slice(0, 10);
  const template = templateInput;
  // Anchor drift is still checked FIRST, and against the template's own bytes:
  // the id line must exist exactly once, unfenced, before anything is written.
  const anchorLine = assertSingleIdAnchor(config, template);
  const anchor = idAnchor(config);
  const tokens = configuredTokens(config);

  // Every rule that may fire, applied in ONE sweep. Required anchors are
  // verified before the sweep so a drifted template still fails loudly rather
  // than silently instantiating without its metadata.
  const required: Array<[RegExp, string]> = [
    [/^> \*\*Created\*\*: \[YYYY-MM-DD\]$/m, 'Created'],
    [/^> \*\*Updated\*\*: \[YYYY-MM-DD\]$/m, 'Updated'],
    [/^> \*\*Slug\*\*: `\[short-name\]`$/m, 'Slug'],
    [/^> \*\*PRD Class\*\*: feature$/m, 'PRD Class'],
    [/^> \*\*Status\*\*: Draft$/m, 'Status'],
    [/^\| \[YYYY-MM-DD\] \| \[role\] \| Initial draft \|$/m, 'Changelog row'],
  ];
  for (const [re] of required) {
    if (!re.test(template)) {
      throw new Error(`template anchor not found: ${re} — template drifted from gate new`);
    }
  }

  const lines = template.split('\n');
  const rules: Array<[RegExp, (match: string) => string]> = [
    [/^> \*\*Created\*\*: \[YYYY-MM-DD\]$/, () => `> **Created**: ${date}`],
    [/^> \*\*Updated\*\*: \[YYYY-MM-DD\]$/, () => `> **Updated**: ${date}`],
    [/^> \*\*Slug\*\*: `\[short-name\]`$/, () => `> **Slug**: \`${slug}\``],
    [
      /^> \*\*PRD Class\*\*: feature$/,
      () => `> **PRD Class**: ${cls ?? config.classes[0] ?? 'feature'}`,
    ],
    [/^\| \[YYYY-MM-DD\] \| \[role\] \| Initial draft \|$/, () => `| ${date} | [role] | Initial draft |`],
    [/\{\{ID_PREFIX\}\}/, () => config.idPattern.prefix],
    [/\{\{[A-Z0-9_]+\}\}/, (match) => tokens.get(match) ?? match],
  ];

  let out = lines
    .map((line, i) =>
      i === anchorLine ? line.replace(anchor, () => `# ${id}: `) : applyOnce(line, rules),
    )
    .join('\n');

  // A contract the repository cannot enforce is instruction the reader must
  // ignore (PRD-042 FR-3). When memory is off, the two sections come out; when
  // it is on they stay, and `gate check` refuses a PRD that lacks them — which
  // is what stops this from becoming an escape hatch.
  if (!config.memory.enabled) {
    out = dropSection(out, 'Memory Inputs');
    out = dropSection(out, 'Memory Outputs');
  }
  return out;
}

export function createPrd(
  config: WorkflowConfig,
  root: string,
  { slug, cls, templatePath, now = new Date(), raceWindow }: CreatePrdOptions,
): CreatePrdResult {
  if (!SLUG_RE.test(slug)) {
    throw new Error(`invalid slug "${slug}" — use lowercase letters, digits, hyphens`);
  }
  if (cls !== undefined && !config.classes.includes(cls)) {
    throw new Error(`unknown class "${cls}" — configured classes: ${config.classes.join(', ')}`);
  }
  const resolvedTemplate =
    templatePath ??
    (config.templates.prd !== ''
      ? containedPath(root, config.templates.prd)
      : defaultTemplatePath());
  const template = readFileSync(resolvedTemplate, 'utf8');
  const prdKind = config.dirs.artifacts.prd;
  // Role-keyed, never position-keyed: states[0] is not necessarily wip.
  const wipState = config.dirs.stateRoles.wip;

  // The whole allocate-and-write sequence — INCLUDING the slug-uniqueness
  // scan — is serialized by a workspace mutex: scan-based protocols alone
  // cannot durably reserve an id (or a slug) across processes. The re-scan
  // below stays as a belt for mutex-less writers.
  return withWorkspaceMutex(
    resolve(dirname(containedPath(root, config.dirs.stateFile)), '.gate-new.mutex'),
    () => {
      const holder = slugHolder(config, root, slug);
      if (holder !== null) {
        throw new Error(`slug "${slug}" is already used by ${holder} — pick a distinct slug`);
      }
      const MAX_RETRIES = 3;
      let retries = 0;
      for (;;) {
        const num = highestPrdNumber(config, root) + 1;
        const padded = String(num).padStart(config.idPattern.width, '0');
        if (padded.length > config.idPattern.width) {
          throw new Error(
            `id width exhausted (${num} does not fit ${config.idPattern.width} digits) — bump idPattern.width`,
          );
        }
        const id = `${config.idPattern.prefix}-${padded}`;
        const relPath = `${prdKind.dir}/${wipState}/${prdKind.prefix}-${padded}-${slug}.md`;
        const full = containedPath(root, relPath);

        const parentDir = dirname(full);
        let createdParents = false;
        try {
          readdirSync(parentDir);
        } catch {
          // Uninitialized repo (W2): create just the needed parents — additive,
          // contained — and let the caller point at `gate init` for the full tree.
          mkdirSync(parentDir, { recursive: true });
          createdParents = true;
        }

        const content = instantiateTemplate(config, template, id, slug, cls, now);
        raceWindow?.(full);
        try {
          writeFileSync(full, content, { flag: 'wx' });
        } catch (err) {
          if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
          // Same id + same slug already on disk: a rival `gate new` won the exact
          // path inside the race window. Never overwrite — count it as a raced
          // attempt and retry with the next number.
          retries += 1;
          if (retries > MAX_RETRIES) {
            throw new Error(
              `id allocation raced ${MAX_RETRIES} times for ${id} — concurrent gate new storm; retry manually`,
              { cause: err },
            );
          }
          continue;
        }

        // W1: id-allocation race. Another `gate new` may have computed the same
        // number and written a different slug. Re-scan; if the number is now
        // duplicated, withdraw OUR file and retry with the next number.
        const fileRe = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${padded}-.+\\.md$`);
        let holders = 0;
        for (const state of config.dirs.states) {
          try {
            holders += readdirSync(containedPath(root, `${prdKind.dir}/${state}`)).filter((n) =>
              fileRe.test(n),
            ).length;
          } catch {
            /* state dir absent */
          }
        }
        if (holders > 1) {
          unlinkSync(full);
          retries += 1;
          if (retries > MAX_RETRIES) {
            throw new Error(
              `id allocation raced ${MAX_RETRIES} times for ${id} — concurrent gate new storm; retry manually`,
            );
          }
          continue;
        }
        return { id, path: full, relPath, createdParents, retries, unresolved: unresolvedTokens(content) };
      }
    },
  );
}

/* ------------------------------------------------------------------ *
 * Companion artifacts (PRD-042 FR-1)
 *
 * The gate chain reads three artifacts and the CLI could create one. Phase 6
 * stopped with `no tasks file — independent-review ledger missing` and named
 * neither the path it wanted nor the row it would read, so an adopter had to
 * find the template inside node_modules and guess the file name.
 * ------------------------------------------------------------------ */

export type CompanionKind = 'tasks' | 'review';

export interface CompanionResult {
  id: string;
  slug: string;
  relPath: string;
  path: string;
  /** Tokens the author must still fill; reported, never fatal. */
  unresolved: string[];
}

/** The wip PRD an id names. Identity comes from the artifact BASENAME —
 * `<prefix>-NNN-<slug>.md` — never from the heading, which an author may
 * rewrite freely and often does. Completed items are not targets: new work
 * artifacts belong to work in flight. */
export function findWipPrd(
  config: WorkflowConfig,
  root: string,
  id: string,
): { number: string; slug: string } {
  const prdKind = config.dirs.artifacts.prd;
  // The CONFIGURED width, not "some digits" (phase-6 round 1, Medium): a
  // tolerant grammar makes `PRD-1` an alias for `PRD-001` and lets `PRD-0001`
  // name an artifact the state builder — which scans at the configured width —
  // cannot index. Two spellings for one item is how a board loses a row.
  const width = config.idPattern.width;
  const idRe = new RegExp(`^${escapeRegExp(config.idPattern.prefix)}-(\\d{${width}})$`, 'i');
  const m = idRe.exec(id.trim());
  if (!m) {
    throw new Error(
      `"${id}" is not an id — expected ${config.idPattern.prefix}-${'N'.repeat(width)} ` +
        `(exactly ${width} digits, the configured width)`,
    );
  }
  const padded = m[1]!;
  const fileRe = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${padded}-(.+)\\.md$`);
  const wipDir = `${prdKind.dir}/${config.dirs.stateRoles.wip}`;
  let names: string[] = [];
  try {
    names = readdirSync(containedPath(root, wipDir));
  } catch {
    /* no wip dir yet */
  }
  // A directory named `prd-001-ghost.md` satisfies the basename regex
  // (phase-6 round 4, Medium), so the entry is confirmed to be a FILE. Without
  // it, companion artifacts were written for a PRD that does not exist.
  const matches = names
    .map((n) => fileRe.exec(n))
    .filter((x): x is RegExpExecArray => x !== null)
    .filter((m) => {
      try {
        return statSync(containedPath(root, `${wipDir}/${m[0]}`)).isFile();
      } catch {
        return false;
      }
    });
  if (matches.length === 0) {
    throw new Error(
      `no work item ${config.idPattern.prefix}-${padded} in ${wipDir} — companion artifacts belong to work in flight`,
    );
  }
  if (matches.length > 1) {
    throw new Error(
      `id ${config.idPattern.prefix}-${padded} matches ${matches.length} files in ${wipDir}: ${matches
        .map((x) => x[0])
        .join(', ')} — resolve the duplicate first`,
    );
  }
  return { number: padded, slug: matches[0]![1]! };
}

/** Instantiate the tasks or review template for an existing wip PRD.
 *
 * What each artifact receives is the PRD's closed table: identity, links, dates
 * and the configured token pass for `tasks`; identity only for `review`. The
 * review artifact's `Base SHA` and `Quorum` are deliberately NOT filled — a
 * pre-filled SHA claims a diff nobody read, and a supplied quorum is a panel
 * nobody convened. */
/** An artifact prefix is a FILENAME prefix, never a path fragment (phase-6
 * round 6, High). `tasks.prefix: "nested/tasks"` writes
 * `_tasks/wip/nested/tasks-NNN-slug.md`, which the state reader — matching
 * basenames — never finds, so Phase 6 keeps reporting the file it just wrote as
 * missing. Refusing beats writing an artifact nothing can see. */
function assertFilenamePrefix(kind: string, prefix: string): void {
  if (prefix === '' || /[\\/]/.test(prefix)) {
    throw new Error(
      `dirs.artifacts.${kind}.prefix must be a filename prefix, not a path ("${prefix}") — ` +
        'the state reader matches basenames, so a nested prefix writes a file it can never index',
    );
  }
}

export function createCompanion(
  config: WorkflowConfig,
  root: string,
  kind: CompanionKind,
  id: string,
  now: Date = new Date(),
): CompanionResult {
  assertFilenamePrefix('prd', config.dirs.artifacts.prd.prefix);
  if (kind === 'tasks') assertFilenamePrefix('tasks', config.dirs.artifacts.tasks.prefix);
  const { number, slug } = findWipPrd(config, root, id);
  const canonicalId = `${config.idPattern.prefix}-${number}`;
  const prdKind = config.dirs.artifacts.prd;
  const prdRel = `${prdKind.dir}/${config.dirs.stateRoles.wip}/${prdKind.prefix}-${number}-${slug}.md`;

  let relPath: string;
  let content: string;
  const date = now.toISOString().slice(0, 10);

  if (kind === 'tasks') {
    const tasksKind = config.dirs.artifacts.tasks;
    relPath = `${tasksKind.dir}/${config.dirs.stateRoles.wip}/${tasksKind.prefix}-${number}-${slug}.md`;
    // Token pass FIRST here too (phase-6 round 10, High): running it after the
    // identity substitutions meant it rescanned the slug, the id and the
    // configured review path it had just written.
    const template = substituteConfiguredTokens(
      config,
      readFileSync(shippedTemplatePath('tasks-template.md'), 'utf8'),
    );
    // The link is COMPUTED from the destination, never a hardcoded `../../`
    // (phase-6 round 1, Medium): a configured task directory one level deeper
    // or shallower would otherwise get a link that resolves nowhere, and a
    // broken link in the artifact that names the PRD is a bad first impression
    // of a tool whose whole subject is traceability.
    // Depth from the NORMALIZED path (phase-6 round 2, Medium): a configured
    // directory like `workflow/./tasks` writes to a two-deep location but has
    // three raw segments, and the extra `../` produced a link that resolved
    // above the repository root.
    // Depth comes from where the file ACTUALLY lands, not from the config
    // string (phase-6 round 11, Medium). Round 3 collapsed `.` and `..`; round
    // 10 split on both separators, which fixed Windows and broke POSIX, where
    // `workflow\\tasks` is ONE literal directory. Asking the path layer that
    // writes the file is the only reading that is right on both.
    const depthOf = (relative: string): string[] =>
      relativePath(root, containedPath(root, relative)).split(sep).filter((s) => s !== '');
    const hops = depthOf(relPath).length - 1;
    const prdLink = `${'../'.repeat(hops)}${depthOf(prdRel).join('/')}`;
    content = template
      .replace(/^# Tasks: \[Feature Name\]$/m, () => `# Tasks: ${canonicalId} — ${slug}`)
      .replace(
        /^> \*\*PRD\*\*: \[prd-XXX-\{short-name\}\.md\]\([^)]*\)$/m,
        () => `> **PRD**: [${prdKind.prefix}-${number}-${slug}.md](${prdLink})`,
      )
      .replace(/^> \*\*Created\*\*: \[YYYY-MM-DD\]$/m, () => `> **Created**: ${date}`)
      .replace(/^> \*\*Updated\*\*: \[YYYY-MM-DD\]$/m, () => `> **Updated**: ${date}`)
      .replaceAll('prd-XXX-{short-name}.md', () => `${prdKind.prefix}-${number}-${slug}.md`)
      // The ledger's review path comes from CONFIG (phase-6 round 7, High):
      // it hardcoded `_docs/reviews/` while `gate new --review` writes to
      // `dirs.reviewsDir`, so under any custom reviews directory the two
      // commands produced artifacts Phase 6 could not connect.
      // ONE pass over both review spellings (phase-6 round 9, High): the
      // literal-replacement fix still ran a SECOND `replaceAll` over the first
      // one's output, so a `reviewsDir` that itself contains
      // `review-XXX-{short-name}.md` had its own bytes rewritten. Alternation
      // with a callback means each site is visited once and no output is
      // rescanned.
      .replace(
        /`_docs\/reviews\/review-XXX-\{short-name\}\.md`|review-XXX-\{short-name\}\.md/g,
        (match) =>
          match.startsWith('`')
            ? `\`${config.dirs.reviewsDir}/review-${number}-${slug}.md\``
            : `review-${number}-${slug}.md`,
      );
  } else {
    relPath = `${config.dirs.reviewsDir}/review-${number}-${slug}.md`;
    const template = readFileSync(shippedTemplatePath('review-template.md'), 'utf8');
    // Identity is filled; EVERY reviewer-owned field is BLANKED.
    //
    // Phase-6 round 1 found this as a Critical, and it is the
    // `evidence-pattern-satisfied-by-the-template` record firing on the work
    // that cited it: the shipped template's own placeholders satisfy
    // `validateReviewArtifact` — `[git merge-base or base tip]` is longer than
    // the seven characters the gate checks, the counts are already `0`, and the
    // Quorum reads `3/5 pass`. Instantiating those bytes meant an author could
    // flip `Verdict` to `pass` and hand the gate a review nobody performed.
    // Blank fields fail the gate by name until a reviewer types them.
    content = template
      .replace(
        /^# Independent Review: \{\{ID_PREFIX\}\}-XXX — \[Feature Name\]$/m,
        () => `# Independent Review: ${canonicalId} — ${slug}`,
      )
      .replace(/^> \*\*PRD:\*\* \{\{ID_PREFIX\}\}-XXX$/m, () => `> **PRD:** ${canonicalId}`)
      .replace(/^> \*\*Verdict:\*\* .*$/m, '> **Verdict:**')
      .replace(/^> \*\*Reviewer:\*\* .*$/m, '> **Reviewer:**')
      .replace(/^> \*\*Base SHA:\*\* .*$/m, '> **Base SHA:**')
      .replace(/^> \*\*Critical:\*\* .*$/m, '> **Critical:**')
      .replace(/^> \*\*High:\*\* .*$/m, '> **High:**')
      .replace(/^> \*\*Medium:\*\* .*$/m, '> **Medium:**')
      .replace(/^> \*\*Quorum:\*\* .*$/m, '> **Quorum:**')
      .replaceAll('{{ID_PREFIX}}', () => config.idPattern.prefix);
  }

  const full = containedPath(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  try {
    writeFileSync(full, content, { flag: 'wx' });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(`${relPath} already exists — left byte-untouched`, { cause: err });
    }
    throw err;
  }
  return { id: canonicalId, slug, relPath, path: full, unresolved: unresolvedTokens(content) };
}
