import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { MemoryConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
import { sectionAfter } from '../state/markdown.js';
import { readRecord, type MemoryRecord } from './parse.js';

/**
 * The PRD memory contract (addendum A1 §5): two sections, fixed grammar, parsed
 * rather than read.
 *
 * ```
 * ## Memory Inputs
 * - applied|reviewed|not-applicable: `<record-slug>` — <rationale>
 * - none — <why no active record is relevant>
 *
 * ## Memory Outputs
 * - learning|adr: `<exact repo-relative path>` — <the durable fact expected>
 * - none — <why no non-derivable output is expected>
 * ```
 *
 * The parser reports issues instead of throwing, so one `gate check` names every
 * defect in a PRD at once. It validates FORM only: whether a referenced record
 * exists, is active, and is indexed is resolved against the real store by the
 * readiness gate, because the answer lives in the store and not in the string.
 */

export const DISPOSITIONS = ['applied', 'reviewed', 'not-applicable'] as const;
export const OUTPUT_TYPES = ['learning', 'adr'] as const;

export type Disposition = (typeof DISPOSITIONS)[number];
export type OutputType = (typeof OUTPUT_TYPES)[number];

export const INPUTS_HEADING = 'Memory Inputs';
export const OUTPUTS_HEADING = 'Memory Outputs';

export interface MemoryInput {
  disposition: Disposition;
  /** Record slug exactly as written, without backticks. */
  slug: string;
  rationale: string;
}

export interface MemoryOutput {
  type: OutputType;
  /** Exact repo-relative path — never a directory, glob, or promise. */
  path: string;
  rationale: string;
}

/**
 * One parsed section. `none` and a non-empty `entries` list are mutually
 * exclusive by construction: `none` asserts the set is empty, so a section
 * holding both asserts nothing — and leaves the §7 weakening comparison without
 * an unambiguous baseline.
 */
export interface MemorySection<T> {
  /** Heading found in the document. Absent is a different fact from empty. */
  present: boolean;
  entries: T[];
  /** A reasoned `none` — the section asserts the empty set deliberately. */
  none: boolean;
}

export interface MemoryDeclarations {
  inputs: MemorySection<MemoryInput>;
  outputs: MemorySection<MemoryOutput>;
  /** Grammar problems, each already naming its section. */
  issues: string[];
}

/**
 * A declared output is a concrete file, so the rule is stricter than the one a
 * watch glob passes in `parse.ts`: that predicate admits glob metacharacters
 * because a watch IS a pattern. Here a metacharacter means the author wrote a
 * promise instead of a path, which is the exact failure §5 names ("a directory,
 * a glob, or a promise to 'capture learnings' is not an output").
 *
 * "Metacharacter" means what `globToRegExp` treats as magic — `*` and `?` — and
 * nothing else. `[` and `]` are ESCAPED to literals there, so rejecting them
 * here would make this the third path predicate in the repo with its own private
 * grammar, and the one that refuses a path the lock engine would happily match.
 * `{}` is dropped for the reason `declaredArtifacts` drops it: an unsubstituted
 * template token is not a path an author chose.
 */
function pathProblem(value: string): string | null {
  if (value.length === 0) return 'is empty';
  if (value.startsWith('~')) return 'is home-relative';
  if (/^[/\\]/.test(value) || /^[A-Za-z]:/.test(value)) return 'is not repo-relative';
  if (value.split(/[/\\]/).includes('..')) return 'escapes the workspace';
  if (/[*?]/.test(value)) return 'is a pattern, not an exact path';
  if (/[{}]/.test(value)) return 'is an unsubstituted template token, not a path';
  if (value.endsWith('/')) return 'is a directory, not a file';
  if (!value.includes('/')) return 'is not a repo-relative path';
  // A record is a Markdown file (§12), so requiring the extension is the rule
  // that makes readiness and Phase 7 agree. Without it `_brain/learnings` reads
  // as an exact path here — `declaredArtifacts` returns it and
  // `durableArtifactsOk` lets any child satisfy it — while the close gate needs
  // that exact path in the diff and rejects it. Readiness must not pass what
  // Phase 7 will refuse.
  if (!value.endsWith('.md')) return 'is not a `.md` record path';
  return null;
}

/**
 * The document with fenced code blocks blanked out, line for line.
 *
 * Section lookup takes the FIRST matching heading, so a fenced example
 * containing `## Memory Outputs` shadowed the real section: a PRD could carry a
 * quoted, well-formed example above a malformed real one and the gate would read
 * the example. Blanking rather than deleting keeps every other offset intact, so
 * nothing downstream has to know this happened.
 */
function withoutFences(content: string): string {
  let fenced = false;
  return content
    .split('\n')
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fenced = !fenced;
        return '';
      }
      return fenced ? '' : line;
    })
    .join('\n');
}

