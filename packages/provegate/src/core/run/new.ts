import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

/** Substitute one anchored line; a missing anchor is a template-drift ERROR,
 * never a silent skip (W4). */
function substituteAnchor(content: string, anchor: RegExp, replacement: string): string {
  if (!anchor.test(content)) {
    throw new Error(`template anchor not found: ${anchor} — template drifted from gate new`);
  }
  return content.replace(anchor, replacement);
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

/** Tokens `gate new` can resolve from configuration, with their sources and
 * precedence (PRD-042 FR-2). CLOSED set: a token outside this table is never
 * substituted, however plausible its name, and adding one is a spec change.
 *
 * A source that is absent or empty is NOT a substitution — the token survives
 * and is reported. Silently writing an empty string would put a blank where a
 * command belongs, and `gate check` would then refuse a §11 row for being
 * unrunnable rather than for being unfilled. */
export function configuredTokens(config: WorkflowConfig): Map<string, string> {
  const promptValue = (key: string): string | undefined => {
    const raw = config.prompts?.values?.[key];
    return typeof raw === 'string' && raw !== '' ? raw : undefined;
  };
  const nonEmpty = (value: string | undefined): string | undefined =>
    value !== undefined && value !== '' ? value : undefined;

  const pairs: Array<[string, string | undefined]> = [
    ['{{CMD_CHECK_TYPES}}', nonEmpty(config.commands.checkTypes)],
    ['{{CMD_LINT}}', nonEmpty(config.commands.lint)],
    ['{{CMD_TEST}}', nonEmpty(config.commands.test)],
    ['{{CMD_BUILD}}', nonEmpty(config.commands.build)],
    ['{{CMD_TEST_SCOPED}}', promptValue('CMD_TEST_SCOPED') ?? nonEmpty(config.commands.test)],
    ['{{MEMORY_ROOT}}', nonEmpty(config.memory.root)],
    ['{{DOCS_ROOT}}', promptValue('DOCS_ROOT') ?? nonEmpty(config.dirs.artifacts.summary.dir)],
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

/** Apply the configured token table. Runs AFTER the anchored substitutions and
 * touches none of them.
 *
 * A line that still carries an author placeholder (`[page]`, `[slug]`, …) is
 * left ALONE, and that rule is load-bearing rather than cosmetic. The Durable
 * Artifacts section ships as `` `{{DOCS_ROOT}}/[page].md` `` — resolving only
 * the token turns template scaffolding into `_docs/[page].md`, which reads as a
 * DECLARED path, and the Phase-7 gate then demands a file nobody meant to
 * declare. Measured: the executable quickstart stopped at Phase 7 for exactly
 * this. Half-substituting a placeholder makes it look filled; leaving it whole
 * keeps it visibly the author's job.
 */
function substituteConfiguredTokens(config: WorkflowConfig, content: string): string {
  const table = configuredTokens(config);
  return content
    .split('\n')
    .map((line) => {
      if (/\[[a-z][a-z0-9 -]*\]/i.test(line)) return line;
      let out = line;
      for (const [token, value] of table) out = out.replaceAll(token, value);
      return out;
    })
    .join('\n');
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
  const lines = content.split('\n');
  const start = lines.findIndex((l) => l === `## ${heading}`);
  if (start === -1) return content;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.startsWith('## ')) {
      end = i;
      break;
    }
  }
  // Walk back over the blank lines and the single `---` that closes THIS
  // section, so the removal leaves neither an orphan rule nor a double blank.
  let cut = end;
  while (cut > start && lines[cut - 1] === '') cut--;
  if (cut > start && lines[cut - 1] === '---') cut--;
  while (cut > start && lines[cut - 1] === '') cut--;
  return [...lines.slice(0, start), ...lines.slice(cut)].join('\n');
}

export function instantiateTemplate(
  config: WorkflowConfig,
  template: string,
  id: string,
  slug: string,
  cls: string | undefined,
  now: Date,
): string {
  const date = now.toISOString().slice(0, 10);
  let out = template;
  out = substituteAnchor(out, idAnchor(config), `# ${id}: `);
  out = out.replaceAll('{{ID_PREFIX}}', config.idPattern.prefix);
  out = substituteAnchor(out, /^> \*\*Created\*\*: \[YYYY-MM-DD\]$/m, `> **Created**: ${date}`);
  out = substituteAnchor(out, /^> \*\*Updated\*\*: \[YYYY-MM-DD\]$/m, `> **Updated**: ${date}`);
  out = substituteAnchor(out, /^> \*\*Slug\*\*: `\[short-name\]`$/m, `> **Slug**: \`${slug}\``);
  // Class anchor is ALWAYS validated (a template whose class line vanished is
  // drift even when --class is absent). The default is the FIRST configured
  // class, not the template's literal: a config without `feature` must never
  // produce an artifact whose header names an unconfigured class.
  out = substituteAnchor(
    out,
    /^> \*\*PRD Class\*\*: feature$/m,
    `> **PRD Class**: ${cls ?? config.classes[0] ?? 'feature'}`,
  );
  // Status anchor is verified even though its value is already correct — a
  // template whose lifecycle line vanished should fail loudly here too.
  out = substituteAnchor(out, /^> \*\*Status\*\*: Draft$/m, '> **Status**: Draft');
  // Only the EXPLICITLY supported date sites are touched (blanket replaceAll
  // could rewrite unrelated literals in a forked template): the metadata pair
  // above and the changelog's initial row. Anything else stays user-fill.
  out = substituteAnchor(
    out,
    /^\| \[YYYY-MM-DD\] \| \[role\] \| Initial draft \|$/m,
    `| ${date} | [role] | Initial draft |`,
  );
  // A contract the repository cannot enforce is instruction the reader must
  // ignore (PRD-042 FR-3). When memory is off, the two sections come out; when
  // it is on they stay, and `gate check` refuses a PRD that lacks them — which
  // is what stops this from becoming an escape hatch.
  if (!config.memory.enabled) {
    out = dropSection(out, 'Memory Inputs');
    out = dropSection(out, 'Memory Outputs');
  }
  // Last, and additive: the anchored substitutions above are already done, and
  // this pass changes none of them.
  out = substituteConfiguredTokens(config, out);
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
  const idRe = new RegExp(`^${escapeRegExp(config.idPattern.prefix)}-(\\d+)$`, 'i');
  const m = idRe.exec(id.trim());
  if (!m) {
    throw new Error(`"${id}" is not an id — expected ${config.idPattern.prefix}-NNN`);
  }
  const padded = m[1]!.padStart(config.idPattern.width, '0');
  const fileRe = new RegExp(`^${escapeRegExp(prdKind.prefix)}-${padded}-(.+)\\.md$`);
  const wipDir = `${prdKind.dir}/${config.dirs.stateRoles.wip}`;
  let names: string[] = [];
  try {
    names = readdirSync(containedPath(root, wipDir));
  } catch {
    /* no wip dir yet */
  }
  const matches = names.map((n) => fileRe.exec(n)).filter((x): x is RegExpExecArray => x !== null);
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
export function createCompanion(
  config: WorkflowConfig,
  root: string,
  kind: CompanionKind,
  id: string,
  now: Date = new Date(),
): CompanionResult {
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
    const template = readFileSync(shippedTemplatePath('tasks-template.md'), 'utf8');
    content = template
      .replace(/^# Tasks: \[Feature Name\]$/m, `# Tasks: ${slug}`)
      .replace(
        /^> \*\*PRD\*\*: \[prd-XXX-\{short-name\}\.md\]\([^)]*\)$/m,
        `> **PRD**: [${prdKind.prefix}-${number}-${slug}.md](../../${prdRel})`,
      )
      .replace(/^> \*\*Created\*\*: \[YYYY-MM-DD\]$/m, `> **Created**: ${date}`)
      .replace(/^> \*\*Updated\*\*: \[YYYY-MM-DD\]$/m, `> **Updated**: ${date}`)
      .replaceAll('prd-XXX-{short-name}.md', `${prdKind.prefix}-${number}-${slug}.md`)
      .replaceAll('review-XXX-{short-name}.md', `review-${number}-${slug}.md`);
    content = substituteConfiguredTokens(config, content);
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
        `# Independent Review: ${canonicalId} — ${slug}`,
      )
      .replace(/^> \*\*PRD:\*\* \{\{ID_PREFIX\}\}-XXX$/m, `> **PRD:** ${canonicalId}`)
      .replace(/^> \*\*Verdict:\*\* .*$/m, '> **Verdict:**')
      .replace(/^> \*\*Reviewer:\*\* .*$/m, '> **Reviewer:**')
      .replace(/^> \*\*Base SHA:\*\* .*$/m, '> **Base SHA:**')
      .replace(/^> \*\*Critical:\*\* .*$/m, '> **Critical:**')
      .replace(/^> \*\*High:\*\* .*$/m, '> **High:**')
      .replace(/^> \*\*Medium:\*\* .*$/m, '> **Medium:**')
      .replace(/^> \*\*Quorum:\*\* .*$/m, '> **Quorum:**')
      .replaceAll('{{ID_PREFIX}}', config.idPattern.prefix);
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
