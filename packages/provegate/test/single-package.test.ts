import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { auditWiring } from '../src/core/gates/wiring.js';
import { buildGateChain, runChain } from '../src/core/run/chain.js';
import { initWorkspace } from '../src/core/run/init.js';
import { memoryFind } from '../src/core/memory/index.js';
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
        expect(
          existsSync(join(root, artifact.dir, state, '.gitkeep')),
          `${artifact.dir}/${state}`,
        ).toBe(true);
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
    expect(auditWiring(singlePkgConfig(), defaultManifest(singlePkgConfig()), root).issues).toEqual(
      [],
    );
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

    // ALL FOUR configured non-pnpm floor commands ran and passed — each is
    // load-bearing, not decorative. Asserting every one (not just the first)
    // means flipping ANY of them to a failure breaks this test.
    for (const cmd of [
      'node -e "process.exit(0)"', // checkTypes
      'node --eval "process.exit(0)"', // lint
      'node -e "0"', // build
      'node -e "void 0"', // test
    ]) {
      expect(outcome.results).toContainEqual([`4 Implementation: ${cmd}`, 'passed']);
    }
    // Phase 4 did NOT stop — a later floor failure would halt here (the chain
    // then stops at the review gate, which is expected: no review artifact).
    expect(outcome.stopped?.phase).not.toBe('4 Implementation');
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
    expect(outcome.results).toContainEqual([
      '4 Implementation: node -e "process.exit(1)"',
      'FAILED',
    ]);
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

/**
 * FR-4 — bounds, portability, safety for `gate memory find`.
 *
 * Recall is the one command an agent will run constantly and read casually, so
 * the properties worth pinning are the ones a casual reader assumes: the same
 * question gives the same bytes, a malformed selector refuses rather than
 * returning nothing, and nothing outside the indexed store can ever appear.
 */
