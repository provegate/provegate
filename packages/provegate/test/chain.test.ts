import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest } from '../src/core/gates/manifest.js';
import {
  buildGateChain,
  parseFromPhase,
  planChain,
  runChain,
  shouldSkipGate,
} from '../src/core/run/chain.js';
import { declaredArtifactsStrict } from '../src/core/run/durable.js';
import type { StateRecord } from '../src/core/state/build.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function record(overrides: Partial<StateRecord> = {}): StateRecord {
  return {
    prd: 'PRD-002',
    number: 2,
    slug: 'x',
    status: 'Code Complete',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: 'operator-gated',
    artifacts: { prd: '_prds/wip/p.md', readiness: '', tasks: '_tasks/wip/t.md', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
    ...overrides,
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

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-chain-'));
  roots.push(root);
  return root;
}

describe('buildGateChain / planChain', () => {
  it('assembles phases 4-7 + merge gate in order', () => {
    const chain = buildGateChain({
      config: cfg,
      manifest: defaultManifest(cfg),
      root: tempRoot(),
      record: record(),
      prdContent: PRD_WITH_11,
      tasksContent: '| independent-review | x | passed |',
      changedFiles: [],
      prdClass: 'infra',
    });
    expect(chain.map((g) => g.phase)).toEqual([
      '4 Implementation',
      '5 Testing',
      '6 Final Auditing',
      '7 Learning',
      'merge gate',
    ]);
    const plan = planChain(chain, null);
    expect(plan.join('\n')).toContain('pnpm check-types');
    expect(plan.join('\n')).toContain('node -e');
  });

  it('marks unsafe §11 commands in the plan', () => {
    const chain = buildGateChain({
      config: cfg,
      manifest: defaultManifest(cfg),
      root: tempRoot(),
      record: record(),
      prdContent: PRD_WITH_11.replace('`node -e "process.exit(0)"`', '`pnpm run $(evil)`'),
      tasksContent: '',
      changedFiles: [],
      prdClass: 'infra',
    });
    expect(planChain(chain, null).join('\n')).toContain('UNSAFE');
  });
});

describe('from-phase handling', () => {
  it('parses 4-7 and merge; rejects junk', () => {
    expect(parseFromPhase('5')).toBe(5);
    expect(parseFromPhase('merge')).toBe('merge');
    expect(parseFromPhase(null)).toBeNull();
    expect(() => parseFromPhase('9')).toThrow(/invalid --from-phase/);
  });

  it('skips earlier phases; merge skips command phases but NEVER the operator gate', () => {
    const gate4 = { phase: '4 Implementation' };
    const gate6 = { phase: '6 Final Auditing' };
    const mergeGate = { phase: 'merge gate' };
    expect(shouldSkipGate(gate4, 5)).toBe(true);
    expect(shouldSkipGate(gate6, 5)).toBe(false);
    expect(shouldSkipGate(gate4, 'merge')).toBe(true);
    expect(shouldSkipGate(mergeGate, 'merge')).toBe(false);
  });
});

describe('runChain', () => {
  const manifest = { ...defaultManifest(cfg), phases: { '4': [] as string[] } };

  function chainFor(root: string, prdContent: string, operatorRows = 0) {
    return buildGateChain({
      config: cfg,
      manifest,
      root,
      record: record({
        task: {
          status: 'Unknown',
          checkedCount: 0,
          uncheckedCount: 0,
          operatorHandoffCount: operatorRows,
        },
      }),
      prdContent,
      tasksContent: '',
      changedFiles: [],
      prdClass: 'infra',
    });
  }

  it('executes safe §11 commands and stops at the failing review gate with results so far', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, PRD_WITH_11),
      fromPhase: null,
    });
    expect(outcome.results).toContainEqual(['5 Testing: node -e "process.exit(0)"', 'passed']);
    expect(outcome.stopped?.phase).toBe('6 Final Auditing');
  });

  it('fires the onResult reporter per gate, in order, matching the results (FR-3)', () => {
    const root = tempRoot();
    const reported: [string, string, boolean][] = [];
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, PRD_WITH_11),
      fromPhase: null,
      onResult: (phase, label, ok) => reported.push([phase, label, ok]),
    });
    // One report per result row, same order, same pass/fail — the CLI renders a
    // live status line from each (core stays silent).
    expect(reported.map(([p, l]) => `${p}: ${l}`)).toEqual(outcome.results.map((r) => r[0]));
    expect(reported.map(([, , ok]) => ok)).toEqual(outcome.results.map((r) => r[1] === 'passed'));
    expect(reported.some(([, , ok]) => ok)).toBe(true);
  });

  it('stops with "PRD gap" when §11 has no runnable rows', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, '## 11. Verification Commands\n\nnothing\n'),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('PRD gap');
  });

  it('refuses unsafe commands instead of executing them', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(
        root,
        PRD_WITH_11.replace('`node -e "process.exit(0)"`', '`pnpm run $(evil)`'),
      ),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('unsafe §11 command refused');
  });

  it('a failing command stops the chain with a FAILED row', () => {
    const root = tempRoot();
    const outcome = runChain({
      config: cfg,
      root,
      id: 'PRD-002',
      chain: chainFor(root, PRD_WITH_11.replace('process.exit(0)', 'process.exit(1)')),
      fromPhase: null,
    });
    expect(outcome.stopped?.why).toContain('command failed');
    expect(outcome.results).toContainEqual(['5 Testing: node -e "process.exit(1)"', 'FAILED']);
  });
});

describe('codex review regressions (round 1)', () => {
  it('the operator merge gate is never skippable — gate land cannot bypass acceptance', () => {
    expect(shouldSkipGate({ phase: 'merge gate' }, 'merge')).toBe(false);
    expect(shouldSkipGate({ phase: 'merge gate' }, 7)).toBe(false);
  });

  it('hand-built manifests with unsafe phase commands are refused at execution', () => {
    const root = tempRoot();
    const evil = {
      ...defaultManifest(cfg),
      phases: { '4': ['git push origin main'] },
    };
    const chain = buildGateChain({
      config: cfg,
      manifest: evil,
      root,
      record: record(),
      prdContent: PRD_WITH_11,
      tasksContent: '',
      changedFiles: [],
      prdClass: 'infra',
    });
    const outcome = runChain({ config: cfg, root, id: 'PRD-002', chain, fromPhase: null });
    expect(outcome.stopped?.why).toContain('unsafe');
  });
});

// ---------------------------------------------------------------------------
// FR-4 / FR-5 — the Phase 7 memory close gates.
// ---------------------------------------------------------------------------

const memOn = { ...cfg, memory: { ...cfg.memory, enabled: true } };

const RECORD_MD = (name: string, watch?: string): string =>
  [
    '---',
    `name: ${name}`,
    'description: a record the close gate resolves',
    'type: gotcha',
    'scope: workflow',
    'status: active',
    ...(watch === undefined ? [] : [`watch: [${watch}]`]),
    '---',
    '',
    'Body.',
    '',
    '**Why:** the trap is real.',
    '',
    '**How to apply:** do the safe thing.',
    '',
  ].join('\n');

interface PrdParts {
  inputs?: string[];
  outputs?: string[];
  durable?: string[];
  changelog?: string[];
}

const prd = (parts: PrdParts = {}): string =>
  [
    '# PRD-002',
    '',
    '## Memory Inputs',
    '',
    ...(parts.inputs ?? ['- applied: `sample-record` — it shaped this work item.']),
    '',
    '## Memory Outputs',
    '',
    ...(parts.outputs ?? ['- learning: `_brain/learnings/new-thing.md` — the durable fact.']),
    '',
    '## Durable Artifacts',
    '',
    ...(parts.durable ?? ['- `_brain/learnings/new-thing.md` — the durable fact']),
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command |',
    '| ---- | ------- |',
    '| FR-1 | `node -e "process.exit(0)"` |',
    '',
    '## Changelog',
    '',
    '| Date | Author | Changes |',
    '| ---- | ------ | ------- |',
    ...(parts.changelog ?? ['| 2026-07-25 | agent | initial draft |']),
    '',
  ].join('\n');

