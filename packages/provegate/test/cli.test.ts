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
    for (const name of [
      'init',
      'new',
      'check',
      'open',
      'renew',
      'release',
      'run',
      'land',
      'queue',
      'status',
    ]) {
      expect(result.stdout).toContain(name);
    }
  });

  it('the help screen carries the wordmark, version, and bare-uppercase headers (FR-8)', async () => {
    const result = await cli('--help');
    expect(result.stdout).toContain('ProveGate · prove it, then let it propagate.');
    expect(result.stdout).toMatch(/v\d+\.\d+\.\d+/); // version, right of the wordmark
    expect(result.stdout).toContain('\nUSAGE\n');
    expect(result.stdout).toContain('\nCOMMANDS\n');
    expect(result.stdout).toContain('\nOPTIONS\n');
    expect(result.stdout).toContain(
      'humans own intent and release · the machine owns the verified middle',
    );
  });

  it('renew + release ask for usage (exit 1) when the PRD id is missing', async () => {
    for (const command of ['renew', 'release']) {
      const result = await cli(command);
      expect(result.code, command).toBe(1);
      expect(result.stderr, command).toContain(`usage: gate ${command}`);
    }
  });

  it('zero stubs remain: bare open asks for usage, not a roadmap IOU', async () => {
    const result = await cli('open');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('usage: gate open');
    expect(result.stderr).not.toContain('not implemented');
  });

  it('unknown commands exit 1', async () => {
    const result = await cli('yolo');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('unknown command');
  });
});
