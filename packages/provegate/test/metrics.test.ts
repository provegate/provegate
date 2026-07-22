import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { appendMetric } from '../src/core/run/metrics.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()!;
    try {
      chmodSync(resolve(root, '_state'), 0o755);
    } catch {
      /* may not exist */
    }
    rmSync(root, { recursive: true, force: true });
  }
});

describe('appendMetric', () => {
  it('appends timestamped JSONL lines, creating directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-metrics-'));
    roots.push(root);
    const now = new Date('2026-07-22T12:00:00.000Z');
    expect(
      appendMetric(
        cfg,
        root,
        { prd: 'PRD-002', phase: '4', gate: 'pnpm test', result: 'passed' },
        { now },
      ),
    ).toBe(true);
    appendMetric(
      cfg,
      root,
      { prd: 'PRD-002', phase: '5', gate: 'x', result: 'failed', why: 'boom' },
      { now },
    );

    const lines = readFileSync(resolve(root, '_state/prd-metrics.jsonl'), 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({
      ts: '2026-07-22T12:00:00.000Z',
      prd: 'PRD-002',
      phase: '4',
      gate: 'pnpm test',
      result: 'passed',
    });
    expect(lines[1].why).toBe('boom');
  });

  it('never throws when the metrics path is unwritable (best-effort)', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-metrics-'));
    roots.push(root);
    mkdirSync(resolve(root, '_state'), { recursive: true });
    chmodSync(resolve(root, '_state'), 0o555);
    expect(
      appendMetric(cfg, root, { prd: 'PRD-002', phase: '4', gate: 'x', result: 'passed' }),
    ).toBe(false);
  });
});