/**
 * A committed repo: the baseline PRD lives on `main`, as FR-5 requires, and the
 * work lands on a feature branch.
 *
 * The feature commit is the point. The close gate reads `git diff --name-status`
 * against the merge base, so a fixture that only writes files on `main` proves
 * nothing about capture — the diff is empty and every "declared output is in the
 * diff" assertion would be testing the fallback rather than the real path.
 */
function gitRepo(files: Record<string, string>, branchFiles: Record<string, string> = {}): string {
  const root = tempRoot();
  const run = (args: string[]): void => {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  };
  const write = (path: string, content: string): void => {
    mkdirSync(join(root, dirname(path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  run(['init', '-b', 'main']);
  run(['config', 'user.email', 'gate@example.test']);
  run(['config', 'user.name', 'gate']);
  run(['config', 'commit.gpgsign', 'false']);
  for (const [path, content] of Object.entries(files)) write(path, content);
  run(['add', '-A']);
  run(['commit', '-m', 'baseline', '--no-verify']);
  if (Object.keys(branchFiles).length > 0) {
    run(['checkout', '-b', 'feat/x']);
    for (const [path, content] of Object.entries(branchFiles)) write(path, content);
    run(['add', '-A']);
    run(['commit', '-m', 'feature', '--no-verify']);
  }
  return root;
}

/** The record a PRD promises, as the feature branch actually captures it. */
const CAPTURED_RECORD = {
  '_brain/learnings/new-thing.md': RECORD_MD('new-thing'),
};

const STORE = (watch?: string): Record<string, string> => ({
  '_brain/INDEX.md': [
    '# index',
    '',
    '- [sample](learnings/sample-record.md) — hook',
    // The promised output is indexed here; the feature branch supplies the file.
    '- [new thing](learnings/new-thing.md) — hook',
    ...(watch === undefined ? [] : ['- [watcher](learnings/watcher-record.md) — hook']),
    '',
  ].join('\n'),
  '_brain/learnings/sample-record.md': RECORD_MD('sample-record'),
  ...(watch === undefined
    ? {}
    : { '_brain/learnings/watcher-record.md': RECORD_MD('watcher-record', watch) }),
});

/**
 * Commit `prdContent` on a FEATURE branch, so the fixture models what the close
 * actually judges.
 *
 * The weakening gate compares against the base ref and reads the COMMITTED
 * working copy, because `ensureCheckoutClean` resets tracked `_prds/` on the way
 * to the merge — an approval that is only in the working tree is discarded
 * before it can land. Passing `prdContent` as a bare argument used to model a
 * PRD nobody had committed, which is precisely the state the gate now refuses.
 */
function commitPrdOnBranch(root: string, prdContent: string): void {
  const run = (args: string[]): void => {
    execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  };
  const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim();
  if (branch === 'main') run(['checkout', '-b', 'feat/x']);
  mkdirSync(join(root, '_prds/wip'), { recursive: true });
  writeFileSync(join(root, '_prds/wip/p.md'), prdContent);
  // ONLY the PRD. `add -A` would sweep up whatever else a fixture arranged on
  // disk — a record replaced by a directory, a deliberately uncommitted store —
  // and commit away the very state the test is about.
  run(['add', '--', '_prds/wip/p.md']);
  try {
    run(['commit', '-m', 'working prd', '--no-verify']);
  } catch {
    // nothing to commit — the branch already carries this exact content
  }
}

function chainFor(options: {
  root: string;
  prdContent: string;
  changedFiles: string[];
  config?: typeof cfg;
  rec?: StateRecord;
}) {
  commitPrdOnBranch(options.root, options.prdContent);
  return buildGateChain({
    config: options.config ?? memOn,
    manifest: defaultManifest(options.config ?? memOn),
    root: options.root,
    record: options.rec ?? record(),
    prdContent: options.prdContent,
    tasksContent: '| independent-review | x | passed |',
    changedFiles: options.changedFiles,
    prdClass: 'infra',
  });
}

const gate = (chain: ReturnType<typeof buildGateChain>, needle: string) => {
  const found = chain.find((g) => (g.label ?? '').includes(needle));
  expect(found, `no gate labelled ${needle}`).toBeDefined();
  return found!.fn!();
};

describe('FR-4 memory close gates', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];

  it('passes when every declared output is durable and in the diff', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    expect(gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'declared outputs')).toEqual(
      { ok: true },
    );
  });

  it('refuses a declared output that never reached the merge diff', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const result = gate(chainFor({ root, prdContent: prd(), changedFiles: [] }), 'declared outputs');
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'_brain/learnings/new-thing.md' is declared but was not added");
    expect(result.why).toContain('a deletion is not a capture');
  });

  it('refuses an output that is not also a Durable Artifact', () => {
    const content = prd({ durable: ['- `_brain/learnings/other.md` — something else'] });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE() });
    const result = gate(chainFor({ root, prdContent: content, changedFiles: CHANGED }), 'declared outputs');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('is not listed in Durable Artifacts');
  });

  it('refuses when the diff changes a watched file with no input disposition', () => {
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE('packages/x/**') });
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: [...CHANGED, 'packages/x/src/a.ts'] }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/src/a.ts");
    expect(result.why).toContain('it needs an input disposition');
  });

  it('accepts the same diff once the record carries a disposition', () => {
    const content = prd({
      inputs: ['- not-applicable: `watcher-record` — matched, but the trap is elsewhere.'],
    });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE('packages/x/**') }, CAPTURED_RECORD);
    expect(
      gate(
        chainFor({ root, prdContent: content, changedFiles: [...CHANGED, 'packages/x/src/a.ts'] }),
        'declared outputs',
      ),
    ).toEqual({ ok: true });
  });

  it('fails closed on a missing section and on an unreadable store', () => {
    const noOutputs = prd().replace('## Memory Outputs', '## Something Else');
    const root = gitRepo({ '_prds/wip/p.md': noOutputs, ...STORE() });
    expect(gate(chainFor({ root, prdContent: noOutputs, changedFiles: CHANGED }), 'declared outputs').why).toContain(
      'missing `## Memory Outputs` section',
    );

    const noStore = gitRepo({ '_prds/wip/p.md': prd() });
    expect(gate(chainFor({ root: noStore, prdContent: prd(), changedFiles: CHANGED }), 'declared outputs').why).toContain(
      "memory index '_brain/INDEX.md' does not exist",
    );
  });

  it('--dry-run prints every memory check it would perform', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const plan = planChain(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), null).join('\n');
    expect(plan).toContain('memory: declared outputs in Durable Artifacts and the merge diff');
    expect(plan).toContain('memory: no weakening against main');
  });

  it('the configured validator runs after capture, never before', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const withValidator = { ...memOn, memory: { ...memOn.memory, verifyCommand: 'pnpm verify:brain' } };
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED, config: withValidator });
    const labels = chain.map((g) => g.label ?? (g.cmds ?? []).map((c) => c.cmd).join(','));
    const capture = labels.findIndex((l) => l.includes('declared outputs'));
    const validator = labels.findIndex((l) => l.includes('configured validator'));
    expect(capture).toBeGreaterThanOrEqual(0);
    expect(validator).toBeGreaterThan(capture);
  });

  it('adds no gate at all when memory is disabled', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED, config: cfg });
    expect(chain.some((g) => (g.label ?? '').startsWith('memory:'))).toBe(false);
    expect(chain.map((g) => g.phase)).toEqual([
      '4 Implementation',
      '5 Testing',
      '6 Final Auditing',
      '7 Learning',
      'merge gate',
    ]);
  });
});

