// Shared helpers for the verify:* check library.
// One module for every parser that two checks read (shared-module rule: two gates
// reading the same format must import one parser so they cannot drift).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/** Repo root: optional first positional arg (used by self-tests), else cwd. */
export function targetRoot() {
  const arg = process.argv.slice(2).find((a) => !a.startsWith('-'));
  return arg ?? process.cwd();
}

/** Minimal frontmatter parser: `--- ... ---` fence, scalar keys + `key: [a, b]` lists. */
export function parseFrontmatter(content) {
  const m = /^---\n([\s\S]*?)\n---/.exec(content);
  if (!m) return null;
  const out = {};
  for (const line of m[1].split('\n')) {
    const kv = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!kv) continue; // continuation line of a folded scalar (>-)
    const [, key, raw] = kv;
    const list = /^\[(.*)\]$/.exec(raw.trim());
    out[key] = list
      ? list[1]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : raw.replace(/\s+#.*$/, '').trim();
  }
  return out;
}

/** Parse `> **Key:** value` blockquote metadata (review artifacts). */
export function parseBlockquoteMeta(content) {
  const out = {};
  for (const m of content.matchAll(/^> \*\*([^:*]+):\*\*\s*(.*)$/gm)) {
    if (!(m[1] in out)) out[m[1]] = m[2].trim();
  }
  return out;
}

/** Slice a markdown section: from `## <heading>` to the next `## `. */
export function section(content, headingPattern) {
  const re = new RegExp(`^##\\s+.*${headingPattern}.*$`, 'im');
  const start = content.search(re);
  if (start === -1) return null;
  const rest = content.slice(start).split('\n').slice(1);
  const end = rest.findIndex((l) => /^##\s+/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n');
}

/** Markdown files in a dir (non-recursive); empty list if the dir is absent. */
export function mdFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(dir, f));
}

export const read = (p) => readFileSync(p, 'utf8');

/** Uniform reporter: collect failures + soft notes, exit non-zero on any failure. */
export function makeReporter(name) {
  const failures = [];
  const notes = [];
  return {
    fail: (msg) => failures.push(msg),
    note: (msg) => notes.push(msg),
    done: () => {
      for (const n of notes) console.log(`${name}: note — ${n}`);
      if (failures.length) {
        for (const f of failures) console.error(`${name}: FAIL — ${f}`);
        console.error(`${name}: ${failures.length} failure(s)`);
        process.exit(1);
      }
      console.log(`${name}: PASS`);
      process.exit(0);
    },
  };
}
