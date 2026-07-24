import { existsSync, readFileSync } from 'node:fs';
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
  const re = /(?:from|import)\s*['"]([^'"]+)['"]/g;
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
    const external: string[] = [];
    const walk = (file: string): void => {
      if (visited.has(file)) return;
      visited.add(file);
      for (const spec of specifiersOf(file)) {
        if (spec.startsWith('.')) {
          walk(resolveRelative(file, spec));
        } else if (!spec.startsWith('node:')) {
          external.push(`${spec} (in ${file})`);
        }
      }
    };
    walk(CLI_ENTRY);

    const css = external.filter((e) => /\.css/.test(e));
    const react = external.filter((e) => /react/i.test(e));
    expect(css, 'CSS reachable from ./cli').toEqual([]);
    expect(react, 'React reachable from ./cli').toEqual([]);
    // Any remaining non-relative, non-node specifier is a third-party edge.
    expect(external, 'third-party reachable from ./cli').toEqual([]);
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
