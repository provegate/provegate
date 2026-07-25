import { afterEach, describe, expect, it } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, type WorkflowConfig } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';

const cfg = DEFAULT_CONFIG;
const manifest = defaultManifest(cfg);

const READY_PRD = [
  '## 4. Functional Requirements',
  '',
  '1. **FR-1 — Thing**: does a thing.',
  '   - **Targets:** `packages/x/src/a.ts`',
  '2. **FR-2 — Other**: does another.',
  '   - **Targets:** `packages/x/src/b.ts`',
  '',
  '## 9. Open Questions',
  '',
  '- (none — resolved)',
  '',
  '## 11. Verification Commands',
  '',
  '| FR   | Command |',
  '| ---- | ------- |',
  '| FR-1 | `pnpm test test/a.test.ts` |',
  '| FR-2 | `pnpm test test/b.test.ts` |',
  '',
  '## 12. DO NOT (Anti-Patterns)',
  '',
  '- DO NOT do bad things.',
].join('\n');

describe('lintPrd structural checks', () => {
  it('accepts a structurally ready PRD', () => {
    expect(lintPrd(cfg, manifest, READY_PRD)).toEqual({ ok: true, issues: [] });
  });

  it('flags missing Targets, missing §11 row, unrunnable row', () => {
    const noTargets = READY_PRD.replace('   - **Targets:** `packages/x/src/a.ts`\n', '');
    expect(lintPrd(cfg, manifest, noTargets).issues).toContainEqual(
      expect.stringContaining('FR-1: missing **Targets:**'),
    );

    const noRow = READY_PRD.replace('| FR-2 | `pnpm test test/b.test.ts` |\n', '');
    expect(lintPrd(cfg, manifest, noRow).issues).toContainEqual(
      expect.stringContaining('FR-2: no §11 verification row'),
    );

    const badRow = READY_PRD.replace('`pnpm test test/b.test.ts`', '`manual inspection`');
    expect(lintPrd(cfg, manifest, badRow).issues).toContainEqual(
      expect.stringContaining('FR-2: §11 row has no runnable command'),
    );
  });

  it('flags missing DO NOT, open questions, bare placeholders', () => {
    const noDont = READY_PRD.replace('## 12. DO NOT (Anti-Patterns)', '## 12. Notes');
    expect(lintPrd(cfg, manifest, noDont).issues).toContainEqual(
      expect.stringContaining('missing DO NOT'),
    );

    const openQ = READY_PRD.replace('- (none — resolved)', '- What about auth?');
    expect(lintPrd(cfg, manifest, openQ).issues).toContainEqual(
      expect.stringContaining('Open Questions not empty'),
    );

    const tbd = READY_PRD.replace('does a thing.', 'does a thing. TBD later.');
    expect(lintPrd(cfg, manifest, tbd).issues).toContainEqual(
      expect.stringContaining('placeholder text'),
    );
  });

  it('backtick-quoted lint vocabulary is exempt (W4)', () => {
    const cites = READY_PRD.replace('does a thing.', 'does a thing. The lint bans `TBD`/`???`.');
    expect(lintPrd(cfg, manifest, cites).ok).toBe(true);
  });

  it('reports unsafe §11 commands at lint time', () => {
    const unsafe = READY_PRD.replace('`pnpm test test/a.test.ts`', '`pnpm run $(evil)`');
    expect(lintPrd(cfg, manifest, unsafe).issues).toContainEqual(
      expect.stringContaining('unsafe §11 command'),
    );
  });
});

