import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/** FR-8: the example gates execute — pass fixture exits 0, fail fixture exits 1. */

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function runCheck(script: string, args: string[]): { code: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [join(pkgRoot, script), ...args], {
      encoding: 'utf8',
    });
    return { code: 0, output };
  } catch (error) {
    const e = error as { status?: number; stderr?: string; stdout?: string };
    return { code: e.status ?? -1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

describe('route-guard-coverage example', () => {
  it('passes when every route has a guard test; fails naming the unguarded one', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-example-'));
    roots.push(root);
    mkdirSync(join(root, 'src/routes'), { recursive: true });
    writeFileSync(join(root, 'src/routes/users.route.ts'), '// route\n');
    writeFileSync(join(root, 'src/routes/users.guard.test.ts'), '// deny test\n');

    expect(runCheck('examples/route-guard-coverage/check.mjs', [root]).code).toBe(0);

    writeFileSync(join(root, 'src/routes/orders.route.ts'), '// route, no guard\n');
    const fail = runCheck('examples/route-guard-coverage/check.mjs', [root]);
    expect(fail.code).toBe(1);
    expect(fail.output).toContain('orders.route.ts');
  });
});

describe('doc-drift example', () => {
  function git(dir: string, args: string[]): void {
    execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  }

  it('passes when docs move with watched paths; fails on drift', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-example-'));
    roots.push(root);
    git(root, ['init', '-q', '-b', 'main']);
    git(root, ['config', 'user.email', 't@example.invalid']);
    git(root, ['config', 'user.name', 'T']);
    mkdirSync(join(root, 'src/api'), { recursive: true });
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'src/api/a.ts'), 'a\n');
    writeFileSync(join(root, 'docs/api.md'), 'api\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'chore: init']);
    git(root, ['checkout', '-q', '-b', 'feat/x']);

    // drift: api source changes, doc does not
    writeFileSync(join(root, 'src/api/a.ts'), 'changed\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'feat: api change']);
    const fail = runCheck('examples/doc-drift/check.mjs', [root, 'main']);
    expect(fail.code).toBe(1);
    expect(fail.output).toContain('docs/api.md');

    // fixed: doc moves in the same range
    writeFileSync(join(root, 'docs/api.md'), 'api updated\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'docs: api']);
    expect(runCheck('examples/doc-drift/check.mjs', [root, 'main']).code).toBe(0);
  });
});

describe('examples fail closed (codex review)', () => {
  it('route-guard-coverage errors (exit 2) on a missing routes dir', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-example-'));
    roots.push(root);
    const result = runCheck('examples/route-guard-coverage/check.mjs', [root]);
    expect(result.code).toBe(2);
    expect(result.output).toContain('configure ROUTES_DIR');
  });

  it('doc-drift errors (exit 2) outside a repo or with a bad base ref', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-example-'));
    roots.push(root);
    const result = runCheck('examples/doc-drift/check.mjs', [root, 'main']);
    expect(result.code).toBe(2);
    expect(result.output).toContain('cannot resolve merge-base');
  });
});
