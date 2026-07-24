import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * FR-9 / W4 — the `./cli` entry must stay bundleable by a zero-runtime-dependency
 * consumer (the provegate CLI). Walk the TRANSITIVE import graph from
 * src/cli/index.ts over the source, and fail on the first CSS import, React
 * import, or non-relative third-party specifier. node: builtins are allowed.
 */

const CLI_ENTRY = resolve(__dirname, '../src/cli/index.ts');

function specifiersOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  const specs: string[] = [];
  // Match static `from '...'`, bare `import '...'`, and dynamic `import('...')` —
  // the `\(?` catches a dynamic import's paren. The quote class includes the
  // backtick so a template-literal specifier (``import(`../styles.css`)``) is
  // caught too, without relying on the built-output check (Finding 4). This keeps
  // the source walk a complete guard on its own, even on a never-built checkout.
  const re = /(?:\bfrom\s*|\bimport\s*\(?\s*)['"`]([^'"`]+)['"`]/g;
  for (const m of src.matchAll(re)) specs.push(m[1]!);
  return specs;
}

/** Resolve a relative `./x.js` import to its `.ts` source path. */
function resolveRelative(fromFile: string, spec: string): string {
  const base = resolve(dirname(fromFile), spec);
  for (const candidate of [base, base.replace(/\.js$/, '.ts'), `${base}.ts`]) {
    if (existsSync(candidate)) return candidate;
  }
  return base;
}

describe('the ./cli entry import graph is pure', () => {
  it('imports no CSS, no React, no third-party module (transitively)', () => {
    const visited = new Set<string>();
    const css: string[] = [];
    const react: string[] = [];
    const external: string[] = [];
    const walk = (file: string): void => {
      if (visited.has(file)) return;
      visited.add(file);
      for (const spec of specifiersOf(file)) {
        // Classify by the SPECIFIER first — a `.css` or `react` import is a
        // violation whether it is written relative (`../styles.css`) or bare.
        // (A relative CSS import must be FLAGGED, not recursed into — the bug an
        // earlier version had, which let a dynamic import of styles.css slip.)
        if (/\.css$/i.test(spec)) {
          css.push(`${spec} (in ${file})`);
        } else if (/(^|\/)react($|\/)/i.test(spec)) {
          react.push(`${spec} (in ${file})`);
        } else if (spec.startsWith('.')) {
          walk(resolveRelative(file, spec));
        } else if (!spec.startsWith('node:')) {
          external.push(`${spec} (in ${file})`);
        }
      }
    };
    walk(CLI_ENTRY);

    expect(css, 'CSS reachable from ./cli').toEqual([]);
    expect(react, 'React reachable from ./cli').toEqual([]);
    expect(external, 'third-party reachable from ./cli').toEqual([]);
  });
});

describe('the built ./cli output carries no web asset (empirical, defeat-proof)', () => {
  // The source walk above is static analysis and can be fooled; this is the
  // ground truth. If ANY web import (static, dynamic, re-export, whatever)
  // becomes reachable from cli/index.ts, tsup emits it into dist/cli — most
  // visibly a .css bundle. Assert dist/cli holds only JS + type declarations.
  // Runs whenever a build exists (the gate runs `pnpm build` before tests).
  it('dist/cli contains no .css (nor any non-JS asset)', () => {
    const distCli = resolve(__dirname, '../dist/cli');
    if (!existsSync(distCli)) {
      // No build present (standalone `vitest` with no prior build). The source
      // walk still guards; the gated run always builds first, so this fires there.
      return;
    }
    const stray = readdirSync(distCli).filter((f) => !/\.(js|d\.ts|js\.map)$/.test(f));
    expect(stray, `unexpected assets in dist/cli: ${stray.join(', ')}`).toEqual([]);
  });

  it('dist/cli/index.js does not import React (PRD-012 W2)', () => {
    const distCli = resolve(__dirname, '../dist/cli/index.js');
    if (!existsSync(distCli)) return;
    const js = readFileSync(distCli, 'utf8');
    // Adding React to ./react must never pull it into the CLI bundle.
    expect(js).not.toMatch(/from\s*['"]react(-dom)?['"]/);
    expect(js).not.toMatch(/require\(\s*['"]react(-dom)?['"]/);
    expect(js).not.toContain('react/jsx-runtime');
  });
});

describe('the package declares zero runtime dependencies', () => {
  it('package.json has no `dependencies` key (or an empty one)', () => {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies ?? {}).toEqual({});
  });
});
