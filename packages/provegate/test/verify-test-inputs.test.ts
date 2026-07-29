/**
 * The census gate's deny suite (PRD-036 FR-3). Runs the PRODUCTION
 * scripts/verify/verify-test-inputs.mjs IN PLACE with a target-root argument
 * (the runLedger pattern) — a temp-root copy would lose the script's
 * `typescript` resolution anchor, the exact defect
 * `fixture-must-reach-production-shape` records.
 *
 * Ten planted violations, each failing BY NAME from its own independent cause,
 * with the passing live corpus as §11's positive control. Plus the documented
 * limit: a string-concatenation traversal the syntactic grammar deliberately
 * does NOT catch — asserted as a non-catch so the boundary's edge is tested,
 * not implied.
 *
 * Fixture escape paths below are assembled by CONCATENATION ('..' + '/' + …)
 * precisely so this file's own source stays legal under the grammar it tests.
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { repoPath } from './helpers/repo-reads.js';

const SCRIPT = repoPath('scripts/verify/verify-test-inputs.mjs');
const UP = '..' + '/' + '..'; // multi-parent, assembled — the documented limit's shape

const roots: string[] = [];
afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

// the helper body's own multi-parent URL literals are interpolated from UP so
// THIS file's literal parts stay single-parent under the grammar it tests
const GOOD_READS = `import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const pkgRoot = fileURLToPath(new URL('${UP}', import.meta.url));
const repoRoot = fileURLToPath(new URL('${UP}/${UP}', import.meta.url));
export const repoPath = (rel: string): string => join(repoRoot, rel);
export const REPO_READ_GLOBS = ['**/*.md', 'LICENSE'];
`;
const GOOD_FIXTURES = `export const TRAVERSAL_SELECTOR = 'x';
export const TRAVERSAL_COMMAND = 'y';
export const TRAVERSAL_SLUG = 'z';
export const QUICKSTART_TASKS_FIXTURE = 'w';
`;

/** A minimal fixture root: helpers + turbo.json + one clean test file. */
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'test-inputs-fixture-'));
  roots.push(root);
  mkdirSync(join(root, 'packages/provegate/test/helpers'), { recursive: true });
  writeFileSync(join(root, 'packages/provegate/test/helpers/repo-reads.ts'), GOOD_READS);
  writeFileSync(join(root, 'packages/provegate/test/helpers/escape-fixtures.ts'), GOOD_FIXTURES);
  writeFileSync(
    join(root, 'turbo.json'),
    JSON.stringify({
      tasks: {
        test: { inputs: ['$TURBO_DEFAULT$', '$TURBO_ROOT$/**/*.md', '$TURBO_ROOT$/LICENSE'] },
      },
    }),
  );
  writeFileSync(
    join(root, 'packages/provegate/test/clean.test.ts'),
    `import { repoPath } from './helpers/repo-reads.js';\nconst p = repoPath('LICENSE');\n`,
  );
  return root;
}

function run(root: string): { status: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [SCRIPT, root, '--no-probe'], {
      encoding: 'utf8',
    });
    return { status: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

function plant(root: string, name: string, source: string): void {
  writeFileSync(join(root, 'packages/provegate/test', name), source);
}

describe('positive control — a clean fixture corpus passes', () => {
  it('helpers + ledgered usage + covered ledger = PASS', () => {
    const { status, output } = run(makeRoot());
    expect(output).toContain('PASS');
    expect(status).toBe(0);
  });
});

describe('the ten planted deny causes fail by name (FR-3)', () => {
  it('1 — a multi-parent literal', () => {
    const root = makeRoot();
    plant(root, 'bad.test.ts', `const p = '${UP}/outside.txt';\n`);
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:1 \[multi-parent\]/);
  });

  it('2 — a split-join escape', () => {
    const root = makeRoot();
    plant(
      root,
      'bad.test.ts',
      `import { join } from 'node:path';\nconst p = join('x', '..', '..');\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:2 \[multi-parent-args-call\]/);
  });

  it('3 — a split-resolve mixed escape', () => {
    const root = makeRoot();
    plant(
      root,
      'bad.test.ts',
      `import { resolve } from 'node:path';\nconst p = resolve('x', '..', '../y');\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:2 \[multi-parent-args-call\]/);
  });

  it('4 — a nested-URL escape', () => {
    const root = makeRoot();
    plant(root, 'bad.test.ts', `const u = new URL('..', new URL('..', import.meta.url));\n`);
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:1 \[nested-url\]/);
  });

  it('5 — a nested-dirname escape', () => {
    const root = makeRoot();
    plant(
      root,
      'bad.test.ts',
      `import { dirname } from 'node:path';\nconst d = dirname(dirname('a/b'));\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:2 \[nested-dirname\]/);
  });

  it('6 — a non-literal repoPath argument fails closed', () => {
    const root = makeRoot();
    plant(
      root,
      'bad.test.ts',
      `import { repoPath } from './helpers/repo-reads.js';\nconst rel = 'LICENSE';\nconst p = repoPath(rel);\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/bad\.test\.ts:3 \[repoPath-non-literal\]/);
  });

  it('7 — an unledgered repoPath path', () => {
    const root = makeRoot();
    plant(
      root,
      'bad.test.ts',
      `import { repoPath } from './helpers/repo-reads.js';\nconst p = repoPath('secrets/undeclared.json');\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/\[unledgered\] repoPath\('secrets\/undeclared\.json'\)/);
  });

  it('8 — an uncovered ledger entry', () => {
    const root = makeRoot();
    writeFileSync(
      join(root, 'packages/provegate/test/helpers/repo-reads.ts'),
      GOOD_READS.replace("['**/*.md', 'LICENSE']", "['**/*.md', 'LICENSE', 'uncovered-dir/**']"),
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/\[uncovered\] REPO_READ_GLOBS entry `uncovered-dir\/\*\*`/);
  });

  it('9 — an extra export in escape-fixtures.ts', () => {
    const root = makeRoot();
    writeFileSync(
      join(root, 'packages/provegate/test/helpers/escape-fixtures.ts'),
      GOOD_FIXTURES + `export const SMUGGLED = '${UP}/anything';\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/escape-fixtures\.ts: unexpected export `SMUGGLED`/);
  });

  it('10 — a forbidden import plus read call in repo-reads.ts', () => {
    const root = makeRoot();
    writeFileSync(
      root + '/packages/provegate/test/helpers/repo-reads.ts',
      `import { readFileSync } from 'node:fs';\n` +
        GOOD_READS +
        `export const sneak = readFileSync(repoPath('LICENSE'), 'utf8');\n`,
    );
    const { status, output } = run(root);
    expect(status).toBe(1);
    expect(output).toMatch(/repo-reads\.ts: forbidden import `node:fs`/);
    expect(output).toMatch(/repo-reads\.ts: forbidden call `readFileSync\(`/);
  });
});

describe('the documented limit — concatenation is outside the syntactic net', () => {
  it("a runtime-assembled traversal ('..' + '/' + '..') is NOT flagged", () => {
    const root = makeRoot();
    plant(root, 'limit.test.ts', `const p = '..' + '/' + '..';\n`);
    const { status, output } = run(root);
    // The scan stays green: this is the boundary's named edge. The cache
    // guarantee for such a read still rests on the glob census (defense in
    // depth) — the PRD documents this limit rather than implying coverage.
    expect(output).toContain('PASS');
    expect(status).toBe(0);
  });
});

describe('stale-probe refusal (FR-4 pre-scan)', () => {
  it('a leftover .probe-* file under the snapshot root fails by name', () => {
    // fixture root is not the real repo root, so the probe itself is skipped;
    // the pre-scan runs only at the real root. Prove the refusal by pointing
    // the script at the REAL root with a planted stale probe — without --no-probe.
    const snapshotRoot = repoPath('docs/research/provegate-bootstrap/source-snapshot');
    const stale = join(snapshotRoot, '.probe-stale-fixture.tmp');
    writeFileSync(stale, 'stale\n');
    try {
      const result = (() => {
        try {
          const output = execFileSync(process.execPath, [SCRIPT, repoPath('.')], {
            encoding: 'utf8',
          });
          return { status: 0, output };
        } catch (error) {
          const e = error as { status?: number; stdout?: string; stderr?: string };
          return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
        }
      })();
      expect(result.status).toBe(1);
      expect(result.output).toMatch(/stale probe file\(s\).*\.probe-stale-fixture\.tmp/);
    } finally {
      rmSync(stale, { force: true });
    }
  });
});
