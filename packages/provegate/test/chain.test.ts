import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
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
    ...(watch === undefined ? [] : ['- [watcher](learnings/watcher-record.md) — hook']),
    '',
  ].join('\n'),
  '_brain/learnings/sample-record.md': RECORD_MD('sample-record'),
  ...(watch === undefined
    ? {}
    : { '_brain/learnings/watcher-record.md': RECORD_MD('watcher-record', watch) }),
});

function chainFor(options: {
  root: string;
  prdContent: string;
  changedFiles: string[];
  config?: typeof cfg;
  rec?: StateRecord;
}) {
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
        acceptances: [
          {
            prd: 'PRD-002',
            owner: 'owner',
            items: ['memory output removal: _brain/adr/ADR-0001-x.md'],
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
    for (const item of [
      '_brain/adr/ADR-0001-x.md',
      'removed `_brain/adr/ADR-0001-x.md`, moved to PRD-022',
      'the decision at _brain/adr/ADR-0001-x.md.',
    ]) {
      const root = gitRepo(
        {
          '_prds/wip/p.md': baseline,
          '_state/acceptances.json': JSON.stringify({
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
    const root = gitRepo({ '_prds/wip/p.md': prd(), ...STORE() });
    // the record lands on main AFTER the branch forks, and origin/main is stale
    execFileSync('git', ['branch', 'origin/main'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['checkout', '-b', 'feat/x'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['checkout', 'main'], { cwd: root, stdio: 'ignore' });
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(join(root, '_brain/learnings/new-thing.md'), RECORD_MD('new-thing'));
    execFileSync('git', ['add', '-A'], { cwd: root, stdio: 'ignore' });
    execFileSync('git', ['commit', '-m', 'someone else added the record', '--no-verify'], {
      cwd: root,
      stdio: 'ignore',
    });
    execFileSync('git', ['checkout', 'feat/x'], { cwd: root, stdio: 'ignore' });
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
    const forged = [
      prd(),
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
    ].join('\n');
    const root = gitRepo(
      {
        '_prds/wip/p.md': baseline,
        '_state/acceptances.json': JSON.stringify({
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
  });

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