describe('hard caps', () => {
  const capped: GatesManifest = {
    ...manifest,
    hardCaps: [
      {
        id: 'route-deny-test',
        when: { targetsMatch: ['packages/x/**'] },
        requireLine: 'Deny test: `[^`]+`',
        message: 'targets touch packages/x — name a runnable deny test line',
      },
    ],
  };

  it('fires when targets match and the required line is absent', () => {
    const report = lintPrd(cfg, capped, READY_PRD);
    expect(report.issues).toContainEqual(expect.stringContaining('hard cap route-deny-test'));
  });

  it('passes when the required line is present or targets do not match', () => {
    const withLine = `${READY_PRD}\n\nDeny test: \`pnpm test test/deny.test.ts\`\n`;
    expect(lintPrd(cfg, capped, withLine).ok).toBe(true);

    const elsewhere: GatesManifest = {
      ...capped,
      hardCaps: [{ ...capped.hardCaps[0]!, when: { targetsMatch: ['apps/api/**'] } }],
    };
    expect(lintPrd(cfg, elsewhere, READY_PRD).ok).toBe(true);
  });
});

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('FR-2 memory readiness gate', () => {

  const on: WorkflowConfig = { ...cfg, memory: { ...cfg.memory, enabled: true } };

  const record = (over: Partial<Record<string, string>> = {}): string =>
    [
      '---',
      `name: ${over.name ?? 'sample-record'}`,
      'description: a sample record for the readiness gate',
      'type: gotcha',
      'scope: workflow',
      `status: ${over.status ?? 'active'}`,
      ...(over.status === 'superseded' ? ['superseded-by: other-record'] : []),
      ...(over.watch === undefined ? [] : [`watch: [${over.watch}]`]),
      '---',
      '',
      'Body prose.',
      '',
      '**Why:** because the trap is real.',
      '',
      '**How to apply:** do the safe thing.',
      '',
    ].join('\n');

  /** A repo-shaped fixture: `_brain/INDEX.md` plus the records it points at. */
  function fixture(records: Array<{ slug: string; content: string; adr?: boolean }>): string {
    const root = mkdtempSync(join(tmpdir(), 'provegate-memory-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    mkdirSync(join(root, '_brain/adr'), { recursive: true });
    const pointers = records.map((r) => {
      const dir = r.adr === true ? 'adr' : 'learnings';
      writeFileSync(join(root, '_brain', dir, `${r.slug}.md`), r.content);
      return `- [${r.slug}](${dir}/${r.slug}.md) — hook text`;
    });
    writeFileSync(join(root, '_brain/INDEX.md'), `# index\n\n${pointers.join('\n')}\n`);
    return root;
  }

  const withMemory = (inputs: string[], outputs: string[], durable?: string[]): string =>
    [
      READY_PRD,
      '',
      '## Memory Inputs',
      '',
      ...inputs,
      '',
      '## Memory Outputs',
      '',
      ...outputs,
      '',
      '## Durable Artifacts',
      '',
      ...(durable ?? ['- `_brain/learnings/new-thing.md` — the durable fact']),
      '',
    ].join('\n');

  const VALID = withMemory(
    ['- applied: `sample-record` — it shaped this work item.'],
    ['- learning: `_brain/learnings/new-thing.md` — the durable fact expected.'],
  );

  it('accepts a complete declaration against a real store', () => {
    const root = fixture([{ slug: 'sample-record', content: record() }]);
    expect(lintPrd(on, manifest, VALID, root)).toEqual({ ok: true, issues: [] });
  });

  describe('the disabled path is unchanged (W-disabled)', () => {
    it('a PRD with no memory sections still passes, root or not', () => {
      const root = fixture([]);
      expect(lintPrd(cfg, manifest, READY_PRD, root)).toEqual({ ok: true, issues: [] });
      expect(lintPrd(cfg, manifest, READY_PRD)).toEqual({ ok: true, issues: [] });
    });

    it('the store is never read, so a broken store cannot fail a disabled repo', () => {
      const root = mkdtempSync(join(tmpdir(), 'provegate-memory-'));
      roots.push(root);
      // no _brain at all — the enabled path reports this, the disabled one cannot
      expect(lintPrd(cfg, manifest, READY_PRD, root).issues).toEqual([]);
      expect(lintPrd(on, manifest, READY_PRD, root).issues).toContainEqual(
        expect.stringContaining("memory index '_brain/INDEX.md' does not exist"),
      );
    });

    it('historical PRDs are not rewritten: a disabled repo ignores a malformed section', () => {
      const malformed = withMemory(['- considered: `x` — nope.'], ['- none']);
      expect(lintPrd(cfg, manifest, malformed).issues).toEqual([]);
    });
  });

  describe('each rejection reason, separately', () => {
    it('missing Memory Inputs section', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      const content = VALID.replace('## Memory Inputs', '## Something Else');
      expect(lintPrd(on, manifest, content, root).issues).toContainEqual(
        'missing `## Memory Inputs` section',
      );
    });

    it('missing Memory Outputs section', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      const content = VALID.replace('## Memory Outputs', '## Something Else');
      expect(lintPrd(on, manifest, content, root).issues).toContainEqual(
        'missing `## Memory Outputs` section',
      );
    });

    it('an input naming a record that does not exist', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      const content = VALID.replace('`sample-record`', '`no-such-record`');
      expect(lintPrd(on, manifest, content, root).issues).toEqual([
        "Memory Inputs: 'no-such-record' is not an active indexed record",
      ]);
    });

    it('an input naming a superseded record', () => {
      const root = fixture([
        { slug: 'sample-record', content: record({ status: 'superseded' }) },
      ]);
      expect(lintPrd(on, manifest, VALID, root).issues).toEqual([
        "Memory Inputs: 'sample-record' is superseded — it cannot be an input",
      ]);
    });

    it('an input naming a record that does not validate', () => {
      const broken = record().replace('type: gotcha', 'type: nonsense');
      const root = fixture([{ slug: 'sample-record', content: broken }]);
      // Both gates report the store problem now: reporting it only at close let
      // readiness pass a PRD that could never close (phase 6 round 2, P2-7).
      expect(lintPrd(on, manifest, VALID, root).issues).toEqual([
        "Memory Inputs: 'sample-record' does not validate — repair the record first",
        "memory store: indexed record 'sample-record' does not validate, so its watch cannot " +
          'be evaluated — repair it before closing',
      ]);
    });

    it('an UNRELATED broken record also fails readiness, not just the close', () => {
      const root = fixture([
        { slug: 'sample-record', content: record() },
        {
          slug: 'other-record',
          content: record({ name: 'other-record' }).replace('type: gotcha', 'type: nonsense'),
        },
      ]);
      expect(lintPrd(on, manifest, VALID, root).issues).toEqual([
        "memory store: indexed record 'other-record' does not validate, so its watch cannot " +
          'be evaluated — repair it before closing',
      ]);
    });

    it('the same record named twice', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      const content = withMemory(
        [
          '- applied: `sample-record` — it shaped this work item.',
          '- reviewed: `sample-record` — on second thought it did not.',
        ],
        ['- learning: `_brain/learnings/new-thing.md` — the durable fact expected.'],
      );
      expect(lintPrd(on, manifest, content, root).issues).toEqual([
        "Memory Inputs: 'sample-record' is named more than once",
      ]);
    });

    it('a watched target with no disposition names the record and the normalized path', () => {
      const root = fixture([
        { slug: 'sample-record', content: record() },
        {
          slug: 'watcher-record',
          content: record({ name: 'watcher-record', watch: 'packages/x/src/**' }),
        },
      ]);
      const issues = lintPrd(on, manifest, VALID, root).issues;
      expect(issues).toEqual([
        "Memory Inputs: 'watcher-record' watches packages/x/src/a.ts, packages/x/src/b.ts — " +
          'a declared target overlaps it, so it needs an input disposition',
      ]);
    });

    it('a `::SymbolName` target still matches a path-scoped watch', () => {
      const root = fixture([
        {
          slug: 'watcher-record',
          content: record({ name: 'watcher-record', watch: 'packages/x/src/a.ts' }),
        },
      ]);
      const symbolScoped = VALID.replace(
        '`packages/x/src/a.ts`',
        '`packages/x/src/a.ts::doThing`',
      ).replace('- applied: `sample-record` — it shaped this work item.', '- none — nothing yet.');
      expect(lintPrd(on, manifest, symbolScoped, root).issues).toEqual([
        "Memory Inputs: 'watcher-record' watches packages/x/src/a.ts — a declared target " +
          'overlaps it, so it needs an input disposition',
      ]);
    });

    it('naming the watching record clears it — a watch is a trigger, not a rewrite', () => {
      const root = fixture([
        {
          slug: 'watcher-record',
          content: record({ name: 'watcher-record', watch: 'packages/x/src/**' }),
        },
      ]);
      const named = withMemory(
        ['- not-applicable: `watcher-record` — its watch matched, but the trap is elsewhere.'],
        ['- learning: `_brain/learnings/new-thing.md` — the durable fact expected.'],
      );
      expect(lintPrd(on, manifest, named, root)).toEqual({ ok: true, issues: [] });
    });

    it('a superseded record never fires a watch', () => {
      const root = fixture([
        {
          slug: 'watcher-record',
          content: record({
            name: 'watcher-record',
            watch: 'packages/x/src/**',
            status: 'superseded',
          }),
        },
      ]);
      const noInputs = withMemory(
        ['- none — no active record is relevant.'],
        ['- learning: `_brain/learnings/new-thing.md` — the durable fact expected.'],
      );
      expect(lintPrd(on, manifest, noInputs, root)).toEqual({ ok: true, issues: [] });
    });

    it('an output missing from Durable Artifacts', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      const content = withMemory(
        ['- applied: `sample-record` — it shaped this work item.'],
        ['- learning: `_brain/learnings/new-thing.md` — the durable fact expected.'],
        ['- `_brain/learnings/other-thing.md` — a different file'],
      );
      expect(lintPrd(on, manifest, content, root).issues).toEqual([
        "Memory Outputs: '_brain/learnings/new-thing.md' is not listed in Durable Artifacts",
      ]);
    });

    it('a dangling index pointer is a store issue, not a missing record', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      rmSync(join(root, '_brain/learnings/sample-record.md'));
      expect(lintPrd(on, manifest, VALID, root).issues).toEqual([
        'memory index: dangling pointer to learnings/sample-record.md',
        "Memory Inputs: 'sample-record' is not an active indexed record",
      ]);
    });

    it('an unindexed record is not resolvable, even though the file exists', () => {
      const root = fixture([{ slug: 'sample-record', content: record() }]);
      writeFileSync(
        join(root, '_brain/learnings/unindexed.md'),
        record({ name: 'unindexed' }),
      );
      const content = VALID.replace('`sample-record`', '`unindexed`');
      expect(lintPrd(on, manifest, content, root).issues).toEqual([
        "Memory Inputs: 'unindexed' is not an active indexed record",
      ]);
    });

    it('enabled without a root fails closed rather than skipping', () => {
      expect(lintPrd(on, manifest, VALID).issues).toEqual([
        'memory is enabled but the readiness lint received no repository root',
      ]);
    });
  });
});

