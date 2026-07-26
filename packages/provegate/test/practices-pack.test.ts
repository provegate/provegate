import { afterEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  mkdirSync,
  symlinkSync,
  accessSync,
  constants,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { practicesPackDir } from '../src/core/run/init.js';
import type { DoctorReport } from '../src/core/memory/doctor.js';

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

  /**
   * PRD-017 W10: the strengthened record rules are proved by mutation, not by
   * asserting today's green. Each case below is a record or index line the
   * INSTALLED validator accepted before this PRD — the empty folded description
   * most of all, which slipped through because the old parser stored the fold
   * marker and never read the fold.
   */
  it('the installed validator rejects what the old one accepted (mutation matrix)', () => {
    const repo = makeRepo();
    gateInit(repo, '--practices');
    const brainCheck = () =>
      execFileSync(process.execPath, [join(repo, 'scripts/verify/verify-brain.mjs')], {
        cwd: repo,
        encoding: 'utf8',
        stdio: 'pipe',
      });
    // The pack installs a valid store, so the baseline must be green — a red
    // baseline would make every case below pass for the wrong reason.
    expect(() => brainCheck()).not.toThrow();

    const record = (frontmatter: string, body = '\n**Why:** w\n**How to apply:** h\n'): string =>
      `---\n${frontmatter}\n---\n${body}`;
    const indexPath = join(repo, '_brain/INDEX.md');
    const indexBefore = readFileSync(indexPath, 'utf8');
    const recordPath = join(repo, '_brain/learnings/mutation-case.md');

    const cases: [string, string][] = [
      [
        'empty folded description',
        record(
          'name: mutation-case\ndescription: >-\ntype: gotcha\nscope: workflow\nstatus: active',
        ),
      ],
      [
        'missing Why section',
        record(
          'name: mutation-case\ndescription: a real description\ntype: gotcha\nscope: workflow\nstatus: active',
          '\n**How to apply:** h\n',
        ),
      ],
      [
        'placeholder description',
        record(
          'name: mutation-case\ndescription: <one line>\ntype: gotcha\nscope: workflow\nstatus: active',
        ),
      ],
      [
        'watch escaping the workspace',
        record(
          'name: mutation-case\ndescription: a real description\ntype: gotcha\nscope: workflow\nstatus: active\nwatch: [../outside/**]',
        ),
      ],
      [
        'unknown key',
        record(
          'name: mutation-case\ndescription: a real description\ntype: gotcha\nscope: workflow\nstatus: active\nprovanance: seed',
        ),
      ],
      [
        'duplicate key',
        record(
          'name: mutation-case\ndescription: a real description\ndescription: a second one\ntype: gotcha\nscope: workflow\nstatus: active',
        ),
      ],
    ];

    for (const [label, content] of cases) {
      writeFileSync(recordPath, content);
      writeFileSync(
        indexPath,
        `${indexBefore}- [mutation case](learnings/mutation-case.md) — a hook\n`,
      );
      expect(() => brainCheck(), label).toThrow();
    }
    // The wrapper and the shared helper must agree: `[[ slug ]]` is one
    // reference written with spaces. Keeping the raw capture made the installed
    // verifier reject what the helper accepted — a gate disagreeing with itself.
    writeFileSync(
      recordPath,
      record(
        'name: mutation-case\ndescription: a real description\ntype: gotcha\nscope: workflow\nstatus: active',
        '\nsee [[ memory-index-vs-detail ]]\n\n**Why:** w\n**How to apply:** h\n',
      ),
    );
    writeFileSync(
      indexPath,
      `${indexBefore}- [mutation case](learnings/mutation-case.md) — a hook\n`,
    );
    expect(() => brainCheck(), 'a spaced wikilink').not.toThrow();

    rmSync(recordPath);
    writeFileSync(indexPath, indexBefore);
    expect(() => brainCheck()).not.toThrow();

    // W10 is a forward-only constraint: no existing hook is over the limit, so
    // the rule is proved by writing one that is, never by shortening a record.
    writeFileSync(
      indexPath,
      `${indexBefore}- [long hook](learnings/memory-index-vs-detail.md) — ${'x'.repeat(121)}\n`,
    );
    expect(() => brainCheck(), '121-character hook').toThrow();
    writeFileSync(indexPath, indexBefore);
    expect(() => brainCheck()).not.toThrow();
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
        // and deliberately NOT matched here). Includes the internal numbered
        // practice/pattern taxonomy ("practice 06", "pattern P3") — an
        // adopter has no catalog to resolve those against.
        if (
          /\bwave [0-9]\b|\bpractice [0-9]{2}\b|\bpattern P[0-9]\b|handoff template|contributor handoff|the user asked for|originating implementation/i.test(
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

/**
 * FR-2 — the partial-install matrix, run against the REAL CLI in a REAL repo.
 *
 * A doctor is only worth having if it is right about installs that are broken in
 * ONE place, which is how installs actually arrive. Each row below breaks
 * exactly one thing from a known-good baseline and asserts which check fails and
 * that the others do not — a diagnostic that reports six failures for one cause
 * sends an adopter to five wrong files.
 */
describe('FR-2 — doctor output and the partial-install matrix', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  const RECORD = [
    '---',
    'name: sample-record',
    'description: a record the doctor resolves',
    'type: convention',
    'scope: workflow',
    'status: active',
    '---',
    '',
    'Body.',
    '',
    '**Why:** a reason.',
    '**How to apply:** a method.',
    '',
  ].join('\n');

  /** A complete, passing install. Every row starts here and breaks one thing. */
  function site(): string {
    const root = makeRepo();
    roots.push(root);
    const write = (rel: string, body: string): void => {
      mkdirSync(join(root, dirname(rel)), { recursive: true });
      writeFileSync(join(root, rel), body);
    };
    write('_brain/INDEX.md', '# INDEX\n\n- [sample](learnings/sample-record.md) — hook\n');
    write('_brain/learnings/sample-record.md', RECORD);
    write('CLAUDE.md', 'Read `_brain/INDEX.md` before any work.\n');
    write('package.json', JSON.stringify({ name: 'fixture', scripts: { 'verify:brain': 'node x' } }));
    write('scripts/verify/verify-brain.mjs', '// noop\n');
    write(
      'workflow.config.json',
      JSON.stringify({ memory: { enabled: true, entrypoints: ['CLAUDE.md'] } }, null, 2),
    );
    write('gates.manifest.json', JSON.stringify({ phases: { '7': ['pnpm verify:brain'] } }, null, 2));
    return root;
  }

  /** Run the real binary and return the parsed report plus the exit code. */
  function doctor(root: string): { code: number; report: DoctorReport } {
    try {
      const out = execFileSync(process.execPath, [CLI, 'doctor', '--memory', '--json'], {
        cwd: root,
        encoding: 'utf8',
      });
      return { code: 0, report: JSON.parse(out) as DoctorReport };
    } catch (error) {
      const e = error as { status?: number; stdout?: string; stderr?: string };
      // Surface the real failure. A bare JSON parse error here hides whatever the
      // CLI actually said, which is the only thing that explains it.
      if (!(e.stdout ?? '').trim().startsWith('{')) {
        throw new Error(
          `doctor did not emit JSON (exit ${e.status ?? '?'}):\n${e.stdout ?? ''}\n${e.stderr ?? ''}`,
          { cause: error },
        );
      }
      return { code: e.status ?? -1, report: JSON.parse(e.stdout!) as DoctorReport };
    }
  }

  const failing = (r: DoctorReport): string[] =>
    r.checks.filter((c) => c.severity === 'fail').map((c) => c.id);

  /** Every file's bytes, so non-mutation is a measurement rather than a claim. */
  function treeHash(dir: string): string {
    const parts: string[] = [];
    const walk = (current: string): void => {
      for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) =>
        a.name.localeCompare(b.name),
      )) {
        if (entry.name === '.git') continue;
        const full = join(current, entry.name);
        if (entry.isDirectory()) walk(full);
        else parts.push(`${full}:${readFileSync(full, 'utf8')}`);
      }
    };
    walk(dir);
    return createHash('sha256').update(parts.join(' ')).digest('hex');
  }

  it('a complete install passes, and the JSON exposes the documented shape', () => {
    const { code, report } = doctor(site());
    expect(code).toBe(0);
    expect(report.ok).toBe(true);
    expect(report.disabled).toBe(false);
    expect(report.code).toBe(0);
    // FR-2's contract: these keys are the machine surface an adopter scripts on.
    for (const check of report.checks) {
      expect(Object.keys(check).sort()).toEqual(
        check.remedy === undefined ? ['detail', 'id', 'severity'] : ['detail', 'id', 'remedy', 'severity'],
      );
      expect(['pass', 'warn', 'fail']).toContain(check.severity);
    }
  });

  it('human output names the failing check AND its repair', () => {
    // The two renderers come from one typed result, so an adapter cannot change
    // semantics — but the HUMAN one must still be actionable on its own.
    const root = site();
    rmSync(join(root, '_brain/INDEX.md'));
    let text = '';
    try {
      execFileSync(process.execPath, [CLI, 'doctor', '--memory'], { cwd: root, encoding: 'utf8' });
    } catch (error) {
      text = (error as { stdout?: string }).stdout ?? '';
    }
    expect(text).toContain('memory.index.resolvable');
    expect(text).toContain('_brain/INDEX.md');
    expect(text).toMatch(/→ .+/);
  });

  const matrix: [string, (root: string) => void, string[]][] = [
    [
      'missing index',
      (root) => rmSync(join(root, '_brain/INDEX.md')),
      ['memory.index.resolvable', 'memory.records.valid'],
    ],
    [
      'missing store root',
      (root) => rmSync(join(root, '_brain'), { recursive: true }),
      ['memory.root.resolvable', 'memory.index.resolvable', 'memory.records.valid'],
    ],
    [
      'missing package script',
      (root) =>
        writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fixture', scripts: {} })),
      ['memory.verify.script.wired'],
    ],
    [
      'missing Phase 7 wiring',
      (root) => writeFileSync(join(root, 'gates.manifest.json'), JSON.stringify({ phases: {} })),
      ['memory.phase7.reachable'],
    ],
    [
      'entrypoint without the pointer',
      (root) => writeFileSync(join(root, 'CLAUDE.md'), 'nothing useful here\n'),
      ['memory.entrypoint.pointer'],
    ],
    [
      'record that does not validate',
      (root) => writeFileSync(join(root, '_brain/learnings/sample-record.md'), 'no frontmatter\n'),
      ['memory.records.valid'],
    ],
  ];

  for (const [name, breakIt, expected] of matrix) {
    it(`matrix: ${name} fails exactly its own check(s)`, () => {
      const root = site();
      breakIt(root);
      const { code, report } = doctor(root);
      expect(code).toBe(1);
      expect(report.ok).toBe(false);
      // Exactly these, in any order: one broken thing must not implicate others.
      expect([...new Set(failing(report))].sort()).toEqual([...expected].sort());
    });
  }

  it('matrix: memory disabled reports one skipped check and exits 0', () => {
    const root = site();
    writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ memory: { enabled: false } }));
    const { code, report } = doctor(root);
    expect(code).toBe(0);
    expect(report.disabled).toBe(true);
    expect(report.checks).toHaveLength(1);
  });

  it('matrix: no CI workflow warns without changing the exit code', () => {
    const { code, report } = doctor(site());
    expect(code).toBe(0);
    const ci = report.checks.find((c) => c.id === 'memory.ci.reachable')!;
    expect(ci.severity).toBe('warn');
  });

  it('matrix: a placeholder left in the index warns without blocking', () => {
    const root = site();
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      '# {{PROJECT_NAME}}\n\n- [sample](learnings/sample-record.md) — hook\n',
    );
    const { code, report } = doctor(root);
    expect(code).toBe(0);
    expect(report.checks.find((c) => c.id === 'memory.placeholders.filled')!.severity).toBe('warn');
  });

  it('[W1] the symlink cases, against a real symlinked entrypoint', () => {
    // This repository ships `AGENTS.md -> CLAUDE.md`; the fixture reproduces it
    // rather than synthesizing something the repo does not do.
    const root = site();
    // RELATIVE, which is what this repository actually ships. An ABSOLUTE
    // in-repo symlink is refused by config load on macOS, where the root is
    // `/var/...` and realpath returns `/private/var/...` — the same
    // `/var → /private/var` trap `containedPath` documents avoiding. That is a
    // real defect in `core/config` containment, outside this PRD's surface, and
    // it is on the deferral board rather than fixed here.
    symlinkSync('CLAUDE.md', join(root, 'AGENTS.md'));
    writeFileSync(
      join(root, 'workflow.config.json'),
      JSON.stringify({ memory: { enabled: true, entrypoints: ['AGENTS.md'] } }),
    );
    expect(doctor(root).code).toBe(0);

    // Both spellings of one real file are ONE satisfied entrypoint.
    writeFileSync(
      join(root, 'workflow.config.json'),
      JSON.stringify({ memory: { enabled: true, entrypoints: ['CLAUDE.md', 'AGENTS.md'] } }),
    );
    const both = doctor(root);
    expect(both.code).toBe(0);
    expect(both.report.checks.find((c) => c.id === 'memory.entrypoint.pointer')!.detail).toContain(
      '1 entrypoint',
    );

    // A link out of the repository never reaches the doctor: CONFIG LOAD refuses
    // it first, and that is the better answer — an invalid configuration should
    // stop every command, not produce a diagnosis. The doctor keeps its own
    // escape guard for callers that build a config directly, and `memory.test.ts`
    // exercises it there; here the end-to-end truth is the refusal.
    const outside = mkdtempSync(join(tmpdir(), 'provegate-outside-'));
    roots.push(outside);
    writeFileSync(join(outside, 'elsewhere.md'), 'Read `_brain/INDEX.md`.\n');
    rmSync(join(root, 'AGENTS.md'));
    symlinkSync(join(outside, 'elsewhere.md'), join(root, 'AGENTS.md'));
    writeFileSync(
      join(root, 'workflow.config.json'),
      JSON.stringify({ memory: { enabled: true, entrypoints: ['AGENTS.md'] } }),
    );
    let refusal = '';
    let refused = false;
    try {
      execFileSync(process.execPath, [CLI, 'doctor', '--memory'], { cwd: root, encoding: 'utf8' });
    } catch (error) {
      refused = true;
      const e = error as { stdout?: string; stderr?: string };
      refusal = `${e.stdout ?? ''}${e.stderr ?? ''}`;
    }
    expect(refused).toBe(true);
    expect(refusal).toContain('resolves outside the workspace through a symlink');
  });

  it('[FR-2] the doctor writes nothing — on the passing path AND the failing one', () => {
    // A diagnostic that writes only when it fails is still a writer, and the
    // failing path is exactly when an adopter can least afford a surprise edit.
    const clean = site();
    const beforeClean = treeHash(clean);
    expect(doctor(clean).code).toBe(0);
    expect(treeHash(clean)).toBe(beforeClean);

    const broken = site();
    rmSync(join(broken, '_brain/INDEX.md'));
    writeFileSync(join(broken, 'package.json'), JSON.stringify({ name: 'fixture', scripts: {} }));
    const beforeBroken = treeHash(broken);
    expect(doctor(broken).code).toBe(1);
    expect(treeHash(broken)).toBe(beforeBroken);
  });
});
