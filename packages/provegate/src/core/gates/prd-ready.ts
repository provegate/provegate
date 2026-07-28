import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
import { contractView,
  lintMemoryContract, loadMemoryStore } from '../memory/artifacts.js';
import { scanDocument, sectionBounds } from '../memory/scan.js';
import { declaredArtifactsStrict, durableDeclarationIssue } from '../run/durable.js';
import { formatId, parseArtifactName } from '../state/artifacts.js';
import { escapeRegExp } from '../state/markdown.js';
import type { GatesManifest } from './manifest.js';
import { parseVerificationTable } from './safety.js';
import { valueScoreIssue } from './value-score.js';

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

/** The two heading identities (PRD-028 FR-2): an optional leading ordinal,
 * then the exact name, and nothing more — `## Resolved Open Questions` is not
 * the section, and `## Non-Functional Requirements` never shadows the real
 * requirements again. */
const FR_HEADING = String.raw`(?:\d+\.[ \t]+)?Functional Requirements`;
const OPEN_QUESTIONS_HEADING = String.raw`(?:\d+\.[ \t]+)?Open Questions`;

/**
 * The RAW source lines of exactly one heading-identified section.
 *
 * The scanner decides which headings are on the page (a fenced or commented
 * copy is code, not a section), but its `text` lines carry comment-MASKED
 * content — and a masked question reads as blank. So the section is LOCATED
 * through `scanDocument` + `sectionBounds` and then JUDGED on the raw source
 * lines within those bounds. The two stay index-aligned because the scanner
 * emits exactly one scanned line per input line under the same newline
 * normalization; the slice start is recovered by reference identity, which
 * keeps the exported `sectionBounds` signature untouched.
 */
function rawSection(
  content: string,
  heading: string,
): { count: number; lines: string[]; executable: string[] } {
  const scan = scanDocument(content);
  const found = sectionBounds(scan.lines, heading);
  if (found.count !== 1 || found.body.length === 0) {
    return { count: found.count, lines: [], executable: [] };
  }
  const start = scan.lines.indexOf(found.body[0]!);
  const raw = content.replace(/\r\n|\r/g, '\n').split('\n');
  return {
    count: 1,
    lines: raw.slice(start, start + found.body.length),
    // The EXECUTABLE view of the same span: only lines the scan classifies as
    // Markdown text, with comments masked. Round 2: the FR reader must consume
    // this one — a requirement written inside a fence is an example to every
    // renderer, and reading it as a real FR let a document with no live
    // requirements pass.
    executable: found.body.filter((line) => line.kind === 'text').map((line) => line.text),
  };
}

function frBlocks(content: string): { count: number; blocks: FrBlock[] } {
  const found = rawSection(content, FR_HEADING);
  const section = found.executable.join('\n');
  const blocks: FrBlock[] = [];
  const matches = [...section.matchAll(/^\s*\d+\.\s+\*\*FR-(\d+)/gm)];
  for (let i = 0; i < matches.length; i += 1) {
    const start = matches[i]!.index!;
    const end = i + 1 < matches.length ? matches[i + 1]!.index! : section.length;
    blocks.push({ number: Number.parseInt(matches[i]![1]!, 10), body: section.slice(start, end) });
  }
  return { count: found.count, blocks };
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

/** The declaring PRD's own artifact on disk, located by number across the
 * configured lifecycle states — the comparison target for rule 7's canonical
 * distinctness. `null` when the declaring artifact is not on disk (a fixture
 * document linted before it is filed); number distinctness still holds then. */
function declaringArtifactPath(config: WorkflowConfig, root: string, num: number): string | null {
  const prd = config.dirs.artifacts.prd;
  for (const state of config.dirs.states) {
    const dir = resolve(root, prd.dir, state);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir)) {
      if (!entry.endsWith('.md')) continue;
      const parsed = parseArtifactName(config.idPattern, prd.prefix, entry);
      if (parsed !== null && parsed.number === num) return resolve(dir, entry);
    }
  }
  return null;
}

/** The first heading the scanner recognizes as on the page, or null. Fenced,
 * commented and raw-HTML copies are code, not headings. */
function firstHeading(content: string): string | null {
  for (const line of scanDocument(content).lines) {
    if (line.kind !== 'text') continue;
    if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(line.text)) return line.text;
  }
  return null;
}

/**
 * PRD-028 FR-1, resolution rules 2–8: a deferral's referent is RESOLVED
 * through the state layer — never matched as a shape — to a distinct,
 * registered, unfinished work item. Returns the failure reason, or null when
 * the referent resolves. Shape-plus-existence was the seventh hiding place (a
 * self-link); basename-level resolution was the eighth (a symlink alias).
 */
