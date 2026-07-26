import { existsSync, lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { MemoryConfig } from '../config/index.js';
import { globToRegExp } from '../locks/glob.js';
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
 * ONE stateful scan producing the view a renderer would execute: fenced code
 * blanked, HTML comments masked, code spans preserved.
 *
 * Three rules, each earned by a round of attack:
 *  - Fence, comment, and code-span state are decided TOGETHER, in reading
 *    order. Two ordered strippers could not: a `<!--` inside a fence ate the
 *    fence's own closer, and a later fence then re-opened somewhere else.
 *  - A comment is MASKED, never spliced out. Splicing joined the text around it,
 *    so `##<!-- --> Changelog` became a heading the source never had — and
 *    masking with spaces would have produced the same forgery, which is why the
 *    placeholder is not whitespace.
 *  - Code spans SURVIVE. The grammar reads slugs and paths out of backticks, so
 *    spans are consumed as spans while scanning but written through unchanged.
 *    Their delimiter runs are matched by LENGTH and may cross lines: ``<!--`` is
 *    one two-backtick span, not two one-backtick spans.
 */
const COMMENT_MASK = '␀';

/** Does a backtick run of `length` close on this line's remainder, or on a
 * later line of the SAME paragraph? A blank line ends the paragraph, and a span
 * cannot span one. */
function closesBeforeParagraphEnd(
  lines: readonly string[],
  from: number,
  restOfLine: string,
  length: number,
): boolean {
  const closer = new RegExp(`(?<!\`)\`{${length}}(?!\`)`);
  if (closer.test(restOfLine)) return true;
  for (let i = from + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    // A paragraph ends at a blank line OR at a heading, which can interrupt one
    // without a blank. Carrying a span across a heading masked the heading and
    // pulled the next section's bullets into this one.
    if (line.trim().length === 0) return false;
    if (/^ {0,3}#{1,6}(?:[ \t]|\r?$)/.test(line)) return false;
    // A column-zero list marker interrupts a paragraph too, so a span cannot
    // reach across it — masking one as span interior hid a rendered list item.
    if (/^-[ \t]+\S/.test(line)) return false;
    if (closer.test(line)) return true;
  }
  return false;
}

/**
 * The terminator for the raw HTML block this line opens, or null when it opens
 * none. `paragraphActive` separates the kinds that may interrupt a paragraph
 * (types 1-6) from type 7, which may not — and an open paragraph is not the
 * same as "the previous line was not blank": a heading closes one too.
 */
/** CommonMark's type-6 block tag names: these interrupt a paragraph. Anything
 * else in tag form is type 7, which does not. */
const BLOCK_TAGS =
  'address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|' +
  'dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|' +
  'hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|' +
  'search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul';

/** A blank line, CRLF included — the `\r` was retained and never matched, so a
 * CRLF document's HTML block ran to end of file. */
const BLANK_LINE = /^[ \t]*\r?$/;

/**
 * CommonMark type 7: a COMPLETE open or closing tag, alone on its line,
 * attributes and all. The previous shape allowed no attributes, so
 * `<x-note class="warning">` opened a raw block for a renderer and nothing for
 * this reader — which then read the bullet the block was hiding.
 */
const TYPE_7 =
  /^ {0,3}(?:<[a-zA-Z][a-zA-Z0-9-]*(?:\s+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>|<\/[a-zA-Z][a-zA-Z0-9-]*\s*>)[ \t]*\r?$/;

function htmlBlockEnd(line: string, paragraphActive: boolean): RegExp | null {
  // Types 1-5 carry their own terminators and may interrupt a paragraph.
  // The name must END: `\b` matched before the hyphen, so `<style-guide>` was
  // read as an unclosed `<style>` block and swallowed the rest of the document.
  if (/^ {0,3}<(?:script|pre|style|textarea)(?:[ \t>]|\r?$)/i.test(line)) {
    return /<\/(?:script|pre|style|textarea)>/i;
  }
  if (/^ {0,3}<!\[CDATA\[/.test(line)) return /\]\]>/;
  if (/^ {0,3}<\?/.test(line)) return /\?>/;
  if (/^ {0,3}<![A-Za-z]/.test(line)) return />/;
  // Type 6 — a known block tag — also interrupts a paragraph, and ends at a
  // blank line. Requiring a preceding blank let `<div>` under a prose line stay
  // unrecognized, so a declaration inside it was read as one.
  if (new RegExp(`^ {0,3}</?(?:${BLOCK_TAGS})(?:[ \t>]|/>|\r?$)`, 'i').test(line)) {
    return BLANK_LINE;
  }
  // Type 7 — any other complete tag alone on its line — may NOT interrupt a
  // paragraph, which is what keeps a wrapped `<br>` inside a rationale from
  // being read as a block.
  if (!paragraphActive && TYPE_7.test(line)) return BLANK_LINE;
  return null;
}
htmlBlockEnd.CLOSES_ON_OPEN = /^ {0,3}<(?:script|pre|style|textarea|!\[CDATA\[|\?|![A-Za-z])/i;

function executableView(content: string): { view: string; unreliable: string | null } {
  interface Fence {
    char: string;
    length: number;
  }
  let fence: Fence | null = null;
  let inComment = false;
  /**
   * The open raw HTML block's end condition, or null outside one.
   *
   * CommonMark gives HTML blocks five different terminators, and ending them
   * all at a blank line was a hole: a `<script>` region with a blank inside it
   * continues to `</script>`, so a heading and a declaration written between
   * them are raw text to a renderer and were a live section to this reader.
   */
  let htmlBlock: RegExp | null = null;
  /** The previous line was blank, so this one starts a block. */
  /** A paragraph is open: the previous line was text, not a blank and not a
   * heading. Only this blocks a type-7 tag from opening a block. */
  let paragraphActive = false;
  /** The open comment began a line, so it is an HTML block and owns its closing
   * line entirely. */
  let blockComment = false;
  /** Open code-span delimiter run in backticks, or 0 outside one. Only ever
   * opened when a matching run closes it on the same line. */
  let span = 0;
  const out: string[] = [];

  const lines = content.split('\n');
  for (const [lineIndex, raw] of lines.entries()) {
    if (fence !== null) {
      const closer = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(raw);
      if (
        closer !== null &&
        closer[2]![0] === fence.char &&
        closer[2]!.length >= fence.length &&
        closer[3]!.trim().length === 0
      ) {
        fence = null;
      }
      out.push('');
      paragraphActive = false;
      continue;
    }

    // An OPEN html block is consumed first, like a fence. Testing for a new
    // opener before checking the current block's terminator made that
    // terminator unreachable, so every block ran to end of file and swallowed
    // the sections after it.
    if (htmlBlock !== null) {
      const ends: boolean = htmlBlock.test(raw);
      if (ends) htmlBlock = null;
      out.push('');
      // Raw HTML is never a paragraph, so nothing it contains can block the
      // next line from opening one.
      paragraphActive = false;
      continue;
    }

    // A fence opens only outside a comment and outside a code span.
    if (!inComment && span === 0) {
      const opener = /^( {0,3})(`{3,}|~{3,})(.*)$/.exec(raw);
      if (opener !== null && !(opener[2]![0] === '`' && opener[3]!.includes('`'))) {
        fence = { char: opener[2]![0]!, length: opener[2]!.length };
        out.push('');
        paragraphActive = false;
        continue;
      }
      // A raw HTML block is not executed either, and blanking it here is what
      // covers the INDEX as well as a contract section: a pointer written
      // inside `<? … ?>` renders as nothing and must not count.
      htmlBlock = htmlBlockEnd(raw, paragraphActive);
      if (htmlBlock !== null) {
        // A types-1-5 opener may also close on its own line.
        if (htmlBlockEnd.CLOSES_ON_OPEN.test(raw) && htmlBlock.test(raw)) htmlBlock = null;
        out.push('');
        paragraphActive = false;
        continue;
      }
    }

    let line = '';
    let i = 0;
    let carriedSpan = span > 0;
    while (i < raw.length) {
      if (inComment) {
        if (raw.startsWith('-->', i)) {
          inComment = false;
          line += COMMENT_MASK.repeat(3);
          i += 3;
          // A comment that OPENED a line is an HTML block, and the block runs to
          // the end of the closing line — text after `-->` is block content, not
          // Markdown. Masking only the comment let `<!-- -->Other` become a
          // setext heading's text and truncate the section.
          if (blockComment) {
            line += COMMENT_MASK.repeat(raw.length - i);
            i = raw.length;
          }
          continue;
        }
        line += COMMENT_MASK;
        i += 1;
        continue;
      }
      if (carriedSpan) {
        // Interior of a span that OPENED on an earlier line: this text is code
        // to a renderer, so it is masked rather than written through. Only a
        // same-line span's content survives, because that is where the grammar
        // reads its slugs and paths from.
        if (raw[i] === '`') {
          let run = 0;
          while (raw[i + run] === '`') run += 1;
          if (run === span) {
            span = 0;
            carriedSpan = false;
          }
          line += COMMENT_MASK.repeat(run);
          i += run;
          continue;
        }
        line += COMMENT_MASK;
        i += 1;
        continue;
      }
      if (raw[i] === '`') {
        let run = 0;
        while (raw[i + run] === '`') run += 1;
        if (span === 0) {
          // A delimiter run opens a span only when a matching run closes it
          // before the paragraph ends. CommonMark renders an unmatched run
          // literally, and letting one stay open across BLOCKS was a fail-open:
          // a following fence became span content, so a path quoted inside an
          // example counted as declared. Measured first — SIX artifacts in this
          // repository carry an unmatched run and must keep parsing. (The first
          // count said four; it scanned six directories and left out `_docs/`.
          // Corrected after round 10 refuted it.)
          //
          // The closer may be on a LATER line of the same paragraph: a real
          // multiline span is legal, and treating its contents as live text let
          // a `- none —` line inside one be read as a declaration.
          if (closesBeforeParagraphEnd(lines, lineIndex, raw.slice(i + run), run)) span = run;
        } else if (run === span) {
          span = 0;
        }
        line += raw.slice(i, i + run);
        i += run;
        continue;
      }
      if (span === 0 && raw.startsWith('<!--', i)) {
        inComment = true;
        blockComment = /^ {0,3}$/.test(raw.slice(0, i));
        line += COMMENT_MASK.repeat(4);
        i += 4;
        continue;
      }
      line += raw[i];
      i += 1;
    }
    out.push(line);
    paragraphActive =
      raw.trim().length > 0 &&
      !/^ {0,3}#{1,6}(?:[ \t]|\r?$)/.test(raw) &&
      !/^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*\r?$/.test(raw);
  }

  // State left open at EOF means the document and this scanner disagree about
  // where its blocks end — and a scanner that is unsure must not be believed.
  // Only the two states that BLANK content are fatal. An unmatched backtick run
  // no longer opens a span at all, so it cannot leave one dangling — and
  // refusing on it would have rejected four real artifacts in this repository
  // that render perfectly well.
  const dangling =
    fence !== null ? 'an unclosed code fence' : inComment ? 'an unclosed HTML comment' : null;

  return { view: out.join('\n'), unreliable: dangling };
}

/**
 * Everything a rendered document does not execute.
 *
 * This scanner is a Markdown APPROXIMATION, not a CommonMark implementation —
 * the package takes zero runtime dependencies, so there is no parser to defer
 * to. Six review rounds each found another rule it approximated, and each fix
 * was correct and insufficient, which is the signal that the strategy was
 * wrong: an approximation that disagrees with a renderer must never disagree in
 * the PERMISSIVE direction.
 *
 * So the contract reads refuse when the scan ends in a state the document did
 * not close. An unmatched backtick run, an unclosed fence, or an unclosed
 * comment means "this document is not one I can read", and the gate says so
 * instead of guessing. Drift becomes a refusal rather than a hole.
 */
export function contractView(content: string): string {
  return executableView(content).view;
}

/** Why the document cannot be read reliably, or null when it can. */
export function contractViewProblem(content: string): string | null {
  const { unreliable } = executableView(content);
  return unreliable === null
    ? null
    : `the document ends with ${unreliable}, so its contract sections cannot be read reliably`;
}

/**
 * The `## <heading>` occurrences and the body of the single one, read with ONE
 * predicate.
 *
 * Counting with `[ \t]` while slicing with the section slicer's `\s` was a live
 * fail-open: `\s` matches a non-breaking space, so a `## Memory Outputs`
 * forgery placed above the real section was not counted (one heading, no
 * ambiguity) and was then SELECTED as the body. Two regexes over one document
 * is the same class of defect as two parsers over one input.
 *
 * The separator is `[ \t]`, never `\s`, because `\s` also matches a newline —
 * `##` on one line with the text on the next is not a heading.
 */
export function contractSection(content: string, heading: string): { count: number; body: string } {
  // Up to three leading spaces and an optional closing run of hashes are both
  // ordinary ATX — `   ## Memory Outputs ##` renders as the required heading,
  // and reporting it missing refused a document a maintainer can see is correct.
  const pattern = new RegExp(`^ {0,3}##[ \\t]+${heading}(?:[ \\t]+#*)?[ \\t]*$`, 'gim');
  const matches = [...content.matchAll(pattern)];
  if (matches.length !== 1) return { count: matches.length, body: '' };
  const match = matches[0]!;
  const rest = content.slice(match.index! + match[0].length);
  // A section ends at the next heading of rank 1 or 2 — `# Other` closes an H2
  // section just as `## Other` does. Setext headings cannot occur inside a
  // contract section any more: the ambiguous underline is refused outright, so
  // there is nothing left here to guess about.
  const atx = rest.search(/^ {0,3}#{1,2}(?:[ \t]|\r?$)/m);
  return { count: 1, body: atx === -1 ? rest : rest.slice(0, atx) };
}

/**
 * The block construct that makes a section unreadable as a plain bullet list, or
 * null when there is none.
 *
 * Chasing CommonMark one construct per review round did not converge, so the
 * section declares its own shape instead: bullets, prose, blank lines. A fence,
 * an indented code block, or a raw HTML block inside one is refused, because a
 * renderer shows those as code or markup while a line-based parser sees
 * bullets. Measured across 52 real contract sections in this repository: none
 * contains any of them.
 */
function unsupportedContainer(body: string): string | null {
  let previousBlank = true;
  let paragraphActive = false;
  let inBullet = false;
  for (const line of body.split('\n')) {
    // The SAME opener predicate the scanner uses: a backtick fence's info
    // string cannot contain backticks, so ` ```markdown``` ` wrapped into a
    // rationale is an inline code span and refusing it blocked an ordinary
    // sentence.
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence !== null && !(fence[1]![0] === '`' && fence[2]!.includes('`'))) {
      return 'a code fence';
    }
    // An HTML block STARTS a block, so only a line after a blank one can open
    // it — a `<https://…>` autolink on a rationale's wrapped second line is
    // paragraph continuation. An autolink is excluded by shape as well, and an
    // HTML COMMENT is excluded because the shipped template uses one to show
    // the alternative form and a block comment owns its closing line.
    // Position-independent: several HTML block kinds interrupt a paragraph, so
    // requiring a preceding blank let `<div>` under a prose line hide a bullet.
    // Autolinks are excluded by shape — both the URI form and the email form,
    // which a maintainer may reasonably write in a rationale.
    if (!/^ {0,3}<!--/.test(line) && htmlBlockEnd(line, paragraphActive) !== null) {
      return 'a raw HTML block';
    }
    // Four spaces after a blank line opens an indented code block — but NOT
    // inside a list item, where that indentation is the item's own second
    // paragraph. Refusing it rejected an ordinary wrapped rationale.
    if (previousBlank && !inBullet && /^ {4,}\S/.test(line)) return 'an indented code block';
    // A line of only dashes or equals after a NON-blank line is a setext
    // underline: it turns the line above into a heading and everything below
    // into a different section. After a blank line the same run is a thematic
    // break, which is what every real PRD writes before its next heading.
    // Refusing the ambiguous case is what retires setext handling here
    // altogether — the reader no longer has to decide which one it is.
    if (!previousBlank && /^ {0,3}(?:-+|=+)[ \t]*$/.test(line)) {
      return 'a setext underline (a line of dashes or equals directly under text)';
    }
    if (/^-[ \t]+\S/.test(line)) inBullet = true;
    else if (line.trim().length > 0 && !/^ +\S/.test(line)) inBullet = false;
    previousBlank = line.trim().length === 0;
    paragraphActive =
      line.trim().length > 0 &&
      !/^ {0,3}#{1,6}(?:[ \t]|\r?$)/.test(line) &&
      !/^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*\r?$/.test(line);
  }
  return null;
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
    // COLUMN ZERO only — and deliberately narrower than CommonMark, which starts
    // a top-level list at up to three spaces. Accepting those would re-admit the
    // nested-list case: `-` then `  - none` is a NESTED item to a renderer and a
    // declaration to a line-based reader, and telling them apart needs the list
    // context this reader does not keep. Column zero is a rule an author can
    // see, and every declaration in this repository already sits there. Accepting a bullet at any indentation meant one inside
    // indented code, inside a raw HTML block, or NESTED under another list item
    // was read as a declaration — so both contract sections could be satisfied
    // entirely by text a renderer never shows as a top-level list. Telling a
    // nested item from a top-level one needs list-context tracking, which is
    // the CommonMark chase that did not converge; column zero is a rule an
    // author can see, and all 64 bullets in the sections this parser actually
    // reads already sit there. (An earlier note said 312 — that figure counted
    // Conflict Surface too, which this parser never reads. Corrected after
    // round 12 refuted it.)
    if (/^-[ \t]+\S/.test(line)) {
      blocks.push(line.trim().replace(/^-[ \t]+/, ''));
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
/** Rationale length with masked comment characters removed. `- none — <!-- x -->`
 * renders with NO rationale, but the mask has nonzero length, so a hidden
 * comment satisfied the check that exists to reject an unreasoned `none`. */
function visibleLength(rationale: string | null): number {
  if (rationale === null) return 0;
  // One stateful pass, because three regexes in sequence each lost the
  // context the next one needed: a tag's quoted attribute could contain `>`,
  // a code span's delimiters are not content, and an entity is a character
  // rather than a space unless it IS whitespace.
  let visible = '';
  let i = 0;
  const text = rationale.split(COMMENT_MASK).join('');
  while (i < text.length) {
    const char = text[i]!;
    if (char === '`') {
      let run = 0;
      while (text[i + run] === '`') run += 1;
      const closer = text.indexOf('`'.repeat(run), i + run);
      if (closer === -1) {
        // Unmatched: the delimiters are literal text.
        visible += text.slice(i, i + run);
        i += run;
        continue;
      }
      // Code renders its contents literally, delimiters excluded.
      visible += text.slice(i + run, closer);
      i = closer + run;
      continue;
    }
    if (char === '<') {
      const autolink = /^<([a-zA-Z][a-zA-Z0-9+.-]*:[^ <>]*|[^ <>@]+@[^ <>@]+)>/.exec(text.slice(i));
      if (autolink !== null) {
        // An autolink DISPLAYS its target.
        visible += autolink[1]!;
        i += autolink[0].length;
        continue;
      }
      const end = tagEnd(text, i);
      if (end !== -1) {
        i = end;
        continue;
      }
      visible += char;
      i += 1;
      continue;
    }
    if (char === '&') {
      const entity = /^&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/.exec(text.slice(i));
      if (entity !== null) {
        visible += decodeEntity(entity[1]!);
        i += entity[0].length;
        continue;
      }
    }
    visible += char;
    i += 1;
  }
  return visible.trim().length;
}

/** Index just past the tag starting at `from`, scanning to an UNQUOTED `>`, or
 * -1 when there is none. A quoted attribute may contain `>`. */
function tagEnd(text: string, from: number): number {
  let i = from + 1;
  let quote: string | null = null;
  while (i < text.length) {
    const char = text[i]!;
    if (quote !== null) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i + 1;
    }
    i += 1;
  }
  return -1;
}

/** The character an entity displays. Whitespace entities render as space, so
 * they add nothing visible; every other entity contributes a character. */
function decodeEntity(body: string): string {
  const code = body.startsWith('#x') || body.startsWith('#X')
    ? Number.parseInt(body.slice(2), 16)
    : body.startsWith('#')
      ? Number.parseInt(body.slice(1), 10)
      : NaN;
  if (Number.isFinite(code)) {
    const char = String.fromCodePoint(code);
    return /\s|\u00a0/.test(char) ? ' ' : char;
  }
  return /^(?:nbsp|ensp|emsp|thinsp)$/.test(body) ? ' ' : 'x';
}

function splitRationale(block: string): { head: string; rationale: string | null } {
  const idx = block.indexOf('—');
  if (idx === -1) return { head: block.trim(), rationale: null };
  return { head: block.slice(0, idx).trim(), rationale: block.slice(idx + 1).trim() };
}

interface ParsedBlock {
  /** The whole head, lower-cased — everything before the rationale. */
  head: string;
  /** Lower-cased token before the colon; the whole head when there is none. */
  kind: string;
  /** Backticked value, when present. */
  value: string | null;
  rationale: string | null;
  raw: string;
}

function parseBlock(block: string): ParsedBlock {
  const { head, rationale } = splitRationale(block);
  const flat = head.toLowerCase();
  const colon = head.indexOf(':');
  if (colon === -1) return { head: flat, kind: flat, value: null, rationale, raw: block };
  const kind = head.slice(0, colon).trim().toLowerCase();
  const quoted = /`([^`]*)`/.exec(head.slice(colon + 1));
  return {
    head: flat,
    kind,
    value: quoted === null ? null : quoted[1]!.trim(),
    rationale,
    raw: block,
  };
}

function parseSection<T>(
  content: string,
  rawContent: string,
  heading: string,
  kinds: readonly string[],
  build: (kind: string, value: string, rationale: string) => T,
  valueProblem: (value: string) => string | null,
  valueNoun: string,
): { section: MemorySection<T>; issues: string[] } {
  const issues: string[] = [];
  const { count, body } = contractSection(content, heading);
  const present = count > 0;
  const section: MemorySection<T> = { present, entries: [], none: false };
  if (!present) return { section, issues };
  if (count > 1) {
    issues.push(`${heading}: declared ${count} times — exactly one section is parseable`);
    return { section, issues };
  }
  // A contract section is a plain bullet list. A fence at ANY indentation is a
  // construct this scanner cannot classify against CommonMark — a fence nested
  // in a list item is code to a renderer and was bullets to `bulletBlocks`, so
  // declarations could be forged inside one. Refusing is cheap: measured across
  // 52 real contract sections in this repository, none contains a fence.
  // The container check reads the RAW section, because the scanner has already
  // blanked what it recognized — and "the section is empty" is a true but
  // useless message when the cause is an HTML block the author can see.
  const raw = contractSection(rawContent, heading);
  const container = raw.count === 1 ? unsupportedContainer(raw.body) : null;
  if (container !== null) {
    issues.push(
      `${heading}: contains ${container} — a contract section is a plain bullet list, and a ` +
        `declaration inside another block cannot be told from a real one`,
    );
    return { section, issues };
  }

  for (const block of bulletBlocks(body)) {
    const parsed = parseBlock(block);

    if (parsed.kind === 'none') {
      // Exactly `none`, with nothing before the rationale. `none: <anything>`
      // reduced to kind `none` and the remainder was ignored — quoted or not —
      // so a malformed entry parsed as a deliberate empty set.
      if (parsed.head !== 'none') {
        issues.push(`${heading}: \`none\` takes no value — write \`- none — <reason>\``);
        continue;
      }
      if (section.none) {
        issues.push(`${heading}: \`none\` appears more than once — it asserts one empty set`);
        continue;
      }
      // A rationale is required in every form, including `none`. An unreasoned
      // `none` is the ceremonial answer the contract exists to prevent.
      if (visibleLength(parsed.rationale) === 0) {
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
    if (visibleLength(parsed.rationale) === 0) {
      issues.push(`${heading}: '${parsed.value}' requires a rationale after ' — '`);
      continue;
    }
    section.entries.push(build(parsed.kind, parsed.value, parsed.rationale ?? ''));
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
  // Every contract read happens on the executable view of the document, so a
  // quoted example or a commented-out block can never stand in for the real
  // section — and an unreadable document is refused rather than guessed at.
  const unreadable = contractViewProblem(rawContent);
  if (unreadable !== null) {
    return {
      inputs: { present: false, entries: [], none: false },
      outputs: { present: false, entries: [], none: false },
      issues: [unreadable],
    };
  }
  const content = contractView(rawContent);
  const inputs = parseSection<MemoryInput>(
    content,
    rawContent,
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
    rawContent,
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
    // Landing a file in the store directory is not capturing a record. Without
    // this, a branch could add `<root>/learnings/new.md` holding arbitrary
    // text, leave it out of the INDEX, and pass: placement succeeds, the file
    // exists, and `loadMemoryStore` never sees an unindexed file. Whether a
    // Phase 7 validator command happens to be wired is configuration, and a
    // gate may not depend on the adopter having wired one.
    // The path is derived from the INDEX's directory, not from the root:
    // `loadMemoryStore` resolves pointers relative to the index, and validated
    // configuration allows an index nested below the root. Reconstructing
    // `<root>/<pointer>` therefore mapped a record loaded from
    // `_brain/catalog/learnings/x.md` onto `_brain/learnings/x.md`, and an
    // arbitrary file at that outer path would have satisfied capture. It also
    // mis-joined every non-canonical root spelling.
    const indexed = new Map(
      store.records.map((record) => [indexedPath(options.memory!, record.pointer), record]),
    );
    for (const output of decl.outputs.entries) {
      const record = indexed.get(output.path);
      if (record === undefined) {
        issues.push(
          `${OUTPUTS_HEADING}: '${output.path}' is not an indexed, valid record — a file in ` +
            `the store is not a capture until the index points at it and it parses`,
        );
        continue;
      }
      const isAdr = record.pointer.startsWith('adr/');
      if ((output.type === 'adr') !== isAdr) {
        issues.push(
          `${OUTPUTS_HEADING}: '${output.path}' is declared '${output.type}' but the store ` +
            `holds it as ${isAdr ? 'an ADR' : 'a learning'}`,
        );
      }
    }
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
  if (contractViewProblem(rawContent) !== null) return false;
  const { count, body: section } = contractSection(contractView(rawContent), 'Changelog');
  if (count !== 1) return false;
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
  // Two exact forms, and nothing inferred from prose. A substring test failed
  // OPEN (`x.md` is inside `x.md.bak`); splitting prose on punctuation to fix
  // that failed open a second way, because a comma is legal in a filename and
  // `x.md,backup.md` split into a token equal to the path. Both attempts were
  // trying to read intent out of a sentence. The item either IS the path, or it
  // quotes the path — an author saying which file they waived can do either.
  return items.some((item) => {
    if (typeof item !== 'string') return false;
    if (item.trim() === path) return true;
    return [...item.matchAll(/`([^`]+)`/g)].some((match) => match[1]!.trim() === path);
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
  // Separators are normalized before any filesystem call: config validation
  // treats `_brain\\catalog\\INDEX.md` and `_brain/catalog/INDEX.md` as the same
  // path, and passing the raw value to `resolve` made the loader disagree with
  // the validator that accepted it.
  const indexRel = repoRelative(memory.index);
  const indexPath = resolve(root, indexRel);
  let indexIsFile: boolean;
  try {
    // `statSync`, following links: `config/load.ts` deliberately resolves safe
    // in-repository symlink chains, so rejecting the final link here made a
    // configuration that config load and `verify:brain` both accept impossible
    // to pass at readiness.
    indexIsFile = statSync(indexPath).isFile();
  } catch {
    indexIsFile = false;
  }
  if (!indexIsFile) {
    store.issues.push(
      existsSync(indexPath)
        ? `memory index '${memory.index}' is not a regular file`
        : `memory index '${memory.index}' does not exist`,
    );
    return store;
  }
  // Pointers are relative to the index's own directory, which is how the
  // shipped index writes them (`learnings/x.md` beside `INDEX.md`).
  const base = dirname(indexPath);
  const rawIndex = readFileSync(indexPath, 'utf8');
  // The INDEX is Markdown, so it can be unreadable for the same reasons a PRD
  // can — and discarding that verdict was a fail-open: an unclosed comment at
  // the top erased every pointer, so every watched record vanished and the gates
  // accepted `none`, while the standalone validator still saw all of them.
  const indexProblem = contractViewProblem(rawIndex);
  if (indexProblem !== null) {
    store.issues.push(`memory index '${memory.index}': ${indexProblem}`);
    return store;
  }
  const indexText = contractView(rawIndex);
  const seen = new Set<string>();
  for (const match of indexText.matchAll(POINTER)) {
    const pointer = match[1]!;
    if (seen.has(pointer)) {
      store.issues.push(`memory index: duplicate pointer to ${pointer}`);
      continue;
    }
    seen.add(pointer);
    const file = join(base, pointer);
    // `existsSync` is true for a directory, and `readRecord` then throws EISDIR
    // out of a gate whose contract is to REPORT problems. A pointer that does
    // not resolve to a regular file is a store issue like any other.
    let isFile: boolean;
    try {
      isFile = lstatSync(file).isFile();
    } catch {
      isFile = false;
    }
    if (!isFile) {
      store.issues.push(
        existsSync(file)
          ? `memory index: ${pointer} is not a regular file`
          : `memory index: dangling pointer to ${pointer}`,
      );
      continue;
    }
    const slug = pointer.replace(/^(?:learnings|adr)\//, '').replace(/\.md$/, '');
    const { record } = readRecord(file, slug, { isAdr: pointer.startsWith('adr/') });
    if (record === null) store.unreadable.push(slug);
    else store.records.push({ slug, pointer, record });
  }

  // A record FILE with no executable pointer is an orphan, and reporting it is
  // what keeps this loader's stricter pointer rule from being a fail-open. The
  // standalone validator does not share the rule — it counts a pointer inside a
  // fenced example — so a record could vanish from readiness and close while
  // `verify:brain` still passed, and its watch would stop firing silently. The
  // two parsers still disagree about what a pointer IS; they no longer disagree
  // about whether the store is complete.
  for (const dir of ['learnings', 'adr']) {
    let entries: string[];
    try {
      entries = readdirSync(join(base, dir));
    } catch {
      continue;
    }
    for (const name of entries) {
      if (!name.endsWith('.md')) continue;
      if (seen.has(`${dir}/${name}`)) continue;
      store.issues.push(
        `memory store: ${dir}/${name} has no pointer in '${memory.index}' — an unindexed ` +
          `record is invisible to the contract, and its watch never fires`,
      );
    }
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
  const issues: string[] = [];
  for (const output of outputs) {
    const expected = recordDir(memory, output.type === 'adr' ? 'adr' : 'learnings');
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

/** `_brain`, `_brain/`, `./_brain`, and `_brain\\x` all name one repo-relative
 * path. Every comparison in this module goes through here, so a configured
 * spelling can never make two checks disagree about the same file. */
function repoRelative(value: string): string {
  return value
    .split(/[/\\]/)
    .filter((part) => part.length > 0 && part !== '.')
    .join('/');
}

/**
 * The directory a record of each kind lives in, derived from the INDEX rather
 * than from `memory.root`.
 *
 * The loader resolves pointers relative to the index, and configuration permits
 * an index nested below the root. Deriving the placement rule from the root
 * while deriving the lookup from the index made a VALID nested configuration
 * impossible to close: placement demanded `_brain/learnings/`, the map held
 * `_brain/catalog/learnings/`, and nothing could satisfy both. One base, both
 * answers.
 */
function recordDir(memory: MemoryConfig, kind: 'learnings' | 'adr'): string {
  const base = repoRelative(dirname(memory.index));
  return base.length > 0 ? `${base}/${kind}/` : `${kind}/`;
}

/** The repo-relative path the loader read a pointer from. */
function indexedPath(memory: MemoryConfig, pointer: string): string {
  const base = repoRelative(dirname(memory.index));
  return repoRelative(base.length > 0 ? `${base}/${pointer}` : pointer);
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
