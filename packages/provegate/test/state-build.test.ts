import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import { buildState } from '../src/core/state/build.js';
import { readState, writeState } from '../src/core/state/io.js';

const roots: string[] = [];

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-state-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function writeArtifact(root: string, relPath: string, content: string): void {
  const full = resolve(root, relPath);
  mkdirSync(join(full, '..'), { recursive: true });
  writeFileSync(full, content);
}

const PRD_DOC = [
  '# PRD-007: Widget',
  '',
  '> **Status**: In Progress',
  '> **Updated**: 2026-07-20',
  '> **Cycle Phase**: 4 (Implementation)',
  '> **Autonomous Close**: operator-gated',
].join('\n');

const READINESS_DOC = [
  '# Readiness',
  '',
  '| Field | Value |',
  '| ----- | ----- |',
  '| Score | 8.7/10 |',
  '| Verdict | PASS |',
  '| Model Tier (Execution) | high |',
  '| Model Tier (Audit) | medium |',
  '> **Updated**: 2026-07-21',
].join('\n');

const TASKS_DOC = [
  '# Tasks',
  '',
  '> **Status**: In Progress',
  '',
  '- [x] 1.1 done thing',
  '- [ ] 1.2 open thing',
  '- [ ] 1.3 other open thing',
  '',
  '## Operator Handoff',
  '',
  '| Task | Category | Owner | Required Check | Status | Notes |',
  '| ---- | -------- | ----- | -------------- | ------ | ----- |',
  '| 9.1 | external | owner | review | pending | |',
].join('\n');

const SUMMARY_DOC = ['# Summary', '', '## Ship Readiness', '', 'Code Complete pending review'].join(
  '\n',
);

describe('buildState', () => {
  it('merges the four artifact kinds into one record', () => {
    const root = tempRepo();
    writeArtifact(root, '_prds/wip/prd-007-widget.md', PRD_DOC);
    writeArtifact(root, '_readiness/wip/readiness-007-widget.md', READINESS_DOC);
    writeArtifact(root, '_tasks/wip/tasks-007-widget.md', TASKS_DOC);
    writeArtifact(root, '_docs/completed/summary-007-widget.md', SUMMARY_DOC);

    const state = buildState(DEFAULT_CONFIG, root, { generatedAt: '2026-07-22T00:00:00.000Z' });
    expect(state.schemaVersion).toBe(1);
    expect(state.records).toHaveLength(1);

    const record = state.records[0]!;
    expect(record.prd).toBe('PRD-007');
    expect(record.slug).toBe('widget');
    expect(record.status).toBe('In Progress');
    expect(record.autonomousClose).toBe('operator-gated');
    expect(record.artifactStates).toEqual({
      prd: 'wip',
      readiness: 'wip',
      tasks: 'wip',
      summary: 'completed',
    });
    expect(record.readiness).toEqual({
      score: 8.7,
      verdict: 'PASS',
      modelTierExecution: 'high',
      modelTierAudit: 'medium',
    });
    expect(record.task).toEqual({
      status: 'In Progress',
      checkedCount: 1,
      uncheckedCount: 2,
      operatorHandoffCount: 1,
    });
    expect(record.summary.shipReadiness).toBe('Code Complete');
    expect(record.lastUpdated).toBe('2026-07-21');
  });

  it('sorts records by number then slug and keeps distinct slugs distinct', () => {
    const root = tempRepo();
    writeArtifact(root, '_prds/wip/prd-002-beta.md', PRD_DOC);
    writeArtifact(root, '_prds/wip/prd-001-alpha.md', PRD_DOC);
    const state = buildState(DEFAULT_CONFIG, root);
    expect(state.records.map((r) => r.prd)).toEqual(['PRD-001', 'PRD-002']);
  });

  it('honors a custom id pattern (TASK/4)', () => {
    const root = tempRepo();
    const config = deepMerge(DEFAULT_CONFIG, {
      idPattern: { prefix: 'TASK', width: 4 },
      dirs: { artifacts: { prd: { dir: '_prds', prefix: 'task' } } },
    });
    writeArtifact(root, '_prds/wip/task-0042-thing.md', PRD_DOC);
    // Width mismatch is invisible by design (W3):
    writeArtifact(root, '_prds/wip/task-043-short.md', PRD_DOC);

    const state = buildState(config, root);
    expect(state.records.map((r) => r.prd)).toEqual(['TASK-0042']);
  });

  it('round-trips through writeState/readState', () => {
    const root = tempRepo();
    writeArtifact(root, '_prds/wip/prd-001-alpha.md', PRD_DOC);
    const state = buildState(DEFAULT_CONFIG, root, { generatedAt: 'g' });
    writeState(DEFAULT_CONFIG, root, state);
    expect(readState(DEFAULT_CONFIG, root)).toEqual(state);
  });

  it('returns an empty record set for an empty tree', () => {
    const root = tempRepo();
    expect(buildState(DEFAULT_CONFIG, root).records).toEqual([]);
  });
});
