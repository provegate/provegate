import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { auditWiring } from '../src/core/gates/wiring.js';
import { initWorkspace } from '../src/core/run/init.js';
import { mergeToLocalBase, mergeMessage } from '../src/core/run/merge.js';

// PRD-015 — proves the gated workflow runs in a PLAIN single-package repo
// (one package.json, no pnpm-workspace.yaml, no turbo), with commands that are
// not pnpm/turbo. Drives a REAL temp git repo — not a mock (readiness W1).

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

// A single-package config whose gate commands are NON-pnpm — tool-agnosticism
// proven, not asserted (readiness W3). `node` is allowlisted; `node -e` is a
// direct exec, so it stands in for any `tsc`/`vitest`/`npm run` a user maps.
const singlePkgConfig: WorkflowConfig = deepMerge(DEFAULT_CONFIG, {
  commands: {
    checkTypes: 'node -e "process.exit(0)"',
    lint: 'node -e "process.exit(0)"',
    test: 'node -e "process.exit(0)"',
    build: 'node -e "process.exit(0)"',
  },
});

describe('single-package support (PRD-015)', () => {
  it('FR-2/W1: gate init scaffolds the workflow tree only — no apps/, no packages/, additive', () => {
    const root = singlePackageRepo();
    const pkgBefore = readFileSync(resolve(root, 'package.json'), 'utf8');

    const report = initWorkspace(DEFAULT_CONFIG, root);

    // The workflow tree is present.
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
    // …and direct non-pnpm commands are execs, not scripts, so they are clean too.
    expect(auditWiring(singlePkgConfig, defaultManifest(singlePkgConfig), root).issues).toEqual([]);
  });

  it('FR-1/W3: the gated local merge lands in a single-package repo with NON-pnpm commands', () => {
    const root = singlePackageRepo();
    initWorkspace(singlePkgConfig, root);
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: gate init']);

    // A feature branch with one committed change — the state gate run merges.
    git(root, ['checkout', '-q', '-b', 'feat/prd-x']);
    writeFileSync(resolve(root, 'feature.txt'), 'feature\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'feat: change']);

    const manifest: GatesManifest = {
      ...defaultManifest(singlePkgConfig),
      postMerge: ['node -e "process.exit(0)"'],
    };
    const result = mergeToLocalBase({ config: singlePkgConfig, manifest, root, id: 'PRD-X' });

    expect(result.ok).toBe(true);
    // Landed on base with a no-ff merge commit (two parents).
    expect(git(root, ['rev-parse', '--abbrev-ref', 'HEAD'])).toBe('main');
    expect(git(root, ['log', '-1', '--format=%s'])).toBe(mergeMessage('PRD-X'));
    expect(git(root, ['log', '-1', '--format=%p']).split(' ')).toHaveLength(2);
    expect(readFileSync(resolve(root, 'feature.txt'), 'utf8')).toBe('feature\n');
    // Nothing was pushed — the repo has no remote at all.
    expect(git(root, ['remote'])).toBe('');
  });
});
