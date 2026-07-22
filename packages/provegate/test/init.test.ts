import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, validateConfig, validateResolvedConfig, deepMerge } from '../src/core/config/index.js';
import { defaultManifest, loadManifest } from '../src/core/gates/manifest.js';
import { auditWiring, packageScriptOf } from '../src/core/gates/wiring.js';
import { initWorkspace, planInit } from '../src/core/run/init.js';
import { buildState } from '../src/core/state/build.js';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-init-'));
  roots.push(root);
  return root;
}

describe('initWorkspace (FR-2, W1)', () => {
  it('creates the full config-derived tree + starter configs', () => {
    const root = tempRoot();
    const report = initWorkspace(cfg, root);
    expect(report.skipped).toEqual([]);
    for (const artifact of Object.values(cfg.dirs.artifacts)) {
      for (const state of cfg.dirs.states) {
        expect(existsSync(join(root, artifact.dir, state, '.gitkeep')), `${artifact.dir}/${state}`).toBe(true);
      }
    }
    expect(existsSync(join(root, cfg.dirs.locksDir))).toBe(true);
    expect(existsSync(join(root, cfg.dirs.reviewsDir))).toBe(true);
    expect(existsSync(join(root, 'workflow.config.json'))).toBe(true);
    expect(existsSync(join(root, 'gates.manifest.json'))).toBe(true);
  });

  it('is idempotent: second run skips everything, mutates nothing', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    const configPath = join(root, 'workflow.config.json');
    writeFileSync(configPath, '{ "idPattern": { "prefix": "TASK", "width": 4 } }\n');
    const before = readFileSync(configPath, 'utf8');
    const mtime = statSync(configPath).mtimeMs;

    const second = initWorkspace(cfg, root);
    expect(second.created).toEqual([]);
    expect(second.skipped.length).toBe(planInit(cfg).length);
    expect(readFileSync(configPath, 'utf8')).toBe(before);
    expect(statSync(configPath).mtimeMs).toBe(mtime);
  });

  it('--dry-run plans without writing', () => {
    const root = tempRoot();
    const report = initWorkspace(cfg, root, { dryRun: true });
    expect(report.created.length).toBeGreaterThan(0);
    expect(existsSync(join(root, 'workflow.config.json'))).toBe(false);
  });

  it('the starter config validates (shape + semantics) and merges cleanly', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    const starter = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
    expect(validateConfig(starter)).toEqual([]);
    const merged = deepMerge(cfg, starter);
    expect(validateResolvedConfig(merged)).toEqual([]);
  });

  it('the scaffolded repo passes state build and the wiring audit (W1, no package.json)', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    expect(buildState(cfg, root).records).toEqual([]);
    const manifest = loadManifest(cfg, root);
    expect(auditWiring(cfg, manifest, root)).toEqual({ ok: true, issues: [] });
  });

  it('refuses config-controlled paths that escape the root (absolute, dotdot, symlink)', () => {
    const outside = tempRoot();
    const abs = deepMerge(cfg, { dirs: { locksDir: join(outside, 'locks') } });
    expect(() => initWorkspace(abs, tempRoot())).toThrow(/absolute/);
    const dotdot = deepMerge(cfg, { dirs: { locksDir: '../escaped-locks' } });
    expect(() => initWorkspace(dotdot, tempRoot())).toThrow(/escap/);
    const symRoot = tempRoot();
    symlinkSync(outside, join(symRoot, '_state'));
    expect(() => initWorkspace(cfg, symRoot)).toThrow(/symlink/);
    expect(existsSync(join(outside, 'locks'))).toBe(false);
  });

  it('a refused plan writes nothing at all (no partial scaffold)', () => {
    const root = tempRoot();
    const dotdot = deepMerge(cfg, { dirs: { locksDir: '../escaped-locks' } });
    expect(() => initWorkspace(dotdot, root)).toThrow(/escap/);
    expect(existsSync(join(root, '_prds'))).toBe(false);
    expect(existsSync(join(root, 'workflow.config.json'))).toBe(false);
  });

  it('a node repo still gets the script-existence audit (no evasion by absence)', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'x', scripts: {} }));
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toContain('check-types');
  });

  it('a contained dotfile-style name like ..cache is not an escape', () => {
    const root = tempRoot();
    const dotcache = deepMerge(cfg, { dirs: { locksDir: '..cache/locks' } });
    const report = initWorkspace(dotcache, root);
    expect(report.created).toContain('..cache/locks');
    expect(existsSync(join(root, '..cache', 'locks'))).toBe(true);
  });
});

describe('packageScriptOf — the wiring grammar (no shape evasion)', () => {
  const cases: [string, string | null][] = [
    ['pnpm check-types', 'check-types'],
    ['pnpm run ghost', 'ghost'],
    ['pnpm run-script ghost', 'ghost'],
    ['npm run ghost', 'ghost'],
    ['npm test', 'test'],
    ['yarn ghost', 'ghost'],
    ['yarn run ghost', 'ghost'],
    ['bun test', 'test'],
    ['bun run ghost', 'ghost'],
    ['pnpm install', null],
    ['npm ci', null],
    ['pnpm dlx create-thing', null],
    ['pnpm exec vitest', null],
    ['npx vitest', null],
    ['node script.js', null],
    ['pnpm --filter provegate test', null], // cross-package: root can't answer
    ['pnpm --filter=provegate test', null], // attached selector, same scope-out
    ['npm --workspace=pkg test', null],
    ['npm -w=pkg run ghost', null],
  ];
  for (const [cmd, expected] of cases) {
    it(`${JSON.stringify(cmd)} -> ${JSON.stringify(expected)}`, () => {
      expect(packageScriptOf(cmd)).toBe(expected);
    });
  }

  it('package-absent repos flag every script-invoking manager form', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    const manifest = {
      ...defaultManifest(cfg),
      phases: { '4': ['pnpm run ghost', 'npm test', 'yarn lint', 'bun run build'] },
      postMerge: [],
    };
    const report = auditWiring(cfg, manifest, root);
    expect(report.ok).toBe(false);
    expect(report.issues).toHaveLength(4);
    for (const issue of report.issues) {
      expect(issue).toContain('no package.json');
    }
  });
});

describe('gate init (live CLI)', () => {
  it('scaffolds from a bare directory and reports; second run all-skip', async () => {
    const root = tempRoot();
    const first = await run(process.execPath, [cliPath, 'init'], { cwd: root });
    expect(first.stdout).toContain('created');
    expect(first.stdout).toContain('QUICKSTART');

    const second = await run(process.execPath, [cliPath, 'init'], { cwd: root });
    expect(second.stdout).toContain('0 created');

    const status = await run(process.execPath, [cliPath, 'status'], { cwd: root });
    expect(status.stdout).toContain('(no workflow artifacts found)');
  });
});
