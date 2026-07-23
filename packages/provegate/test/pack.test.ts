import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** FR-3/FR-4: the tarball is the product's first artifact — its contents are a
 * tested invariant, not a hope. The invariant is an EXPLICIT manifest
 * (test/pack-manifest.json): any add/remove/rename in the packed set is a
 * conscious, reviewed diff of that fixture — whole-directory allowlisting
 * would let a stray file (or a gutted prompts/) pass unseen. */

async function packedFiles(): Promise<string[]> {
  let stdout: string;
  try {
    ({ stdout } = await run('npm', ['pack', '--dry-run', '--json'], { cwd: pkgDir }));
  } catch (err) {
    const e = err as NodeJS.ErrnoException;
    if (e.code === 'ENOENT') {
      throw new Error('npm is not on PATH — the pack audit needs the npm CLI (W4)', {
        cause: err,
      });
    }
    throw err;
  }
  const parsed = JSON.parse(stdout) as [{ files: { path: string }[] }];
  return parsed[0].files.map((f) => f.path).sort();
}

const manifest = (): string[] =>
  JSON.parse(readFileSync(join(pkgDir, 'test/pack-manifest.json'), 'utf8')) as string[];

describe('pack audit (FR-3)', () => {
  it('the packed file set equals the committed manifest exactly', async () => {
    const files = await packedFiles();
    const expected = [...manifest()].sort();
    const extra = files.filter((f) => !expected.includes(f));
    const missing = expected.filter((f) => !files.includes(f));
    expect(extra, `NOT in pack-manifest.json (add consciously): ${extra.join(', ')}`).toEqual([]);
    expect(missing, `in pack-manifest.json but not packed: ${missing.join(', ')}`).toEqual([]);
  });

  it('the manifest itself still carries the load-bearing files', () => {
    // Belt to the manifest's suspenders: a bad manifest edit must not be able
    // to wave the essentials through.
    const m = manifest();
    for (const required of [
      'LICENSE',
      'README.md',
      'METHOD.md',
      'QUICKSTART.md',
      'CHANGELOG.md',
      'package.json',
      'dist/cli.js',
      'dist/index.js',
    ]) {
      expect(m, `pack-manifest.json lost ${required}`).toContain(required);
    }
    for (const dir of ['prompts/', 'templates/', 'schemas/', 'examples/']) {
      expect(
        m.some((f) => f.startsWith(dir)),
        `pack-manifest.json has nothing under ${dir}`,
      ).toBe(true);
    }
  });

  it('package LICENSE is byte-identical to the root LICENSE (anti-drift, W1)', () => {
    const pkg = readFileSync(join(pkgDir, 'LICENSE'), 'utf8');
    const root = readFileSync(join(repoRoot, 'LICENSE'), 'utf8');
    expect(pkg).toBe(root);
    expect(pkg).toContain('ProveGate contributors');
  });

  it('EVERY packed text file is residue-free (hygiene on the full shipping set)', async () => {
    for (const file of await packedFiles()) {
      const content = readFileSync(join(pkgDir, file), 'utf8').toLowerCase();
      expect(content.includes('emofy'), `${file} contains "emofy"`).toBe(false);
      expect(content.includes('rayvaz'), `${file} contains "rayvaz"`).toBe(false);
      expect(content.includes('ramazan'), `${file} contains a personal name`).toBe(false);
    }
  });
});

describe('version single-sourcing (FR-4)', () => {
  it('cli --version output equals package.json version', async () => {
    const pkg = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')) as {
      version: string;
    };
    const { stdout } = await run(process.execPath, [join(pkgDir, 'dist/cli.js'), '--version']);
    expect(stdout.trim()).toBe(pkg.version);
  });

  it('shipped docs hardcode no version pins (W2: version-shaped patterns only)', () => {
    // Catches provegate@0.1.0, provegate@^0.1.0, provegate@~0.1.0, "version":,
    // and any bare three-part semver (v-prefixed or not). Calibration decimals
    // (r = −0.03) are two-part and never match.
    const versionPin = /provegate@[^\s`"']+|"version"\s*:|\bv?\d+\.\d+\.\d+\b/;
    for (const doc of ['README.md', 'QUICKSTART.md', 'METHOD.md']) {
      const content = readFileSync(join(pkgDir, doc), 'utf8');
      const m = versionPin.exec(content);
      expect(m, `${doc} pins a version: "${m?.[0]}"`).toBeNull();
    }
  });

  it('the deliberate-violation fixtures fail (the pin scan is not vacuous)', () => {
    const versionPin = /provegate@[^\s`"']+|"version"\s*:|\bv?\d+\.\d+\.\d+\b/;
    for (const bad of [
      'install provegate@0.1.0 today',
      'requires provegate@^0.1.0',
      'requires provegate@~0.1.0',
      'as of v1.2.3 the gate',
      'since 1.2.3 this works',
    ]) {
      expect(versionPin.test(bad), bad).toBe(true);
    }
    expect(versionPin.test('the score had r = −0.03 correlation')).toBe(false);
    expect(versionPin.test('scores clustered in 8.0–9.4')).toBe(false);
  });
});