function deferralIssue(
  config: WorkflowConfig,
  root: string | undefined,
  declaringNumber: number | null | undefined,
  labelNumber: number,
  target: string,
): string | null {
  // Fail closed on missing context before touching the disk: the production
  // caller (`runCheck`) always passes both; a fixture without them is
  // `fixture-must-reach-production-shape` violated, not a laxer mode.
  if (root === undefined) return 'deferral unverifiable — the lint received no repository root';
  if (declaringNumber === null || declaringNumber === undefined) {
    return 'deferral unverifiable — the lint received no declaring PRD number';
  }
  const prd = config.dirs.artifacts.prd;
  // Rounds 2-4: the path is a REPOSITORY-RELATIVE state-layer coordinate, and
  // it must read the same to the lint, the filesystem, and a renderer. `#`
  // opens a fragment, `?` a query, `%` percent-decodes, `&` opens a character
  // reference CommonMark decodes in link destinations (`&quest;` → `?`), `\`
  // is a separator on one platform and a name character on another, `:` opens
  // a URL scheme — each makes two readers disagree about the referent, so all
  // six are refused outright.
  if (/[#\\:?%&]/.test(target)) {
    return 'the target path carries a character the link and the filesystem read differently (`#`, `?`, `%`, `&`, `\\`, `:`)';
  }
  // Rule 2 — containment inside the configured artifact root, path-boundary
  // safe (never a string prefix), and repository-relative to begin with.
  if (isAbsolute(target) || target.split('/').includes('..')) {
    return 'the target path must be repository-relative with no `..` segments';
  }
  const full = resolve(root, target);
  const artifactRoot = resolve(root, prd.dir);
  const fromRoot = relative(artifactRoot, full);
  if (fromRoot.startsWith('..') || isAbsolute(fromRoot)) {
    return `the target must sit inside the configured artifact root '${prd.dir}'`;
  }
  const segments = fromRoot.split(sep);
  if (segments.length !== 2) {
    return 'the target must sit directly inside a lifecycle state directory';
  }
  // Rule 3 — the state builder's own parser accepts the basename, and the
  // parsed number equals the label's. A look-alike the parser rejects is not
  // a work item.
  const parsed = parseArtifactName(config.idPattern, prd.prefix, full);
  if (parsed === null) return 'the target basename does not parse as a registered work item';
  if (parsed.number !== labelNumber) {
    return 'the label and the target basename name different numbers';
  }
  // Rule 5 — distinct and UNFINISHED: the state directory is the configured
  // wip or deferred role name (roles are config, never literals), and the
  // referent is not the declaring PRD. A completed-role target is finished
  // work, not a follow-up.
  const state = segments[0]!;
  if (state !== config.dirs.stateRoles.wip && state !== config.dirs.stateRoles.deferred) {
    return `the target's state directory '${state}' is not the configured wip or deferred role`;
  }
  if (parsed.number === declaringNumber) {
    return 'the target is the declaring PRD itself — a follow-up is a different work item';
  }
  // Rules 4 + 6, one lstat, fail-closed order: existence first, then REGULAR
  // FILE — a symlink is refused outright, because the eighth hiding place was
  // a wip alias whose basename-level checks all passed while the canonical
  // referent was self.
  let stat;
  try {
    stat = lstatSync(full);
  } catch {
    return 'the target file does not exist';
  }
  if (!stat.isFile()) return 'the target is not a regular file — a symlink is refused';
  // Round 2: the ON-DISK name must be byte-equal to the linked one. On a
  // case-insensitive filesystem `lstat` opens `PRD-123-x.md` through a
  // lowercase link, but the state builder enumerates the real basename and
  // refuses it — the deferral would resolve to an item absent from state. The
  // directory listing is the state layer's own source of names, so it is the
  // authority here.
  if (
    !readdirSync(artifactRoot).includes(state) ||
    !readdirSync(resolve(artifactRoot, state)).includes(segments[1]!)
  ) {
    return "the target's on-disk name differs from the link — the state layer would not register it";
  }
  // Round 1: a hardlink is a second NAME for the same inode — realpath
  // canonicalizes pathnames, not file identity, so a finished artifact
  // hardlinked into a wip role would pass every path-level rule. A repository
  // artifact has one link; more than one means identity cannot be established.
  if (stat.nlink > 1) {
    return 'the target has multiple hard links — canonical identity cannot be established';
  }
  // Rule 7 — canonical identity: the realpath stays under the realpath'd
  // artifact root, and differs from the declaring PRD's own artifact (the
  // alias comparison a number check cannot see).
  const realTarget = realpathSync(full);
  const realFromRoot = relative(realpathSync(artifactRoot), realTarget);
  if (realFromRoot.startsWith('..') || isAbsolute(realFromRoot)) {
    return 'the target canonically resolves outside the artifact root';
  }
  // Round 1: the ROLE must hold at the canonical location too. `lstat` refuses
  // a symlinked FILE, but a symlinked state DIRECTORY (`deferred` →
  // `completed`) relabels finished work as unfinished while every file-level
  // check passes — so the canonical path's state segment must be the same
  // directory the lexical path claimed.
  const realSegments = realFromRoot.split(sep);
  if (realSegments.length !== 2 || realSegments[0] !== state) {
    return 'the target canonically sits outside its claimed state directory — a directory alias is refused';
  }
  const declaring = declaringArtifactPath(config, root, declaringNumber);
  if (declaring !== null && realpathSync(declaring) === realTarget) {
    return 'the target canonically resolves to the declaring PRD — an alias is still a self-link';
  }
  // Rule 8 — a recognized record, not a stub: the first heading on the page is
  // the H1 the template ships, carrying the target's own id and a colon.
  const id = formatId(config.idPattern, parsed.number);
  const h1 = new RegExp(`^ {0,3}#[ \\t]+${escapeRegExp(id)}:`);
  const heading = firstHeading(readFileSync(full, 'utf8'));
  if (heading === null || !h1.test(heading)) {
    return `the target does not carry its own H1 (\`# ${id}: …\`) — a stub is not a filed work item`;
  }
  return null;
}

/** Names the line's shape so a refusal reads as a diagnosis, not a shrug. The
 * order matters only where shapes overlap: a malformed deferral before the
 * `(none)` tail, indentation before the generic bullet. */
function lineShape(line: string): string {
  if (/^[ \t]*- \[[ xX]\]/.test(line)) return 'a checkbox bullet';
  if (/^[ \t]*<!--/.test(line)) return 'an HTML comment';
  if (/^[ \t]*(?:`{3,}|~{3,})/.test(line)) return 'a fenced code line';
  if (/^[ \t]*</.test(line)) return 'raw HTML';
  if (/^- Deferred to /.test(line)) return 'a malformed deferral (the form is exact)';
  if (/^- \(none\)/.test(line)) return 'a tail after the `- (none)` marker';
  if (/^[ \t]+\S/.test(line)) return 'an indented continuation';
  if (/^[ \t]*[-+*][ \t]/.test(line)) return 'a bullet outside the two exempt forms';
  return 'prose';
}

/**
 * PRD-028 FR-1 + FR-2: exactly one §9 section, holding only the closed
 * grammar, judged on raw lines. Every raw line must be blank, the exact
 * `- (none)` line, an exact deferral resolving through `deferralIssue`, or a
 * single terminal `---`. Everything else fails by name — there is no
 * continuation clause and no comment clause, because rows 3a and 3b of the
 * hiding-place history are where those clauses hid.
 */
function openQuestionsIssues(
  config: WorkflowConfig,
  content: string,
  root: string | undefined,
  prdNumber: number | null | undefined,
): string[] {
  const section = rawSection(content, OPEN_QUESTIONS_HEADING);
  if (section.count === 0) return ['Open Questions section missing — exactly one is required'];
  if (section.count > 1) {
    return [
      `Open Questions section ambiguous: ${section.count} sections — exactly one is required`,
    ];
  }
  const deferred = new RegExp(
    `^- Deferred to \\[${escapeRegExp(config.idPattern.prefix)}-(\\d{${config.idPattern.width}})\\]\\(([^()\\s]+)\\)$`,
  );
  const issues: string[] = [];
  let lastContent = -1;
  for (let i = 0; i < section.lines.length; i += 1) {
    if (!/^[ \t]*$/.test(section.lines[i]!)) lastContent = i;
  }
  let separatorSeen = false;
  for (let i = 0; i < section.lines.length; i += 1) {
    const line = section.lines[i]!;
    if (/^[ \t]*$/.test(line)) continue;
    if (line === '- (none)') continue;
    const match = deferred.exec(line);
    if (match !== null) {
      const issue = deferralIssue(
        config,
        root,
        prdNumber,
        Number.parseInt(match[1]!, 10),
        match[2]!,
      );
      if (issue !== null) issues.push(`Open Questions: ${issue}: "${line}"`);
      continue;
    }
    if (line === '---') {
      if (separatorSeen) {
        issues.push('Open Questions: a second `---` is not in the closed grammar');
      } else if (i !== lastContent) {
        issues.push('Open Questions: a `---` is only allowed as the terminal line');
      }
      separatorSeen = true;
      continue;
    }
    // Rounds 2-3: a line that trims to nothing (an NBSP-only line is not
    // blank to this grammar) must still show WHAT was refused — explicit
    // codepoints, because JSON.stringify prints U+00A0 as itself: invisibly.
    const shown =
      line.trim().length > 0
        ? `"${line.trim()}"`
        : [...line]
            .map((c) => `U+${c.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')}`)
            .join(' ');
    issues.push(`Open Questions: ${lineShape(line)} is not in the closed grammar: ${shown}`);
  }
  return issues;
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
  // FIFTH, and optional, because a required parameter cannot follow the
  // optional `root` — and because optional is what keeps this a one-caller
  // change. Every existing call site omits it and receives `undefined`; only
  // `runCheck`, which already resolved the record, has an id to pass.
  prdNumber?: number | null,
): PrdReadyReport {
  const issues: string[] = [];
  const frFound = frBlocks(content);
  const frs = frFound.blocks;

  // PRD-028 FR-2(d): the same first-match hole the §9 reader had — a second
  // requirements section was invisible. Zero keeps the legacy message (no
  // section is also no entries); two or more is its own refusal.
  if (frFound.count > 1) {
    issues.push(
      `Functional Requirements section ambiguous: ${frFound.count} sections — exactly one is required`,
    );
  } else if (frs.length === 0) {
    issues.push('no functional requirements found (§4 with numbered **FR-N** entries)');
  }

  for (const fr of frs) {
    if (!/\*\*Targets:\*\*/.test(fr.body)) {
      issues.push(`FR-${fr.number}: missing **Targets:** line`);
    }
  }

  // One shared extraction for both readers of the §11 table (PRD-024 FR-1):
  // the parser's own issues surface here as readiness failures, and every
  // per-row read below sees the Command cell only — never Scope or Notes.
  const table = parseVerificationTable(config, content);
  issues.push(...table.issues);
  const rowsByFr = new Map<number, string>();
  for (const row of table.rows) rowsByFr.set(row.fr, row.commandCell);
  for (const fr of frs) {
    const cell = rowsByFr.get(fr.number);
    if (cell === undefined) {
      issues.push(`FR-${fr.number}: no §11 verification row`);
      continue;
    }
    const hasRunnable = [...cell.matchAll(/`([^`]+)`/g)].some((m) =>
      config.commands.allowedPrefixes.some((p) => m[1]!.trim().startsWith(p)),
    );
    if (!hasRunnable) issues.push(`FR-${fr.number}: §11 row has no runnable command`);
  }

  if (!/^##\s+.*DO NOT/im.test(content)) {
    issues.push('missing DO NOT (anti-patterns) section');
  }

  issues.push(...openQuestionsIssues(config, content, root, prdNumber));

  const prose = stripCode(content);
  if (/\bTBD\b|\?\?\?|to be decided/i.test(prose)) {
    issues.push('placeholder text (TBD / ??? / to be decided) outside code quotes');
  }

  // PRD-026 FR-2: a wip PRD declares its durable artifacts at readiness — the
  // deleted script's lint mode, now at the phase where a missing declaration
  // should stop the work. Measured across the whole wip corpus before landing:
  // zero newly failing sections.
  const declarationIssue = durableDeclarationIssue(content);
  if (declarationIssue !== null) issues.push(declarationIssue);

  for (const { cmd, safe } of table.commands) {
    if (!safe) issues.push(`unsafe §11 command (would be refused at run time): ${cmd}`);
  }

  const allTargets = frs.flatMap((fr) => frTargets(fr.body));

  // The value recompute. Absent and `null` take the same path — see
  // `valueScoreIssue`, which owns the cutoff decision because it owns the
  // config that configures it.
  const valueIssue = valueScoreIssue(config, content, prdNumber);
  if (valueIssue !== null) issues.push(valueIssue);

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
      // The HARD CAP engine above reads the same executable FR view since
      // round 2 (a fenced target is an example, not a declaration) — a
      // DECLARED behavior change, recorded in the PRD-028 changelog, that
      // finally makes the target reader agree with the evidence reader
      // (`contractView`) about what is on the page.
      const executable = contractView(content);
      issues.push(
        ...lintMemoryContract(
          content,
          frBlocks(executable).blocks.flatMap((fr) => frTargetEntries(fr.body)),
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
