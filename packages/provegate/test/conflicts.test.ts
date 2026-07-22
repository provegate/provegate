import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import {
  candidateConflicts,
  candidateFromPrd,
  findConflicts,
  structuralOverlap,
  type SurfacedLock,
} from '../src/core/locks/conflicts.js';

const cfg = DEFAULT_CONFIG;
const FILES = ['scripts/verify-foo.mjs', 'scripts/verify-bar.mjs', 'packages/x/index.ts'];

const foo: SurfacedLock = {
  prd: 'PRD-999',
  phase: 'Phase 4',
  ownedPaths: ['scripts/verify-foo.mjs'],
};
const bar: SurfacedLock = {
  prd: 'PRD-999',
  phase: 'Phase 4',
  ownedPaths: ['scripts/verify-bar.mjs'],
};
const conflictingLock: SurfacedLock[] = [
  { lockId: 'l1', prd: 'PRD-900', phase: 'Phase 4', ownedPaths: ['scripts/verify-foo.mjs'] },
];
const disjointLock: SurfacedLock[] = [
  { lockId: 'l2', prd: 'PRD-901', phase: 'Phase 4', ownedPaths: ['packages/x/**'] },
];

describe('the four ported self-test fixtures', () => {
  it('conflicting candidate + active lock reports overlap (exit 1 path)', () => {
    expect(candidateConflicts(cfg, foo, conflictingLock, FILES).length).toBeGreaterThan(0);
  });
  it('clean candidate has no overlap (exit 0 path)', () => {
    expect(candidateConflicts(cfg, bar, disjointLock, FILES)).toEqual([]);
  });
  it('surfaceless candidate (null) has no overlap (exit 0 path)', () => {
    expect(candidateConflicts(cfg, null, conflictingLock, FILES)).toEqual([]);
  });
  it('no active locks yields no overlap (exit 0 path)', () => {
    expect(candidateConflicts(cfg, foo, [], FILES)).toEqual([]);
  });
});

describe('findConflicts', () => {
  it('subtracts shared append-only manifests post-materialization', () => {
    const files = ['package.json', 'src/a.ts'];
    const a: SurfacedLock = { prd: 'PRD-001', phase: 'Phase 4', ownedPaths: ['**'] };
    const b: SurfacedLock = { prd: 'PRD-002', phase: 'Phase 4', ownedPaths: ['package.json'] };
    // Broad ** materializes src/a.ts only; b materializes nothing → structural check
    // on globs: '**' vs 'package.json' do not prefix-nest → no conflict.
    expect(findConflicts(cfg, [a, b], files)).toEqual([]);
  });

  it('reports materialized overlap with the shared files', () => {
    const a: SurfacedLock = { prd: 'PRD-001', phase: 'Phase 4', ownedPaths: ['scripts/**'] };
    const b: SurfacedLock = {
      prd: 'PRD-002',
      phase: 'Phase 4',
      ownedPaths: ['scripts/verify-foo.mjs'],
    };
    expect(findConflicts(cfg, [a, b], FILES)).toEqual([
      { a: 'PRD-001', b: 'PRD-002', shared: ['scripts/verify-foo.mjs'] },
    ]);
  });

  it('exempts non-execution phases and same-id pairs', () => {
    const a: SurfacedLock = { prd: 'PRD-001', phase: 'Phase 1', ownedPaths: ['scripts/**'] };
    const b: SurfacedLock = { prd: 'PRD-002', phase: 'Phase 4', ownedPaths: ['scripts/**'] };
    expect(findConflicts(cfg, [a, b], FILES)).toEqual([]);

    const samePrd: SurfacedLock = { prd: 'PRD-002', phase: 'Phase 4', ownedPaths: ['scripts/**'] };
    expect(findConflicts(cfg, [b, samePrd], FILES)).toEqual([]);
  });

  it('locks without a surface never trip the gate (opt-in)', () => {
    const a: SurfacedLock = { prd: 'PRD-001', phase: 'Phase 4' };
    const b: SurfacedLock = { prd: 'PRD-002', phase: 'Phase 4', ownedPaths: ['scripts/**'] };
    expect(findConflicts(cfg, [a, b], FILES)).toEqual([]);
  });

  it('falls back to structural overlap when globs materialize to nothing', () => {
    const a: SurfacedLock = { prd: 'PRD-001', phase: 'Phase 4', ownedPaths: ['newdir/**'] };
    const b: SurfacedLock = { prd: 'PRD-002', phase: 'Phase 4', ownedPaths: ['newdir/sub/**'] };
    const conflicts = findConflicts(cfg, [a, b], FILES);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.shared).toEqual(['newdir/** ~ newdir/sub/**']);
  });
});

