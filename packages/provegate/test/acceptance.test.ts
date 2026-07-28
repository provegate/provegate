import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import {
  loadAcceptance,
  operatorGateOk,
  validAcceptance,
  type AcceptanceEntry,
} from '../src/core/run/acceptance.js';
import { buildState, type StateRecord } from '../src/core/state/build.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

const ENTRY: AcceptanceEntry = {
  prd: 'PRD-002',
  owner: 'owner',
  items: ['9.1 review authorization'],
  reason: 'reviewed and accepted for autonomous close',
  date: '2026-07-22',
  method: 'interactive',
  authorship: 'owner-written',
};

function repoWithAcceptances(entries: AcceptanceEntry[]): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
  roots.push(root);
  mkdirSync(resolve(root, '_state'), { recursive: true });
  writeFileSync(
    resolve(root, '_state/acceptances.json'),
    JSON.stringify({ schemaVersion: 1, acceptances: entries }),
  );
  return root;
}

function record(operatorHandoffCount: number): StateRecord {
  return {
    prd: 'PRD-002',
    number: 2,
    slug: 'x',
    status: 'Code Complete',
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: 'operator-gated',
    artifacts: { prd: '', readiness: '', tasks: '', summary: '' },
    artifactStates: { prd: 'wip', readiness: 'missing', tasks: 'wip', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: 'Unknown', checkedCount: 0, uncheckedCount: 0, operatorHandoffCount },
    summary: { shipReadiness: 'Unknown' },
    lastUpdated: null,
  };
}

describe('validAcceptance', () => {
  it('accepts an owner-signed complete entry (case-insensitive owner)', () => {
    expect(validAcceptance(cfg, ENTRY)).toBe(true);
    expect(validAcceptance(cfg, { ...ENTRY, owner: 'Operator' })).toBe(true);
  });

  it('rejects non-owner signers, empty items, short reasons', () => {
    expect(validAcceptance(cfg, { ...ENTRY, owner: 'somebody' })).toBe(false);
    expect(validAcceptance(cfg, { ...ENTRY, items: [] })).toBe(false);
    expect(validAcceptance(cfg, { ...ENTRY, reason: 'ok' })).toBe(false);
    expect(validAcceptance(cfg, null)).toBe(false);
  });

  it('honors custom config owners', () => {
    const custom = deepMerge(cfg, { owners: ['maintainer'] });
    expect(validAcceptance(custom, ENTRY)).toBe(false);
    expect(validAcceptance(custom, { ...ENTRY, owner: 'maintainer' })).toBe(true);
  });
});

describe('loadAcceptance / operatorGateOk', () => {
  it('zero operator rows pass without any acceptance file', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    expect(operatorGateOk(cfg, root, record(0)).ok).toBe(true);
  });

  it('operator rows without acceptance fail with a pointing message', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    const result = operatorGateOk(cfg, root, record(3));
    expect(result.ok).toBe(false);
    expect(result.why).toContain('3 operator-owned row(s)');
    expect(result.why).toContain('acceptances.json');
  });

  it('a valid entry waives the rows and names the signer', () => {
    const root = repoWithAcceptances([ENTRY]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result).toEqual({
      ok: true,
      waived: true,
      why: '2 operator row(s) waived via acceptances.json (owner decided, owner-written)',
    });
  });

  it('malformed acceptances file degrades to null, not a crash', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-'));
    roots.push(root);
    mkdirSync(resolve(root, '_state'), { recursive: true });
    writeFileSync(resolve(root, '_state/acceptances.json'), '{ nope');
    expect(loadAcceptance(cfg, root, 'PRD-002')).toBeNull();
    expect(operatorGateOk(cfg, root, record(1)).ok).toBe(false);
  });
});

/**
 * End-to-end regression: the record the gate reads comes from the tasks FILE, so
 * the parser and the gate must be exercised together. PRD-016 shipped its
 * operator row as a checkbox bullet; the parser counted zero and the gate — fed
 * a synthetic zero in every unit test above — passed without an acceptance while
 * the file itself still said a human owed a signature.
 */
