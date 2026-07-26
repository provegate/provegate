/**
 * The document scanner: ONE pass that decides what every line IS.
 *
 * It lives in its own module because two readers need it — the contract grammar
 * in `artifacts.ts` and the record validator in `parse.ts`, which must agree
 * about what a renderer displays. Importing it from `artifacts.ts` would have
 * closed a cycle (`artifacts` already reads `parse`), and a second scanner
 * written to avoid that cycle is the `two-parsers-wrong-together` defect the
 * single-authority design exists to prevent.
 */
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
export const COMMENT_MASK = '␀';

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

export function htmlBlockEnd(line: string, paragraphActive: boolean): RegExp | null {
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
export type LineKind =
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

export interface ScannedLine {
  kind: LineKind;
  /** Comment-masked content for `text`; the raw line otherwise. */
  text: string;
}

export interface Scan {
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

export function scanDocument(content: string): Scan {
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
export function executableView(content: string): { view: string; unreliable: string | null } {
  const scan = scanDocument(content);
  return { view: viewOf(scan.lines), unreliable: scan.unreliable };
}

/** The executable text: everything the renderer does not execute is blanked, so
 * a line's content survives only when the scan called it `text`. */
export function viewOf(lines: readonly ScannedLine[]): string {
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
export function sectionBounds(
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