/** How many times an unfenced `## <heading>` appears. More than one is an
 * ambiguity, not a duplicate: the parser would silently pick one of them. */
function headingCount(content: string, heading: string): number {
  return (content.match(new RegExp(`^##\\s+${heading}\\s*$`, 'gim')) ?? []).length;
}

/**
 * Split a section body into bullet blocks, folding indented continuation lines
 * into the bullet that opened them. A declaration whose rationale wraps across
 * lines is the normal case in a hand-written PRD — treating the wrap as a new
 * (malformed) entry would fail the very artifacts this contract ships with.
 */
function bulletBlocks(section: string): string[] {
  const blocks: string[] = [];
  for (const line of section.split('\n')) {
    if (/^\s*-\s+\S/.test(line)) {
      blocks.push(line.trim().replace(/^-\s+/, ''));
      continue;
    }
    if (blocks.length === 0) continue;
    if (line.trim().length === 0) continue;
    if (!/^\s/.test(line)) continue;
    blocks[blocks.length - 1] += ` ${line.trim()}`;
  }
  return blocks;
}

/** The rationale after the em dash. The separator is exact: an author who wrote
 * something else gets told which form is required, not a silently empty reason. */
function splitRationale(block: string): { head: string; rationale: string | null } {
  const idx = block.indexOf('—');
  if (idx === -1) return { head: block.trim(), rationale: null };
  return { head: block.slice(0, idx).trim(), rationale: block.slice(idx + 1).trim() };
}

interface ParsedBlock {
  /** Lower-cased token before the colon; '' when the block has no colon. */
  kind: string;
  /** Backticked value, when present. */
  value: string | null;
  rationale: string | null;
  raw: string;
}

