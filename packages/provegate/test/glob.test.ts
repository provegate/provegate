import { describe, expect, it } from 'vitest';
import { globToRegExp, globsMayIntersect } from '../src/core/locks/glob.js';

const matches = (glob: string, path: string): boolean => globToRegExp(glob).test(path);

describe('globToRegExp (byte-equal port semantics)', () => {
  it('`*` stays within one path segment', () => {
    expect(matches('scripts/*.mjs', 'scripts/verify-foo.mjs')).toBe(true);
    expect(matches('scripts/*.mjs', 'scripts/lib/verify-foo.mjs')).toBe(false);
  });

  it('`**` crosses path segments', () => {
    expect(matches('packages/**', 'packages/x/deep/file.ts')).toBe(true);
    expect(matches('packages/x/**', 'packages/x/index.ts')).toBe(true);
    expect(matches('packages/x/**', 'packages/y/index.ts')).toBe(false);
  });

  it('`a/**/b` collapses the slash after `**`', () => {
    expect(matches('a/**/b.ts', 'a/x/y/b.ts')).toBe(true);
    expect(matches('a/**/b.ts', 'a/b.ts')).toBe(true);
  });

  it('`?` is exactly one non-slash character', () => {
    expect(matches('file-?.ts', 'file-a.ts')).toBe(true);
    expect(matches('file-?.ts', 'file-ab.ts')).toBe(false);
    expect(matches('file-?.ts', 'file-/.ts')).toBe(false);
  });

  it('escapes regex metacharacters', () => {
    expect(matches('a.b/c+d.ts', 'a.b/c+d.ts')).toBe(true);
    expect(matches('a.b/c+d.ts', 'aXb/ccd.ts')).toBe(false);
    expect(matches('weird/[x]{y}(z)$^|.ts', 'weird/[x]{y}(z)$^|.ts')).toBe(true);
  });

  it('anchors both ends (no substring match)', () => {
    expect(matches('src/a.ts', 'prefix/src/a.ts')).toBe(false);
    expect(matches('src/a.ts', 'src/a.ts.bak')).toBe(false);
  });
});

describe('globsMayIntersect (sound pattern intersection)', () => {
  // Every pair carries its expected verdict. `intersect` pairs share at least
  // one concrete future path; `disjoint` pairs share none. Soundness = no
  // `disjoint` verdict on a pair that actually shares a path (false negative).
  const INTERSECT: [string, string][] = [
    // The two documented misses this PRD closes (sibling wildcard vs literal).
    ['src/api/*.ts', 'src/api/users.ts'],
    ['src/*/handlers/**', 'src/auth/handlers/**'],
    // Identical and prefix-nested (the cases the old check already caught).
    ['a/**', 'a/**'],
    ['a/**', 'a/b/**'],
    ['packages/design/**', 'packages/design/src/tokens.ts'],
    // Star crossing a literal segment.
    ['src/*/x/**', 'src/a/x/**'],
    // `?` vs literal in the same position.
    ['file-?.ts', 'file-a.ts'],
    ['src/api/?ser.ts', 'src/api/user.ts'],
    // `**` boundary: zero segments and many segments both reachable.
    ['a/**/b.ts', 'a/b.ts'],
    ['a/**/b.ts', 'a/x/y/b.ts'],
    ['**/config.ts', 'src/deep/config.ts'],
    // Wildcard vs wildcard that admit a common path.
    ['src/*.ts', 'src/*.ts'],
    ['src/**', 'src/api/*.ts'],
  ];
  const DISJOINT: [string, string][] = [
    // Genuinely different literal segments — parallelism must be preserved.
    ['src/a/**', 'src/b/**'],
    ['src/x/**', 'src/y/**'],
    ['*.md', '*.ts'],
    ['src/api/users.ts', 'src/api/posts.ts'],
    // `*` never crosses `/`, so it cannot reach into a nested literal path.
    ['src/*.ts', 'src/a/b.ts'],
    // `?` is exactly one char — differing lengths cannot meet.
    ['file-?.ts', 'file-ab.ts'],
    // Different extensions under a shared directory.
    ['src/api/*.ts', 'src/api/*.js'],
  ];

  it('reports every intersecting pair (no false negatives), symmetric', () => {
    for (const [a, b] of INTERSECT) {
      expect(globsMayIntersect(a, b), `${a} ~ ${b}`).toBe(true);
      expect(globsMayIntersect(b, a), `${b} ~ ${a} (symmetry)`).toBe(true);
    }
  });

  it('leaves genuinely disjoint pairs claimable in parallel, symmetric', () => {
    for (const [a, b] of DISJOINT) {
      expect(globsMayIntersect(a, b), `${a} ~ ${b}`).toBe(false);
      expect(globsMayIntersect(b, a), `${b} ~ ${a} (symmetry)`).toBe(false);
    }
  });

  it('returns a verdict for pathological-length globs instead of overflowing the stack', () => {
    // A pair long enough to blow a recursive stack (Phase-6 finding M1): the
    // iterative walk must return, not throw.
    const longLit = 'a'.repeat(50_000);
    expect(() => globsMayIntersect(longLit, longLit)).not.toThrow();
    expect(globsMayIntersect(longLit, longLit)).toBe(true); // identical literals match
    const longStar = `${'a/'.repeat(20_000)}**`;
    expect(() => globsMayIntersect(longStar, longStar)).not.toThrow();
  });

  it('cross-checks the verdict against a concrete-path witness where one exists', () => {
    // For each INTERSECT pair we can name a path that matches both — proving
    // the verdict is not a false positive.
    const witnesses: [string, string, string][] = [
      ['src/api/*.ts', 'src/api/users.ts', 'src/api/users.ts'],
      ['src/*/handlers/**', 'src/auth/handlers/**', 'src/auth/handlers/list.ts'],
      ['a/**/b.ts', 'a/b.ts', 'a/b.ts'],
      ['**/config.ts', 'src/deep/config.ts', 'src/deep/config.ts'],
    ];
    for (const [a, b, path] of witnesses) {
      expect(globToRegExp(a).test(path) && globToRegExp(b).test(path), `${path}`).toBe(true);
    }
  });
});
