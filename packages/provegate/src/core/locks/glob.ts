// Zero-dependency glob to anchored RegExp. `**` crosses `/` and collapses the
// slash that follows it (nested `**` segments behave); `*` stays within one
// path segment; `?` is one non-slash char. The full regex-metacharacter class
// is escaped. Ported byte-semantics — no glob library resolves at root.
export function globToRegExp(glob: string): RegExp {
  let out = '^';
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]!;
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i += 1;
        if (glob[i + 1] === '/') i += 1;
        out += '.*';
      } else {
        out += '[^/]*';
      }
    } else if (ch === '?') {
      out += '[^/]';
    } else if ('.+()[]{}$^|\\'.includes(ch)) {
      out += `\\${ch}`;
    } else {
      out += ch;
    }
  }
  return new RegExp(`${out}$`);
}

// ---------------------------------------------------------------------------
// Glob-pattern intersection (structural-overlap engine, PRD-009).
//
// `globsMayIntersect(a, b)` decides whether ANY concrete path matches both
// globs, over the exact grammar `globToRegExp` compiles: `/`-separated
// segments, `*` (zero+ non-slash chars within a segment), `?` (one non-slash
// char), `**` (zero+ of any char, crossing `/`, swallowing a following `/` —
// the same collapse `globToRegExp` performs), and escaped literals.
//
// It walks the PATTERNS (never the compiled regexes — the regex form erases
// segment structure). Two-pointer DP over token positions, memoized on the
// `(i, j)` pair, so it is bounded: patterns are config-scale (tens of globs),
// not user-input-scale. Over this grammar the decision is EXACT — no false
// negatives (the property this PRD requires) and, as a bonus, no false
// positives. The one conservative bias, honoring the "uncertain =
// may-intersect" rule: an unrecognized token (which `globToRegExp` never
// emits) returns `true` rather than risk a missed collision.
// ---------------------------------------------------------------------------

type GlobToken =
  | { kind: 'lit'; ch: string } // exactly this char
  | { kind: 'one' } // `?` — one non-slash char
  | { kind: 'star' } // `*` — zero+ non-slash chars
  | { kind: 'globstar' }; // `**` — zero+ of any char (crosses `/`)

/** Tokenize a glob with the same semantics `globToRegExp` compiles, including
 * `**` swallowing an immediately following `/`. */
function tokenizeGlob(glob: string): GlobToken[] {
  const tokens: GlobToken[] = [];
  for (let i = 0; i < glob.length; i += 1) {
    const ch = glob[i]!;
    if (ch === '*') {
      if (glob[i + 1] === '*') {
        i += 1;
        if (glob[i + 1] === '/') i += 1;
        tokens.push({ kind: 'globstar' });
      } else {
        tokens.push({ kind: 'star' });
      }
    } else if (ch === '?') {
      tokens.push({ kind: 'one' });
    } else {
      tokens.push({ kind: 'lit', ch });
    }
  }
  return tokens;
}

/** True when this token can match the empty string (advance without emitting). */
function nullable(token: GlobToken): boolean {
  return token.kind === 'star' || token.kind === 'globstar';
}

/** True when this token consumes exactly one char per emission (advances on
 * emit); `star`/`globstar` stay put and may emit again. */
function consumesOne(token: GlobToken): boolean {
  return token.kind === 'lit' || token.kind === 'one';
}

/** True when tokens `a` and `b` can each emit some common next character.
 * Char classes: lit={ch}; one/star=any non-`/`; globstar=any char. */
function shareChar(a: GlobToken, b: GlobToken): boolean {
  const aSlashOnly = a.kind === 'lit' && a.ch === '/';
  const bSlashOnly = b.kind === 'lit' && b.ch === '/';
  // A literal `/` is matchable only by another `/` or a globstar.
  if (aSlashOnly) return b.kind === 'globstar' || bSlashOnly;
  if (bSlashOnly) return a.kind === 'globstar' || aSlashOnly;
  if (a.kind === 'lit' && b.kind === 'lit') return a.ch === b.ch;
  // Neither is a slash literal now; every remaining class contains some shared
  // non-slash char (lit's own char, or the open non-slash classes).
  return true;
}

export function globsMayIntersect(aGlob: string, bGlob: string): boolean {
  const a = tokenizeGlob(aGlob);
  const b = tokenizeGlob(bGlob);
  const seen = new Set<number>();
  const stride = b.length + 1;

  const walk = (i: number, j: number): boolean => {
    if (i === a.length && j === b.length) return true;
    const key = i * stride + j;
    if (seen.has(key)) return false;
    seen.add(key);

    // Skip a nullable front token (emit nothing, advance past it).
    if (i < a.length && nullable(a[i]!) && walk(i + 1, j)) return true;
    if (j < b.length && nullable(b[j]!) && walk(i, j + 1)) return true;

    // Emit one common char, advancing whichever side consumes a char. At least
    // one pointer must advance, so a stall (both star/globstar) is left to the
    // skip transitions above.
    if (i < a.length && j < b.length) {
      const ta = a[i]!;
      const tb = b[j]!;
      const nextI = consumesOne(ta) ? i + 1 : i;
      const nextJ = consumesOne(tb) ? j + 1 : j;
      if ((nextI !== i || nextJ !== j) && shareChar(ta, tb) && walk(nextI, nextJ)) return true;
    }
    return false;
  };

  return walk(0, 0);
}
