import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WorkflowConfig } from '../config/index.js';

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

/** Contained-write guard (init discipline): config paths stay inside root. */
function containedResolve(root: string, rel: string): string {
  if (isAbsolute(rel)) throw new Error(`refusing absolute path from config: ${rel}`);
  const rootAbs = resolve(root);
  const full = resolve(rootAbs, rel);
  const r = relative(rootAbs, full);
  if (r === '..' || r.startsWith(`..${sep}`) || isAbsolute(r)) {
    throw new Error(`refusing path escaping the workspace root: ${rel}`);
  }
  return full;
}

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
  const fileRe = new RegExp(`^${prdKind.prefix}-(\\d{${config.idPattern.width}})-.+\\.md$`);
  let max = 0;
  for (const state of config.dirs.states) {
    const dir = containedResolve(root, `${prdKind.dir}/${state}`);
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
  if (cls !== undefined) {
    out = substituteAnchor(out, /^> \*\*PRD Class\*\*: feature$/m, `> **PRD Class**: ${cls}`);
  }
  // Status anchor is verified even though its value is already correct — a
  // template whose lifecycle line vanished should fail loudly here too.
  out = substituteAnchor(out, /^> \*\*Status\*\*: Draft$/m, '> **Status**: Draft');
  // Remaining date placeholders (e.g. the changelog's initial row) are all
  // "today" at creation time.
  out = out.replaceAll('[YYYY-MM-DD]', date);
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
  const template = readFileSync(templatePath ?? defaultTemplatePath(), 'utf8');
  const prdKind = config.dirs.artifacts.prd;
  const wipState = config.dirs.states[0];
  if (wipState === undefined) throw new Error('config.dirs.states must not be empty');

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
    const full = containedResolve(root, relPath);

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
    const fileRe = new RegExp(`^${prdKind.prefix}-${padded}-.+\\.md$`);
    let holders = 0;
    for (const state of config.dirs.states) {
      try {
        holders += readdirSync(containedResolve(root, `${prdKind.dir}/${state}`)).filter((n) =>
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
}