describe('self-application (W4 dogfood)', () => {
  it('PRD-002 itself passes the lint (wip or archived)', () => {
    // The artifact moves wip→completed at close; accept either location so
    // this test survives its own PRD's archive (lesson from PRD-001's lease test).
    const candidates = ['wip', 'completed'].map((state) =>
      fileURLToPath(
        new URL(`../../../_prds/${state}/prd-002-gate-manifest-runner.md`, import.meta.url),
      ),
    );
    const prdPath = candidates.find((p) => existsSync(p));
    expect(prdPath, 'PRD-002 artifact not found in wip or completed').toBeDefined();
    const report = lintPrd(cfg, manifest, readFileSync(prdPath!, 'utf8'));
    expect(report.issues).toEqual([]);
  });
});

describe('FR Targets are read as an entry, not as one line', () => {
  // A real FR wraps its target list. Reading only the marker line hid every path
  // after the first — measured at 7 of ~30 on PRD-018 — which silently narrowed
  // both the hard-cap rules and the memory watch gate.
  const WRAPPED = [
    '## 4. Functional Requirements',
    '',
    '1. **FR-1 — Thing**: does a thing.',
    '   - **Targets:** `packages/x/src/a.ts`,',
    '     `packages/x/src/b.ts`,',
    '     `packages/y/src/c.ts` (new)',
    '   - **Note:** `packages/z/prose-only.ts` is discussed, not targeted.',
    '',
    '## 9. Open Questions',
    '',
    '- (none)',
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command |',
    '| ---- | ------- |',
    '| FR-1 | `pnpm test test/a.test.ts` |',
    '',
    '## 12. DO NOT (Anti-Patterns)',
    '',
    '- DO NOT do bad things.',
  ].join('\n');

  const capFor = (glob: string): GatesManifest => ({
    ...manifest,
    hardCaps: [
      {
        id: 'cap',
        when: { targetsMatch: [glob] },
        requireLine: 'Deny test: `[^`]+`',
        message: 'targets matched',
      },
    ],
  });

  it('hard caps keep the LEGACY line-only target set, memory or not', () => {
    // Deliberate, and the reason is the default-off promise: the hard-cap engine
    // runs in every repository, so widening what it sees would fire caps that
    // the previous release did not — a behavior change in a memory-DISABLED
    // repo. The wider read is scoped to the memory gate below; migrating the
    // cap side is a recorded deferral, not a silent ride-along.
    expect(lintPrd(cfg, capFor('packages/y/**'), WRAPPED).ok).toBe(true);
    const on: WorkflowConfig = { ...cfg, memory: { ...cfg.memory, enabled: true } };
    expect(lintPrd(on, capFor('packages/y/**'), WRAPPED).issues).not.toContainEqual(
      expect.stringContaining('hard cap cap'),
    );
  });

  it('and still fires on the first line', () => {
    expect(lintPrd(cfg, capFor('packages/x/src/a.ts'), WRAPPED).issues).toContainEqual(
      expect.stringContaining('hard cap cap'),
    );
  });

  it('a path in a sibling bullet is prose, not a target', () => {
    expect(lintPrd(cfg, capFor('packages/z/**'), WRAPPED).ok).toBe(true);
  });

  it('the watch gate sees continuation targets too', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-memory-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/learnings/watcher-record.md'),
      [
        '---',
        'name: watcher-record',
        'description: watches the wrapped target',
        'type: gotcha',
        'scope: workflow',
        'status: active',
        'watch: [packages/y/**]',
        '---',
        '',
        'Body.',
        '',
        '**Why:** real.',
        '',
        '**How to apply:** safe.',
        '',
      ].join('\n'),
    );
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      '# index\n\n- [watcher](learnings/watcher-record.md) — hook\n',
    );
    const on: WorkflowConfig = { ...cfg, memory: { ...cfg.memory, enabled: true } };
    const content = [
      WRAPPED,
      '',
      '## Memory Inputs',
      '',
      '- none — nothing applied.',
      '',
      '## Memory Outputs',
      '',
      '- none — nothing durable expected.',
      '',
    ].join('\n');
    expect(lintPrd(on, manifest, content, root).issues).toEqual([
      "Memory Inputs: 'watcher-record' watches packages/y/src/c.ts — a declared target " +
        'overlaps it, so it needs an input disposition',
    ]);
  });
});

describe('phase 6 round 8 regressions', () => {
  it('[R8-P2-4] readiness reports an ambiguous Durable Artifacts section', () => {
    // It discarded the flag and Phase 7 refused the same PRD later. A gate that
    // passes what a later gate must reject is a trap, not a gate.
    const root = mkdtempSync(join(tmpdir(), 'provegate-memory-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(join(root, '_brain/INDEX.md'), '# index\n');
    const on: WorkflowConfig = { ...cfg, memory: { ...cfg.memory, enabled: true } };
    const content = [
      READY_PRD,
      '',
      '## Memory Inputs',
      '',
      '- none — nothing applied.',
      '',
      '## Memory Outputs',
      '',
      '- none — nothing durable expected.',
      '',
      '## Durable Artifacts',
      '',
      '- `docs/a.md` — one',
      '',
      '## Durable Artifacts',
      '',
      '- `docs/b.md` — two',
      '',
    ].join('\n');
    expect(lintPrd(on, manifest, content, root).issues).toContainEqual(
      '`## Durable Artifacts` is declared more than once — exactly one section is parseable',
    );
  });
});
