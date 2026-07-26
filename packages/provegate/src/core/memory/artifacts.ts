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

/**
 * CommonMark's three line endings, reduced to one.
 *
 * The scanner split on `\n` while every heading and container regex ran under
 * `/m`, which also breaks on a bare `\r`. A document using bare CR therefore had
 * a fence the scanner never saw and a heading the matcher did — so a whole
 * contract could be read out of fenced code. Normalizing once is what keeps the
 * two halves on the same line model; nothing downstream may re-split raw text.
 */
function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n|\r/g, '\n');
}


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
    // So does a fence, and so does an HTML block of types 1-6. Both were
    // missing, and the omission ran the wrong way: a lone backtick in prose
    // above them found its "closer" on the fence line, which made the scanner
    // treat the fence OPENER as span content and never open the fence. The
    // whole contract could then be forged inside rendered code —
    // `` Prose `open `` / `` ~~~ ` `` / `## Memory Outputs` / `- none — …`.
    // The fence test is the scanner's OWN predicate, backtick-info exclusion and
    // all: a looser one here would stop the lookahead at ` ```` ` ` — which is
    // not a fence, because a backtick fence's info string may not contain a
    // backtick — and refuse a span the renderer closes.
    const fence = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence !== null && !(fence[1]![0] === '`' && fence[2]!.includes('`'))) return false;
    if (htmlBlockEnd(line, true) !== null) return false;
    // And at an HTML COMMENT, which is block type 2 and lives in the scanner's
    // own comment state rather than in `htmlBlockEnd` — the omission was the
    // round 18 exploit with `<!--` substituted for `<div>`.
    if (/^ {0,3}<!--/.test(line)) return false;
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
// The separators are `[ \t]`, never `\s`: CommonMark allows only spaces and
// tabs inside a tag on one line, so a tag holding a vertical tab is literal TEXT to a
// renderer and was refused here as a raw HTML block — a refusal naming a
// construct the page does not contain.
const TYPE_7 =
  /^ {0,3}(?:<[a-zA-Z][a-zA-Z0-9-]*(?:[ \t]+[a-zA-Z_:][a-zA-Z0-9_.:-]*(?:[ \t]*=[ \t]*(?:"[^"]*"|'[^']*'|[^ \t"'=<>`]+))?)*[ \t]*\/?>|<\/[a-zA-Z][a-zA-Z0-9-]*[ \t]*>)[ \t]*\r?$/;

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

/**
 * What the scanner decided a line IS.
 *
 * Rounds 18 and 19 both landed here rather than in the narrowed grammar, and for
 * one reason: the scanner derived block state from the document and the
 * container check derived it AGAIN from the raw text, so the two could disagree.
 * A commented-out `## Other` ended the raw section early and the whole
 * inline-HTML defense was bypassed; a `>` written inside a comment was refused
 * as a block quote that is not on the page. That is `two-parsers-wrong-together`
 * with both parsers in one file.
 *
 * So the scan is the single authority now. It classifies every line once, and
 * everything downstream — the section slicer, the container check, the setext
 * diagnostic — reads that classification instead of re-deriving it.
 */
type LineKind =
  /** Executable Markdown. `text` carries the comment-masked content. */
  | 'text'
  /** A fence's opening or closing line. */
  | 'fence'
  /** Inside a fenced code block. */
  | 'in-fence'
  /** A raw HTML block's opening line. */
  | 'html'
  /** Inside a raw HTML block. */
  | 'in-html'
  /** An indented code block's line. */
  | 'indented-code';

interface ScannedLine {
  kind: LineKind;
  /** Comment-masked content for `text`; the raw line otherwise. */
  text: string;
}

interface Scan {
  lines: ScannedLine[];
  unreliable: string | null;
}

/** Does the comment opened at `from` close before its paragraph ends?
 *
 * An INLINE `<!--` — one with text before it on the line — is raw inline HTML,
 * and inline HTML must be complete. `Prose <!-- open` followed by a heading
 * renders the opener literally and shows the heading, because an ATX heading
 * interrupts a paragraph; the scanner instead stayed in comment state across the
 * heading and lost a declaration the page displays. A comment that OPENS a line
 * is an HTML block and is exempt: that one really does run to its closer. */
function commentClosesBeforeParagraphEnd(
  lines: readonly string[],
  from: number,
  restOfLine: string,
): boolean {
  if (restOfLine.includes('-->')) return true;
  for (let i = from + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.trim().length === 0) return false;
    if (/^ {0,3}#{1,6}(?:[ \t]|$)/.test(line)) return false;
    if (/^ {0,3}[-+*][ \t]+\S/.test(line)) return false;
    if (/^ {0,3}(?:`{3,}|~{3,})/.test(line)) return false;
    if (line.includes('-->')) return true;
  }
  return false;
}

/** A list marker opens an item whose indented lines are item content, not an
 * indented code block. Bullet and ordered forms both, because the indentation
 * rule does not care which one it is. */
const LIST_MARKER = /^ {0,3}(?:[-+*]|\d{1,9}[.)])[ \t]+\S/;

function scanDocument(content: string): Scan {
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
  /** Inside a list item, where an indented line is item content rather than an
   * indented code block. Cleared by a non-blank line at the left margin. */
  let inListItem = false;
  const out: ScannedLine[] = [];

  const lines = normalizeLineEndings(content).split('\n');
  for (const [lineIndex, raw] of lines.entries()) {
    if (fence !== null) {
      const closer = /^( {0,3})(`{3,}|~{3,})[ \t]*(.*)$/.exec(raw);
      if (
        closer !== null &&
        closer[2]![0] === fence.char &&
        closer[2]!.length >= fence.length &&
        // A closing fence may be followed only by SPACES OR TABS. `.trim()` also
        // removes a non-breaking space and every other Unicode blank, so a
        // trailing NBSP closed a fence here and left it open in the renderer —
        // recording a declaration written inside the code block.
        /^\r?$/.test(closer[3]!)
      ) {
        fence = null;
        out.push({ kind: 'fence', text: raw });
        paragraphActive = false;
        continue;
      }
      out.push({ kind: 'in-fence', text: raw });
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
      out.push({ kind: 'in-html', text: raw });
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
        out.push({ kind: 'fence', text: raw });
        paragraphActive = false;
        continue;
      }
      // An INDENTED CODE BLOCK, which the scanner did not model at all. Its
      // absence ran both ways: `paragraphActive` stayed set across one, so a
      // type-7 tag below it could not open the raw HTML block a renderer opens;
      // and a `<!--` written inside one was read as a real comment opener, which
      // masked the visible heading and declaration that followed. Indented code
      // cannot interrupt a paragraph, and inside a list item the same
      // indentation is item content — when in doubt this stays FALSE, which
      // keeps comment masking on and errs toward refusing.
      if (!paragraphActive && !inListItem && /^(?: {4,}|\t)[ \t]*\S/.test(raw)) {
        out.push({ kind: 'indented-code', text: raw });
        continue;
      }
      // A raw HTML block is not executed either, and blanking it here is what
      // covers the INDEX as well as a contract section: a pointer written
      // inside `<? … ?>` renders as nothing and must not count.
      htmlBlock = htmlBlockEnd(raw, paragraphActive);
      if (htmlBlock !== null) {
        // A types-1-5 opener may also close on its own line.
        if (htmlBlockEnd.CLOSES_ON_OPEN.test(raw) && htmlBlock.test(raw)) htmlBlock = null;
        out.push({ kind: 'html', text: raw });
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
        // `<!-->` and `<!--->` are COMPLETE comments in CommonMark. Searching
        // only for `-->` ran past them to end of file and reported the document
        // as having an unclosed comment it had in fact closed.
        const short = /^<!--->|^<!-->/.exec(raw.slice(i));
        if (short !== null) {
          line += COMMENT_MASK.repeat(short[0].length);
          i += short[0].length;
          continue;
        }
        const atLineStart = /^ {0,3}$/.test(raw.slice(0, i));
        // Inline raw HTML must be COMPLETE. An unterminated `<!--` mid-paragraph
        // is literal text to a renderer, and a heading below it interrupts the
        // paragraph — so keeping comment state open across that heading lost a
        // declaration the page shows. A comment that opens a line is an HTML
        // block and does run to its closer, blank lines and all.
        if (!atLineStart && !commentClosesBeforeParagraphEnd(lines, lineIndex, raw.slice(i + 4))) {
          line += raw[i];
          i += 1;
          continue;
        }
        inComment = true;
        blockComment = atLineStart;
        line += COMMENT_MASK.repeat(4);
        i += 4;
        continue;
      }
      line += raw[i];
      i += 1;
    }
    out.push({ kind: 'text', text: line });
    // Derived from the MASKED line, not the raw one: a completed `<!-- note -->`
    // renders as nothing and closes no paragraph, but its raw text is non-blank
    // and left the flag set — which stopped the NEXT line's type-7 tag from
    // opening a block, so the bullet that block was hiding got read.
    const visible = line.split(COMMENT_MASK).join('').trim();
    paragraphActive =
      visible.length > 0 &&
      !/^ {0,3}#{1,6}(?:[ \t]|\r?$)/.test(raw) &&
      !/^ {0,3}(?:-{3,}|\*{3,}|_{3,})[ \t]*\r?$/.test(raw);
    // A list item's indented lines are its content. The item ends at a non-blank
    // line back at the left margin that is not itself a marker.
    if (LIST_MARKER.test(raw)) inListItem = true;
    else if (visible.length > 0 && !/^[ \t]/.test(raw)) inListItem = false;
  }

  // State left open at EOF means the document and this scanner disagree about
  // where its blocks end — and a scanner that is unsure must not be believed.
  // Only the two states that BLANK content are fatal. An unmatched backtick run
  // no longer opens a span at all, so it cannot leave one dangling — and
  // refusing on it would have rejected four real artifacts in this repository
  // that render perfectly well.
  const dangling =
    fence !== null ? 'an unclosed code fence' : inComment ? 'an unclosed HTML comment' : null;

  return { lines: out, unreliable: dangling };
}

/**
 * The scanned document, or the reason it cannot be read.
 *
 * U+2028 and U+2029 no longer refuse the document. Round 18 added that refusal
 * because `/m` anchored a heading where CommonMark shows none — but the fix was
 * scoped to the whole file, so a separator inside a fenced example refused a
 * contract that renders perfectly well. The section slicer works on scanned
 * LINES now and never runs `/m` over the document at all, so the forgery has no
 * regex left to exploit and the refusal has nothing left to protect.
 */
function executableView(content: string): { view: string; unreliable: string | null } {
  const scan = scanDocument(content);
  return { view: viewOf(scan.lines), unreliable: scan.unreliable };
}

/** The executable text: everything the renderer does not execute is blanked, so
 * a line's content survives only when the scan called it `text`. */
function viewOf(lines: readonly ScannedLine[]): string {
  return lines.map((line) => (line.kind === 'text' ? line.text : '')).join('\n');
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
  if (unreliable === null) return null;
  return `the document ends with ${unreliable}, so its contract sections cannot be read reliably`;
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
  const found = sectionBounds(scanDocument(content).lines, heading);
  return { count: found.count, body: found.body.map((line) => line.text).join('\n') };
}

/**
 * The section's scanned LINES, found by walking the scan rather than by running
 * `/m` over the document.
 *
 * `/m` breaks on U+2028 and U+2029, which CommonMark treats as ordinary
 * characters, so a separator could anchor a heading that is not on the page.
 * Round 18 met that by refusing any document containing one — which then refused
 * a separator sitting harmlessly inside a fenced example. Walking lines removes
 * the regex, and with it both the forgery and the over-broad refusal.
 */
function sectionBounds(
  lines: readonly ScannedLine[],
  heading: string,
): { count: number; body: ScannedLine[] } {
  // Up to three leading spaces and an optional closing run of hashes are both
  // ordinary ATX — `   ## Memory Outputs ##` renders as the required heading,
  // and reporting it missing refused a document a maintainer can see is correct.
  const isHeading = new RegExp(`^ {0,3}##[ \\t]+${heading}(?:[ \\t]+#*)?[ \\t]*$`, 'i');
  const starts: number[] = [];
  for (const [index, line] of lines.entries()) {
    if (line.kind === 'text' && isHeading.test(line.text)) starts.push(index);
  }
  if (starts.length !== 1) return { count: starts.length, body: [] };
  const start = starts[0]! + 1;
  // A section ends at the next heading of rank 1 or 2 — `# Other` closes an H2
  // section just as `## Other` does. Setext headings cannot occur inside a
  // contract section any more: the ambiguous underline is refused outright, so
  // there is nothing left here to guess about. A heading written inside a
  // comment, a fence or an HTML block ends nothing, because the scan already
  // said that line is not executable text.
  let end = lines.length;
  for (let i = start; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (line.kind === 'text' && /^ {0,3}#{1,2}(?:[ \t]|$)/.test(line.text)) {
      end = i;
      break;
    }
  }
  return { count: 1, body: lines.slice(start, end) };
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
function unsupportedContainer(body: readonly ScannedLine[]): string | null {
  // The scan already decided what each line IS. Re-deriving that from raw text
  // is what let a `>` written inside an HTML comment be refused as a block quote
  // the page does not contain, and let a commented-out `## Other` cut the raw
  // section short so the inline-HTML check never saw the rest of it.
  for (const line of body) {
    if (line.kind === 'fence') return 'a code fence';
    if (line.kind === 'html') return 'a raw HTML block';
    if (line.kind === 'indented-code') return 'an indented code block';
  }

  let previousBlank = true;
  let inBullet = false;
  for (const line of body) {
    // Fenced, HTML-block and indented-code lines were returned on above; what is
    // left here is executable text, comment interiors already masked.
    if (line.kind !== 'text') continue;
    const text = line.text;
    // Containers this reader does not model. The narrowed grammar's whole point
    // is that a section holds bullets, their continuations, prose and blanks —
    // anything that nests content is refused rather than approximated.
    // Measured across 29 real sections: none appears.
    if (/^ {0,3}>/.test(text)) return 'a block quote';
    if (/^ {0,3}\d+[.)][ \t]/.test(text)) return 'an ordered list';
    // `+` and `*` open a list a renderer shows and `bulletBlocks` does not read,
    // so the section would silently declare nothing. Naming it beats reporting
    // "declares neither an entry nor a reasoned `none`" about a visible list.
    if (/^ {0,3}[+*][ \t]+\S/.test(text)) return 'a `+` or `*` bullet list';
    // A line of only dashes or equals after a NON-blank line is a setext
    // underline: it turns the line above into a heading and everything below
    // into a different section. After a blank line the same run is a thematic
    // break, which is what every real PRD writes before its next heading.
    // Refusing the ambiguous case is what retires setext handling here
    // altogether — the reader no longer has to decide which one it is.
    if (!previousBlank && /^ {0,3}(?:-+|=+)[ \t]*$/.test(text)) {
      return 'a setext underline (a line of dashes or equals directly under text)';
    }
    if (/^-[ \t]+\S/.test(text)) inBullet = true;
    else if (text.trim().length > 0 && !/^ +\S/.test(text)) inBullet = false;
    previousBlank = text.trim().length === 0;
  }
  void inBullet;

  // Raw INLINE HTML, anywhere in the section — not only in a rationale. A
  // renderer's HTML parser closes the paragraph at a mid-sentence `<div hidden>`
  // and swallows the list that follows, so the declaration below it is in the
  // source and not on the page. Whether a tag displays what follows it is the
  // DOM question the narrowed grammar exists not to answer, so the section is
  // refused instead. Scanned over the executable text as ONE string, so a code
  // span that wraps across lines is skipped as one span. Measured across this
  // repository's real contract sections: none contains inline HTML.
  if (rationaleHasRawHtml(viewOf(body))) return 'raw inline HTML';
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
/**
 * Does the rationale carry raw inline HTML outside a code span?
 *
 * An autolink is excluded — it is Markdown, and it displays its target. A TAG is
 * refused: whether its contents render is a DOM question (`<span hidden>x</span>`
 * and `<script>x</script>` display nothing), and inferring that is the guessing
 * the narrowed grammar exists to avoid.
 */
/**
 * CommonMark's inline raw HTML, all six shapes, anchored at the scan position.
 *
 * The previous test was "a `<` followed by a letter, slash, `!` or `?`, with a
 * `>` somewhere after it", which refused text a renderer displays: a tag's
 * whitespace may be spaces, tabs and newlines and nothing else, so
 * a tag holding a vertical tab is literal text on the page and was reported as HTML. A
 * refusal that names a construct the reader invented is the same defect as
 * reading a declaration that is not there, pointed the other way.
 */
/** The punctuation a backslash may escape in CommonMark. */
const ASCII_PUNCTUATION = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;

const INLINE_HTML = new RegExp(
  '^(?:' +
    // open tag
    '<[a-zA-Z][a-zA-Z0-9-]*(?:[ \\t\\n]+[a-zA-Z_:][a-zA-Z0-9_.:-]*' +
    '(?:[ \\t\\n]*=[ \\t\\n]*(?:"[^"]*"|\'[^\']*\'|[^ \\t\\n"\'=<>`]+))?)*[ \\t\\n]*/?>' +
    // closing tag
    '|</[a-zA-Z][a-zA-Z0-9-]*[ \\t\\n]*>' +
    // comment, processing instruction, declaration, CDATA
    '|<!-->|<!--->|<!--[\\s\\S]*?-->' +
    '|<\\?[\\s\\S]*?\\?>' +
    '|<![a-zA-Z][\\s\\S]*?>' +
    '|<!\\[CDATA\\[[\\s\\S]*?\\]\\]>' +
    ')',
);

function rationaleHasRawHtml(rationale: string | null): boolean {
  if (rationale === null) return false;
  const text = rationale.split(COMMENT_MASK).join('');
  let i = 0;
  while (i < text.length) {
    if (text[i] === '`') {
      let run = 0;
      while (text[i + run] === '`') run += 1;
      const closer = text.indexOf('`'.repeat(run), i + run);
      i = closer === -1 ? i + run : closer + run;
      continue;
    }
    // A backslash escapes the punctuation after it, so `\\<span>` displays the
    // literal text `<span>` and naming it raw inline HTML refused a rationale a
    // renderer shows as words.
    if (text[i] === '\\' && ASCII_PUNCTUATION.test(text[i + 1] ?? '')) {
      i += 2;
      continue;
    }
    if (text[i] === '<') {
      if (/^<([a-zA-Z][a-zA-Z0-9+.-]*:[^ <>]*|[^ <>@]+@[^ <>@]+)>/.test(text.slice(i))) {
        i += 1;
        continue;
      }
      if (INLINE_HTML.test(text.slice(i))) return true;
    }
    i += 1;
  }
  return false;
}

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
    if (char === '\\' && ASCII_PUNCTUATION.test(text[i + 1] ?? '')) {
      // The escaped character is literal, visible text; the backslash is not.
      visible += text[i + 1]!;
      i += 2;
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
      // A TAG, not merely a `<…>` span: `<3>` is visible text. Whether the tag's
      // contents are displayed is a DOM question — `<span hidden>x</span>` and
      // `<script>x</script>` show nothing — and guessing at it is exactly the
      // inference the narrowed grammar exists to avoid, so raw inline HTML is
      // refused by the caller instead.
      const end = /^<[a-zA-Z/!?]/.test(text.slice(i)) ? tagEnd(text, i) : -1;
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
  // Zero-width and formatting characters occupy no space on the page, so a
  // rationale made of them is not a rationale. `\s` matches none of them:
  // `- none — &#8203;` decoded to U+200B, survived the trim, and satisfied the
  // very check that exists to reject an unreasoned `none`. Literal ones pasted
  // straight into the source did the same.
  return visible.replace(INVISIBLE, '').trim().length;
}

/** Characters a renderer displays as nothing: the C0/C1 controls, the format
 * characters (`\p{Cf}` — soft hyphen, zero-width space, joiners, bidi marks,
 * BOM), and the two Unicode separators. */
const INVISIBLE = /[\p{Cc}\p{Cf}\u00ad\u180e\u200b-\u200f\u2028\u2029\u2060-\u2064\ufeff]/gu;


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
  const numeric = body.startsWith('#');
  if (numeric) {
    const code =
      body[1] === 'x' || body[1] === 'X'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
    // Out of range is not a character reference at all — a renderer displays
    // `&#99999999;` literally, and `fromCodePoint` would throw on it.
    if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return `&${body};`;
    // A surrogate is not a character either \u2014 a renderer substitutes U+FFFD, and
    // `fromCodePoint` accepts the code point but produces a lone surrogate.
    if (code >= 0xd800 && code <= 0xdfff) return '\ufffd';
    const char = String.fromCodePoint(code);
    // Whitespace AND the zero-width formatting characters: `&#8203;` decoded to
    // something `\s` does not match, so it counted as a visible rationale.
    return /\s|\u00a0/.test(char) || new RegExp(INVISIBLE.source, 'u').test(char) ? ' ' : char;
  }
  // A NAMED entity is INVISIBLE only when it is known to be. The set below is
  // every HTML5 name that renders as blank or zero-width; anything else is
  // visible, and it does not matter which way it is visible. `&AElig;` renders
  // `Æ` and `&bogus;` is not a reference at all, so a renderer displays it
  // literally — both put ink on the page, which is all this check asks.
  //
  // Rounds 17 through 19 each moved this rule. Counting an unknown name
  // invisible let `&Tab;` stand in for a rationale AND refused `&AElig;`;
  // refusing unknown names by name then invented a character reference out of
  // `&bogus;`, which is ordinary text. Enumerating the small invisible set and
  // treating everything else as ink is the only reading that is honest in both
  // directions, and it needs no entity table.
  return INVISIBLE_NAMED_ENTITIES.has(body) ? ' ' : 'x';
}

/** Named references that render as nothing or as blank space. These are the
 * names a forged rationale reaches for, so they are enumerated rather than left
 * to the unknown-name refusal. */
const INVISIBLE_NAMED_ENTITIES = new Set([
  'Tab',
  'NewLine',
  'ZeroWidthSpace',
  'NoBreak',
  'NonBreakingSpace',
  'nbsp',
  'shy',
  'ensp',
  'emsp',
  'emsp13',
  'emsp14',
  'numsp',
  'puncsp',
  'thinsp',
  'hairsp',
  'MediumSpace',
  'ThickSpace',
  'ThinSpace',
  'VeryThinSpace',
  'zwnj',
  'zwj',
  'lrm',
  'rlm',
  'ApplyFunction',
  'af',
  'InvisibleComma',
  'ic',
  'InvisibleTimes',
  'it',
]);


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
  scanned: readonly ScannedLine[],
  heading: string,
  kinds: readonly string[],
  build: (kind: string, value: string, rationale: string) => T,
  valueProblem: (value: string) => string | null,
  valueNoun: string,
): { section: MemorySection<T>; issues: string[] } {
  const issues: string[] = [];
  const { count, body: sectionLines } = sectionBounds(scanned, heading);
  const body = viewOf(sectionLines);
  const present = count > 0;
  const section: MemorySection<T> = { present, entries: [], none: false };
  if (!present) {
    // A setext heading renders as the H2 the contract requires, and this reader
    // matches only the ATX form. Reporting the section MISSING when the author
    // can see it on the page is a refusal that names the wrong thing — so the
    // shape is named instead. Measured: no artifact in this repository writes
    // one, and the fix costs nothing it already contains.
    // Read from the SCAN, not from the raw text: the same two lines written
    // inside a fenced example are code, and reporting them as a setext heading
    // named a heading the page does not contain.
    const title = new RegExp(`^ {0,3}${heading}[ \\t]*$`, 'i');
    const underline = /^ {0,3}(?:=+|-+)[ \t]*$/;
    const asSetext = scanned.some(
      (line, index) =>
        line.kind === 'text' &&
        title.test(line.text) &&
        scanned[index + 1]?.kind === 'text' &&
        underline.test(scanned[index + 1]!.text),
    );
    if (asSetext) {
      issues.push(
        `${heading}: written as a setext heading — write it as \`## ${heading}\`, which is ` +
          `the one form this contract reads`,
      );
    }
    return { section, issues };
  }
  if (count > 1) {
    issues.push(`${heading}: declared ${count} times — exactly one section is parseable`);
    return { section, issues };
  }
  // A contract section is a plain bullet list. A fence at ANY indentation is a
  // construct this scanner cannot classify against CommonMark — a fence nested
  // in a list item is code to a renderer and was bullets to `bulletBlocks`, so
  // declarations could be forged inside one. Refusing is cheap: measured across
  // 52 real contract sections in this repository, none contains a fence.
  // The container check reads the SAME scanned lines the body came from. It used
  // to re-slice the raw document, and the two could disagree: a `## Other`
  // written inside a comment ended the raw section early, so the check never saw
  // the rest of it and the whole inline-HTML defense was bypassed.
  const container = unsupportedContainer(sectionLines);
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
      if (rationaleHasRawHtml(parsed.rationale)) {
        issues.push(
          `${heading}: \`none\` has a rationale containing raw HTML — whether a tag displays ` +
            `its contents is not something this reader decides`,
        );
        continue;
      }
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
    if (rationaleHasRawHtml(parsed.rationale)) {
      issues.push(
        `${heading}: '${parsed.value}' has a rationale containing raw HTML — whether a tag ` +
          `displays its contents is not something this reader decides`,
      );
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
export function parseMemoryDeclarations(input: string): MemoryDeclarations {
  // ONE scan, and every read below is a question put to it. Both halves of this
  // reader used to derive block state independently — the scanner from the
  // document, the container check from the raw text — and rounds 18 and 19 both
  // found their disagreement rather than a hole in the grammar.
  const scan = scanDocument(input);
  if (scan.unreliable !== null) {
    return {
      inputs: { present: false, entries: [], none: false },
      outputs: { present: false, entries: [], none: false },
      issues: [
        `the document ends with ${scan.unreliable}, so its contract sections cannot be read reliably`,
      ],
    };
  }
  const inputs = parseSection<MemoryInput>(
    scan.lines,
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
    scan.lines,
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
