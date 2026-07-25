import { execFile } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The CLI is spawned with a piped (non-TTY) stdout, so colorTier resolves to
// `none` and output must carry NO escape sequences at all — the glyph carries
// status. This is the runtime half of the NO_COLOR guarantee (the strip-identity
// property is unit-tested in theme.test.ts).
//
// Every spawn runs in a FIXTURE repo. Without an explicit cwd the child inherits
// the runner's, root discovery walks up to the real checkout, and `gate status`
// rebuilds and REWRITES the developer's own `_state/prds.json` — a test reaching
// out of its sandbox into the live tree. The fixture slug below is the guard:
// it appears in the output only when the spawn really ran in the fixture.

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
// eslint-disable-next-line no-control-regex -- ANSI escape matcher, control char is intentional
const ESC = /\x1b\[/;
const FIXTURE_SLUG = 'nocolor-fixture';

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'provegate-nocolor-'));
  writeFileSync(resolve(root, 'workflow.config.json'), '{}');
  mkdirSync(resolve(root, '_prds/wip'), { recursive: true });
  mkdirSync(resolve(root, '_readiness/wip'), { recursive: true });
  writeFileSync(
    resolve(root, `_prds/wip/prd-001-${FIXTURE_SLUG}.md`),
    ['# PRD-001: Fixture', '', '> **Status**: Approved', '> **Updated**: 2026-07-22'].join('\n'),
  );
  writeFileSync(
    resolve(root, `_readiness/wip/readiness-001-${FIXTURE_SLUG}.md`),
    ['| Field | Value |', '| --- | --- |', '| Score | 9.0/10 |', '| Verdict | PASS |'].join('\n'),
  );
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

async function cli(env: NodeJS.ProcessEnv, ...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cliPath, ...args], {
      cwd: root,
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

  // Anti-regression for the sandbox escape: both commands read the artifact tree,
  // so the fixture slug proves WHICH tree they read. Drop the `cwd` above and the
  // spawn resolves the real checkout instead — where PRD-001 carries a different
  // slug — and these two fail before the live state file is ever rewritten.
  it('reads the fixture tree, not the checkout the runner happens to sit in', async () => {
    for (const cmd of ['status', 'queue']) {
      const { out } = await cli({}, cmd);
      expect(out, cmd).toContain(FIXTURE_SLUG);
    }
  });

  it('the push refusal text is byte-identical regardless of colour', async () => {
    const plain = (await cli({}, 'push')).out;
    const noColor = (await cli({ NO_COLOR: '1' }, 'push')).out;
    expect(plain).toContain('No. Push is yours.');
    expect(plain).toBe(noColor);
  });
});
