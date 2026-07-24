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

  it('bare `gate init` stays byte-identical: exact golden file set, pre-feature contents', () => {
    // Fixed golden manifest of the PRE-practices bare init. Any file the flagless
    // path gains or loses — practices leak, dropped scaffold — breaks this list.
    const GOLDEN = [
      '_docs/completed/.gitkeep',
      '_docs/deferred/.gitkeep',
      '_docs/reviews/.gitkeep',
      '_docs/wip/.gitkeep',
      '_prds/completed/.gitkeep',
      '_prds/deferred/.gitkeep',
      '_prds/wip/.gitkeep',
      '_readiness/completed/.gitkeep',
      '_readiness/deferred/.gitkeep',
      '_readiness/wip/.gitkeep',
      '_state/locks/.gitkeep',
      '_tasks/completed/.gitkeep',
      '_tasks/deferred/.gitkeep',
      '_tasks/wip/.gitkeep',
      'gates.manifest.json',
      'workflow.config.json',
    ];
    const repo = makeRepo();
    gateInit(repo);
    const files = fingerprint(repo);
    expect([...files.keys()].sort()).toEqual(GOLDEN);
    for (const f of GOLDEN) {
      if (f.endsWith('.gitkeep')) expect(files.get(f), f).toBe('');
    }
    // BYTE-for-byte, not parsed: whitespace/key-order drift is a parity break too.
    expect(files.get('workflow.config.json')).toBe(
      '{\n  "branches": {\n    "base": "main"\n  },\n  "idPattern": {\n    "prefix": "PRD",\n    "width": 3\n  }\n}\n',
    );
    expect(files.get('gates.manifest.json')).toBe(
      '{\n  "phases": {\n    "4": []\n  },\n  "postMerge": []\n}\n',
    );
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

  it('installed security scripts hold under adversarial staging (scanner bypass, injection names, guard deletions/renames)', () => {
    const repo = makeRepo();
    gateInit(repo, '--practices');
    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
    const runScript = (script: string) =>
      execFileSync(process.execPath, [join(repo, script)], {
        cwd: repo,
        encoding: 'utf8',
        stdio: 'pipe',
      });

    // Scanner: a stage-syntax-colliding filename must still be SCANNED — the
    // secret inside `0:leak.txt` has to be found, not skipped via a swallowed
    // `git show :0:leak.txt` stage-spec misparse.
    // Key assembled at runtime so this test file itself never contains a
    // contiguous key-shaped string (the repo's own pre-commit scanner would
    // rightly refuse it — proof the scanner works, but not a secret).
    writeFileSync(join(repo, '0:leak.txt'), `const k = "${'AKIA' + 'IOSFODNN7EXAMPLE'}";\n`);
    // Scanner: a command-substitution filename must be inert (argv, no shell).
    writeFileSync(join(repo, '$(touch PWNED).txt'), 'harmless\n');
    git('add', '-f', '0:leak.txt', '$(touch PWNED).txt');
    expect(() => runScript('scripts/secret-scan.mjs')).toThrow(/0:leak\.txt/);
    expect(readdirSync(repo)).not.toContain('PWNED');
    git('reset');

    // Guard: deleting a source file on a protected branch must be blocked...
    writeFileSync(join(repo, 'source.js'), 'x\n');
    git('add', '-f', 'source.js');
    git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'seed', '--no-verify');
    git('checkout', '-q', '-B', 'main');
    git('rm', '-q', 'source.js');
    expect(() => runScript('scripts/base-branch-guard.mjs')).toThrow(/source\.js/);
    git('reset', '--hard', '-q');
    // ...and a rename from an allowed path INTO source must be blocked on
    // both sides (the destination is source-class).
    writeFileSync(join(repo, '_docs/note.md'), 'doc\n');
    git('add', '_docs/note.md');
    git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'doc', '--no-verify');
    git('mv', '_docs/note.md', 'renamed-into-source.js');
    expect(() => runScript('scripts/base-branch-guard.mjs')).toThrow(/renamed-into-source\.js/);
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
        // Origin-process terminology that only makes sense in the repo the
        // pack was extracted from ("handoff card" is a generic workflow term
        // and deliberately NOT matched here).
        if (
          /\bwave [0-9]\b|handoff template|contributor handoff|the user asked for|originating implementation/i.test(
            text,
          )
        )
          bad.push(`${full}: origin-process terminology`);
        const executable = /\.(mjs|sh)$/.test(entry.name) || full.includes('/hooks/');
        if (executable && /\bgit\s+push\b/.test(text)) bad.push(`${full}: push path`);
      }
    };
    walk(pack);
    expect(bad).toEqual([]);
  });

  it('hook exec bit survives a hostile umask: chmod pins the exact mode after create', () => {
    // writeFileSync's mode is masked by the process umask, so init chmods to the
    // declared mode right after a successful create. Prove it under a umask that
    // strips group/other exec bits (owner bits stay so directories remain
    // traversable); without the chmod the hook would land 0o744, not 0o755.
    const hostile = makeRepo();
    const prevMask = process.umask(0o011);
    try {
      gateInit(hostile, '--practices');
    } finally {
      process.umask(prevMask);
    }
    expect(statSync(join(hostile, '.githooks/pre-commit')).mode & 0o111).toBe(0o111);

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