function parseBlock(block: string): ParsedBlock {
  const { head, rationale } = splitRationale(block);
  const colon = head.indexOf(':');
  if (colon === -1) return { kind: head.toLowerCase(), value: null, rationale, raw: block };
  const kind = head.slice(0, colon).trim().toLowerCase();
  const quoted = /`([^`]*)`/.exec(head.slice(colon + 1));
  return { kind, value: quoted === null ? null : quoted[1]!.trim(), rationale, raw: block };
}

function parseSection<T>(
  content: string,
  heading: string,
  kinds: readonly string[],
  build: (kind: string, value: string, rationale: string) => T,
  valueProblem: (value: string) => string | null,
  valueNoun: string,
): { section: MemorySection<T>; issues: string[] } {
  const issues: string[] = [];
  const count = headingCount(content, heading);
  const present = count > 0;
  const section: MemorySection<T> = { present, entries: [], none: false };
  if (!present) return { section, issues };
  if (count > 1) {
    issues.push(`${heading}: declared ${count} times — exactly one section is parseable`);
    return { section, issues };
  }

  for (const block of bulletBlocks(sectionAfter(content, heading))) {
    const parsed = parseBlock(block);

    if (parsed.kind === 'none') {
      // A rationale is required in every form, including `none`. An unreasoned
      // `none` is the ceremonial answer the contract exists to prevent.
      if (parsed.rationale === null || parsed.rationale.length === 0) {
        issues.push(`${heading}: \`none\` requires a rationale after ' — '`);
      }
      section.none = true;
      continue;
    }

    if (!kinds.includes(parsed.kind)) {
      issues.push(
        `${heading}: '${parsed.kind.length === 0 ? parsed.raw : parsed.kind}' is not one of ` +
          `${kinds.join('|')}|none`,
      );
      continue;
    }
    if (parsed.value === null) {
      issues.push(`${heading}: '${parsed.kind}' entry must quote its ${valueNoun} in backticks`);
      continue;
    }
    const problem = valueProblem(parsed.value);
    if (problem !== null) {
      issues.push(`${heading}: '${parsed.value}' ${problem}`);
      continue;
    }
    if (parsed.rationale === null || parsed.rationale.length === 0) {
      issues.push(`${heading}: '${parsed.value}' requires a rationale after ' — '`);
      continue;
    }
    section.entries.push(build(parsed.kind, parsed.value, parsed.rationale));
  }

  if (section.none && section.entries.length > 0) {
    issues.push(
      `${heading}: \`none\` cannot appear beside ${section.entries.length} entr` +
        `${section.entries.length === 1 ? 'y' : 'ies'} — the two forms are mutually exclusive`,
    );
  }
  if (!section.none && section.entries.length === 0 && issues.length === 0) {
    issues.push(`${heading}: declares neither an entry nor a reasoned \`none\``);
  }

  return { section, issues };
}

/** A slug is a form, not a fact: existence, status, and indexing are resolved
 * against the real store by the readiness gate. Only shape is checked here. */
function slugProblem(value: string): string | null {
  if (value.length === 0) return 'is empty';
  if (/\s/.test(value)) return 'is not a single record slug';
  if (value.includes('/')) return 'is a path, not a record slug';
  return null;
}

/** Parse both sections of a PRD. Absent headings are reported by `present`, not
 * as issues — whether they are required is the caller's configured question. */
export function parseMemoryDeclarations(rawContent: string): MemoryDeclarations {
  // Every contract read happens on the fence-stripped document, so a quoted
  // example can never stand in for the real section.
  const content = withoutFences(rawContent);
  const inputs = parseSection<MemoryInput>(
    content,
    INPUTS_HEADING,
    DISPOSITIONS,
    (kind, value, rationale) => ({
      disposition: kind as Disposition,
      slug: value,
      rationale,
    }),
    slugProblem,
    'record slug',
  );
  const outputs = parseSection<MemoryOutput>(
    content,
    OUTPUTS_HEADING,
    OUTPUT_TYPES,
    (kind, value, rationale) => ({ type: kind as OutputType, path: value, rationale }),
    pathProblem,
    'path',
  );
  return {
    inputs: inputs.section,
    outputs: outputs.section,
    issues: [...inputs.issues, ...outputs.issues],
  };
}

/**
 * Strip an optional `::SymbolName` suffix before any glob match, so a
 * symbol-scoped target still matches a path-scoped watch (§6). Without this the
 * false negative is silent: the record simply never fires.
 */
export function normalizeTarget(target: string): string {
  const idx = target.indexOf('::');
  return idx === -1 ? target.trim() : target.slice(0, idx).trim();
}

/**
 * Normalized targets a record's watch globs match. A watch is a review trigger,
 * not a staleness verdict — the caller requires an input disposition naming the
 * record, never an edit to the record.
 */
export function watchMatches(watch: readonly string[], targets: readonly string[]): string[] {
  const regexes = watch.map(globToRegExp);
  const matched = targets
    .map(normalizeTarget)
    .filter((target) => target.length > 0 && regexes.some((re) => re.test(target)));
  return [...new Set(matched)];
}

/**
 * Outputs and Durable Artifacts are one contract expressed twice (§5), so the
 * pairing is validated where the grammar is — the runner should never have to
 * infer it from two lists that may disagree.
 */
