import { execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const pkgDir = fileURLToPath(new URL('..', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));

/** FR-3/FR-4: the tarball is the product's first artifact — its contents are a
 * tested invariant, not a hope. */

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
  return parsed[0].files.map((f) => f.path);
}

const ROOT_FILES = new Set([
  'LICENSE',
  'README.md',
  'METHOD.md',
  'QUICKSTART.md',
  'CHANGELOG.md',
  'package.json',
]);
const ROOT_DIRS = ['dist/', 'prompts/', 'templates/', 'schemas/', 'examples/'];

describe('pack audit (FR-3)', () => {
  it('required files are all present', async () => {
    const files = await packedFiles();
    for (const required of [
      'LICENSE',
      'README.md',
      'METHOD.md',
      'QUICKSTART.md',
      'CHANGELOG.md',
      'dist/cli.js',
      'dist/index.js',
    ]) {
      expect(files, `tarball is missing ${required}`).toContain(required);
    }
    for (const dir of ['prompts/', 'templates/', 'schemas/', 'examples/']) {
      expect(
        files.some((f) => f.startsWith(dir)),
        `tarball has no files under ${dir}`,
      ).toBe(true);
    }
  });

  it('every packed file lives under a whitelisted root (nothing leaks)', async () => {
    const files = await packedFiles();
    const unexpected = files.filter(
      (f) => !ROOT_FILES.has(f) && !ROOT_DIRS.some((d) => f.startsWith(d)),
    );
    expect(unexpected, `unexpected paths in tarball: ${unexpected.join(', ')}`).toEqual([]);
  });

  it('package LICENSE is byte-identical to the root LICENSE (anti-drift, W1)', () => {
    const pkg = readFileSync(join(pkgDir, 'LICENSE'), 'utf8');
    const root = readFileSync(join(repoRoot, 'LICENSE'), 'utf8');
    expect(pkg).toBe(root);
    expect(pkg).toContain('ProveGate contributors');
  });

  it('built dist carries no parent-project residue (hygiene on the shipping artifact)', () => {
    const distDir = join(pkgDir, 'dist');
    for (const name of readdirSync(distDir)) {
      const content = readFileSync(join(distDir, name), 'utf8').toLowerCase();
      expect(content.includes('emofy'), `${name} contains "emofy"`).toBe(false);
      expect(content.includes('rayvaz'), `${name} contains "rayvaz"`).toBe(false);
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
    // Precision matters: calibration decimals like "r = −0.03" are content, not
    // versions. Only version-shaped forms are banned.
    const versionPin = /provegate@\d|"version"\s*:|\bv\d+\.\d+\.\d+\b/;
    for (const doc of ['README.md', 'QUICKSTART.md', 'METHOD.md']) {
      const content = readFileSync(join(pkgDir, doc), 'utf8');
      const m = versionPin.exec(content);
      expect(m, `${doc} pins a version: "${m?.[0]}"`).toBeNull();
    }
  });
});
