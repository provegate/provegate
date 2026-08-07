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
  /** True when parent directories had to be created (uninitialized repo, W2). */
  createdParents: boolean;
  /** Id-allocation retries taken to dodge a concurrent `gate new` (W1). */
  retries: number;
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function defaultTemplatePath(): string {
  // Robust against bundling: dist/ is flat while src/ is nested, so a fixed
  // relative hop is wrong in one of the two. Walk up from the module until
  // the shipped template appears (package root), both layouts covered.
  let dir = dirname(fileURLToPath(import.meta.url));
  for (;;) {
    const candidate = resolve(dir, 'templates/prd-template.md');
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      const parent = dirname(dir);
      if (parent === dir) {
        throw new Error('shipped templates/prd-template.md not found — package layout broken');
      }
      dir = parent;
    }
  }
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
  out = substituteAnchor(out, /^# \{\{ID_PREFIX\}\}-XXX: /m, `# ${id}: `);
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
        return { id, path: full, relPath, createdParents, retries };
      }
    },
  );
}