describe('FR-5 base-ref weakening', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    '- adr: `_brain/adr/ADR-0001-x.md` — the decision.',
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    '- `_brain/adr/ADR-0001-x.md` — the decision',
  ];

  it('passes when the working declaration matches the baseline', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    expect(gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'no weakening')).toEqual({
      ok: true,
    });
  });

  it('allows appending an output discovered during implementation', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const appended = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    expect(gate(chainFor({ root, prdContent: appended, changedFiles: CHANGED }), 'no weakening')).toEqual({
      ok: true,
    });
  });

  it('W2 — a PRD absent from the base ref names the cause AND the remedy', () => {
    const root = gitRepo({ 'README.md': 'no PRD committed here', ...STORE() });
    const result = gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toBe(
      'PRD-002 has no committed copy on `main`; commit the PRD to the base branch before ' +
        'closing, or reclaim with `--worktree`',
    );
  });

  it('refuses removal outright when the PRD is eligible for autonomous close', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const root = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() });
    const result = gate(
      chainFor({
        root,
        prdContent: prd(),
        changedFiles: CHANGED,
        rec: record({ autonomousClose: 'eligible' }),
      }),
      'no weakening',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('eligible for autonomous close, which refuses outright');
    expect(result.why).toContain("removed — the baseline promised '_brain/adr/ADR-0001-x.md'");
  });

  it('an operator-gated PRD needs a changelog approval naming the path', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const root = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() });
    const result = gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no owner approval row in the Changelog naming');
    expect(result.why).toContain("'_brain/adr/ADR-0001-x.md'");
  });

  it('and, with the approval, still needs a valid owner acceptance', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const root = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() });
    const approved = prd({
      changelog: [
        '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — the decision moved to PRD-022 |',
      ],
    });
    const result = gate(chainFor({ root, prdContent: approved, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no valid owner acceptance entry exists for PRD-002');
  });

  it('passes as waived when both the changelog row and the acceptance exist', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — the decision moved to PRD-022 |',
      ],
    });
    const root = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({
        schemaVersion: 1,
        acceptances: [
          {
            prd: 'PRD-002',
            owner: 'owner',
            items: ['memory output removal: `_brain/adr/ADR-0001-x.md`'],
            reason: 'the decision moved to PRD-022',
            date: '2026-07-25',
            method: 'interactive',
          },
        ],
      }),
      ...STORE(),
    });
    const result = gate(chainFor({ root, prdContent: approved, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(true);
    expect(result.waived).toBe(true);
  });

  it('type change and replacement with `none` are both weakening', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    const retyped = prd({
      outputs: ['- adr: `_brain/learnings/new-thing.md` — same path, different type.'],
    });
    const retypedResult = gate(chainFor({ root, prdContent: retyped, changedFiles: CHANGED }), 'no weakening');
    expect(retypedResult.why).toContain("was declared 'learning' on the base ref and is now 'adr'");

    const noned = prd({ outputs: ['- none — turns out nothing durable came of it.'] });
    const nonedResult = gate(chainFor({ root, prdContent: noned, changedFiles: CHANGED }), 'no weakening');
    expect(nonedResult.why).toContain('the working PRD declares `none`');
  });
});

// ---------------------------------------------------------------------------
// Phase 6 round 1 — regressions for the seven CRITICAL findings that touch the
// runner. Each one reproduces the reviewer's counterexample and asserts the
// refusal, so a revert of the fix reddens the suite rather than the reviewer.
// ---------------------------------------------------------------------------

