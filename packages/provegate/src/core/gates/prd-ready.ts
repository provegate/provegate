import type { WorkflowConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
import { lintMemoryContract, loadMemoryStore } from '../memory/artifacts.js';
import { declaredArtifacts } from '../run/durable.js';
import { sectionMatching } from '../state/markdown.js';
import type { GatesManifest } from './manifest.js';
import { parseVerificationCommands } from './safety.js';

/**
 * PRD-readiness lint (`gate check`) — the machine gate that retires the
 * structural-lint waiver. Structural checks + manifest hard-cap evaluation.
 */

/** Strip fenced code blocks and inline code spans — lint patterns cited in
 * backticks are exempt from the placeholder scan (a PRD may quote the lint's
 * own vocabulary, as PRD-002 itself does). */
function stripCode(content: string): string {
  return content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
}

interface FrBlock {
  number: number;
  body: string;
}

function frBlocks(content: string): FrBlock[] {
  const section = sectionMatching(content, '.*Functional Requirements.*');
  const blocks: FrBlock[] = [];
  const matches = [...section.matchAll(/^\s*\d+\.\s+\*\*FR-(\d+)/gm)];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i]!.index!;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : section.length;
    blocks.push({ number: Number.parseInt(matches[i]![1]!, 10), body: section.slice(start, end) });
  }
  return blocks;
}

/** Backticked target paths on `**Targets:**` lines of one FR body. */
function frTargets(body: string): string[] {
  const targets: string[] = [];
  for (const line of body.split('\n')) {
    if (!/\*\*Targets:\*\*/.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      if (value.includes('/')) targets.push(value);
    }
  }
  return targets;
}

export interface PrdReadyReport {
  ok: boolean;
  issues: string[];
}

/**
 * `root` is the repository root, required only when `memory.enabled` is true —
 * the memory contract resolves declared inputs against the real record store,
 * and a store is a directory, not a string. A disabled repository never reads
 * it, so its behavior is byte-identical to before the contract existed.
 */
export function lintPrd(
  config: WorkflowConfig,
  manifest: GatesManifest,
  content: string,
  root?: string,
): PrdReadyReport {
  const issues: string[] = [];
  const frs = frBlocks(content);

  if (frs.length === 0) {
    issues.push('no functional requirements found (§4 with numbered **FR-N** entries)');
  }

  for (const fr of frs) {
    if (!/\*\*Targets:\*\*/.test(fr.body)) {
      issues.push(`FR-${fr.number}: missing **Targets:** line`);
    }
  }

  const verification = sectionMatching(content, '.*Verification Commands.*');
  const rowsByFr = new Map<number, string>();
  for (const line of verification.split('\n')) {
    const m = /^\s*\|\s*FR-(\d+)\b/.exec(line);
    if (m) rowsByFr.set(Number.parseInt(m[1]!, 10), line);
  }
  for (const fr of frs) {
    const row = rowsByFr.get(fr.number);
    if (!row) {
      issues.push(`FR-${fr.number}: no §11 verification row`);
      continue;
    }
    const hasRunnable = [...row.matchAll(/`([^`]+)`/g)].some((m) =>
      config.commands.allowedPrefixes.some((p) => m[1]!.trim().startsWith(p)),
    );
    if (!hasRunnable) issues.push(`FR-${fr.number}: §11 row has no runnable command`);
  }

  if (!/^##\s+.*DO NOT/im.test(content)) {
    issues.push('missing DO NOT (anti-patterns) section');
  }

  const openQuestions = sectionMatching(content, '.*Open Questions.*');
  const openItems = openQuestions
    .split('\n')
    .filter((l) => /^\s*-\s+\S/.test(l))
    .filter((l) => !/\(none\b|deferred/i.test(l));
  if (openItems.length > 0) {
    issues.push(`Open Questions not empty: ${openItems.length} unresolved item(s)`);
  }

  const prose = stripCode(content);
  if (/\bTBD\b|\?\?\?|to be decided/i.test(prose)) {
    issues.push('placeholder text (TBD / ??? / to be decided) outside code quotes');
  }

  for (const { cmd, safe } of parseVerificationCommands(config, content)) {
    if (!safe) issues.push(`unsafe §11 command (would be refused at run time): ${cmd}`);
  }

  const allTargets = frs.flatMap((fr) => frTargets(fr.body));

  if (config.memory.enabled) {
    if (root === undefined) {
      // Fail closed rather than skip: a gate that quietly does nothing when its
      // input is missing is the false green this repo keeps paying for.
      issues.push('memory is enabled but the readiness lint received no repository root');
    } else {
      issues.push(
        ...lintMemoryContract(
          content,
          allTargets,
          loadMemoryStore(root, config.memory),
          declaredArtifacts(content),
        ),
      );
    }
  }

  for (const cap of manifest.hardCaps) {
    const regexes = cap.when.targetsMatch.map(globToRegExp);
    const fires = allTargets.some((t) => regexes.some((re) => re.test(t)));
    if (!fires) continue;
    if (!new RegExp(cap.requireLine, 'm').test(content)) {
      issues.push(`hard cap ${cap.id}: ${cap.message}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