describe('operatorGateOk over a real tasks file', () => {
  function repoWithTasks(handoffSection: string[]): string {
    const root = mkdtempSync(join(tmpdir(), 'provegate-accept-e2e-'));
    roots.push(root);
    const write = (rel: string, lines: string[]): void => {
      mkdirSync(resolve(root, rel, '..'), { recursive: true });
      writeFileSync(resolve(root, rel), lines.join('\n'));
    };
    write('_prds/wip/prd-002-x.md', [
      '# PRD-002: X',
      '',
      '> **Status**: Code Complete',
      '> **Autonomous Close**: operator-gated',
    ]);
    write('_tasks/wip/tasks-002-x.md', [
      '# Tasks',
      '',
      '> **Status**: Operator Verification',
      '',
      '- [x] 1.1 implement',
      '',
      '## Operator Handoff',
      '',
      ...handoffSection,
      '',
    ]);
    return root;
  }

  const stateRecord = (root: string): StateRecord => {
    const built = buildState(cfg, root).records.find((r) => r.prd === 'PRD-002');
    expect(built).toBeDefined();
    return built!;
  };

  it('refuses the merge when the operator row is a checkbox bullet and no acceptance exists', () => {
    const root = repoWithTasks(['- [ ] 9.0 owner signs off on the autonomous close']);
    const built = stateRecord(root);
    expect(built.task.operatorHandoffCount).toBe(1);
    expect(operatorGateOk(cfg, root, built).ok).toBe(false);
  });

  it('waives the same checkbox row once the owner acceptance is present', () => {
    const root = repoWithTasks(['- [ ] 9.0 owner signs off on the autonomous close']);
    mkdirSync(resolve(root, '_state'), { recursive: true });
    writeFileSync(
      resolve(root, '_state/acceptances.json'),
      JSON.stringify({ schemaVersion: 1, acceptances: [{ ...ENTRY, prd: 'PRD-002' }] }),
    );
    expect(operatorGateOk(cfg, root, stateRecord(root))).toMatchObject({ ok: true, waived: true });
  });

  it('still merges freely when the section explicitly holds no rows', () => {
    const root = repoWithTasks(['> None — every gate is machine-checkable.', '', '- (none)']);
    const built = stateRecord(root);
    expect(built.task.operatorHandoffCount).toBe(0);
    expect(operatorGateOk(cfg, root, built)).toEqual({ ok: true });
  });
});

/**
 * PRD-033 — authorship provenance.
 *
 * The store is the authorization artifact for every operator-gated close, so
 * these drive `operatorGateOk` with a record that HAS operator rows rather than
 * asserting on the validator directly. A `entryProblem` shape assertion would
 * satisfy the same requirement while proving nothing about whether the
 * authorization path consults it.
 */
