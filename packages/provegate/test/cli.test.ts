import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const pkg = createRequire(import.meta.url)('../package.json');

async function cli(...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cliPath, ...args]);
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

describe('the never-push invariant', () => {
  it('refuses `push` with exit 1', async () => {
    const result = await cli('push');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('No. Push is yours.');
  });

  it('registers both bins (provegate + gate) on the same entry', () => {
    expect(pkg.bin).toEqual({ provegate: './dist/cli.js', gate: './dist/cli.js' });
  });
});

describe('cli skeleton', () => {
  it('prints usage with exit 0 on --help', async () => {
    const result = await cli('--help');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain('ProveGate');
    for (const name of ['init', 'new', 'check', 'open', 'run', 'land', 'queue', 'status']) {
      expect(result.stdout).toContain(name);
    }
  });

  it('stub commands exit 1 and name their roadmap phase', async () => {
    const result = await cli('run');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('not implemented yet (roadmap Phase C)');
  });

  it('unknown commands exit 1', async () => {
    const result = await cli('yolo');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown command');
  });
});
