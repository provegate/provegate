import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

/**
 * PRD-021 FR-7 — `verify:doc-claims`.
 *
 * The script is driven as a script, in a temp repo, because what it audits is a
 * repository: which `verify:*` keys exist in `package.json` decides whether a
 * given sentence is a stale claim or an honest one. Importing its internals
 * would test a grammar; running it tests the check.
 */

const here = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(here, '../../../scripts/verify/verify-doc-claims.mjs');
const LIB = resolve(here, '../../../scripts/verify/lib.mjs');

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

interface Run {
  code: number;
  out: string;
}

function run(root: string): Run {
  try {
    const out = execFileSync(process.execPath, [join(root, 'scripts/verify/verify-doc-claims.mjs')], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

interface RepoSpec {
  /** Lines of AGENT_BOOTSTRAP.md. */
  bootstrap: string[];
  /** `verify:*` scripts the repo declares as wired. */
  scripts?: string[];
  allowlist?: unknown;
  statusExtra?: string[];
}

function repo({ bootstrap, scripts = ['verify:brain'], allowlist = [], statusExtra = [] }: RepoSpec): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-claims-'));
  roots.push(root);
  mkdirSync(join(root, 'scripts/verify'), { recursive: true });
  mkdirSync(join(root, '_brain'), { recursive: true });
  mkdirSync(join(root, 'packages/provegate/practices/brain'), { recursive: true });
  mkdirSync(join(root, 'packages/provegate/practices/templates'), { recursive: true });
  cpSync(SCRIPT, join(root, 'scripts/verify/verify-doc-claims.mjs'));
  cpSync(LIB, join(root, 'scripts/verify/lib.mjs'));
  writeFileSync(
    join(root, 'package.json'),
    JSON.stringify({ name: 'fixture', scripts: Object.fromEntries(scripts.map((s) => [s, 'node x.mjs'])) }, null, 2),
  );
  writeFileSync(join(root, 'scripts/verify/doc-claims-allowlist.json'), JSON.stringify(allowlist, null, 2));
  writeFileSync(join(root, 'AGENT_BOOTSTRAP.md'), `${bootstrap.join('\n')}\n`);
  writeFileSync(join(root, 'STATUS.md'), `# Status\n\n## Recent activity\n\n${statusExtra.join('\n')}\n`);
  // Every file in the scanned set must exist — an absent one is a finding, so
  // the fixture provides them all and varies only what is under test.
  for (const rel of [
    '_brain/PROTOCOL.md',
    'packages/provegate/practices/brain/PROTOCOL.md',
    'packages/provegate/practices/templates/AGENT_BOOTSTRAP.template.md',
    'packages/provegate/practices/templates/STATUS.template.md',
  ]) {
    writeFileSync(join(root, rel), '# doc\n');
  }
  return root;
}

const TOMORROW = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

describe('verify:doc-claims — the positive case (FR-7)', () => {
  it('fails a line calling a WIRED script future work, naming file, line and marker', () => {
    const result = run(
      repo({ bootstrap: ['# Bootstrap', '', 'The `verify:brain` check lands in wave 2.'] }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/AGENT_BOOTSTRAP\.md:3 calls verify:brain "wave 2"/);
  });

  it('recognises the `verify-<name>.mjs` spelling as the same claim', () => {
    const result = run(
      repo({ bootstrap: ['# Bootstrap', '', 'A `verify-brain.mjs` script will land later.'] }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/calls verify:brain "will land"/);
  });
});

describe('verify:doc-claims — the negative cases (FR-7)', () => {
  it('passes a future claim about a script that is genuinely NOT wired', () => {
    // Both halves are required. Without the wiring lookup this sentence fails,
    // and the check becomes "never mention future work", which is not the rule.
    const result = run(
      repo({
        bootstrap: ['# Bootstrap', '', 'A `verify:telemetry` check lands in wave 2.'],
        scripts: ['verify:brain'],
      }),
    );
    expect(result.code).toBe(0);
  });

  it('passes a mention of a wired script with no future marker', () => {
    const result = run(
      repo({ bootstrap: ['# Bootstrap', '', 'Run `verify:brain` before closing.'] }),
    );
    expect(result.code).toBe(0);
  });

  it('ignores a fenced block — a snippet is an example, not a claim', () => {
    const result = run(
      repo({
        bootstrap: ['# Bootstrap', '', '```sh', '# verify:brain lands in wave 2', '```'],
      }),
    );
    expect(result.code).toBe(0);
  });

  it("ignores STATUS.md's Recent activity — history stays true as history", () => {
    // A log entry that said "wave 2" on the day it was written is accurate as a
    // record. Rewriting history to satisfy a linter is the wrong direction.
    const result = run(
      repo({
        bootstrap: ['# Bootstrap'],
        statusExtra: ['- 2026-01-01 — `verify:brain` lands in wave 2'],
      }),
    );
    expect(result.code).toBe(0);
  });
});

describe('verify:doc-claims — the allowlist is shrink-only (FR-7)', () => {
  const staleLine = ['# Bootstrap', '', 'The `verify:brain` check lands in wave 2.'];

  it('an entry with a reason and a future reviewBy suppresses its own line', () => {
    const result = run(
      repo({
        bootstrap: staleLine,
        allowlist: [
          {
            file: 'AGENT_BOOTSTRAP.md',
            claim: 'lands in wave 2',
            reason: 'the second half genuinely ships later',
            reviewBy: TOMORROW,
          },
        ],
      }),
    );
    expect(result.code).toBe(0);
  });

  it('an entry whose reviewBy has passed FAILS, even though it still matches', () => {
    // The known-red-ledger lesson: an allowlist nobody is forced to revisit
    // becomes a permanent bypass, and the entries that matter are the ones
    // everyone has stopped seeing.
    const result = run(
      repo({
        bootstrap: staleLine,
        allowlist: [
          { file: 'AGENT_BOOTSTRAP.md', claim: 'lands in wave 2', reason: 'r', reviewBy: YESTERDAY },
        ],
      }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/reviewBy .* has passed — re-decide it/);
  });

  it('an entry that matches NO line fails — the list may only shrink', () => {
    const result = run(
      repo({
        bootstrap: ['# Bootstrap', '', 'Run `verify:brain` before closing.'],
        allowlist: [
          { file: 'AGENT_BOOTSTRAP.md', claim: 'lands in wave 2', reason: 'r', reviewBy: TOMORROW },
        ],
      }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/matches no line any more — remove it/);
  });

  it('an entry without a reason or a reviewBy fails rather than being honoured', () => {
    const result = run(
      repo({
        bootstrap: staleLine,
        allowlist: [{ file: 'AGENT_BOOTSTRAP.md', claim: 'lands in wave 2' }],
      }),
    );
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/needs a reason/);
    expect(result.out).toMatch(/needs a reviewBy date/);
  });
});

describe('verify:doc-claims — the scanned set is its own claim (FR-7)', () => {
  it('a listed file that is missing FAILS rather than being skipped', () => {
    // The set is what the checker says it covers. A silent skip turns the
    // coverage claim into a lie in the checker's own voice.
    const root = repo({ bootstrap: ['# Bootstrap'] });
    rmSync(join(root, '_brain/PROTOCOL.md'));
    const result = run(root);
    expect(result.code).toBe(1);
    expect(result.out).toMatch(/_brain\/PROTOCOL\.md: listed in the scanned set but missing/);
  });
});