export function outputsMissingFromDurable(
  outputs: readonly MemoryOutput[],
  durable: readonly string[],
): string[] {
  const declared = new Set(durable);
  return outputs.filter((output) => !declared.has(output.path)).map((output) => output.path);
}

// ---------------------------------------------------------------------------
// Phase 7 enforcement (FR-4).
// ---------------------------------------------------------------------------

export interface MemoryCloseOptions {
  content: string;
  changedFiles: readonly string[];
  store: MemoryStore;
  durable: readonly string[];
  /** The configured store, so an output's declared type can be checked against
   * where it actually landed. */
  memory?: MemoryConfig;
  /**
   * Paths the diff ADDED or MODIFIED, when the caller can tell them apart from
   * deletions, plus a predicate for "this path exists as a regular file".
   *
   * Both exist because `changedFiles` is `git diff --name-only`, which includes
   * DELETIONS — so deleting a promised record put its path in the diff and read
   * as a successful capture. Membership in a name list is not evidence that
   * anything was written.
   */
  capturedFiles?: readonly string[];
  exists?: (path: string) => boolean;
}

/** A declared output is satisfied by the file itself, never by a sibling. The
 * directory-prefix tolerance `durableArtifactsOk` allows is deliberately absent:
 * an output IS an exact path, so accepting a prefix would re-admit the "promise
 * to capture learnings" the grammar just refused. */
function captureProblem(path: string, options: MemoryCloseOptions): string | null {
  const inDiff = (options.capturedFiles ?? options.changedFiles).includes(path);
  if (!inDiff) {
    return options.capturedFiles === undefined
      ? 'is declared but absent from the merge diff — a declaration is not a capture'
      : 'is declared but was not added or modified by the merge diff — a deletion is not a capture';
  }
  if (options.exists !== undefined && !options.exists(path)) {
    return 'is declared and in the diff, but no file exists at that path after the merge';
  }
  return null;
}

/**
 * The Phase 7 close checks that do not need the base ref: declared outputs must
 * exist in the merge diff, and any watched file the diff touched must carry an
 * input disposition.
 *
 * Everything here fails closed. A missing section, an unreadable store, or a
 * declaration that does not parse produces an issue rather than an early
 * `return true` — a close gate that skips when its input is malformed is the
 * false green `durable-artifact-must-commit` describes from the other side.
 */
