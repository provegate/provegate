import type { WorkflowConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
import { contractView,
  lintMemoryContract, loadMemoryStore } from '../memory/artifacts.js';
import { declaredArtifactsStrict } from '../run/durable.js';
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

/**
 * Backticked target paths on the `**Targets:**` LINE of one FR body.
 *
 * This under-reads: a real FR wraps its target list, and everything after the
 * first line is invisible here — measured at 7 of ~30 paths on PRD-018. It is
 * kept, unchanged, for the hard-cap engine, because that engine runs in every
 * repository including memory-disabled ones, and widening what it sees would
 * fire caps that the previous release did not fire. PRD-018 promises a
 * memory-disabled repository behaves exactly as before; migrating the hard-cap
 * side is real work with its own blast radius and is recorded as a deferral
 * rather than smuggled in here.
 *
 * The memory watch gate uses `frTargetEntries` below, which reads the whole
 * entry — it is new surface, so there is no previous behavior to preserve.
 */
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

/**
 * Backticked target paths of one FR body, read from the whole `**Targets:**`
 * ENTRY — its opening line plus the wrapped continuation lines beneath it.
 *
 * The entry ends where the next list bullet, the next numbered FR, or a blank
 * line begins, so a path mentioned in a sibling bullet is prose, not a target.
 * This is what the memory watch gate matches against: a gate whose job is to
 * notice an overlap with a declared target cannot read a fifth of the targets.
 */
function frTargetEntries(body: string): string[] {
  const targets: string[] = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    if (!/\*\*Targets:\*\*/.test(lines[i]!)) continue;
    const entry = [lines[i]!];
    for (let j = i + 1; j < lines.length; j += 1) {
      const next = lines[j]!;
      if (next.trim().length === 0) break;
      if (/^\s*-\s/.test(next)) break;
      if (/^\s*\d+\.\s/.test(next)) break;
      entry.push(next);
      i = j;
    }
    for (const match of entry.join('\n').matchAll(/`([^`]+)`/g)) {
      const value = match[1]!.trim();
      if (value.includes('/')) targets.push(value);
    }
  }
  return [...new Set(targets)];
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
      const durable = declaredArtifactsStrict(content);
      if (durable.ambiguous) {
        // Readiness discarded this and Phase 7 refused the same PRD later —
        // a gate that passes what a later gate must reject is a trap, not a gate.
        issues.push(
          '`## Durable Artifacts` is declared more than once — exactly one section is parseable',
        );
      }
      // Targets for the memory watch gate are read from the EXECUTABLE view, not
      // the raw document. `sectionMatching` takes the first heading it finds, so
      // a `## 4. Functional Requirements` written inside a fence — code to every
      // renderer — was selected over the real one below it, and the real
      // section's watched targets were never seen. The same scan the contract
      // grammar uses answers this, so the two cannot disagree about which
      // headings are on the page.
      //
      // The HARD CAP engine above still reads the raw content deliberately: it
      // runs in memory-disabled repositories too, and changing what it sees
      // would fire caps a previous release did not.
      const executable = contractView(content);
      issues.push(
        ...lintMemoryContract(
          content,
          frBlocks(executable).flatMap((fr) => frTargetEntries(fr.body)),
          loadMemoryStore(root, config.memory),
          durable.paths,
          config.memory,
        ),
      );
    }
  }

  for (const cap of manifest.hardCaps) {
    const regexes = cap.when.targetsMatch.map(globToRegExp);
    const fires = allTargets.some((t) => regexes.some((re) => re.test(t)));
    if (!fires) continue;
    // The EXECUTABLE document: a required evidence line written only inside a
    // fence or an HTML comment renders as an example, and satisfied the cap.
    // Fenced blocks and comments are masked; INLINE code is not, deliberately.
    // Round 24 proposed masking spans too, because prose quoting the required
    // form can satisfy the cap it is describing. That fix refuses correct work:
    // a real cap's evidence line IS written with its command in backticks
    // (`Deny test: \`pnpm test test/deny.ts\``), and masking spans rejects every
    // one of them. There is no syntactic difference between evidence and a
    // sentence about evidence at this level, so the reader takes the document at
    // its word and only the unambiguous cases — fence, comment — are excluded.
    if (!new RegExp(cap.requireLine, 'm').test(contractView(content))) {
      issues.push(`hard cap ${cap.id}: ${cap.message}`);
    }
  }

  return { ok: issues.length === 0, issues };
}