describe('acceptance authorship (PRD-033)', () => {
  const legal = /`owner-written` or `agent-transcribed`/;

  it('the operator gate refuses a store whose entry carries an unknown authorship value', () => {
    const root = repoWithAcceptances([
      { ...ENTRY, authorship: 'owner' as unknown as AcceptanceEntry['authorship'] },
    ]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result.ok).toBe(false);
    expect(result.why).toMatch(legal);
  });

  it('the operator gate refuses a store whose entry omits authorship, naming both legal values', () => {
    const withoutField: Record<string, unknown> = { ...ENTRY };
    delete withoutField.authorship;
    const root = repoWithAcceptances([withoutField as unknown as AcceptanceEntry]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result.ok).toBe(false);
    // Absent and illegal share one message on purpose: "missing `authorship`"
    // sends the reader to the schema to learn a vocabulary of two words.
    expect(result.why).toMatch(legal);
  });

  it('a legal authorship does not admit an owner outside the allowlist', () => {
    // The new field must not short-circuit the identity check, and the identity
    // check must not mask a missing field. Neither may stand in for the other.
    const root = repoWithAcceptances([{ ...ENTRY, owner: 'intern', authorship: 'owner-written' }]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result.ok).toBe(false);
    expect(result.why).toMatch(/intern|owner/);
    expect(result.why).not.toMatch(legal);
  });

  it('one malformed entry fails the WHOLE store, not merely the selected one', () => {
    const root = repoWithAcceptances([
      ENTRY,
      {
        ...ENTRY,
        prd: 'PRD-003',
        authorship: 'nope' as unknown as AcceptanceEntry['authorship'],
      },
    ]);
    // PRD-002 is the selected entry and is well-formed; the store is not.
    const result = operatorGateOk(cfg, root, record(2));
    expect(result.ok).toBe(false);
    expect(result.why).toMatch(/acceptances\[1\]/);
  });

  it('the waived reason names the deciding owner AND the authorship', () => {
    const root = repoWithAcceptances([{ ...ENTRY, authorship: 'agent-transcribed' }]);
    const result = operatorGateOk(cfg, root, record(2));
    expect(result).toMatchObject({ ok: true, waived: true });
    expect(result.why).toMatch(/owner decided/);
    expect(result.why).toMatch(/agent-transcribed/);
  });

  it('the same reason is produced on the committed path, not only the fallback', () => {
    // `operatorGateOk` takes a different branch when a committed-blob reader is
    // supplied. Both must reach the same validator and print the same fact.
    const root = repoWithAcceptances([{ ...ENTRY, authorship: 'agent-transcribed' }]);
    const committed = JSON.stringify({
      schemaVersion: 1,
      acceptances: [{ ...ENTRY, authorship: 'agent-transcribed' }],
    });
    const result = operatorGateOk(cfg, root, record(2), () => committed);
    expect(result).toMatchObject({ ok: true, waived: true });
    expect(result.why).toMatch(/agent-transcribed/);
  });

  it('the committed path refuses an illegal value with the same message', () => {
    const root = repoWithAcceptances([ENTRY]);
    const committed = JSON.stringify({
      schemaVersion: 1,
      acceptances: [{ ...ENTRY, authorship: 'whoever' }],
    });
    const result = operatorGateOk(cfg, root, record(2), () => committed);
    expect(result.ok).toBe(false);
    expect(result.why).toMatch(legal);
  });

  it('validAcceptance holds no opinion about authorship', () => {
    // Exactly one function decides what a legal value is. A second checker that
    // agrees today is a second authority that has not disagreed yet.
    const illegal = { ...ENTRY, authorship: 'whoever' as unknown as AcceptanceEntry['authorship'] };
    expect(validAcceptance(cfg, illegal)).toBe(true);
  });
});

/**
 * PRD-033 FR-3 — the one-time migration, pinned to the real data.
 *
 * Both snapshots are fixtures rather than reads of `_state/acceptances.json`,
 * because that file is outside this package's turbo cache key: a test asserting
 * on it can replay a cached pass over a change it never read. The LIVE store is
 * checked by `verify:acceptance-rule`, which is cache-free. These two halves are
 * deliberately split by where the file lives, not by what is asserted.
 */
describe('acceptance store migration (PRD-033 FR-3)', () => {
  const load = (name: string): { acceptances: AcceptanceEntry[] } =>
    JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8'));

  const pre = load('acceptances-pre-migration.json');
  const post = load('acceptances-post-migration.json');

  it('adds a field to every entry and removes none', () => {
    expect(post.acceptances).toHaveLength(pre.acceptances.length);
    expect(post.acceptances).toHaveLength(16);
  });

  it('changes nothing but the added field — every prior value survives byte-for-byte', () => {
    // The obvious implementation is a JSON round-trip, and it silently rewrote
    // `—` escapes to literal em dashes and reordered keys in `reason` and
    // `items`. An assertion scoped to `method` would not have seen it, because
    // the collateral landed in the fields the migration was not about.
    post.acceptances.forEach((after, i) => {
      const rest: Record<string, unknown> = { ...after };
      delete rest.authorship;
      expect(rest).toEqual(pre.acceptances[i]);
    });
  });

  it('derives authorship from the recorded method text, and splits eight and eight', () => {
    const counts: Record<string, number> = {};
    post.acceptances.forEach((entry, i) => {
      const expected =
        pre.acceptances[i]!.method === 'interactive' ? 'owner-written' : 'agent-transcribed';
      expect(entry.authorship).toBe(expected);
      counts[entry.authorship] = (counts[entry.authorship] ?? 0) + 1;
    });
    // The finding this PRD exists for: half the store was already agent-written.
    expect(counts).toEqual({ 'owner-written': 8, 'agent-transcribed': 8 });
  });

  it('every migrated entry passes the validator the merge gate uses', () => {
    const root = repoWithAcceptances(post.acceptances);
    expect(operatorGateOk(cfg, root, { ...record(2), prd: 'PRD-029' }).ok).toBe(true);
  });
});
