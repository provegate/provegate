import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// FR-5/FR-8 — copy discipline + no fictional CLI surface + no hardcoded hex.
// Scans the app source (server-safe, node env).

const APP = resolve(__dirname, '../app');

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = resolve(dir, name);
    if (statSync(p).isDirectory()) out.push(...sources(p));
    else if (/\.(tsx?|css)$/.test(name)) out.push(p);
  }
  return out;
}
const FILES = sources(APP);
const all = (): string => FILES.map((f) => readFileSync(f, 'utf8')).join('\n');

describe('copy discipline (do-not-say list)', () => {
  const text = all();

  it('never uses the banned badge vocabulary', () => {
    expect(text).not.toMatch(/\bPROVEN\b/);
    expect(text).not.toMatch(/\bVIOLATED\b/);
  });

  it('makes no ProveGate speedup / defect-reduction percentage claim', () => {
    // The approved METR quote ("24% speedup … 19% slower") is evidence AGAINST
    // speed claims, not one — so `speedup` in that context is fine. What is
    // banned is a marketing "% faster" / "% fewer bugs" claim for ProveGate.
    expect(text).not.toMatch(/\d+%\s*faster\b/i);
    expect(text).not.toMatch(/\d+%\s*fewer\b/i);
  });

  it('ships no fabricated version, download, or star count', () => {
    expect(text).not.toMatch(/v\d+\.\d+\.\d+/); // no hardcoded version badge
    expect(text.toLowerCase()).not.toContain('downloads/week');
    expect(text).not.toMatch(/\bstars?\b.*\d/i);
  });
});

// The CLI-surface checks (no gate.toml/ledger; the real command list) run on
// the RENDERED output in landing.test.tsx — the commands are built as
// `gate ${name}` at render, and the source comments legitimately mention the
// fictional tokens to say they are excluded.

describe('no distribution channel or flag the tool does not have', () => {
  const text = all();

  it('ships no fictional installer (the package is published to npm only)', () => {
    expect(text).not.toContain('brew install');
    expect(text).not.toContain('install.sh');
    expect(text).not.toMatch(/curl\s+-fsSL/);
  });

  it('claims no `--ci` flag — `gate run` has none', () => {
    expect(text).not.toContain('--ci');
  });

  it('only names flags `gate run` actually accepts', () => {
    for (const flag of text.matchAll(/gate run (--[a-z-]+)/g)) {
      expect(['--dry-run', '--from-phase'], flag[1]).toContain(flag[1]);
    }
  });
});

describe('wordmark casing', () => {
  const text = all();
  it('uses ProveGate (CamelCase) in prose, provegate/gate lowercase for the binary', () => {
    expect(text).toContain('ProveGate');
    expect(text).not.toMatch(/\bProvegate\b/);
    expect(text).not.toMatch(/\bPROVEGATE\b/);
  });
});

describe('tokens only — no hardcoded colour in the app', () => {
  it('no raw hex appears in any app source (all colour via --pg-* tokens)', () => {
    for (const f of FILES) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/#[0-9a-fA-F]{6}\b/);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRD-027 — FR-3 (one install source, app-wide) + FR-7 (no dead exports).
// ─────────────────────────────────────────────────────────────────────────────

import { HERO, HERO_TERMINAL, INSTALLERS } from '../app/sections/content';

const CONTENT = resolve(APP, 'sections/content.ts');

/** Comment-stripped view: a doc comment quoting a command or an export name
 * must neither fail the census nor keep an export alive. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

describe('FR-3 — the install command is authored once, app-wide', () => {
  it('the four consumers derive from one declaration (values, not equal strings)', () => {
    expect(INSTALLERS[0].code).toBe(HERO.install);
    expect(HERO_TERMINAL.steps.slice(0, 2)).toEqual(HERO.install.split('\n'));
    // /alt consumes the constant's first line — asserted at source level below
  });

  it('no source outside content.ts authors the install literal', () => {
    const offenders = FILES.filter((f) => f !== CONTENT)
      .filter((f) => /npm install -D provegate/.test(stripComments(readFileSync(f, 'utf8'))));
    expect(offenders.map((f) => f.split('/app/')[1] ?? f)).toEqual([]);
  });

  it('/alt renders the constant, not a literal', () => {
    const src = stripComments(readFileSync(resolve(APP, 'alt/page.tsx'), 'utf8'));
    expect(src).toContain("HERO.install.split('\\n')[0]");
  });
});

describe('FR-7 — no landing content export is unreferenced', () => {
  it('every export of content.ts is word-anchored-referenced by another app source', () => {
    const decl = readFileSync(CONTENT, 'utf8');
    // enumerate the export forms the scanner recognizes — a new form must not
    // silently escape the census
    const names = [...decl.matchAll(/^export (?:const|function|type|interface) (\w+)/gm)].map(
      (m) => m[1] as string,
    );
    // an export form the scanner does not recognize must fail loudly, never
    // silently escape the census (Codex round-1 [P2])
    const allExports = decl.match(/^export .*/gm) ?? [];
    const unrecognized = allExports.filter(
      (l) => !/^export (?:const|function|type|interface) \w+/.test(l),
    );
    expect(unrecognized, `unrecognized export forms: ${unrecognized.join(' | ')}`).toEqual([]);
    expect(names.length).toBeGreaterThanOrEqual(38); // the measured floor (PROOF deleted, three constants added)
    const others = FILES.filter((f) => f !== CONTENT).map((f) =>
      stripComments(readFileSync(f, 'utf8')),
    );
    const orphans = names.filter(
      (n) => !others.some((src) => new RegExp(`\\b${n}\\b`).test(src)),
    );
    expect(orphans, `unreferenced exports: ${orphans.join(', ')}`).toEqual([]);
  });

  it('PROOF is gone, and PROOF_EVIDENCE did not keep it alive by prefix', () => {
    const decl = readFileSync(CONTENT, 'utf8');
    expect(/^export const PROOF\b(?!_)/m.test(decl)).toBe(false);
    expect(decl).toContain('export const PROOF_EVIDENCE');
  });
});
