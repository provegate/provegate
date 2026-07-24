import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { auditWiring } from '../src/core/gates/wiring.js';
import { buildGateChain, runChain } from '../src/core/run/chain.js';
import { initWorkspace } from '../src/core/run/init.js';
import { mergeToLocalBase, mergeMessage } from '../src/core/run/merge.js';
import type { StateRecord } from '../src/core/state/build.js';

// PRD-015 — proves the gated workflow runs in a PLAIN single-package repo (one
// package.json, no pnpm-workspace.yaml, no turbo), with commands that are not
// pnpm/turbo. Drives REAL temp git repos and the REAL gate chain — the four
// configured floor commands must actually execute (a failure must stop the run),
// not merely sit in config (readiness W1/W3).

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function git(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

/** A plain single-package repo: one package.json, no workspace file, no turbo. */
function singlePackageRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-single-'));
  roots.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  writeFileSync(
    resolve(root, 'package.json'),
    `${JSON.stringify(
      {
        name: 'my-app',
        version: '0.0.0',
        private: true,
        scripts: { 'check-types': 'true', lint: 'true', test: 'true', build: 'true' },
      },
      null,
      2,
    )}\n`,
  );
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'chore: init']);
  return root;
}

// A single-package config whose gate commands are NON-pnpm. `node` is
// allowlisted; each command is a distinct allowlisted exec so the gate chain
// runs the mapping a single-package user would configure, not pnpm/turbo.
function singlePkgConfig(overrides: Partial<WorkflowConfig['commands']> = {}): WorkflowConfig {
  return deepMerge(DEFAULT_CONFIG, {
    commands: {
      checkTypes: 'node -e "process.exit(0)"',
      lint: 'node --eval "process.exit(0)"',
      test: 'node -e "void 0"',
      build: 'node -e "0"',
      ...overrides,
    },
  });
}

// Minimal state record for buildGateChain (only the merge/operator gates read
// its task fields; phase-4 execution does not).
function record(): StateRecord {
  return {
    prd: 'PRD-X',
    number: 15,
    slug: 'single',
    status: 'Code Complete',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: 'eligible',
    artifacts: { prd: '_prds/wip/p.md', readiness: '', tasks: '_tasks/wip/t.md', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
  };
}

const PRD_WITH_11 = [
  '## Durable Artifacts',
  '',
  '- none',
  '',
  '## 11. Verification Commands',
  '',
  '| FR   | Command |',
  '| ---- | ------- |',
  '| FR-1 | `node -e "process.exit(0)"` |',
].join('\n');

function chainFor(config: WorkflowConfig, root: string): ReturnType<typeof buildGateChain> {
  return buildGateChain({
    config,
    manifest: defaultManifest(config), // phase 4 = the four configured floor commands
    root,
    record: record(),
    prdContent: PRD_WITH_11,
    tasksContent: '',
    changedFiles: [],
    prdClass: 'infra',
  });
}

describe('single-package support (PRD-015)', () => {
  it('FR-2/W1: gate init scaffolds the workflow tree only — no apps/, no packages/, additive', () => {
    const root = singlePackageRepo();
    const pkgBefore = readFileSync(resolve(root, 'package.json'), 'utf8');

    const report = initWorkspace(DEFAULT_CONFIG, root);

    expect(existsSync(join(root, 'workflow.config.json'))).toBe(true);
    expect(existsSync(join(root, 'gates.manifest.json'))).toBe(true);
    for (const artifact of Object.values(DEFAULT_CONFIG.dirs.artifacts)) {
      for (const state of DEFAULT_CONFIG.dirs.states) {
        expect(existsSync(join(root, artifact.dir, state, '.gitkeep')), `${artifact.dir}/${state}`).toBe(true);
      }
    }

    // Layout-agnostic: init never scaffolds a monorepo.
    expect(existsSync(join(root, 'apps'))).toBe(false);
    expect(existsSync(join(root, 'packages'))).toBe(false);
    expect(existsSync(join(root, 'pnpm-workspace.yaml'))).toBe(false);

    // Additive: the pre-existing single package.json is untouched.
    expect(readFileSync(resolve(root, 'package.json'), 'utf8')).toBe(pkgBefore);
    expect(report.skipped).toEqual([]);
  });

  it('FR-1/FR-2: the wiring audit accepts a single-package repo (no false monorepo assumption)', () => {
    const root = singlePackageRepo();
    initWorkspace(DEFAULT_CONFIG, root);

    // Default `pnpm <script>` commands resolve to the repo's own scripts…
    expect(auditWiring(DEFAULT_CONFIG, defaultManifest(DEFAULT_CONFIG), root).issues).toEqual([]);
    // …and allowlisted non-pnpm execs are accepted (execs, not package scripts).
    expect(auditWiring(singlePkgConfig(), defaultManifest(singlePkgConfig()), root).issues).toEqual([]);
  });

  it('FR-1/W3: the four NON-pnpm floor commands actually execute in the gate chain', () => {
    const root = singlePackageRepo();
    initWorkspace(singlePkgConfig(), root);

    const outcome = runChain({
      config: singlePkgConfig(),
      root,
      id: 'PRD-X',
      chain: chainFor(singlePkgConfig(), root),
      fromPhase: null,
    });

    // Phase 4 ran the configured non-pnpm floor and each passed — the commands
    // are load-bearing, not decorative. (The chain later stops at the review
    // gate, which is expected: no review artifact in this fixture.)
    const passedPhase4 = outcome.results.filter(
      ([label, res]) => label.startsWith('4 Implementation:') && res === 'passed',
    );
    expect(passedPhase4.length).toBeGreaterThan(0);
    expect(outcome.results).toContainEqual(['4 Implementation: node -e "process.exit(0)"', 'passed']);
  });

  it('FR-1/W3 (negative): a FAILING non-pnpm floor command stops the run at phase 4', () => {
    const root = singlePackageRepo();
    const failing = singlePkgConfig({ checkTypes: 'node -e "process.exit(1)"' });
    initWorkspace(failing, root);

    const outcome = runChain({
      config: failing,
      root,
      id: 'PRD-X',
      chain: chainFor(failing, root),
      fromPhase: null,
    });

    // The floor is real: a failing command halts the chain at phase 4 (this is
    // exactly what the config-only proof missed — a dead command cannot fail).
    expect(outcome.stopped?.phase).toBe('4 Implementation');
    expect(outcome.results).toContainEqual(['4 Implementation: node -e "process.exit(1)"', 'FAILED']);
  });

  it('FR-1: the local no-ff merge lands in a single-package single-checkout repo — nothing pushed', () => {
    const root = singlePackageRepo();
    const cfg = singlePkgConfig();
    initWorkspace(cfg, root);
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: gate init']);

    git(root, ['checkout', '-q', '-b', 'feat/prd-x']);
    writeFileSync(resolve(root, 'feature.txt'), 'feature\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'feat: change']);

    const manifest: GatesManifest = {
      ...defaultManifest(cfg),
      postMerge: ['node -e "process.exit(0)"'],
    };
    const result = mergeToLocalBase({ config: cfg, manifest, root, id: 'PRD-X' });

    expect(result.ok).toBe(true);
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
    expect(git(root, ['log', '-1', '--format=%s'])).toBe(mergeMessage('PRD-X'));
    expect(git(root, ['log', '-1', '--format=%p']).split(' ')).toHaveLength(2);
    expect(readFileSync(resolve(root, 'feature.txt'), 'utf8')).toBe('feature\n');
    // No remote is configured — the runner never pushes.
    expect(git(root, ['remote'])).toBe('');
  });
});