export function memoryCloseIssues(options: MemoryCloseOptions): string[] {
  const { content, store, durable } = options;
  const issues: string[] = [];
  const decl = parseMemoryDeclarations(content);

  issues.push(...store.issues);
  if (!decl.inputs.present) issues.push(`missing \`## ${INPUTS_HEADING}\` section`);
  if (!decl.outputs.present) issues.push(`missing \`## ${OUTPUTS_HEADING}\` section`);
  issues.push(...decl.issues);
  if (!decl.inputs.present || !decl.outputs.present) return issues;

  for (const path of outputsMissingFromDurable(decl.outputs.entries, durable)) {
    issues.push(`${OUTPUTS_HEADING}: '${path}' is not listed in Durable Artifacts`);
  }
  for (const output of decl.outputs.entries) {
    const problem = captureProblem(output.path, options);
    if (problem !== null) issues.push(`${OUTPUTS_HEADING}: '${output.path}' ${problem}`);
  }

  // The close resolves inputs too. Readiness approved a set of slugs; nothing
  // re-checked them at the merge, so an input could be swapped for a name that
  // resolves to nothing after the verdict that accepted it.
  const { declared: declaredInputs, issues: inputIssues } = resolveInputs(
    decl.inputs.entries,
    storeView(store),
  );
  issues.push(...inputIssues);

  // An indexed record that will not parse has no readable watch, so its watch
  // cannot fire. Deleting a watched record and its pointer would otherwise
  // erase the trigger and leave a smaller, self-consistent store behind.
  issues.push(...unreadableStoreIssues(store));
  if (options.memory !== undefined) {
    issues.push(...outputPlacementIssues(decl.outputs.entries, options.memory));
  }

  for (const indexed of activeRecords(store)) {
    const watch = indexed.record.watch;
    if (watch === undefined || watch.length === 0) continue;
    if (declaredInputs.has(indexed.slug)) continue;
    const matched = watchMatches(watch, options.changedFiles);
    if (matched.length === 0) continue;
    issues.push(
      `${INPUTS_HEADING}: '${indexed.slug}' watches ${matched.join(', ')} — the merge diff ` +
        `changes it, so it needs an input disposition`,
    );
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Weakening (FR-5, addendum A1 §7).
// ---------------------------------------------------------------------------

export type WeakeningKind = 'removed' | 'retyped' | 'replaced-with-none';

export interface Weakening {
  kind: WeakeningKind;
  /** The baseline output path the promise was made about. */
  path: string;
  detail: string;
}

/**
 * Compare working Memory Outputs against the same PRD **as committed on the base
 * ref** — the one version an agent editing its own PRD cannot rewrite.
 *
 * Appending is not weakening and is never reported: discovery is the point of
 * doing the work. A baseline path that disappears is `removed` whether the
 * author deleted it or moved it, because the remedy is identical (restore it, or
 * get an acceptance) and guessing between the two would report a rename as a
 * lesser thing than it is.
 */
/**
 * Why the base-ref copy cannot serve as a baseline, or null when it can.
 *
 * Addendum §7 fails closed on a missing, **malformed**, or uncommitted
 * baseline. Only the uncommitted case was handled: a base-ref blob with no
 * Memory Outputs section parsed to zero entries, and zero entries read as
 * "nothing was promised", so pointing the comparison at any section-less file
 * silently licensed every removal.
 */
export function baselineProblem(baselineContent: string): string | null {
  const decl = parseMemoryDeclarations(baselineContent);
  if (!decl.outputs.present) return `it has no \`## ${OUTPUTS_HEADING}\` section`;
  const outputIssues = decl.issues.filter((issue) => issue.startsWith(`${OUTPUTS_HEADING}:`));
  if (outputIssues.length > 0) return `its ${OUTPUTS_HEADING} do not parse: ${outputIssues.join('; ')}`;
  if (!decl.outputs.none && decl.outputs.entries.length === 0) {
    return `its ${OUTPUTS_HEADING} declare neither an entry nor a reasoned \`none\``;
  }
  return null;
}

export function outputWeakenings(baselineContent: string, workingContent: string): Weakening[] {
  const baseline = parseMemoryDeclarations(baselineContent).outputs;
  const working = parseMemoryDeclarations(workingContent).outputs;
  // A deliberate, reasoned `none` on the base ref promised nothing, so nothing
  // can be weakened. Every OTHER way of reaching zero entries is a malformed
  // baseline and is refused by `baselineProblem` before this runs.
  if (baseline.entries.length === 0) return [];

  const byPath = new Map(working.entries.map((entry) => [entry.path, entry]));
  const findings: Weakening[] = [];
  for (const promised of baseline.entries) {
    if (working.none) {
      findings.push({
        kind: 'replaced-with-none',
        path: promised.path,
        detail: `the baseline promised '${promised.path}'; the working PRD declares \`none\``,
      });
      continue;
    }
    const current = byPath.get(promised.path);
    if (current === undefined) {
      findings.push({
        kind: 'removed',
        path: promised.path,
        detail: `the baseline promised '${promised.path}'; the working PRD no longer declares it`,
      });
      continue;
    }
    if (current.type !== promised.type) {
      findings.push({
        kind: 'retyped',
        path: promised.path,
        detail: `'${promised.path}' was declared '${promised.type}' on the base ref and is now '${current.type}'`,
      });
    }
  }
  return findings;
}

/**
 * Does the PRD carry an owner approval for this weakening in its changelog?
 *
 * The addendum requires "a recorded owner approval in the changelog" without
 * fixing its shape, so the narrowest machine-checkable reading is used: a
 * `## Changelog` row whose Author cell is a configured owner and whose Changes
 * cell names the affected path. Naming the path is what makes it an approval OF
 * THIS removal rather than any owner row that happens to exist.
 */
export function changelogApproves(
  rawContent: string,
  owners: readonly string[],
  path: string,
): boolean {
  // Fence-stripped for the same reason the contract sections are: a quoted
  // `## Changelog` carrying an owner row would otherwise shadow the real one and
  // approve a removal the PRD never recorded. More than one real Changelog is an
  // ambiguity, and an ambiguous approval is no approval.
  const content = withoutFences(rawContent);
  if (headingCount(content, 'Changelog') !== 1) return false;
  const section = sectionAfter(content, 'Changelog');
  const ownerSet = new Set(owners.map((owner) => owner.toLowerCase()));
  for (const line of section.split('\n')) {
    const cells = line.trim();
    if (!cells.startsWith('|')) continue;
    const parts = cells
      .slice(1, cells.endsWith('|') ? -1 : undefined)
      .split('|')
      .map((cell) => cell.trim());
    if (parts.length < 3) continue;
    if (!ownerSet.has((parts[1] ?? '').toLowerCase())) continue;
    // The path must be QUOTED, not merely mentioned. A bare substring match let
    // any owner row that happened to name the file in prose — a documentation
    // audit, a moved-file note — waive a removal it never considered. A
    // backticked span is a deliberate reference to that exact path.
    const quoted = [...parts.slice(2).join(' ').matchAll(/`([^`]+)`/g)].map((m) => m[1]!.trim());
    if (quoted.includes(path)) return true;
  }
  return false;
}

/**
 * Does an owner acceptance cover THIS removal? An acceptance entry is scoped by
 * its `items`, and a weakening waiver has to name the path it waives — the
 * addendum requires a *matching* acceptance, and accepting any entry recorded
 * for the PRD let an unrelated operator-row waiver license a broken promise.
 */
export function acceptanceCoversPath(items: readonly string[], path: string): boolean {
  // Token equality, not substring containment. A substring test fails OPEN on
  // the one case that matters: `_brain/learnings/x.md` is a substring of
  // `_brain/learnings/x.md.bak`, so an acceptance naming a backup, a draft, or
  // any longer sibling would waive the removal of the real record. Items are
  // human-written prose, so the path is matched as a whole token with its
  // trailing sentence punctuation stripped.
  return items.some((item) => {
    if (typeof item !== 'string') return false;
    return item
      .split(/[\s`,;()[\]]+/)
      .map((token) => token.replace(/[.,;:]+$/, ''))
      .includes(path);
  });
}