describe('structuralOverlap', () => {
  it('detects identical and prefix-nested globs; siblings are the documented false-negative', () => {
    expect(structuralOverlap(['a/**'], ['a/**'])).toHaveLength(1);
    expect(structuralOverlap(['a/**'], ['a/b/**'])).toHaveLength(1);
    expect(structuralOverlap(['a/x/**'], ['a/y/**'])).toEqual([]);
  });
});

describe('candidateFromPrd', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  function repoWithPrd(name: string, content: string): string {
    const root = mkdtempSync(join(tmpdir(), 'provegate-cand-'));
    roots.push(root);
    mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
    writeFileSync(resolve(root, `_prds/wip/${name}`), content);
    return root;
  }

  it('builds an execution-phase candidate from the Conflict Surface', () => {
    const root = repoWithPrd('prd-004-widget.md', '## Conflict Surface\n\n- `packages/x/**`\n');
    const candidate = candidateFromPrd(cfg, 'prd-004', root);
    expect(candidate).toEqual({
      prd: 'PRD-004',
      phase: cfg.executionPhases[0],
      ownedPaths: ['packages/x/**'],
    });
  });

  it('returns null when no surface is declared', () => {
    const root = repoWithPrd('prd-005-widget.md', '## Conflict Surface\n\n- none\n');
    expect(candidateFromPrd(cfg, 'PRD-005', root)).toBeNull();
  });

  it('throws on malformed ids and missing files', () => {
    const root = repoWithPrd('prd-006-widget.md', '- none');
    expect(() => candidateFromPrd(cfg, 'PRD-6', root)).toThrow(/malformed id/);
    expect(() => candidateFromPrd(cfg, 'PRD-777', root)).toThrow(/no PRD file/);
  });

  it('honors a custom id pattern', () => {
    const custom = deepMerge(DEFAULT_CONFIG, {
      idPattern: { prefix: 'TASK', width: 4 },
      dirs: { artifacts: { prd: { dir: '_prds', prefix: 'task' } } },
    });
    const root = mkdtempSync(join(tmpdir(), 'provegate-cand-'));
    roots.push(root);
    mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
    writeFileSync(
      resolve(root, '_prds/wip/task-0042-thing.md'),
      '## Conflict Surface\n\n- `lib/**`\n',
    );
    const candidate = candidateFromPrd(custom, 'task-0042', root);
    expect(candidate?.prd).toBe('TASK-0042');
    expect(candidate?.ownedPaths).toEqual(['lib/**']);
  });
});

describe('codex review regressions', () => {
  const roots2: string[] = [];
  afterEach(() => {
    while (roots2.length > 0) rmSync(roots2.pop()!, { recursive: true, force: true });
  });

  it('candidateFromPrd finds PRDs in custom-named lifecycle states', () => {
    const custom = deepMerge(DEFAULT_CONFIG, {
      dirs: {
        states: ['proposals', 'landed'],
        stateRoles: { wip: 'proposals', completed: 'landed', deferred: 'landed' },
      },
    });
    const root = mkdtempSync(join(tmpdir(), 'provegate-cand2-'));
    roots2.push(root);
    // Deliberately the SECOND configured state — the pre-fix code searched
    // only drafts + states[0] and would report this PRD as missing.
    mkdirSync(resolve(root, '_prds/landed'), { recursive: true });
    writeFileSync(
      resolve(root, '_prds/landed/prd-009-thing.md'),
      '## Conflict Surface\n\n- `lib/**`\n',
    );
    const candidate = candidateFromPrd(custom, 'PRD-009', root);
    expect(candidate?.ownedPaths).toEqual(['lib/**']);
    expect(candidate?.phase).toBe(custom.executionPhases[0]);
  });

  it('escapes regex metacharacters in configured prefixes', () => {
    const custom = deepMerge(DEFAULT_CONFIG, {
      idPattern: { prefix: 'T.SK', width: 3 },
      dirs: { artifacts: { prd: { dir: '_prds', prefix: 't.sk' } } },
    });
    const root = mkdtempSync(join(tmpdir(), 'provegate-cand3-'));
    roots2.push(root);
    mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
    // literal dot prefix resolves...
    writeFileSync(resolve(root, '_prds/wip/t.sk-010-x.md'), '## Conflict Surface\n\n- `a/**`\n');
    expect(candidateFromPrd(custom, 'T.SK-010', root)?.prd).toBe('T.SK-010');
    // ...and a metachar-exploiting id does NOT ("TXSK" must not match "T.SK")
    expect(() => candidateFromPrd(custom, 'TXSK-010', root)).toThrow(/malformed id/);
  });
});