describe('FR-4 — find bounds, portability, and safety', () => {
  const findRoots: string[] = [];
  afterEach(() => {
    while (findRoots.length > 0) rmSync(findRoots.pop()!, { recursive: true, force: true });
  });

  const rec = (name: string, over: Record<string, string> = {}): string =>
    [
      '---',
      `name: ${name}`,
      `description: ${over.description ?? 'a record'}`,
      `type: ${over.type ?? 'convention'}`,
      'scope: workflow',
      `status: ${over.status ?? 'active'}`,
      ...(over.superseded === undefined ? [] : [`superseded-by: ${over.superseded}`]),
      ...(over.watch === undefined ? [] : [`watch: [${over.watch}]`]),
      ...(over.tags === undefined ? [] : [`tags: [${over.tags}]`]),
      '---',
      '',
      'Body.',
      '',
      '**Why:** a reason.',
      '**How to apply:** a method.',
      '',
    ].join('\n');

  function storeOf(entries: [string, string][]): {
    root: string;
    config: WorkflowConfig;
  } {
    const root = mkdtempSync(join(tmpdir(), 'provegate-fr4-'));
    findRoots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    for (const [slug, body] of entries) {
      writeFileSync(join(root, `_brain/learnings/${slug}.md`), body);
    }
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      ['# INDEX', '', ...entries.map(([s]) => `- [${s}](learnings/${s}.md) — hook`), ''].join('\n'),
    );
    const config = deepMerge(DEFAULT_CONFIG, {
      memory: { enabled: true, entrypoints: ['CLAUDE.md'] },
    }) as WorkflowConfig;
    return { root, config };
  }

  it('handles a thousand records and honours both limit boundaries', () => {
    const entries: [string, string][] = Array.from({ length: 1000 }, (_, i) => {
      const slug = `record-${String(i).padStart(4, '0')}`;
      return [slug, rec(slug, { description: 'a note about caching' })];
    });
    const { root, config } = storeOf(entries);
    expect(memoryFind(config, root, { query: 'caching', limit: 1 }).hits).toHaveLength(1);
    expect(memoryFind(config, root, { query: 'caching', limit: 1000 }).hits).toHaveLength(1000);
    // The default caps a broad query rather than dumping the store.
    expect(memoryFind(config, root, { query: 'caching' }).hits).toHaveLength(20);
    // And the cap slices the RANKED list, so the first result is stable.
    expect(memoryFind(config, root, { query: 'caching', limit: 3 }).hits.map((h) => h.slug)).toEqual(
      ['record-0000', 'record-0001', 'record-0002'],
    );
  });

  it('matches case-insensitively and handles non-ASCII text', () => {
    const { root, config } = storeOf([
      ['uppercase', rec('uppercase', { description: 'About CACHING Behaviour' })],
      ['turkish', rec('turkish', { description: 'çalışma ağacı ve görev' })],
      ['emoji', rec('emoji', { description: 'a note 🎯 about targets' })],
    ]);
    expect(memoryFind(config, root, { query: 'caching' }).hits.map((h) => h.slug)).toEqual([
      'uppercase',
    ]);
    expect(memoryFind(config, root, { query: 'CACHING' }).hits.map((h) => h.slug)).toEqual([
      'uppercase',
    ]);
    // Non-ASCII words tokenize to nothing under an ASCII-only rule, which is a
    // real limit rather than a crash — the record is still reachable by name.
    expect(memoryFind(config, root, { tag: 'turkish' }).hits.map((h) => h.slug)).toEqual([
      'turkish',
    ]);
    expect(memoryFind(config, root, { query: 'targets' }).hits.map((h) => h.slug)).toEqual([
      'emoji',
    ]);
  });

  it('accepts Windows separators in a path selector', () => {
    const { root, config } = storeOf([
      ['watcher', rec('watcher', { watch: 'packages/x/**' })],
    ]);
    const back = memoryFind(config, root, { paths: ['packages\\x\\a.ts'] });
    expect(back.hits.map((h) => h.slug)).toEqual(['watcher']);
    expect(back.hits[0]!.matchedPaths).toEqual(['packages/x/a.ts']);
  });

  it('refuses an unsafe selector with NO partial result', () => {
    // Partial results are the dangerous shape: an agent reads the hits and never
    // notices the refusal line above them.
    const { root, config } = storeOf([
      ['watcher', rec('watcher', { watch: 'packages/x/**', description: 'about caching' })],
    ]);
    for (const bad of ['/etc/passwd', '../outside/a.ts', 'C:\\x\\a.ts', 'packages/../../x']) {
      const result = memoryFind(config, root, { paths: ['packages/x/a.ts', bad], query: 'caching' });
      expect(result.ok, bad).toBe(false);
      expect(result.hits, bad).toEqual([]);
      expect(result.problem, bad).toContain(bad);
    }
  });

  it('never surfaces anything outside the indexed store', () => {
    // Records reach results ONLY through an INDEX pointer, so a file dropped in
    // a `private/` directory is unreachable by construction rather than by a
    // filter someone has to remember to write.
    const { root, config } = storeOf([['public', rec('public', { description: 'about caching' })]]);
    mkdirSync(join(root, '_brain/private'), { recursive: true });
    writeFileSync(
      join(root, '_brain/private/secret.md'),
      rec('secret', { description: 'about caching secrets' }),
    );
    const result = memoryFind(config, root, { query: 'caching' });
    expect(result.hits.map((h) => h.slug)).toEqual(['public']);
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('superseded records are excluded even when they match every signal', () => {
    const { root, config } = storeOf([
      ['live', rec('live', { description: 'about caching', watch: 'packages/x/**' })],
      [
        'dead',
        rec('dead', {
          status: 'superseded',
          superseded: 'live',
          description: 'about caching',
          watch: 'packages/x/**',
          tags: 'caching',
        }),
      ],
    ]);
    const result = memoryFind(config, root, {
      query: 'caching',
      tag: 'caching',
      paths: ['packages/x/a.ts'],
    });
    expect(result.hits.map((h) => h.slug)).toEqual(['live']);
  });

  it('two identical runs produce byte-identical JSON, and write nothing', () => {
    const { root, config } = storeOf([
      ['b-rec', rec('b-rec', { description: 'about caching', watch: 'packages/x/**' })],
      ['a-rec', rec('a-rec', { description: 'about caching', watch: 'packages/x/**' })],
      ['c-rec', rec('c-rec', { description: 'about caching' })],
    ]);
    const snapshot = (): string => {
      const parts: string[] = [];
      const walk = (dir: string): void => {
        for (const e of readdirSync(dir, { withFileTypes: true }).sort((x, y) =>
          x.name.localeCompare(y.name),
        )) {
          const full = join(dir, e.name);
          if (e.isDirectory()) walk(full);
          else parts.push(`${full}:${readFileSync(full, 'utf8')}`);
        }
      };
      walk(root);
      return parts.join('\u0000');
    };
    const before = snapshot();
    const first = JSON.stringify(memoryFind(config, root, { query: 'caching', paths: ['packages/x/a.ts'] }));
    const second = JSON.stringify(memoryFind(config, root, { query: 'caching', paths: ['packages/x/a.ts'] }));
    expect(second).toBe(first);
    // The tie-break is doing work here: `a-rec` and `b-rec` carry identical
    // signals and the index lists `b-rec` first.
    expect(JSON.parse(first).hits.map((h: { slug: string }) => h.slug)).toEqual([
      'a-rec',
      'b-rec',
      'c-rec',
    ]);
    expect(snapshot()).toBe(before);
  });
});