// ---------------------------------------------------------------------------
// The record store, as the readiness gate sees it.
// ---------------------------------------------------------------------------

export interface IndexedRecord {
  slug: string;
  /** Pointer target as the index writes it, e.g. `learnings/foo.md`. */
  pointer: string;
  record: MemoryRecord;
}

export interface MemoryStore {
  /** Indexed records that parse clean. */
  records: IndexedRecord[];
  /**
   * Indexed pointers that do not parse. Kept apart from `records` so a broken
   * record is reported as broken rather than as absent — "no such record" and
   * "that record is unreadable" send an author to different files.
   */
  unreadable: string[];
  /** Problems with the store itself (missing index, dangling pointer). */
  issues: string[];
}

/** Only the documented bullet form counts as a pointer (§12) — a prose mention
 * must not make a record indexed, or the hook rules can be escaped by writing
 * one. HTML comments are stripped first: a commented-out pointer is not one. */
const POINTER = /^- \[[^\]]*\]\(((?:learnings|adr)\/[^)]+\.md)\)/gm;

/**
 * Load the records the index points at. Read-only, and it never infers
 * enablement: the caller decides whether memory is on, per invariant 4.
 */
export function loadMemoryStore(root: string, memory: MemoryConfig): MemoryStore {
  const store: MemoryStore = { records: [], unreadable: [], issues: [] };
  const indexPath = resolve(root, memory.index);
  if (!existsSync(indexPath)) {
    store.issues.push(`memory index '${memory.index}' does not exist`);
    return store;
  }
  // Pointers are relative to the index's own directory, which is how the
  // shipped index writes them (`learnings/x.md` beside `INDEX.md`).
  const base = dirname(indexPath);
  const indexText = readFileSync(indexPath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const seen = new Set<string>();
  for (const match of indexText.matchAll(POINTER)) {
    const pointer = match[1]!;
    if (seen.has(pointer)) {
      store.issues.push(`memory index: duplicate pointer to ${pointer}`);
      continue;
    }
    seen.add(pointer);
    const file = join(base, pointer);
    if (!existsSync(file)) {
      store.issues.push(`memory index: dangling pointer to ${pointer}`);
      continue;
    }
    const slug = pointer.replace(/^(?:learnings|adr)\//, '').replace(/\.md$/, '');
    const { record } = readRecord(file, slug, { isAdr: pointer.startsWith('adr/') });
    if (record === null) store.unreadable.push(slug);
    else store.records.push({ slug, pointer, record });
  }
  return store;
}

/**
 * Where a declared output of each type must live, given the configured store.
 *
 * Grammar alone accepted any repo-relative `.md` path, so `learning:
 * docs/release-note.md` passed readiness and adding that ordinary Markdown file
 * satisfied capture — while the record store and its index never changed and
 * `verify:brain` never looked at it. A "memory output" that lands outside the
 * memory store is not a record; it is a file with a rationale attached.
 */
export function outputPlacementIssues(
  outputs: readonly MemoryOutput[],
  memory: MemoryConfig,
): string[] {
  // `_brain`, `_brain/`, and `./_brain` name one directory, and a raw string
  // compare says otherwise — the same normalization `config/validate.ts` applies
  // when it checks that the index lives under the root.
  const root = memory.root
    .split(/[/\\]/)
    .filter((part) => part.length > 0 && part !== '.')
    .join('/');
  const issues: string[] = [];
  for (const output of outputs) {
    const dir = output.type === 'adr' ? 'adr' : 'learnings';
    const expected = `${root}/${dir}/`;
    if (!output.path.startsWith(expected)) {
      issues.push(
        `${OUTPUTS_HEADING}: '${output.path}' is declared '${output.type}', so it must live ` +
          `under '${expected}'`,
      );
      continue;
    }
    // One segment under the directory: a record is a file in the store, not a
    // tree of its own.
    const slug = output.path.slice(expected.length);
    if (slug.includes('/')) {
      issues.push(`${OUTPUTS_HEADING}: '${output.path}' is nested below '${expected}'`);
    }
  }
  return issues;
}

/** Indexed records that do not validate — a store problem both gates report,
 * because a record whose frontmatter is broken has no readable watch. */
export function unreadableStoreIssues(store: MemoryStore): string[] {
  return store.unreadable.map(
    (slug) =>
      `memory store: indexed record '${slug}' does not validate, so its watch cannot be ` +
      `evaluated — repair it before closing`,
  );
}

interface StoreView {
  bySlug: Map<string, IndexedRecord>;
  superseded: Set<string>;
  unreadable: Set<string>;
}

/** Build the three lookups both gates resolve inputs against. */
function storeView(store: MemoryStore): StoreView {
  return {
    bySlug: new Map(activeRecords(store).map((indexed) => [indexed.slug, indexed])),
    superseded: new Set(
      store.records.filter((i) => i.record.status === 'superseded').map((i) => i.slug),
    ),
    unreadable: new Set(store.unreadable),
  };
}

/**
 * Resolve declared inputs against the store. Shared by readiness and the close
 * gate on purpose: Phase 7 previously read the slugs without checking any of
 * this, so an input could be replaced with a name that resolves to nothing
 * between the readiness that approved it and the merge that closed it.
 */
function resolveInputs(
  entries: readonly MemoryInput[],
  view: StoreView,
): { declared: Set<string>; issues: string[] } {
  const declared = new Set<string>();
  const issues: string[] = [];
  for (const input of entries) {
    if (declared.has(input.slug)) {
      // Two dispositions for one record is a contradiction, not a repetition:
      // the reader cannot tell which one the work item acted on.
      issues.push(`${INPUTS_HEADING}: '${input.slug}' is named more than once`);
      continue;
    }
    declared.add(input.slug);
    if (view.bySlug.has(input.slug)) continue;
    if (view.superseded.has(input.slug)) {
      issues.push(`${INPUTS_HEADING}: '${input.slug}' is superseded — it cannot be an input`);
    } else if (view.unreadable.has(input.slug)) {
      issues.push(`${INPUTS_HEADING}: '${input.slug}' does not validate — repair the record first`);
    } else {
      issues.push(`${INPUTS_HEADING}: '${input.slug}' is not an active indexed record`);
    }
  }
  return { declared, issues };
}

/**
 * Records eligible to be named as inputs. `superseded` is the one status that
 * makes a record inactive in both vocabularies — a learning replaced by another
 * and an ADR replaced by another are both history, and history is not a
 * constraint on new work.
 */
export function activeRecords(store: MemoryStore): IndexedRecord[] {
  return store.records.filter((indexed) => indexed.record.status !== 'superseded');
}

/**
 * The readiness contract for a memory-enabled repository (FR-2). Returns issue
 * strings in `lintPrd`'s vocabulary; an empty array is a pass.
 *
 * `targets` are the PRD's declared FR targets, normalized by the caller or here
 * — `watchMatches` normalizes again, because a caller that forgets is a silent
 * false negative rather than a visible error.
 */
export function lintMemoryContract(
  content: string,
  targets: readonly string[],
  store: MemoryStore,
  durable: readonly string[],
  memory: MemoryConfig,
): string[] {
  const issues: string[] = [];
  const decl = parseMemoryDeclarations(content);

  for (const issue of store.issues) issues.push(issue);
  if (!decl.inputs.present) issues.push(`missing \`## ${INPUTS_HEADING}\` section`);
  if (!decl.outputs.present) issues.push(`missing \`## ${OUTPUTS_HEADING}\` section`);
  issues.push(...decl.issues);
  if (!decl.inputs.present || !decl.outputs.present) return issues;

  const active = activeRecords(store);
  const { declared: declaredInputs, issues: inputIssues } = resolveInputs(
    decl.inputs.entries,
    storeView(store),
  );
  issues.push(...inputIssues);

  // A watch is a REVIEW TRIGGER, not a staleness verdict: the obligation is to
  // name the record with a disposition, never to edit it.
  for (const indexed of active) {
    const watch = indexed.record.watch;
    if (watch === undefined || watch.length === 0) continue;
    if (declaredInputs.has(indexed.slug)) continue;
    const matched = watchMatches(watch, targets);
    if (matched.length === 0) continue;
    issues.push(
      `${INPUTS_HEADING}: '${indexed.slug}' watches ${matched.join(', ')} — a declared target ` +
        `overlaps it, so it needs an input disposition`,
    );
  }

  for (const path of outputsMissingFromDurable(decl.outputs.entries, durable)) {
    issues.push(`${OUTPUTS_HEADING}: '${path}' is not listed in Durable Artifacts`);
  }
  issues.push(...outputPlacementIssues(decl.outputs.entries, memory));

  // An unreadable indexed record is a STORE problem, reported by both gates.
  // Reporting it only at close let readiness pass a PRD that could never close.
  issues.push(...unreadableStoreIssues(store));

  return issues;
}