describe('phase 6 round 1 regressions', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    '- adr: `_brain/adr/ADR-0001-x.md` — the decision.',
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    '- `_brain/adr/ADR-0001-x.md` — the decision',
  ];
  const OWNER_ROW =
    '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — moved to PRD-022 |';

  const acceptance = (items: string[]): string =>
    JSON.stringify({
      schemaVersion: 1,
      acceptances: [
        {
          prd: 'PRD-002',
          owner: 'owner',
          items,
          reason: 'the decision moved to PRD-022',
          date: '2026-07-25',
          method: 'interactive',
        },
      ],
    });

  it('[P1-1] a base-ref copy with no Memory Outputs section is not an empty promise', () => {
    // The reviewer pointed the comparison at README.md and got {ok:true}: zero
    // baseline entries read as "nothing was promised".
    const root = gitRepo({ '_prds/wip/p.md': '# PRD-002\n\nno sections at all.\n', ...STORE() });
    const result = gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('cannot serve as a baseline');
    expect(result.why).toContain('has no `## Memory Outputs` section');
  });

  it('[P1-1] a base-ref copy whose Memory Outputs do not parse also fails closed', () => {
    const broken = prd({ outputs: ['- learning: `_brain/learnings/x.md`'] }); // no rationale
    const root = gitRepo({ '_prds/wip/p.md': broken, ...STORE() });
    const result = gate(chainFor({ root, prdContent: prd(), changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('do not parse');
  });

  it('[P1-1] a baseline that deliberately declared `none` still promises nothing', () => {
    const noned = prd({ outputs: ['- none — nothing durable was expected.'], durable: ['- none'] });
    const root = gitRepo({ '_prds/wip/p.md': noned, ...STORE() }, CAPTURED_RECORD);
    expect(gate(chainFor({ root, prdContent: noned, changedFiles: CHANGED }), 'no weakening')).toEqual(
      { ok: true },
    );
  });

  it('[P1-2] an owner row that merely MENTIONS the path does not approve the removal', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const mentioned = prd({
      changelog: ['| 2026-07-25 | owner | documentation audit covered _brain/adr/ADR-0001-x.md |'],
    });
    const root = gitRepo(
      { '_prds/wip/p.md': baseline, '_state/acceptances.json': acceptance(['anything']), ...STORE() },
      CAPTURED_RECORD,
    );
    const result = gate(
      chainFor({ root, prdContent: mentioned, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no owner approval row in the Changelog naming');
  });

  it('[P1-2] an acceptance that does not name the path does not waive it', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({ changelog: [OWNER_ROW] });
    const root = gitRepo(
      {
        '_prds/wip/p.md': baseline,
        '_state/acceptances.json': acceptance(['staging smoke test signed off']),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const result = gate(chainFor({ root, prdContent: approved, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('does not name');
    expect(result.why).toContain("'_brain/adr/ADR-0001-x.md'");
  });

  it('[P1-3] deleting a promised record is not a capture, though the path is in the diff', () => {
    // git diff --name-only lists deletions, so the old membership test passed.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE(), ...CAPTURED_RECORD });
    execFileSync('git', ['checkout', '-b', 'feat/x'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['rm', '-q', '_brain/learnings/new-thing.md'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'remove the record', '--no-verify'], {
      cwd: root,
      stdio: 'ignore',
    });
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('was not added or modified by the merge diff');
    expect(result.why).toContain('a deletion is not a capture');
  });

  it('[P1-4] the close resolves inputs, so a slug that resolves to nothing is refused', () => {
    const content = prd({ inputs: ['- applied: `no-such-record` — it shaped this.'] });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'no-such-record' is not an active indexed record");
  });

  it('[P1-4] an indexed record that will not parse blocks the close, watch or not', () => {
    const store = STORE();
    store['_brain/learnings/sample-record.md'] = RECORD_MD('sample-record').replace(
      'type: gotcha',
      'type: nonsense',
    );
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo({ '_prds/wip/p.md': content, ...store }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("indexed record 'sample-record' does not validate");
    expect(result.why).toContain('its watch cannot be evaluated');
  });
});

describe('phase 6 round 2 self-attack (before the independent round returned)', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    '- adr: `_brain/adr/ADR-0001-x.md` — the decision.',
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    '- `_brain/adr/ADR-0001-x.md` — the decision',
  ];

  it('an acceptance naming a LONGER sibling path does not waive the real one', () => {
    // Found attacking round 1's own fix: `includes(path)` is true for
    // `_brain/adr/ADR-0001-x.md.bak`, so an acceptance about a backup would
    // have waived removal of the record itself. Fails open, which is the one
    // direction a waiver may never fail in.
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: ['| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — moved |'],
    });
    const root = gitRepo(
      {
        '_prds/wip/p.md': baseline,
        '_state/acceptances.json': JSON.stringify({
          schemaVersion: 1,
          acceptances: [
            {
              prd: 'PRD-002',
              owner: 'owner',
              items: ['archived _brain/adr/ADR-0001-x.md.bak during cleanup'],
              reason: 'unrelated cleanup of a backup file',
              date: '2026-07-25',
              method: 'interactive',
            },
          ],
        }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const result = gate(chainFor({ root, prdContent: approved, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('does not name');
  });

  it('and the exact path, however it is punctuated in prose, still waives it', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: ['| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — moved |'],
    });
    // Two exact forms only: the item IS the path, or it QUOTES the path.
    // Inferring boundaries from prose punctuation is what failed open twice.
    for (const item of [
      '_brain/adr/ADR-0001-x.md',
      'removed `_brain/adr/ADR-0001-x.md`, moved to PRD-022',
    ]) {
      const root = gitRepo(
        {
          '_prds/wip/p.md': baseline,
          '_state/acceptances.json': JSON.stringify({
            schemaVersion: 1,
            acceptances: [
              {
                prd: 'PRD-002',
                owner: 'owner',
                items: [item],
                reason: 'the decision moved to PRD-022',
                date: '2026-07-25',
                method: 'interactive',
              },
            ],
          }),
          ...STORE(),
        },
        CAPTURED_RECORD,
      );
      const result = gate(
        chainFor({ root, prdContent: approved, changedFiles: CHANGED }),
        'no weakening',
      );
      expect(result.ok, `${item}: ${result.why ?? ''}`).toBe(true);
      expect(result.waived).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 6 round 2 — the fix layer's own defects. Round 1's remediations opened
// these, which is why the second round attacked the fixes rather than the code
// they replaced.
// ---------------------------------------------------------------------------

describe('phase 6 round 2 regressions', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];

  it('[R2-P1-1] a stale `origin/base` cannot lend its commits to this feature', () => {
    // The reviewer measured it on this very repository: origin/main one commit
    // behind main made the origin-based range 52 files where the local-base
    // range is 50. A record added on unpushed local base would have counted as
    // this PRD's capture. The gate now asks the LOCAL base, which is what the
    // merge actually targets.
    // Ordering is the whole test, and round 3 caught the first version getting it
    // wrong: the branch must fork AFTER the local-only commit, or the record is
    // absent from the feature range under BOTH implementations and the assertion
    // proves nothing. Here `origin/main` is pinned before that commit, so the
    // origin-first range WOULD have contained the record and passed.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    execFileSync('git', ['branch', 'origin/main'], { cwd: root, stdio: 'ignore' });
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(join(root, '_brain/learnings/new-thing.md'), RECORD_MD('new-thing'));
    execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'someone else added the record', '--no-verify'], {
      cwd: root,
      stdio: 'ignore',
    });
    execFileSync('git', ['checkout', '-b', 'feat/x'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(root, 'unrelated.txt'), 'feature work\n');
    execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'feature', '--no-verify'], { cwd: root, stdio: 'ignore' });
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('was not added or modified by the merge diff');
  });

  it('[R2-P1-2] a fenced example section cannot shadow the real one', () => {
    const shadowed = [
      '# PRD-002',
      '',
      'An example of the grammar:',
      '',
      '```markdown',
      '## Memory Outputs',
      '',
      '- none — the example promises nothing.',
      '```',
      '',
      prd(),
    ].join('\n');
    const root = gitRepo({ '_prds/wip/p.md': shadowed, ...STORE() }, CAPTURED_RECORD);
    // The real section is malformed on the base ref, so the baseline must refuse
    // rather than read the fenced `none` and permit every removal.
    const broken = shadowed.replace(
      '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
      '- learning: `_brain/learnings/new-thing.md`',
    );
    const brokenRoot = gitRepo({ '_prds/wip/p.md': broken, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root: brokenRoot, prdContent: prd(), changedFiles: CHANGED }),
      'no weakening',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('do not parse');
    // and the unfenced document still parses normally
    expect(
      gate(chainFor({ root, prdContent: shadowed, changedFiles: CHANGED }), 'declared outputs'),
    ).toEqual({ ok: true });
  });

  it('[R2-P1-3] a fenced Changelog cannot approve a removal', () => {
    const TWO_OUTPUTS = [
      '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
      '- adr: `_brain/adr/ADR-0001-x.md` — the decision.',
    ];
    const TWO_DURABLE = [
      '- `_brain/learnings/new-thing.md` — the durable fact',
      '- `_brain/adr/ADR-0001-x.md` — the decision',
    ];
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    // BEFORE the real section: the old parser took the first heading, so a
    // forgery placed after it was never read and the assertion was vacuous.
    const forged = [
      '# PRD-002',
      '',
      'For reference, an approval row looks like this:',
      '',
      '```markdown',
      '## Changelog',
      '',
      '| Date | Author | Changes |',
      '| ---- | ------ | ------- |',
      '| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` |',
      '```',
      '',
      prd(),
    ].join('\n');
    const root = gitRepo(
      {
        '_prds/wip/p.md': baseline,
        '_state/acceptances.json': JSON.stringify({
          schemaVersion: 1,
          acceptances: [
            {
              prd: 'PRD-002',
              owner: 'owner',
              items: ['_brain/adr/ADR-0001-x.md'],
              reason: 'moved to PRD-022',
              date: '2026-07-25',
              method: 'interactive',
            },
          ],
        }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const result = gate(chainFor({ root, prdContent: forged, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no owner approval row in the Changelog naming');
  });

  it('[R2-P1-4] an ordinary `.md` file outside the store is not a memory record', () => {
    const content = prd({
      outputs: ['- learning: `docs/release-note.md` — a durable fact, allegedly.'],
      durable: ['- `docs/release-note.md` — a durable fact'],
    });
    const root = gitRepo(
      { '_prds/wip/p.md': content, ...STORE() },
      { 'docs/release-note.md': '# note\n' },
    );
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: ['docs/release-note.md'] }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("is declared 'learning', so it must live under '_brain/learnings/'");
  });

  it('[R2-P1-4] an `adr` output may not sit in the learnings directory', () => {
    const content = prd({
      outputs: ['- adr: `_brain/learnings/new-thing.md` — a decision in the wrong drawer.'],
    });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("must live under '_brain/adr/'");
  });

  it('[R2-P1-5] a DIRECTORY named like a record is not a capture', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    // replace the captured file with a directory of the same name
    rmSync(join(root, '_brain/learnings/new-thing.md'));
    mkdirSync(join(root, '_brain/learnings/new-thing.md'), { recursive: true });
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no file exists at that path after the merge');
  }, 20_000);

  it('[R2-P2-9] the capture check is the diff status, not the injected file list', () => {
    // The reviewer's charge: replacing capturedDiffFiles with `return null`
    // would have left every earlier assertion green, because the tests inject
    // changedFiles and existsSync did the rejecting. Here the file EXISTS and
    // is named in changedFiles, and the only thing that can refuse it is the
    // real diff status — the feature branch never touched it.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE(), ...CAPTURED_RECORD });
    execFileSync('git', ['checkout', '-b', 'feat/x'], { cwd: root, stdio: 'ignore' });
    writeFileSync(join(root, 'unrelated.txt'), 'something else\n');
    execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'unrelated work', '--no-verify'], {
      cwd: root,
      stdio: 'ignore',
    });
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('was not added or modified by the merge diff');
  });
});

describe('phase 6 round 3 regressions', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];

  it('[R3-P1-1] `##` and its text on separate lines is not a heading', () => {
    // `\s+` matches a newline, so `##\nMemory Outputs` satisfied the pattern and
    // the contract read a forged non-heading as the real section.
    const forged = [
      '# PRD-002',
      '',
      '##',
      'Memory Outputs',
      '',
      '- none — forged, and not a heading at all.',
      '',
      prd(),
    ].join('\n');
    const root = gitRepo({ '_prds/wip/p.md': forged, ...STORE() }, CAPTURED_RECORD);
    // The real section still parses; the forgery contributes nothing.
    expect(
      gate(chainFor({ root, prdContent: forged, changedFiles: CHANGED }), 'declared outputs'),
    ).toEqual({ ok: true });
  });

  it('[R3-P1-2] a `~~~` fence is not closed by a ``` line inside it', () => {
    // The toggle version exposed everything after that ``` line, so a section
    // the author fenced OFF became live again — a forged contract, fail open.
    const shadowed = [
      '# PRD-002',
      '',
      '~~~markdown',
      '## Memory Outputs',
      '',
      '- none — this example is fenced off.',
      '```',
      '## Memory Outputs',
      '',
      '- none — and so is this one.',
      '~~~',
      '',
      prd(),
    ].join('\n');
    const decl = gate(
      chainFor({
        root: gitRepo({ '_prds/wip/p.md': shadowed, ...STORE() }, CAPTURED_RECORD),
        prdContent: shadowed,
        changedFiles: CHANGED,
      }),
      'declared outputs',
    );
    // Exactly one real section survives, so the contract reads the author's.
    expect(decl).toEqual({ ok: true });
  });

  it('[R3-P1-3] a file in the store is not a record until the INDEX points at it', () => {
    // Placement and lstat both succeed; only indexing separates a captured
    // record from an arbitrary Markdown file dropped in the right directory.
    const unindexed = {
      ...STORE(),
      '_brain/INDEX.md': '# index\n\n- [sample](learnings/sample-record.md) — hook\n',
    };
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...unindexed }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('is not an indexed, valid record');
  });

  it('[R3-P1-3] and an output declared `adr` that the store holds as a learning fails', () => {
    const content = prd({
      outputs: ['- adr: `_brain/learnings/new-thing.md` — filed in the wrong drawer.'],
      durable: ['- `_brain/learnings/new-thing.md` — the durable fact'],
    });
    const root = gitRepo({ '_prds/wip/p.md': content, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    // Placement subsumes the explicit type check whenever the index sits
    // directly under the root, which is the shipped layout — so assert the
    // reason that actually fires rather than accepting either one.
    expect(result.why).toContain("must live under '_brain/adr/'");
  });

  it('[R3-P1-4] a comma-bearing sibling filename does not waive the real path', () => {
    // The prose-tokenizing matcher split `x.md,backup.md` into a token equal to
    // the promised path. A comma is legal in a filename; intent is not.
    const TWO_OUTPUTS = [
      '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
      '- adr: `_brain/adr/ADR-0001-x.md` — the decision.',
    ];
    const TWO_DURABLE = [
      '- `_brain/learnings/new-thing.md` — the durable fact',
      '- `_brain/adr/ADR-0001-x.md` — the decision',
    ];
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: ['| 2026-07-25 | owner | dropped `_brain/adr/ADR-0001-x.md` — moved |'],
    });
    const root = gitRepo(
      {
        '_prds/wip/p.md': baseline,
        '_state/acceptances.json': JSON.stringify({
          schemaVersion: 1,
          acceptances: [
            {
              prd: 'PRD-002',
              owner: 'owner',
              items: ['_brain/adr/ADR-0001-x.md,backup.md'],
              reason: 'a different file entirely',
              date: '2026-07-25',
              method: 'interactive',
            },
          ],
        }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const result = gate(chainFor({ root, prdContent: approved, changedFiles: CHANGED }), 'no weakening');
    expect(result.ok).toBe(false);
    expect(result.why).toContain('does not name');
  });

  it('[R3-P2-8] a SYMLINK to a valid record is not a capture', () => {
    // lstat, not stat: following the link would re-admit "point at something
    // that already exists" as though the promised fact had been written.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    rmSync(join(root, '_brain/learnings/new-thing.md'));
    symlinkSync('sample-record.md', join(root, '_brain/learnings/new-thing.md'));
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('no file exists at that path after the merge');
  });

  it('[R3-P2-8] an index pointer resolving to a directory reports, never throws', () => {
    // Found by this suite: `existsSync` is true for a directory, so `readRecord`
    // threw EISDIR out of a gate whose contract is to report.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    rmSync(join(root, '_brain/learnings/new-thing.md'));
    mkdirSync(join(root, '_brain/learnings/new-thing.md'), { recursive: true });
    const result = gate(
      chainFor({ root, prdContent: prd(), changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('is not a regular file');
  });
});

describe('phase 6 round 7 regressions (integration)', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];

  it('[R7-P2-7] the CHAIN uses the strict durable reader when memory is enabled', () => {
    // Asserting `declaredArtifactsStrict` in isolation proved nothing about the
    // gate: reverting chain.ts to the legacy reader left that test green and
    // reopened the fenced-Durable bypass. This drives the chain itself.
    const shadowed = [
      '# PRD-002',
      '',
      '```markdown',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/new-thing.md` — quoted, not declared',
      '```',
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
      '- `_brain/learnings/new-thing.md` — the record',
      '- `docs/must-change.md` — a promise the feature branch never touched',
      '',
      '## 11. Verification Commands',
      '',
      '| FR   | Command |',
      '| ---- | ------- |',
      '| FR-1 | `node -e "process.exit(0)"` |',
      '',
    ].join('\n');
    const root = gitRepo({ '_prds/wip/p.md': shadowed, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: shadowed, changedFiles: CHANGED }),
      'durable artifacts touched',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('docs/must-change.md');
  });

  it('[R7-P1-1] a twice-declared Durable Artifacts section refuses at the chain', () => {
    const twice = [
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
      '- `_brain/learnings/a.md` — one',
      '',
      '## Durable Artifacts',
      '',
      '- `_brain/learnings/b.md` — two',
      '',
      '## 11. Verification Commands',
      '',
      '| FR   | Command |',
      '| ---- | ------- |',
      '| FR-1 | `node -e "process.exit(0)"` |',
      '',
    ].join('\n');
    const root = gitRepo({ '_prds/wip/p.md': twice, ...STORE() }, CAPTURED_RECORD);
    const result = gate(
      chainFor({ root, prdContent: twice, changedFiles: CHANGED }),
      'durable artifacts touched',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('declared more than once');
  });
});

describe('phase 6 round 20 regressions — the enforcement machinery', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const SECOND_OUTPUT = '_brain/adr/ADR-0001-x.md';
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    `- adr: \`${SECOND_OUTPUT}\` — the decision.`,
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    `- \`${SECOND_OUTPUT}\` — the decision`,
  ];

  it('[R20-1] `gate land` cannot skip the memory close gates', () => {
    // `--from-phase=merge` skipped every phase gate. The operator gate was
    // already exempt; the memory gates need the same exemption for a stronger
    // reason — they are what binds the merge to the capture, so skippable they
    // let an operator-gated PRD remove every promise, capture nothing, and land.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED });
    const memoryGates = chain.filter((g) => (g.label ?? '').startsWith('memory:'));
    expect(memoryGates.length).toBeGreaterThanOrEqual(2);
    for (const g of memoryGates) {
      expect(shouldSkipGate(g, 'merge'), g.label).toBe(false);
    }
    // And the plan for `gate land` still prints them.
    const plan = planChain(chain, 'merge').join('\n');
    expect(plan).toContain('no weakening');
    expect(plan).toContain('declared outputs');
  });

  it('[R20-2] deleting a watching record and its pointer cannot erase the trigger', () => {
    // The obligation used to be derived only from the branch's own store, so a
    // branch could change a watched file, delete the watcher AND its INDEX
    // pointer, and leave a smaller store that is perfectly self-consistent.
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo(
      { '_prds/wip/p.md': content, ...STORE('packages/x/**') },
      { ...CAPTURED_RECORD },
    );
    // The branch removes the watcher and the pointer that names it.
    rmSync(join(root, '_brain/learnings/watcher-record.md'));
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      '# INDEX\n\n- [new thing](learnings/new-thing.md) — hook\n',
    );
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: [...CHANGED, 'packages/x/src/a.ts'] }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/src/a.ts");
  });

  it('[R20-3] an uncommitted approval cannot waive a committed weakening', () => {
    // `ensureCheckoutClean` resets tracked `_prds/` on the way to the merge, so
    // an approval that lives only in the working tree is read by the gate and
    // then discarded before it can land.
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const root = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() }, CAPTURED_RECORD);
    const chain = buildGateChain({
      config: memOn,
      manifest: defaultManifest(memOn),
      root,
      record: record(),
      // The working copy the gate is handed, never committed anywhere.
      prdContent: prd(),
      tasksContent: '| independent-review | x | passed |',
      changedFiles: CHANGED,
      prdClass: 'infra',
    });
    const found = chain.find((g) => (g.label ?? '').includes('no weakening'))!;
    const result = found.fn!();
    // An uncommitted weakening is not a weakening: the gate judges the copy the
    // merge will land, so what lives only in the working tree is a non-event in
    // BOTH directions.
    expect(result).toEqual({ ok: true });

    // The case that matters: the weakening IS committed, and the approval that
    // would have waived it lives nowhere in the landed history.
    const committedWeakening = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() }, CAPTURED_RECORD);
    const armed = gate(
      chainFor({ root: committedWeakening, prdContent: prd(), changedFiles: CHANGED }),
      'no weakening',
    );
    expect(armed.ok).toBe(false);
    expect(armed.why).toContain('no owner approval row in the Changelog');
  });

  it('[R20-6] a schema-invalid acceptance store cannot authorize a weakening', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        `| 2026-07-25 | owner | removed \`${SECOND_OUTPUT}\` — the decision moved to PRD-022 |`,
      ],
    });
    const entry = {
      prd: 'PRD-002',
      owner: 'owner',
      items: [`memory output removal: \`${SECOND_OUTPUT}\``],
      reason: 'the decision moved to PRD-022',
      date: '2026-07-25',
      method: 'interactive',
    };
    // No `schemaVersion` — the store the documented schema rejects.
    const noVersion = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({ acceptances: [entry] }),
      ...STORE(),
    });
    const missing = gate(
      chainFor({ root: noVersion, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(missing.ok).toBe(false);
    expect(missing.why).toContain('schemaVersion');

    // An entry missing a required field, in an otherwise valid store.
    const withoutMethod: Record<string, unknown> = { ...entry };
    delete withoutMethod.method;
    const noMethod = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({
        schemaVersion: 1,
        acceptances: [withoutMethod],
      }),
      ...STORE(),
    });
    const incomplete = gate(
      chainFor({ root: noMethod, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(incomplete.ok).toBe(false);
    expect(incomplete.why).toContain('`method`');

    // An unexpected top-level key is refused too.
    const extraKey = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({
        schemaVersion: 1,
        acceptances: [entry],
        notes: 'anything',
      }),
      ...STORE(),
    });
    const unexpected = gate(
      chainFor({ root: extraKey, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(unexpected.ok).toBe(false);
    expect(unexpected.why).toContain('unexpected top-level field');
  });
});

describe('phase 6 round 21 regressions — what the round-20 fixes did not reach', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const SECOND_OUTPUT = '_brain/adr/ADR-0001-x.md';
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    `- adr: \`${SECOND_OUTPUT}\` — the decision.`,
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    `- \`${SECOND_OUTPUT}\` — the decision`,
  ];

  it('[R21-1] a branch cannot switch the contract off on its way through the gate', () => {
    // Gate policy was decided from the WORKING configuration, so a branch could
    // set `memory.enabled: false`, drop every baseline output, omit every
    // watched input, and close with no memory gate built at all — the contract
    // disabled by the very merge it was meant to govern.
    const root = gitRepo(
      {
        '_prds/wip/p.md': prd(),
        'workflow.config.json': JSON.stringify({ memory: { enabled: true } }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const off = { ...memOn, memory: { ...memOn.memory, enabled: false } };
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED, config: off });
    const guard = chain.find((g) => (g.label ?? '').includes('disabling the contract'));
    expect(guard, 'no guard gate for the disabling transition').toBeDefined();
    expect(shouldSkipGate(guard!, 'merge')).toBe(false);
    const result = guard!.fn!();
    expect(result.ok).toBe(false);
    expect(result.why).toContain('would disable the memory contract');
  });

  it('[R21-2] `gate land` cannot skip the validator the pack installs', () => {
    // The internal gates were made non-skippable and the MANIFEST phase-7
    // commands were not — and the practices pack wires `verify:brain` there
    // while leaving `memory.verifyCommand` empty.
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    const withValidator = {
      ...defaultManifest(memOn),
      phases: { ...defaultManifest(memOn).phases, '7': ['node -e "process.exit(0)"'] },
    };
    const chain = buildGateChain({
      config: memOn,
      manifest: withValidator,
      root,
      record: record(),
      prdContent: prd(),
      tasksContent: '| independent-review | x | passed |',
      changedFiles: CHANGED,
      prdClass: 'infra',
    });
    const phase7 = chain.filter((g) => g.phase === '7 Learning' && g.cmds !== undefined);
    expect(phase7.length).toBeGreaterThan(0);
    for (const g of phase7) expect(shouldSkipGate(g, 'merge')).toBe(false);
  });

  it('[R21-3] relocating the index cannot erase the base store', () => {
    // The base store was loaded with the BRANCH's `memory.index`, so a branch
    // could point the config at a new index, build a valid smaller store there,
    // and the base loader would look for the NEW path on the base, find nothing,
    // and return an empty store — every base watch gone in one config edit.
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo(
      {
        '_prds/wip/p.md': content,
        'workflow.config.json': JSON.stringify({
          memory: { enabled: true, index: '_brain/INDEX.md' },
        }),
        ...STORE('packages/x/**'),
      },
      CAPTURED_RECORD,
    );
    // The branch relocates the store and leaves the watcher behind.
    const relocated = {
      ...memOn,
      memory: { ...memOn.memory, index: '_brain/new/INDEX.md' },
    };
    mkdirSync(join(root, '_brain/new/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/new/INDEX.md'),
      '# INDEX\n\n- [new thing](learnings/new-thing.md) — hook\n',
    );
    writeFileSync(join(root, '_brain/new/learnings/new-thing.md'), RECORD_MD('new-thing'));
    const result = gate(
      chainFor({
        root,
        prdContent: content,
        changedFiles: [...CHANGED, 'packages/x/src/a.ts'],
        config: relocated,
      }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/src/a.ts");
  });

  it('[R21-4] narrowing a watch does not remove the obligation either', () => {
    // Round 20 closed deletion; the working store still WON for a slug present
    // in both, so rewriting `watch: [packages/x/**]` to `watch: [docs/**]` and
    // then changing `packages/x/a.ts` matched neither glob.
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo(
      { '_prds/wip/p.md': content, ...STORE('packages/x/**') },
      { ...CAPTURED_RECORD },
    );
    writeFileSync(
      join(root, '_brain/learnings/watcher-record.md'),
      RECORD_MD('watcher-record', 'docs/**'),
    );
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: [...CHANGED, 'packages/x/src/a.ts'] }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/src/a.ts");
  });

  it('[R21-6] acceptance field TYPES are validated, and so is every entry', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        `| 2026-07-25 | owner | removed \`${SECOND_OUTPUT}\` — the decision moved to PRD-022 |`,
      ],
    });
    const good = {
      prd: 'PRD-002',
      owner: 'owner',
      items: [`memory output removal: \`${SECOND_OUTPUT}\``],
      reason: 'the decision moved to PRD-022',
      date: '2026-07-25',
      method: 'interactive',
    };
    const store = (acceptances: unknown[]): Record<string, string> => ({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({ schemaVersion: 1, acceptances }),
      ...STORE(),
    });
    // A wrong-typed field in the selected entry.
    const badTypes = gitRepo(store([{ ...good, date: 123, method: null }]));
    const typed = gate(
      chainFor({ root: badTypes, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(typed.ok).toBe(false);

    // A non-string item beside the real one.
    const badItem = gitRepo(store([{ ...good, items: [42, `\`${SECOND_OUTPUT}\``] }]));
    const item = gate(
      chainFor({ root: badItem, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(item.ok).toBe(false);

    // A malformed NEIGHBOUR entry invalidates the store the owner signed.
    const badNeighbour = gitRepo(store([{ prd: 'PRD-777' }, good]));
    const neighbour = gate(
      chainFor({ root: badNeighbour, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(neighbour.ok).toBe(false);
    expect(neighbour.why).toContain('acceptances[0]');
  });
});

describe('phase 6 round 21 — the rename source and the root-level artifact', () => {
  it('[R21-5] a record watching a renamed file’s SOURCE still fires', () => {
    // `--name-only` reports a rename as the destination alone, so a record
    // watching the path the merge moved AWAY from never fired on the merge that
    // moved it. `capturedDiffFiles` computed both sides and the close then
    // passed the caller's list instead — evidence gathered and discarded.
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo(
      { '_prds/wip/p.md': content, 'packages/x/old.ts': 'export const a = 1;\n', ...STORE('packages/x/old.ts') },
      CAPTURED_RECORD,
    );
    execFileSync('git', ['mv', 'packages/x/old.ts', 'packages/x/new.ts'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-qm', 'rename', '--no-verify'], { cwd: root, stdio: 'ignore' });
    // The caller's list carries only what `--name-only` reports.
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: ['_brain/learnings/new-thing.md', 'packages/x/new.ts'] }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/old.ts");
  });

  it('[R21-11] a root-level Durable Artifact is not silently dropped', () => {
    expect(declaredArtifactsStrict('## Durable Artifacts\n\n- `RELEASING.md` — the note\n')).toEqual(
      { paths: ['RELEASING.md'], ambiguous: false },
    );
    // A prose word in backticks is still not a path.
    expect(
      declaredArtifactsStrict('## Durable Artifacts\n\n- none — `nothing` durable here\n').paths,
    ).toEqual([]);
  });
});

describe('phase 6 round 22 regressions — one step over each round-21 fix', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const SECOND_OUTPUT = '_brain/adr/ADR-0001-x.md';
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    `- adr: \`${SECOND_OUTPUT}\` — the decision.`,
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    `- \`${SECOND_OUTPUT}\` — the decision`,
  ];
  const GOOD_ENTRY = {
    prd: 'PRD-002',
    owner: 'owner',
    items: [`memory output removal: \`${SECOND_OUTPUT}\``],
    reason: 'the decision moved to PRD-022',
    date: '2026-07-25',
    method: 'interactive',
  };

  it('[R22-1] an uncommitted acceptance cannot authorize the weakening either', () => {
    // Round 20 required the PRD to be committed and left the acceptance — the
    // other half of the same waiver — reading the working tree, which
    // `ensureCheckoutClean` resets on the way to the merge.
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        `| 2026-07-25 | owner | removed \`${SECOND_OUTPUT}\` — the decision moved to PRD-022 |`,
      ],
    });
    const root = gitRepo({ '_prds/wip/p.md': baseline, ...STORE() }, CAPTURED_RECORD);
    const chain = chainFor({ root, prdContent: approved, changedFiles: CHANGED });
    // The acceptance appears only AFTER the branch was committed.
    mkdirSync(join(root, '_state'), { recursive: true });
    writeFileSync(
      join(root, '_state/acceptances.json'),
      JSON.stringify({ schemaVersion: 1, acceptances: [GOOD_ENTRY] }),
    );
    const result = chain.find((g) => (g.label ?? '').includes('no weakening'))!.fn!();
    expect(result.ok).toBe(false);
    expect(result.why).toContain('is not committed as it stands');
  });

  it('[R22-2] a SPARSE base config does not hand the branch its own index back', () => {
    // A real base config names `enabled` and `entrypoints` and no `index`, and
    // the overlay was onto the BRANCH's memory config — so relocating the index
    // made the "base" config carry the new path and the base store loaded empty.
    const content = prd({ inputs: ['- none — nothing applied.'] });
    const root = gitRepo(
      {
        '_prds/wip/p.md': content,
        'workflow.config.json': JSON.stringify({
          memory: { enabled: true, entrypoints: ['AGENT_BOOTSTRAP.md'] },
        }),
        ...STORE('packages/x/**'),
      },
      CAPTURED_RECORD,
    );
    const relocated = { ...memOn, memory: { ...memOn.memory, index: '_brain/new/INDEX.md' } };
    mkdirSync(join(root, '_brain/new/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/new/INDEX.md'),
      '# INDEX\n\n- [new thing](learnings/new-thing.md) — hook\n',
    );
    writeFileSync(join(root, '_brain/new/learnings/new-thing.md'), RECORD_MD('new-thing'));
    const result = gate(
      chainFor({
        root,
        prdContent: content,
        changedFiles: [...CHANGED, 'packages/x/src/a.ts'],
        config: relocated,
      }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'watcher-record' watches packages/x/src/a.ts");
  });

  it('[R22-3] deleting the store validator is refused, not silently honoured', () => {
    // Marking the existing phase-7 commands non-skippable did nothing about
    // REMOVING them: empty `phases.7` and empty `verifyCommand` ran no validator.
    const root = gitRepo(
      {
        '_prds/wip/p.md': prd(),
        'gates.manifest.json': JSON.stringify({ phases: { '7': ['pnpm verify:brain'] } }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED });
    const guard = chain.find((g) => (g.label ?? '').includes('validator may not be removed'));
    expect(guard, 'no guard for a removed validator').toBeDefined();
    expect(shouldSkipGate(guard!, 'merge')).toBe(false);
    expect(guard!.fn!().ok).toBe(false);
  });

  it('[R22-9] an acceptance date must be ISO, and the owner must be configured', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        `| 2026-07-25 | owner | removed \`${SECOND_OUTPUT}\` — the decision moved to PRD-022 |`,
      ],
    });
    const store = (entry: Record<string, unknown>): Record<string, string> => ({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({ schemaVersion: 1, acceptances: [entry] }),
      ...STORE(),
    });
    const prose = gitRepo(store({ ...GOOD_ENTRY, date: 'July 25, 2026' }));
    expect(
      gate(chainFor({ root: prose, prdContent: approved, changedFiles: CHANGED }), 'no weakening').ok,
    ).toBe(false);
    const stranger = gitRepo(store({ ...GOOD_ENTRY, owner: 'someone-else' }));
    const result = gate(
      chainFor({ root: stranger, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('is not a configured owner');
  });

  it('[R22-12] a record RENAME can still be closed by naming what was removed', () => {
    // The base/working union made the base slug's watch fire, and the working
    // store no longer carried that slug — so naming it was rejected and not
    // naming it failed the watch. The obligation was unsatisfiable.
    // BOTH slugs: the base watcher, and the renamed record which watches the
    // same paths and so raises its own obligation.
    const content = prd({
      inputs: [
        '- applied: `watcher-record` — renamed to `watcher-v2`.',
        '- applied: `watcher-v2` — the renamed record, same watch.',
      ],
    });
    const root = gitRepo(
      { '_prds/wip/p.md': content, ...STORE('packages/x/**') },
      { ...CAPTURED_RECORD },
    );
    rmSync(join(root, '_brain/learnings/watcher-record.md'));
    writeFileSync(
      join(root, '_brain/learnings/watcher-v2.md'),
      RECORD_MD('watcher-v2', 'packages/x/**'),
    );
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      [
        '# INDEX',
        '',
        '- [sample](learnings/sample-record.md) — hook',
        '- [new thing](learnings/new-thing.md) — hook',
        '- [watcher](learnings/watcher-v2.md) — hook',
        '',
      ].join('\n'),
    );
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: [...CHANGED, 'packages/x/src/a.ts'] }),
      'declared outputs',
    );
    // ASSERT SUCCESS. Two absent substrings were satisfied by any other failure,
    // and by an undefined `why` — a regression that cannot tell "the rename
    // closes" from "something else broke" proves neither.
    expect(result).toEqual({ ok: true });
  });
});

describe('phase 6 round 23 — the enforcement machinery, one step over', () => {
  const CHANGED = ['_brain/learnings/new-thing.md'];
  const SECOND_OUTPUT = '_brain/adr/ADR-0001-x.md';
  const TWO_OUTPUTS = [
    '- learning: `_brain/learnings/new-thing.md` — the durable fact.',
    `- adr: \`${SECOND_OUTPUT}\` — the decision.`,
  ];
  const TWO_DURABLE = [
    '- `_brain/learnings/new-thing.md` — the durable fact',
    `- \`${SECOND_OUTPUT}\` — the decision`,
  ];
  const GOOD_ENTRY = {
    prd: 'PRD-002',
    owner: 'owner',
    items: [`memory output removal: \`${SECOND_OUTPUT}\``],
    reason: 'the decision moved to PRD-022',
    date: '2026-07-25',
    method: 'interactive',
  };

  it('[R23-2] a base config with `memory: null` fails closed, not open', () => {
    // Valid JSON is not a valid POLICY: `null` spread to nothing, the defaults'
    // `enabled: false` came back, and no memory gate was built at all.
    const root = gitRepo(
      {
        '_prds/wip/p.md': prd(),
        'workflow.config.json': JSON.stringify({ memory: null }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const off = { ...memOn, memory: { ...memOn.memory, enabled: false } };
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED, config: off });
    const guard = chain.find((g) => (g.label ?? '').includes('disabling the contract'));
    expect(guard, 'no guard gate for the disabling transition').toBeDefined();
    expect(guard!.fn!().ok).toBe(false);
  });

  it('[R23-3] swapping the validator for an unrelated command is still removing it', () => {
    const root = gitRepo(
      {
        '_prds/wip/p.md': prd(),
        'gates.manifest.json': JSON.stringify({ phases: { '7': ['pnpm verify:brain'] } }),
        ...STORE(),
      },
      CAPTURED_RECORD,
    );
    const swapped = {
      ...defaultManifest(memOn),
      phases: { ...defaultManifest(memOn).phases, '7': ['pnpm lint'] },
    };
    const chain = buildGateChain({
      config: memOn,
      manifest: swapped,
      root,
      record: record(),
      prdContent: prd(),
      tasksContent: '| independent-review | x | passed |',
      changedFiles: CHANGED,
      prdClass: 'infra',
    });
    const guard = chain.find((g) => (g.label ?? '').includes('validator may not be removed'));
    expect(guard, 'a swapped validator must still be a removal').toBeDefined();
    expect(guard!.fn!().why).toContain('verify:brain');
  });

  it('[R23-1] an ordinary operator acceptance must be committed too', () => {
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() }, CAPTURED_RECORD);
    const withRows: StateRecord = { ...record(), task: { ...record().task, operatorHandoffCount: 1 } };
    const chain = chainFor({ root, prdContent: prd(), changedFiles: CHANGED, rec: withRows });
    // Written only in the working tree, after the branch was committed.
    mkdirSync(join(root, '_state'), { recursive: true });
    writeFileSync(
      join(root, '_state/acceptances.json'),
      JSON.stringify({ schemaVersion: 1, acceptances: [{ ...GOOD_ENTRY, items: ['1.1'] }] }),
    );
    const merge = chain.find((g) => g.phase === 'merge gate')!.fn!();
    expect(merge.ok).toBe(false);
    expect(merge.why).toContain('is not committed');
  });

  it('[R23-15] an impossible date and a metacharacter prefix are both refused', () => {
    const baseline = prd({ outputs: TWO_OUTPUTS, durable: TWO_DURABLE });
    const approved = prd({
      changelog: [
        `| 2026-07-25 | owner | removed \`${SECOND_OUTPUT}\` — the decision moved to PRD-022 |`,
      ],
    });
    // `2026-02-30` satisfies the ISO shape and `Date.parse` slides it to March 2.
    const impossible = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({
        schemaVersion: 1,
        acceptances: [{ ...GOOD_ENTRY, date: '2026-02-30' }],
      }),
      ...STORE(),
    });
    const result = gate(
      chainFor({ root: impossible, prdContent: approved, changedFiles: CHANGED }),
      'no weakening',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain('real calendar date');

    // The OTHER half of this test's name, which it did not exercise: an
    // unescaped prefix is a regex, so `P.D` matched `PXD-001` and a store entry
    // naming a work item that does not exist read as a decision about one that
    // does.
    const dotted = { ...memOn, idPattern: { ...memOn.idPattern, prefix: 'P.D' } };
    const forged = gitRepo({
      '_prds/wip/p.md': baseline,
      '_state/acceptances.json': JSON.stringify({
        schemaVersion: 1,
        acceptances: [{ ...GOOD_ENTRY, prd: 'PXD-002' }],
      }),
      ...STORE(),
    });
    const escaped = gate(
      chainFor({ root: forged, prdContent: approved, changedFiles: CHANGED, config: dotted }),
      'no weakening',
    );
    expect(escaped.ok).toBe(false);
    expect(escaped.why).toContain('is not a work-item id');
  });

  it('[R23-14] a SUPERSEDED base record does not rescue a disposition', () => {
    // The record is SUPERSEDED on the base and ABSENT from the branch, so the
    // only thing that could rescue the disposition is the base-slug set — which
    // must contain active records only.
    const content = prd({ inputs: ['- applied: `retired-record` — long gone.'] });
    const retired = RECORD_MD('retired-record')
      .replace('status: active', 'status: superseded')
      .replace('---\n\nBody.', 'superseded-by: sample-record\n---\n\nBody.');
    const root = gitRepo(
      {
        '_prds/wip/p.md': content,
        ...STORE(),
        '_brain/learnings/retired-record.md': retired,
        '_brain/INDEX.md': [
          '# INDEX',
          '',
          '- [sample](learnings/sample-record.md) — hook',
          '- [retired](learnings/retired-record.md) — hook',
          '',
        ].join('\n'),
      },
      CAPTURED_RECORD,
    );
    // The branch drops it entirely.
    rmSync(join(root, '_brain/learnings/retired-record.md'));
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      [
        '# INDEX',
        '',
        '- [sample](learnings/sample-record.md) — hook',
        '- [new thing](learnings/new-thing.md) — hook',
        '',
      ].join('\n'),
    );
    const result = gate(
      chainFor({ root, prdContent: content, changedFiles: CHANGED }),
      'declared outputs',
    );
    expect(result.ok).toBe(false);
    expect(result.why).toContain("'retired-record' is not an active indexed record");
  });
});
