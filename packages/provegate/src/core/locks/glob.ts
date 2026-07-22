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
