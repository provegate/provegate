import { execFile, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

let root: string;

async function cli(...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cliPath, ...args], { cwd: root });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'provegate-cli-'));
  writeFileSync(resolve(root, 'workflow.config.json'), '{}');
  mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
  mkdirSync(resolve(root, '_readiness/wip'), { recursive: true });
  writeFileSync(
    resolve(root, '_prds/wip/prd-001-fixture.md'),
    ['# PRD-001: Fixture', '', '> **Status**: Approved', '> **Updated**: 2026-07-22'].join('\n'),
  );
  writeFileSync(
    resolve(root, '_readiness/wip/readiness-001-fixture.md'),
    ['| Field | Value |', '| --- | --- |', '| Score | 9.0/10 |', '| Verdict | PASS |'].join('\n'),
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('gate status (live CLI in fixture repo)', () => {
  it('exits 0, lists the record, and writes the snapshot', async () => {
    const result = await cli('status');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('PRD-001');
    expect(result.stdout).toContain('Approved');
    expect(existsSync(resolve(root, '_state/prds.json'))).toBe(true);
    const state = JSON.parse(readFileSync(resolve(root, '_state/prds.json'), 'utf8'));
    expect(state.records[0].prd).toBe('PRD-001');
  });
});

describe('gate queue (live CLI in fixture repo)', () => {
  it('--json emits the full queue shape', async () => {
    const result = await cli('queue', '--json');
    expect(result.code).toBe(0);
    const queue = JSON.parse(result.stdout);
    expect(Object.keys(queue).sort()).toEqual([
      'blocked',
      'generatedAt',
      'inFlight',
      'inReview',
      'ready',
      'readyOverlaps',
    ]);
    expect(queue.ready[0].prd).toBe('PRD-001');
  });

  it('human output renders the four sections', async () => {
    const result = await cli('queue');
    expect(result.code).toBe(0);
    for (const section of ['READY', 'IN-FLIGHT', 'BLOCKED', 'IN-REVIEW']) {
      expect(result.stdout).toContain(section);
    }
  });
});

describe('config errors surface cleanly', () => {
  it('invalid config exits 1 with path-tagged message', async () => {
    const badRoot = mkdtempSync(join(tmpdir(), 'provegate-cli-bad-'));
    writeFileSync(resolve(badRoot, 'workflow.config.json'), JSON.stringify({ bogus: 1 }));
    try {
      const result = await run(process.execPath, [cliPath, 'status'], { cwd: badRoot }).then(
        () => ({ code: 0, stderr: '' }),
        (e: { code?: number; stderr?: string }) => ({ code: e.code ?? -1, stderr: e.stderr ?? '' }),
      );
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('bogus');
    } finally {
      rmSync(badRoot, { recursive: true, force: true });
    }
  });
});

describe('unchanged surfaces', () => {
  it('push still refuses with exit 1', async () => {
    const result = await cli('push');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('No. Push is yours.');
  });

  it('bare open/new without arguments exit 1 with usage (no stubs remain)', async () => {
    for (const cmd of ['open', 'new']) {
      const result = await cli(cmd);
      expect(result.code, cmd).toBe(1);
      expect(result.stderr, cmd).toContain(`usage: gate ${cmd}`);
    }
  });
});

describe('codex review regressions', () => {
  it('a lock file containing JSON null does not crash queue', async () => {
    mkdirSync(resolve(root, '_state/locks'), { recursive: true });
    const brokenLock = resolve(root, '_state/locks/broken.json');
    writeFileSync(brokenLock, 'null');
    try {
      const result = await cli('queue', '--json');
      expect(result.code).toBe(0);
      const queue = JSON.parse(result.stdout);
      expect(queue.inFlight).toEqual([]);
    } finally {
      // The suite shares one root: an unreadable lease makes ownership
      // unknowable, and `gate run/land` now (correctly) fails closed on it —
      // leaving this fixture behind would hijack every later test here.
      rmSync(brokenLock, { force: true });
    }
  });
});

describe('codex review regressions (round 1): recursion sentinel (W1, real CLI)', () => {
  it('nested non-dry-run gate run refuses before touching anything', async () => {
    const result = await run(process.execPath, [cliPath, 'run', 'PRD-001'], {
      cwd: root,
      env: { ...process.env, PROVEGATE_RUN_ACTIVE: '1' },
    }).then(
      () => ({ code: 0, stderr: '' }),
      (e: { code?: number; stderr?: string }) => ({ code: e.code ?? -1, stderr: e.stderr ?? '' }),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('refusing to nest');
  });
});

describe('codex round-2: precondition-before-archive ordering (real CLI)', () => {
  it('gate land from the base branch refuses without creating any commit', async () => {
    const gitRun = (args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
    gitRun(['init', '-q', '-b', 'main']);
    gitRun(['config', 'user.email', 't@example.invalid']);
    gitRun(['config', 'user.name', 'T']);
    gitRun(['add', '.']);
    gitRun(['commit', '-q', '-m', 'chore: fixture']);
    const before = gitRun(['rev-parse', 'HEAD']).trim();

    // clear the sentinel: this suite may itself run under `gate run` (dogfood)
    const result = await run(process.execPath, [cliPath, 'land', 'PRD-001'], {
      cwd: root,
      env: { ...process.env, PROVEGATE_RUN_ACTIVE: '' },
    }).then(
      () => ({ code: 0, stderr: '' }),
      (e: { code?: number; stderr?: string }) => ({ code: e.code ?? -1, stderr: e.stderr ?? '' }),
    );
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("current branch is 'main'");
    expect(gitRun(['rev-parse', 'HEAD']).trim()).toBe(before);
  });
});
