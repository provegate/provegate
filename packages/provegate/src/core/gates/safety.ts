import type { WorkflowConfig } from '../config/index.js';
import { sectionMatching } from '../state/markdown.js';

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

/**
 * Parse a PRD's Verification Commands section: backticked commands on
 * `| FR-N |` table rows, deduped, each carrying its safety flag. Non-FR rows
 * (cross-cutting bullets) are deliberately NOT runnable by the runner.
 */
export function parseVerificationCommands(
  config: WorkflowConfig,
  content: string,
): SafetyCheckedCommand[] {
  const verification = sectionMatching(content, '.*Verification Commands.*');
  const cmds: SafetyCheckedCommand[] = [];
  for (const line of verification.split('\n')) {
    if (!/^\s*\|\s*FR-\d+\b/.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
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
  return cmds.filter(({ cmd }) => (seen.has(cmd) ? false : (seen.add(cmd), true)));
}
