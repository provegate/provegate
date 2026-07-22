/**
 * Markdown parsing primitives for workflow artifacts. Pure functions, ported
 * from the parent's prd-state-utils with identical semantics — several encode
 * hard-won fixes (padding-tolerant tables, annotated statuses, value-cell-only
 * table writes) that must not drift.
 */

export function stripMarkdown(value: string): string {
  return value
    .replace(/\*\*/g, '')
    .replace(/`/g, '')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim();
}

function escapeRegExp(value: string): string {
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

/** The body of a `## <heading>` section, up to the next `##`. */
export function sectionAfter(content: string, heading: string): string {
  const pattern = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'im');
  const match = pattern.exec(content);
  if (!match) return '';
  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

export function countTaskChecks(content: string): { checkedCount: number; uncheckedCount: number } {
  const checkedCount = (content.match(/^\s*-\s*\[[xX]\]/gm) ?? []).length;
  const uncheckedCount = (content.match(/^\s*-\s*\[\s\]/gm) ?? []).length;
  return { checkedCount, uncheckedCount };
}

/** Count data rows of the table inside the `## Operator Handoff` section. */
export function countOperatorHandoff(content: string): number {
  const section = sectionAfter(content, 'Operator Handoff');
  if (!section) return 0;
  return section
    .split('\n')
    .filter((line) => line.trim().startsWith('|'))
    .filter((line) => !/^\|\s*-+/.test(line))
    .filter((line) => !/^\|\s*Task\s*\|/i.test(line))
    .filter((line) => line.split('|').some((cell) => cell.trim().length > 0)).length;
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
  const section = sectionAfter(content, 'Conflict Surface');
  const globs: string[] = [];
  for (const line of section.split('\n')) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/\bnone\b/i.test(line) && !line.includes('`')) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      if (!value.includes('/')) continue;
      if (/[{}]/.test(value)) continue;
      if (/\bnone\b/i.test(value)) continue;
      globs.push(value);
    }
  }
  return [...new Set(globs)];
}
