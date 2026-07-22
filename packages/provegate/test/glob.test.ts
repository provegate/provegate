import { describe, expect, it } from 'vitest';
import { globToRegExp } from '../src/core/locks/glob.js';

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
