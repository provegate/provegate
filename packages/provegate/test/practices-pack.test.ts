import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import {
  chmodSync,
  accessSync,
  constants,
  mkdtempSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { practicesPackDir } from '../src/core/run/init.js';

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), '../dist/cli.js');

/** A REAL temp git repo — the pack must prove itself against actual git, not a mock. */
function makeRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), 'provegate-practices-'));
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
  git('init', '-q');
  git('config', 'user.email', 'fixture@example.invalid');
  git('config', 'user.name', 'fixture');
  return repo;
}

function gateInit(repo: string, ...flags: string[]): string {
  return execFileSync(process.execPath, [CLI, 'init', ...flags], {
    cwd: repo,
    encoding: 'utf8',
    stdio: 'pipe',
  });
}

/** Stable content fingerprint of every file under root (skips .git). */
function fingerprint(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(full.slice(root.length + 1), readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return out;
}

const KEY_FILES = [
  '_brain/PROTOCOL.md',
  '_brain/README.md',
  '_brain/INDEX.md',
  '_brain/_templates/learning.md',
  '_brain/_templates/adr.md',
  '_brain/private/.gitignore',
  'AGENT_BOOTSTRAP.md',
  'STATUS.md',
  'commitlint.config.mjs',
  '_docs/review-artifact.template.md',
  '_docs/retros/README.md',
  '_state/known-red-verifies.json',
  '.githooks/pre-commit',
  '.githooks/commit-msg',
  'scripts/base-branch-guard.mjs',
  'scripts/secret-scan.mjs',
  'scripts/verify/lib.mjs',
  'scripts/verify/verify-workflow.mjs',
  'scripts/verify/gates-wired-exceptions.json',
];

describe('gate init --practices (real temp repos)', () => {
  it('fresh install: full layer lands, hooks executable, verify bundle green, entrypoints untouched', () => {
    const repo = makeRepo();
    const out = gateInit(repo, '--practices');

    for (const f of KEY_FILES) {
      expect(statSync(join(repo, f)).isFile(), f).toBe(true);
    }
    const learnings = readdirSync(join(repo, '_brain/learnings')).filter((f) => f.endsWith('.md'));
    expect(learnings).toHaveLength(21);
    const pointers = readFileSync(join(repo, '_brain/INDEX.md'), 'utf8').match(
      /^- \[.*\]\(learnings\//gm,
    );
    expect(pointers).toHaveLength(21);

    for (const hook of ['.githooks/pre-commit', '.githooks/commit-msg']) {
      accessSync(join(repo, hook), constants.X_OK); // throws when not executable
    }

    // The pack never creates agent entrypoints — shims are paste-yourself.
    expect(readdirSync(repo)).not.toContain('CLAUDE.md');
    expect(readdirSync(repo)).not.toContain('AGENTS.md');

    // Manual wiring is printed, not performed.
    expect(out).toContain('Practices pack — manual wiring');

    // The load-bearing claim: the verify bundle is green IMMEDIATELY.
    const bundle = execFileSync(
      process.execPath,
      [join(repo, 'scripts/verify/verify-workflow.mjs')],
      { cwd: repo, encoding: 'utf8', stdio: 'pipe' },
    );
    expect(bundle).toContain('verify:workflow: PASS');
  });

  it('re-run: every path skipped, zero bytes changed', () => {
    const repo = makeRepo();
    gateInit(repo, '--practices');
    const before = fingerprint(repo);
    const out = gateInit(repo, '--practices');
    expect(out).not.toMatch(/^ {2}\+ /m); // no created lines at all
    expect(out).toContain('AGENT_BOOTSTRAP.md (exists, skipped)');
    expect(fingerprint(repo)).toEqual(before);
  });

  it('--dry-run: plan printed, zero writes', () => {
    const repo = makeRepo();
    const out = gateInit(repo, '--practices', '--dry-run');
    expect(out).toContain('_brain/PROTOCOL.md');
    expect(readdirSync(repo)).toEqual(['.git']);
  });

  it('existing files are never touched; no git-config or package.json mutation', () => {
    const repo = makeRepo();
    const claude = '# my own entrypoint\n';
    const status = '# my own board\n';
    const pkg = '{\n  "name": "adopter",\n  "private": true\n}\n';
    writeFileSync(join(repo, 'CLAUDE.md'), claude);
    writeFileSync(join(repo, 'STATUS.md'), status);
    writeFileSync(join(repo, 'package.json'), pkg);
    const gitConfigBefore = readFileSync(join(repo, '.git/config'), 'utf8');

    const out = gateInit(repo, '--practices');

    expect(readFileSync(join(repo, 'CLAUDE.md'), 'utf8')).toBe(claude);
    expect(readFileSync(join(repo, 'STATUS.md'), 'utf8')).toBe(status);
    expect(readFileSync(join(repo, 'package.json'), 'utf8')).toBe(pkg);
    expect(readFileSync(join(repo, '.git/config'), 'utf8')).toBe(gitConfigBefore);
    expect(out).toContain('STATUS.md (exists, skipped)');
  });

  it('bare `gate init` stays byte-identical: no practices file appears without the flag', () => {
    const repo = makeRepo();
    gateInit(repo);
    const files = fingerprint(repo);
    expect(files.has('AGENT_BOOTSTRAP.md')).toBe(false);
    expect([...files.keys()].some((f) => f.startsWith('_brain/'))).toBe(false);
    expect([...files.keys()].some((f) => f.startsWith('scripts/'))).toBe(false);
    expect(files.has('workflow.config.json')).toBe(true);
    expect(files.has('gates.manifest.json')).toBe(true);
  });

  it('a failing packed check is not masked: broken _brain record turns the bundle red', () => {
    const repo = makeRepo();
    gateInit(repo, '--practices');
    // Orphan record with an illegal type — verify:brain must fail, and the
    // bundle must propagate the failure (green-by-construction would prove nothing).
    writeFileSync(
      join(repo, '_brain/learnings/broken.md'),
      '---\nname: broken\ndescription: x\ntype: banana\nscope: workflow\nstatus: active\n---\nx\n',
    );
    expect(() =>
      execFileSync(process.execPath, [join(repo, 'scripts/verify/verify-workflow.mjs')], {
        cwd: repo,
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    ).toThrow();
  });

  it('pack content hygiene: no source-project names, no Turkish, no push path in executables', () => {
    const pack = practicesPackDir();
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        const text = readFileSync(full, 'utf8');
        if (/emofy|rayvaz/i.test(text)) bad.push(`${full}: source-project name`);
        if (/[çğışöüÇĞİŞÖÜ]/.test(text)) bad.push(`${full}: non-English character`);
        const executable = /\.(mjs|sh)$/.test(entry.name) || full.includes('/hooks/');
        if (executable && /\bgit\s+push\b/.test(text)) bad.push(`${full}: push path`);
      }
    };
    walk(pack);
    expect(bad).toEqual([]);
  });

  it('hook exec bit survives an unwritable-adopter umask edge: mode is set at write time', () => {
    // Regression guard for the mode plumbing: write path must pass mode through
    // wx (not chmod-after-write, which a crash could skip).
    const repo = makeRepo();
    gateInit(repo, '--practices');
    const mode = statSync(join(repo, '.githooks/pre-commit')).mode & 0o777;
    expect(mode & 0o111, `mode was ${mode.toString(8)}`).toBeTruthy();
    // chmod down then re-run: wx skips, mode stays adopter-owned (never "fixed" silently)
    chmodSync(join(repo, '.githooks/pre-commit'), 0o644);
    gateInit(repo, '--practices');
    expect(statSync(join(repo, '.githooks/pre-commit')).mode & 0o111).toBe(0);
  });
});
