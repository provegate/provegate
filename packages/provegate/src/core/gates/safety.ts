import type { WorkflowConfig } from '../config/index.js';
import { sectionsMatching } from '../state/markdown.js';

/**
 * §11 command safety. Threat model (PRD-002 §7): defends against accidents and
 * injection through artifact content, not adversarial spec authors — the spec
 * is human-approved upstream. User-gate commands run through a shell ONLY
 * after this check passes; internal git never touches a shell.
 */

/** True when a user-gate command may be shell-executed. */
export function isSafeCommand(config: WorkflowConfig, cmd: string): boolean {
  if (/[`$><]|\$\(|\bgit\s+push\b/.test(cmd)) return false;
  // Newlines are shell separators too — a manifest JSON string (or a
  // multi-line backtick span) could smuggle a second command past the
  // segment check (codex round-2 finding).
  if (/[\r\n]/.test(cmd)) return false;
  // A lone `&` backgrounds the left side — the right side escapes the segment
  // check (and could clear the recursion sentinel). Only `&&` chaining is legal.
  if (/(?<!&)&(?!&)/.test(cmd)) return false;
  const segments = cmd
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    segments.length > 0 &&
    segments.every((s) => config.commands.allowedPrefixes.some((p) => s.startsWith(p)))
  );
}

export interface SafetyCheckedCommand {
  cmd: string;
  safe: boolean;
}

/** One well-formed `| FR-N |` row, reduced to the cell the runner may read. */
export interface VerificationRow {
  fr: number;
  commandCell: string;
}

/**
 * The internal parse result. `commands` come from the Command cell only;
 * `issues` are the §11-parser-class diagnostics, emitted under the exact
 * prefixes PRD-024 FR-1 fixes — FR-2's corpus predicate matches on that text,
 * so the wording here is a contract, not a message.
 */
export interface ParsedVerificationTable {
  commands: SafetyCheckedCommand[];
  issues: string[];
  rows: VerificationRow[];
}

/**
 * The §11 heading, identified by equality rather than substring: the canonical
 * name with an optional leading ordinal, and nothing more. A longer variant
 * (`Resolved Verification Commands`) is not the section.
 */
const VERIFICATION_HEADING = String.raw`(?:\d+\.[ \t]+)?Verification Commands`;

/**
 * Split a §11 table row into trimmed cells: split on `|`, drop the single
 * empty leading and trailing components a fenced row produces, trim the rest.
 * An interior empty cell survives — only the fence artifacts are dropped.
 */
function rowCells(line: string): string[] {
  const parts = line.split('|');
  if (parts.length > 0 && parts[0]!.trim() === '') parts.shift();
  if (parts.length > 0 && parts[parts.length - 1]!.trim() === '') parts.pop();
  return parts.map((cell) => cell.trim());
}

/**
 * Parse the Verification Commands table: the shared extraction both readers
 * (`lintPrd` and `buildGateChain`) consume, so neither re-splits the row for
 * itself. A row is well-formed at two or more cells; the command comes from
 * cell 2, cells 3–4 are Scope/Notes and never parsed for commands, a fifth or
 * later cell is accepted and ignored. Fewer than two cells is malformed and
 * reported, never skipped.
 */
export function parseVerificationTable(
  config: WorkflowConfig,
  content: string,
): ParsedVerificationTable {
  const issues: string[] = [];
  const rows: VerificationRow[] = [];
  const cmds: SafetyCheckedCommand[] = [];
  const sections = sectionsMatching(content, VERIFICATION_HEADING);
  if (sections.length === 0) {
    issues.push('§11 verification section is missing');
  } else if (sections.length > 1) {
    issues.push(
      `§11 verification section is declared more than once (${sections.length} sections)`,
    );
  }
  for (const line of (sections[0] ?? '').split('\n')) {
    if (!/^\s*\|\s*FR-\d+\b/.test(line)) continue;
    const cells = rowCells(line);
    if (cells.length < 2) {
      issues.push(`§11 row is malformed (fewer than two cells): ${line.trim()}`);
      continue;
    }
    const fr = Number.parseInt(/FR-(\d+)/.exec(cells[0]!)![1]!, 10);
    rows.push({ fr, commandCell: cells[1]! });
    for (const match of cells[1]!.matchAll(/`([^`]+)`/g)) {
      const cmd = match[1]!.trim();
      // Every backticked token surfaces UNLESS it is an inert file path
      // (extension-terminated, no whitespace). Bare words like `reboot`
      // and path-shaped commands like `./verify` must be visible as
      // unsafe, never silently dropped (codex round-2 finding).
      const inertPath = !/\s/.test(cmd) && /^[\w@/-]+(\.[\w-]+)+$/.test(cmd);
      if (!inertPath) {
        cmds.push({ cmd, safe: isSafeCommand(config, cmd) });
      }
    }
  }
  const seen = new Set<string>();
  return {
    commands: cmds.filter(({ cmd }) => (seen.has(cmd) ? false : (seen.add(cmd), true))),
    issues,
    rows,
  };
}

/**
 * Parse a PRD's Verification Commands section: backticked commands on
 * `| FR-N |` table rows, deduped, each carrying its safety flag — from the
 * Command cell only. Non-FR rows (cross-cutting bullets) are deliberately NOT
 * runnable by the runner. The exported shape is unchanged (two tests consume
 * it as an array); it keeps dropping malformed rows silently, which is the
 * status quo for a programmatic caller — the gate paths take
 * `parseVerificationTable` and see the issues.
 */
export function parseVerificationCommands(
  config: WorkflowConfig,
  content: string,
): SafetyCheckedCommand[] {
  return parseVerificationTable(config, content).commands;
}
