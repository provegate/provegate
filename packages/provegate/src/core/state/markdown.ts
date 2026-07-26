/**
 * Markdown parsing primitives for workflow artifacts. Pure functions, ported
 * from the parent's prd-state-utils with identical semantics — several encode
 * hard-won fixes (padding-tolerant tables, annotated statuses, value-cell-only
 * table writes) that must not drift.
 */

import { scanDocument } from '../memory/scan.js';

export function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim();
}

/** Escape a literal for interpolation into a RegExp — REQUIRED for any
 * user-configured value (prefixes, labels) entering a pattern. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Read a `> **Key**: value` (or bare `Key: value`) metadata line. */
export function getMetaValue(content: string, key: string): string | null {
  const escaped = escapeRegExp(key);
  const patterns = [
    new RegExp(`^>\\s*\\*\\*${escaped}\\*\\*\\s*:?\\s*([^\\n]+)$`, 'im'),
    new RegExp(`^>\\s*\\*\\*${escaped}:\\*\\*\\s*([^\\n]+)$`, 'im'),
    new RegExp(`^${escaped}\\s*:?\\s*([^\\n]+)$`, 'im'),
  ];
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match?.[1] !== undefined) return stripMarkdown(match[1]);
  }
  return null;
}

/** Read the value cell of a `| Label | value |` table row. */
export function getTableValue(content: string, label: string): string | null {
  const pattern = new RegExp(`^\\|\\s*${escapeRegExp(label)}\\s*\\|\\s*([^|]+)\\|`, 'im');
  const match = content.match(pattern);
  return match?.[1] !== undefined ? stripMarkdown(match[1]) : null;
}

/** The body of a `## <heading>` section (literal heading), up to the next `##`. */
export function sectionAfter(content: string, heading: string): string {
  return sectionMatching(content, escapeRegExp(heading));
}

/**
 * EVERY section under a heading matching `headingPattern`, read from the
 * executable document.
 *
 * The old reader took the first raw `^## ` match, and a heading inside a fenced
 * example is code to every renderer. A fenced `## Operator Handoff` holding
 * `none`, placed above the real section, was therefore selected — and the merge
 * gate's precondition IS that row count, so an owner-gated PRD passed with no
 * acceptance at all. The same primitive under-read a real Conflict Surface.
 *
 * All matches are returned, not the first, because these callers are gates: two
 * sections with the same heading is an ambiguity, and the fail-closed reading of
 * an ambiguity is to honour every one of them.
 */
export function sectionsMatching(content: string, headingPattern: string): string[] {
  const lines = scanDocument(content).lines;
  // CommonMark's ATX form, not `^## `: up to three leading spaces and an
  // optional closing run of hashes are both ordinary. `   ## Operator Handoff`
  // and `## Operator Handoff ##` render as the H2 a maintainer wrote and
  // returned no section at all, so the merge gate read zero rows and skipped the
  // owner acceptance. The memory scanner already spelled this correctly; two
  // heading grammars over one document is the defect this file just fixed at the
  // other end.
  const heading = new RegExp(`^ {0,3}##[ \\t]+${headingPattern}(?:[ \\t]+#*)?[ \\t]*$`, 'i');
  const bodies: string[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.kind !== 'text' || !heading.test(line.text)) continue;
    const body: string[] = [];
    for (let i = index + 1; i < lines.length; i += 1) {
      const next = lines[i]!;
      if (next.kind === 'text' && /^ {0,3}#{1,2}(?:[ \t]|$)/.test(next.text)) break;
      body.push(next.kind === 'text' ? next.text : '');
    }
    bodies.push(`\n${body.join('\n')}`);
  }
  return bodies;
}

/** Like `sectionAfter`, but the heading is a regex source (e.g. `.*Verification Commands.*`). */
export function sectionMatching(content: string, headingPattern: string): string {
  return sectionsMatching(content, headingPattern)[0] ?? '';
}

export function countTaskChecks(content: string): { checkedCount: number; uncheckedCount: number } {
  // The EXECUTABLE document. A `- [ ] example` written inside a fenced template
  // is an illustration, and counting it recorded an unchecked task that no one
  // had to do — the queue then reported the work item resumable forever.
  const executable = executableTextOf(content);
  // `*` and `+` are task-list markers too, and a plan written with them
  // reported zero tasks — no progress, and no work item ever resumable.
  const checkedCount = (executable.match(/^\s*(?:[-*+]|\d{1,9}[.)])\s*\[[xX]\]/gm) ?? []).length;
  const uncheckedCount = (executable.match(/^\s*(?:[-*+]|\d{1,9}[.)])\s*\[\s\]/gm) ?? []).length;
  return { checkedCount, uncheckedCount };
}

/** The document with everything a renderer does not execute blanked. */
function executableTextOf(content: string): string {
  return scanDocument(content)
    .lines.map((line) => (line.kind === 'text' ? line.text : ''))
    .join('\n');
}

/**
 * Count operator rows inside the `## Operator Handoff` section: table rows (the
 * documented shape) PLUS checkbox rows.
 *
 * Counting checkboxes is not a second supported shape — it is the fail-closed
 * direction. This count IS the merge gate's precondition: at zero the gate
 * short-circuits to pass and never consumes the owner acceptance. A row written
 * as `- [ ] 9.0 owner signs off` therefore used to DISARM the gate while every
 * human artifact (the `operator-gated` header, the unchecked box, the status
 * board) said a signature was pending — the exact false green PRD-016's close
 * hit. Miscounting UP costs a spurious acceptance prompt; miscounting DOWN
 * merges unreviewed work.
 *
 * A plain `- (none)` bullet is not a row, and a template's all-empty table row
 * is not a row — an empty section legitimately means zero operator rows.
 */
