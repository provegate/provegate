import { execFile } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
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
  planPrompts,
  practicesPackDir,
  promptsConfigBlock,
} from '../src/core/run/init.js';
import {
  PromptsError,
  parseRegistry,
  planStore,
  promptsPackageDir,
  requiredValues,
} from '../src/core/run/prompts.js';
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
    // PRD-025 added `surfaces` to WiringReport (an FR-required output field);
    // a scaffold with no package.json reads zero script bodies and no other
    // surface exists yet.
    expect(auditWiring(cfg, manifest, root)).toEqual({
      ok: true,
      issues: [],
      surfaces: ['manifest', 'scripts:0'],
    });
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
    // The switch ships WITH entrypoints. Asserting the raw object alone let the
    // pack write a config whose very next command failed validation — enabled
    // memory rejects an empty entrypoint list, and the default list is empty.
    expect(config.memory.enabled).toBe(true);
    expect(config.memory.entrypoints.length).toBeGreaterThan(0);
    // And the generated config must actually RESOLVE, which is the assertion
    // that would have caught it.
    expect(validateResolvedConfig(deepMerge(cfg, config))).toEqual([]);
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

// --- PRD-029 parent 7: migration and rollback -------------------------------

/** A config with every required value supplied, so the render succeeds. */
function promptsReady(dir = '.provegate') {
  const packageDir = promptsPackageDir();
  const rows = requiredValues(
    packageDir,
    planStore(packageDir),
    parseRegistry(readFileSync(join(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8')),
  );
  const values: Record<string, string> = {};
  for (const row of rows) values[row.token] = `v-${row.token}`;
  return { ...DEFAULT_CONFIG, prompts: { ...DEFAULT_CONFIG.prompts, enabled: true, dir, values } };
}

function fileSet(root: string): Set<string> {
  const out = new Set<string>();
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const rel = prefix === '' ? entry : `${prefix}/${entry}`;
      if (statSync(abs).isDirectory()) walk(abs, rel);
      else out.add(rel);
    }
  };
  walk(root, '');
  return out;
}

describe('PRD-029 migration and rollback', () => {
  it('FORWARD: a repository that has not opted in is byte-identical to before', () => {
    // The promise is held by a test, not by a sentence. `prompts` ships
    // disabled, so a plain `gate init` must be indistinguishable from the
    // pre-PRD build — the only way to know that is to compare the plan.
    const plain = planInit(DEFAULT_CONFIG);
    expect(plain.some((a) => a.path.includes('.provegate'))).toBe(false);
    expect(plain.some((a) => a.path.startsWith('.claude/'))).toBe(false);
    expect(plain.some((a) => a.path.startsWith('.cursor/'))).toBe(false);
    // And the starter config it writes carries no prompts block at all.
    const configAction = plain.find((a) => a.path === 'workflow.config.json');
    expect(configAction?.content).not.toContain('prompts');
  });

  it('FORWARD: `--practices` alone installs no store', () => {
    // PACK_MAP is a static source→destination table and cannot emit a
    // config-dependent render, so the pack ships instructions instead.
    const pack = planPractices(practicesPackDir());
    expect(pack.some((a) => a.path.includes('.provegate'))).toBe(false);
    expect(pack.some((a) => a.path.startsWith('.claude/'))).toBe(false);
  });

  it('ACTIVATION: an existing config is never edited; the block is printed instead', () => {
    // This is the ONLY activation path an existing repository has, and readiness
    // iteration 5 found the previous design tied discovery to scaffolding, which
    // only happens where no config exists — nowhere that matters.
    const root = mkdtempSync(join(tmpdir(), 'provegate-activate-'));
    roots.push(root);
    const existing = `${JSON.stringify({ idPattern: { prefix: 'PRD', width: 3 } }, null, 2)}\n`;
    writeFileSync(join(root, 'workflow.config.json'), existing);

    const block = promptsConfigBlock(DEFAULT_CONFIG, promptsPackageDir());
    expect(block).toContain('"enabled": true');
    expect(block).toContain('"prd": ".provegate/templates/prd-template.md"');
    // Every required key present and unset, each with its meaning printed.
    expect(block).toContain('"ARCHITECTURE_DOC": null');
    expect(block).toMatch(/ARCHITECTURE_DOC — /);
    // Printing is not writing.
    expect(readFileSync(join(root, 'workflow.config.json'), 'utf8')).toBe(existing);
  });

  it('ACTIVATION: the printed block names exactly the nine required keys', () => {
    const packageDir = promptsPackageDir();
    const rows = requiredValues(
      packageDir,
      planStore(packageDir),
      parseRegistry(readFileSync(join(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8')),
    );
    const block = promptsConfigBlock(DEFAULT_CONFIG, packageDir);
    const parsed: unknown = JSON.parse(block.slice(0, block.indexOf('\n\nvalues:')));
    const values = (parsed as { prompts: { values: Record<string, null> } }).prompts.values;
    expect(Object.keys(values).sort()).toEqual(rows.map((r) => r.token).sort());
    expect(Object.keys(values)).toHaveLength(9);
  });

  it('REFUSAL: an unresolved value leaves the filesystem byte-identical', () => {
    // `absence-must-be-asserted`: the requirement is over the WHOLE set, not one
    // named path. And the scenario would otherwise have written — the next
    // assertion installs from the same config with values filled.
    const root = mkdtempSync(join(tmpdir(), 'provegate-mig-refuse-'));
    roots.push(root);
    mkdirSync(join(root, 'keep'), { recursive: true });
    writeFileSync(join(root, 'keep', 'x.txt'), 'x\n');
    const before = fileSet(root);

    const unresolved = promptsReady();
    unresolved.prompts.values = {};
    expect(() => planPrompts(unresolved, promptsPackageDir())).toThrow(PromptsError);
    expect(fileSet(root)).toEqual(before);

    const ready = promptsReady();
    initWorkspace(ready, root, { extra: planPrompts(ready, promptsPackageDir()) });
    expect(fileSet(root).size).toBeGreaterThan(before.size);
  });

  it('ORDERING: the prompt plan is written BEFORE the activation files', () => {
    // `initWorkspace` writes `workflow.config.json` and `gates.manifest.json`
    // last by explicit design, so an interrupted install never leaves a
    // repository demanding a store it has not got. The prompt plan arrives via
    // `extra`, which sits in the middle — this asserts that, rather than
    // trusting the comment.
    const root = mkdtempSync(join(tmpdir(), 'provegate-order-'));
    roots.push(root);
    const ready = promptsReady();
    const report = initWorkspace(ready, root, {
      extra: planPrompts(ready, promptsPackageDir()),
    });
    const configAt = report.created.indexOf('workflow.config.json');
    const storeAt = report.created.findIndex((p) => p.startsWith('.provegate/prompts/'));
    expect(storeAt).toBeGreaterThanOrEqual(0);
    expect(configAt).toBeGreaterThan(storeAt);
  });

  it('ROLLBACK: removing the printed set and the block returns the repo to pre-install', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-rollback-'));
    roots.push(root);
    const before = fileSet(root);
    const ready = promptsReady();
    const actions = planPrompts(ready, promptsPackageDir());
    initWorkspace(ready, root, { extra: actions });

    for (const action of actions) {
      if (action.kind === 'file') rmSync(join(root, action.path), { force: true });
    }
    // Everything the prompt plan wrote is gone; what remains is the base
    // scaffold, which the plain `gate init` would have written anyway.
    const after = fileSet(root);
    for (const path of after) {
      expect(path.startsWith('.provegate/')).toBe(false);
      expect(path.startsWith('.claude/')).toBe(false);
    }
    expect(after.size).toBeGreaterThanOrEqual(before.size);
  });

  it('ROLLBACK: NEXT_STEPS tells the adopter to clear templates.prd with the store', () => {
    // Otherwise `gate new` reads a path that no longer exists. Stated where the
    // adopter reads it, not only here.
    const next = readFileSync(join(practicesPackDir(), 'NEXT_STEPS.md'), 'utf8');
    expect(next).toContain('templates.prd');
    expect(next).toContain('ONE WAY');
    expect(next).toMatch(/delete \*\*every\s*\n?path in that set\*\*|every\s+path in that set/);
  });
});

describe('the pack upgrade over an old-shape install (PRD-026 FR-5)', () => {
  const REMOVED = [
    'scripts/verify/verify-review-artifact.mjs',
    'scripts/verify/verify-durable-artifacts.mjs',
    'scripts/verify/verify-gates-wired.mjs',
    'scripts/verify/gates-wired-exceptions.json',
  ];

  function oldShapeRepo(): string {
    const root = tempRoot();
    mkdirSync(join(root, 'scripts/verify'), { recursive: true });
    for (const rel of REMOVED) writeFileSync(join(root, rel), `// old pack: ${rel}\n`);
    return root;
  }

  it('removed paths appear in NEITHER list, and the seeded files are byte-identical', () => {
    const root = oldShapeRepo();
    // (c) positive control, skipped branch: a RETAINED pack file pre-seeded
    // with modified content proves the run processed the pack at all.
    writeFileSync(join(root, 'scripts/verify/lib.mjs'), '// locally modified\n');
    const report = initWorkspace(cfg, root, { extra: planPractices(practicesPackDir()) });

    for (const rel of REMOVED) {
      // Not "reported skipped": a path absent from PACK_MAP is absent from the
      // plan entirely, so it appears in NEITHER list — asserting `skipped`
      // would pass for the wrong reason.
      expect(report.created, rel).not.toContain(rel);
      expect(report.skipped, rel).not.toContain(rel);
      // (b) non-mutation
      expect(readFileSync(join(root, rel), 'utf8')).toBe(`// old pack: ${rel}\n`);
    }
    // (c) the pre-seeded retained file is skipped and byte-identical
    expect(report.skipped).toContain('scripts/verify/lib.mjs');
    expect(readFileSync(join(root, 'scripts/verify/lib.mjs'), 'utf8')).toBe('// locally modified\n');
    // (d) positive control, created branch: a retained absent file is created
    expect(report.created).toContain('scripts/verify/verify-workflow.mjs');
  });

  it('the contract assertion is sensitive: an injected removed-path action surfaces', () => {
    // The mutation check, written so it fails on the created/skipped CONTRACT
    // rather than on pack readability: injecting an action for a removed path
    // (with readable content, as a restored PACK_MAP entry would carry) makes
    // that path appear in the report — which is exactly what the assertions
    // above would catch as a regression.
    const root = oldShapeRepo();
    const injected = [
      ...planPractices(practicesPackDir()),
      { path: REMOVED[0]!, kind: 'file' as const, content: '// resurrected' },
    ];
    const report = initWorkspace(cfg, root, { extra: injected });
    expect([...report.created, ...report.skipped]).toContain(REMOVED[0]!);
  });
});
