import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The CLI is spawned with a piped (non-TTY) stdout, so colorTier resolves to
// `none` and output must carry NO escape sequences at all — the glyph carries
// status. This is the runtime half of the NO_COLOR guarantee (the strip-identity
// property is unit-tested in theme.test.ts).

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
// eslint-disable-next-line no-control-regex -- ANSI escape matcher, control char is intentional
const ESC = /\x1b\[/;

async function cli(env: NodeJS.ProcessEnv, ...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cliPath, ...args], {
      env: { ...process.env, ...env },
    });
    return { code: 0, out: stdout + stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, out: (e.stdout ?? '') + (e.stderr ?? '') };
  }
}

describe('non-TTY / NO_COLOR output carries no escape sequences', () => {
  for (const cmd of [['--help'], ['status'], ['queue'], ['push']]) {
    it(`\`gate ${cmd.join(' ')}\` is escape-free (piped stdout)`, async () => {
      const { out } = await cli({}, ...cmd);
      expect(ESC.test(out), out.slice(0, 120)).toBe(false);
    });

    it(`\`gate ${cmd.join(' ')}\` is escape-free with NO_COLOR=1`, async () => {
      const { out } = await cli({ NO_COLOR: '1' }, ...cmd);
      expect(ESC.test(out)).toBe(false);
    });
  }

  it('the push refusal text is byte-identical regardless of colour', async () => {
    const plain = (await cli({}, 'push')).out;
    const noColor = (await cli({ NO_COLOR: '1' }, 'push')).out;
    expect(plain).toContain('No. Push is yours.');
    expect(plain).toBe(noColor);
  });
});