export function countOperatorHandoff(content: string): number {
  // Summed across EVERY section with this heading. One row anywhere is enough
  // to require an acceptance, so counting only the first section was the
  // permissive reading of a document that says the same thing twice.
  return sectionsMatching(content, escapeRegExp('Operator Handoff')).reduce(
    (total, section) => total + operatorRowsIn(section),
    0,
  );
}

function operatorRowsIn(section: string): number {
  if (!section) return 0;
  const lines = section.split('\n').map((line) => line.trim());
  const tableRows = lines
    .filter((line) => line.startsWith('|'))
    // A SEPARATOR in any of its spellings. `^\|\s*-+` missed the aligned forms
    // `| :--- |` and `| ---: |`, so a table with a header and no data rows
    // counted one row and demanded an acceptance nobody owed. Indentation
    // defeated this filter and the header filter together, which is why the
    // lines are trimmed above.
    .filter((line) => !/^\|[\s:|-]*$/.test(line))
    .filter((line) => !/^\|\s*Task\s*\|/i.test(line))
    .filter((line) => line.split('|').some((cell) => cell.trim().length > 0)).length;
  // `*` and `+` open a task list exactly as `-` does. Recognizing only `-` let
  // `* [ ] owner approves` read as zero operator rows, and the merge gate passed
  // without the acceptance that row exists to require.
  // ORDERED markers too. GFM writes `1. [ ] …`, and recognizing only the bullet
  // forms read a numbered handoff table as zero rows — the merge gate then
  // passed with no owner acceptance.
  const checkboxRows = lines.filter((line) =>
    /^(?:[-*+]|\d{1,9}[.)])\s*\[[ xX]\]/.test(line),
  ).length;
  return tableRows + checkboxRows;
}

function splitTableCells(line: string): string[] | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|') || trimmed.length < 2) return null;
  return trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
}

export interface MarkdownTableBounds {
  headerIdx: number;
  afterSep: number;
  rowsEnd: number;
}

/**
 * Locate a markdown table by its header cells, tolerant of column padding
 * (formatters re-pad tables; byte-exact header matching is the bug this
 * replaces). Returns character offsets, or null when not found.
 */
export function findMarkdownTable(
  content: string,
  headerCells: string[],
): MarkdownTableBounds | null {
  const lines = content.split('\n');
  let offset = 0;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const cells = splitTableCells(line);
    if (
      cells !== null &&
      cells.length === headerCells.length &&
      cells.every((cell, idx) => cell === headerCells[idx])
    ) {
      const sepLine = lines[i + 1];
      const sepCells = sepLine === undefined ? null : splitTableCells(sepLine);
      if (
        sepCells === null ||
        sepCells.length === 0 ||
        !sepCells.every((cell) => /^:?-+:?$/.test(cell))
      ) {
        return null;
      }
      const afterSep = offset + line.length + 1 + (sepLine as string).length;
      let rowsEnd = content.indexOf('\n---', afterSep);
      if (rowsEnd === -1) rowsEnd = content.length;
      return { headerIdx: offset, afterSep, rowsEnd };
    }
    offset += line.length + 1;
  }
  return null;
}

/**
 * Replace ONLY the value cell of the `| <label> | <value> |` row, leaving
 * every sibling row byte-untouched. Returns content unchanged when the label
 * row is absent.
 */
export function writeTableValue(content: string, label: string, value: string): string {
  const pattern = new RegExp(`^(\\|\\s*${escapeRegExp(label)}\\s*\\|)\\s*[^|]*?\\s*(\\|)`, 'im');
  if (!pattern.test(content)) return content;
  return content.replace(pattern, (_match, pre: string, post: string) => `${pre} ${value} ${post}`);
}

/**
 * Parse a `## Conflict Surface` section into the globs a work item claims
 * exclusive write-ownership of. Keeps `*` (globs are intentional), drops
 * `{ }` template tokens, bare `none` lines, and non-path tokens.
 */
export function declaredGlobs(content: string): string[] {
  // Unioned across every section with this heading, for the same reason the
  // operator rows are summed: a claim written twice is still a claim.
  const globs: string[] = [];
  for (const line of sectionsMatching(content, escapeRegExp('Conflict Surface'))
    .join('\n')
    .split('\n')) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/^\s*-\s+none\b/i.test(line)) continue;
    // The segment BEFORE the em dash, for the same reason Durable Artifacts
    // reads one: a Conflict Surface bullet explains itself after the dash, and
    // the explanation quotes paths it does not claim.
    const declared = line.split('—')[0]!;
    for (const match of declared.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      // A ROOT-LEVEL claim is a claim. Requiring a `/` discarded
      // `workflow.config.json` and `gates.manifest.json` — the entries this
      // repository's own PRDs use — so two agents could claim the same control
      // file and no conflict was detected.
      if (!/^[^\s`]+$/.test(value)) continue;
      if (/[{}]/.test(value)) continue;
      if (/^none$/i.test(value)) continue;
      globs.push(value);
    }
  }
  return [...new Set(globs)];
}
