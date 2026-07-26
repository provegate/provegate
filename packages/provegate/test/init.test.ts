import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
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
import {
  DEFAULT_CONFIG,
  validateConfig,
  validateResolvedConfig,
  deepMerge,
} from '../src/core/config/index.js';
import { defaultManifest, loadManifest } from '../src/core/gates/manifest.js';
import { auditWiring, packageScriptOf } from '../src/core/gates/wiring.js';
import {
  initWorkspace,
  planInit,
  planPractices,
  practicesPackDir,
} from '../src/core/run/init.js';
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
        expect(
          existsSync(join(root, artifact.dir, state, '.gitkeep')),
          `${artifact.dir}/${state}`,
        ).toBe(true);
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

describe('FR-6 memory-enabled scaffold (practices only)', () => {
  const practices = () => planPractices(practicesPackDir());

  it('a plain init opts into nothing: no memory key, empty phase-4 floor', () => {
    const root = tempRoot();
    initWorkspace(cfg, root);
    const config = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
    expect(config.memory).toBeUndefined();
    const manifest = JSON.parse(readFileSync(join(root, 'gates.manifest.json'), 'utf8'));
    expect(manifest.phases).toEqual({ '4': [] });
  });

  it('a practices init writes the opt-in and omits phases.4 entirely', () => {
    const root = tempRoot();
    initWorkspace(cfg, root, { extra: practices() });
    const config = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
    expect(config.memory).toEqual({ enabled: true });
    const manifest = JSON.parse(readFileSync(join(root, 'gates.manifest.json'), 'utf8'));
    // The rule this fixture exists for: the key is ABSENT, not empty.
    expect(Object.keys(manifest.phases)).toEqual(['7']);
    expect('4' in manifest.phases).toBe(false);
    expect(manifest.phases['7']).toEqual(['node scripts/verify/verify-brain.mjs']);
  });

  it('the generated Phase 7 command is allowlist-safe', () => {
    const root = tempRoot();
    initWorkspace(cfg, root, { extra: practices() });
    const manifest = JSON.parse(readFileSync(join(root, 'gates.manifest.json'), 'utf8'));
    for (const cmd of manifest.phases['7']) {
      expect(cfg.commands.allowedPrefixes.some((p: string) => cmd.startsWith(p)), cmd).toBe(true);
    }
  });

  it('never overwrites: an existing config and manifest stay byte-identical', () => {
    const root = tempRoot();
    const config = '{ "branches": { "base": "trunk" } }\n';
    const manifest = '{ "phases": { "4": ["make check"] } }\n';
    writeFileSync(join(root, 'workflow.config.json'), config);
    writeFileSync(join(root, 'gates.manifest.json'), manifest);
    const report = initWorkspace(cfg, root, { extra: practices() });
    expect(readFileSync(join(root, 'workflow.config.json'), 'utf8')).toBe(config);
    expect(readFileSync(join(root, 'gates.manifest.json'), 'utf8')).toBe(manifest);
    expect(report.skipped).toContain('workflow.config.json');
    expect(report.skipped).toContain('gates.manifest.json');
  });

  it('an adopter’s stray `_brain` never enables memory — only the pack does', () => {
    const root = tempRoot();
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(join(root, '_brain/INDEX.md'), '# index\n');
    initWorkspace(cfg, root);
    const config = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
    expect(config.memory).toBeUndefined();
  });
});

describe('phase 6 round 20 — activation is written last', () => {
  it('[R20-8] the store and validator land before the config that demands them', () => {
    // `planInit` ran before `extra`, so `workflow.config.json` with
    // `memory.enabled` and the Phase 7 manifest were written BEFORE the `_brain`
    // store and the validator they activate. An interrupted install left a
    // repository that demands a memory contract and has nothing to satisfy it.
    const order: string[] = [];
    const root = tempRoot();
    const config = { ...DEFAULT_CONFIG, memory: { ...DEFAULT_CONFIG.memory, enabled: true } };
    const extra = [
      { kind: 'file' as const, path: '_brain/INDEX.md', content: '# INDEX\n' },
      { kind: 'file' as const, path: 'scripts/verify/verify-brain.mjs', content: '// noop\n' },
    ];
    const report = initWorkspace(config, root, { extra });
    for (const path of report.created) order.push(path);
    const configAt = order.indexOf('workflow.config.json');
    const manifestAt = order.indexOf('gates.manifest.json');
    const storeAt = order.indexOf('_brain/INDEX.md');
    const validatorAt = order.indexOf('scripts/verify/verify-brain.mjs');
    expect(storeAt).toBeGreaterThanOrEqual(0);
    expect(validatorAt).toBeGreaterThanOrEqual(0);
    expect(configAt).toBeGreaterThan(storeAt);
    expect(configAt).toBeGreaterThan(validatorAt);
    if (manifestAt >= 0) {
      expect(manifestAt).toBeGreaterThan(storeAt);
      expect(manifestAt).toBeGreaterThan(validatorAt);
    }
  });
});
