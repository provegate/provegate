import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { revalidateControlArtifacts } from '../src/core/run/index.js';

/**
 * PRD-022 — a worktree must still carry the control artifacts base carries.
 *
 * Two layers, because neither proves the other: the primitive is unit-covered
 * for the DERIVATION (which files, in which order, and what "unknowable" does),
 * and the seam is proven through the BUILT CLI in a real git worktree, because
 * `chain.test.ts` and `merge.test.ts` call functions — they cannot show that a
 * *command* stopped before running anything.
 */

const CLI_PATH = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

const git = (cwd: string, args: string[]): string =>
  execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function newRepo(tag: string): string {
  const root = mkdtempSync(join(tmpdir(), `provegate-reval-${tag}-`));
  roots.push(root);
  git(root, ['init', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Test']);
  git(root, ['config', 'commit.gpgsign', 'false']);
  return root;
}

// ─────────────────────────────────────────────────────────────────────────────
// FR-1 — the primitive
// ─────────────────────────────────────────────────────────────────────────────

interface Unit {
  root: string;
  relPath: string;
  branch: string;
}

/** A main checkout plus a linked worktree branched from its HEAD. `controls`
 * decides which control files exist BEFORE the worktree is cut — the
 * introduction case needs a worktree that never saw one. */
function unitRepo(tag: string, controls: string[]): Unit {
  const root = newRepo(tag);
  writeFileSync(join(root, 'seed.txt'), 'seed\n');
  for (const name of controls) writeFileSync(join(root, name), '{}\n');
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'seed']);
  const relPath = '.worktrees/wt';
  mkdirSync(join(root, '.worktrees'), { recursive: true });
  git(root, ['worktree', 'add', '-b', 'feat/wt', join(root, relPath)]);
  return { root, relPath, branch: 'feat/wt' };
}

const check = (u: Unit, extra?: Parameters<typeof revalidateControlArtifacts>[0]['extra']) =>
  revalidateControlArtifacts({
    root: u.root,
    config: cfg,
    relPath: u.relPath,
    branch: u.branch,
    ...(extra ? { extra } : {}),
  });

describe('revalidateControlArtifacts — derivation (FR-1)', () => {
  it('a checkout carrying what base carries does not drift', () => {
    const u = unitRepo('match', ['workflow.config.json', 'gates.manifest.json']);
    const result = check(u);
    expect(result.drifted).toEqual([]);
    // null, not '': callers branch on the value, and an empty string is falsy
    // in a way that hides a formatting bug.
    expect(result.refusal).toBeNull();
  });

  it('an edited control file drifts', () => {
    const u = unitRepo('edited', ['workflow.config.json', 'gates.manifest.json']);
    writeFileSync(join(u.root, 'gates.manifest.json'), '{ "phases": {} }\n');
    const result = check(u);
    expect(result.drifted).toEqual(['gates.manifest.json']);
    expect(result.refusal).toContain(`the checkout at ${u.relPath} carries workflow artifacts`);
  });

  it('a file DELETED locally but still committed on base drifts, not omitted', () => {
    // The quiet one: without the presence UNION this file drops out of the set
    // entirely and `loadManifest` falls back to `defaultManifest` — different
    // gates, no error.
    const u = unitRepo('deleted', ['workflow.config.json', 'gates.manifest.json']);
    rmSync(join(u.root, 'gates.manifest.json'));
    expect(check(u).drifted).toEqual(['gates.manifest.json']);
  });

  it('a file newly ADDED on base drifts even though the checkout never had it', () => {
    const u = unitRepo('introduced', []);
    writeFileSync(join(u.root, 'gates.manifest.json'), '{ "phases": {} }\n');
    git(u.root, ['add', '-A']);
    git(u.root, ['commit', '-m', 'introduce the manifest']);
    // The main checkout matches base; the worktree, cut before the commit,
    // does not — so this is the checkout-side comparator, not the ref-side one.
    expect(check(u).drifted).toEqual(['gates.manifest.json']);
  });

  it('a present but unhashable control file refuses instead of reporting agreement', () => {
    // Both comparators read null === null as "equal", so this is the one case
    // that could pass an unknowable file as clean. Fail closed.
    const u = unitRepo('unreadable', []);
    mkdirSync(join(u.root, 'workflow.config.json'));
    const result = check(u);
    expect(result.refusal).toContain('unusable workflow artifact (workflow.config.json)');
    expect(result.drifted).toEqual(['workflow.config.json']);
  });

  it('drifted order is extra, then config, then manifest — deduplicated by FIRST occurrence', () => {
    // The refusal joins this list, and FR-3 promises the claim refusal's bytes
    // are unchanged, so ORDER is contract. Alphabetical would put
    // gates.manifest.json first; a Set built ref-side-then-checkout-side would
    // still pass a membership assertion. Both must fail here.
    const u = unitRepo('order', ['workflow.config.json', 'gates.manifest.json']);
    writeFileSync(join(u.root, 'workflow.config.json'), '{ "owners": ["x"] }\n');
    writeFileSync(join(u.root, 'gates.manifest.json'), '{ "phases": {} }\n');
    const result = check(u, [{ rel: '_prds/wip/prd-001-x.md', sha: 'f'.repeat(40) }]);
    expect(result.drifted).toEqual([
      '_prds/wip/prd-001-x.md',
      'workflow.config.json',
      'gates.manifest.json',
    ]);
    // Every entry mismatches on BOTH sides, so a dedup that kept last-wins
    // would produce the same three names in the same order — the length is
    // what proves first-occurrence dedup ran at all.
    expect(result.drifted).toHaveLength(3);
    expect(result.refusal).toBe(
      `the checkout at ${u.relPath} carries workflow artifacts differing from 'main' (_prds/wip/prd-001-x.md, workflow.config.json, gates.manifest.json) — merge or rebase main into ${u.branch} first`,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-2 / FR-4 — the seam, through the built CLI
// ─────────────────────────────────────────────────────────────────────────────

interface Cli {
  code: number;
  stdout: string;
  stderr: string;
}

function cli(cwd: string, args: string[]): Cli {
  try {
    const stdout = execFileSync(process.execPath, [CLI_PATH, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, stdout, stderr: '' };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { code: e.status ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

interface Fixture {
  root: string;
  wt: string;
  relPath: string;
  branch: string;
  metrics: string;
  marker: string;
}

/** The phase-4 command is an observable no-op: the marker file is what turns
 * "no phase command ran" into a file assertion rather than stdout reading.
 * `node ` is an allowed prefix in `core/config/defaults.ts` — asserted below,
 * not assumed. `postMerge: []` lets a recovered `gate land` actually merge
 * instead of reverting on a toolchain this temp repo does not have. */
const MANIFEST = {
  phases: { '4': ['node -e "require(\'fs\').writeFileSync(\'ran.txt\',\'1\')"'] },
  postMerge: [],
};

/** A real repo, a real lease with real stamps, and a base that has moved on.
 * Everything it needs it creates: it never reads the developer's `.env*`, and
 * a linked worktree inherits none of this repository's toolchain
 * (`fresh-worktree-env-gap`). */
function fixture(tag: string, opts: { advanceBase?: boolean } = {}): Fixture {
  const root = newRepo(tag);
  expect(cli(root, ['init']).code).toBe(0);
  expect(cli(root, ['new', 'drift-case']).code).toBe(0);

  const prdPath = join(root, '_prds/wip/prd-001-drift-case.md');
  const prd = readFileSync(prdPath, 'utf8')
    .replace(/## Conflict Surface\n[\s\S]*?(?=\n## |$)/, '## Conflict Surface\n\n- `src/x/**`\n\n')
    .replace('> **Status**: Draft', '> **Status**: Approved')
    // The template ships placeholders; a fixture that leaves them in is a
    // fixture `gate check` refuses, which would make the unaffected-command
    // assertions test the placeholder rather than the drift.
    .replace(/\{\{CMD_TEST_SCOPED\}\}/g, 'node -e "0"');
  expect(prd).not.toContain('{{CMD_TEST_SCOPED}}');
  writeFileSync(prdPath, prd);
  writeFileSync(join(root, 'gates.manifest.json'), `${JSON.stringify(MANIFEST, null, 2)}\n`);
  git(root, ['add', '-A']);
  git(root, ['commit', '-m', 'seed']);

  const claim = cli(root, ['open', 'PRD-001', '--worktree']);
  expect(claim.code, claim.stderr).toBe(0);
  const relPath = '.worktrees/prd-001-drift-case';

  if (opts.advanceBase !== false) {
    // The drift: base moves, the checkout is untouched and unaware.
    writeFileSync(
      join(root, 'gates.manifest.json'),
      `${JSON.stringify({ ...MANIFEST, hardCaps: [] }, null, 2)}\n`,
    );
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'advance base']);
  }

  return {
    root,
    wt: join(root, relPath),
    relPath,
    branch: 'feat/prd-001-drift-case',
    metrics: join(root, cfg.dirs.metricsFile),
    marker: join(root, relPath, 'ran.txt'),
  };
}

describe('gate run / gate land refuse a drifted checkout (FR-2, FR-4)', () => {
  it('the fixture command prefix is actually allowlisted', () => {
    expect(cfg.commands.allowedPrefixes).toContain('node ');
  });

  it('gate run stops before any phase command and any metric row', () => {
    const fx = fixture('run');
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('gates.manifest.json');
    expect(result.stderr).toContain(`merge or rebase main into ${fx.branch} first`);
    // Assert-ABSENT, both of them: a grep over stdout would pass on a run that
    // executed everything and simply printed differently.
    expect(existsSync(fx.marker)).toBe(false);
    expect(existsSync(fx.metrics)).toBe(false);
  });

  it('gate land stops before the archive and before the merge', () => {
    const fx = fixture('land');
    const baseBefore = git(fx.root, ['rev-parse', 'main']);
    const result = cli(fx.wt, ['land', 'PRD-001']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('carries workflow artifacts differing');
    // Independent evidence, not stdout parsing: base did not move and the
    // branch carries no archive commit.
    expect(git(fx.root, ['rev-parse', 'main'])).toBe(baseBefore);
    expect(git(fx.root, ['log', '--oneline', fx.branch])).not.toContain('archive');
    expect(existsSync(join(fx.root, '_prds/completed/prd-001-drift-case.md'))).toBe(false);
  });

  it('a manifest deleted locally but still committed on base is refused', () => {
    // Without this the run proceeds against `defaultManifest(config)` — the
    // quietest form of the bug, because nothing errors.
    const fx = fixture('deleted', { advanceBase: false });
    rmSync(join(fx.wt, 'gates.manifest.json'));
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.code).toBe(1);
    // The DRIFT text specifically. `gates.manifest.json` alone is not enough:
    // with the check removed, the fallback manifest has no phase-4 command, so
    // the run stops elsewhere with the same filename in a different sentence —
    // and the marker is absent because nothing was configured to write it.
    expect(result.stderr).toContain('carries workflow artifacts differing');
    expect(result.stderr).toContain('gates.manifest.json');
    expect(existsSync(fx.marker)).toBe(false);
  });

  it('precedence: a malformed lease is named before drift', () => {
    const fx = fixture('lease');
    writeFileSync(join(fx.root, '_state/locks/prd-001-drift-case.json'), '{ "prd": "PRD-001" }\n');
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('malformed lease(s)');
    expect(result.stderr).not.toContain('carries workflow artifacts');
  });

  it('precedence: an unparseable local manifest is the loader error, not drift', () => {
    const fx = fixture('unparseable');
    writeFileSync(join(fx.wt, 'gates.manifest.json'), 'not json\n');
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('is not valid JSON');
    expect(result.stderr).not.toContain('carries workflow artifacts');
  });

  it('recovery: the remedy the refusal prints actually clears it', () => {
    // A check that never lets you through is not a check.
    const fx = fixture('recovery');
    expect(cli(fx.wt, ['run', 'PRD-001']).code).toBe(1);
    git(fx.wt, ['merge', '--no-edit', 'main']);

    const rerun = cli(fx.wt, ['run', 'PRD-001']);
    expect(rerun.stderr).not.toContain('carries workflow artifacts');
    expect(existsSync(fx.marker)).toBe(true);
    // The metric row that was absent under drift now exists — which is what
    // makes the earlier assert-absent mean something.
    expect(existsSync(fx.metrics)).toBe(true);

    rmSync(fx.marker);
    const baseBefore = git(fx.root, ['rev-parse', 'main']);
    const land = cli(fx.wt, ['land', 'PRD-001']);
    expect(land.stderr + land.stdout).not.toContain('carries workflow artifacts');
    expect(git(fx.root, ['rev-parse', 'main'])).not.toBe(baseBefore);
    expect(git(fx.root, ['log', '--oneline', '-1', 'main'])).toContain('PRD-001');
  });

  it('the read-only commands and the plan are unaffected by the same drift', () => {
    const fx = fixture('unaffected');
    for (const args of [['check', 'PRD-001'], ['status'], ['queue'], ['run', 'PRD-001', '--dry-run']]) {
      const result = cli(fx.wt, args);
      expect(result.code, `${args.join(' ')}: ${result.stderr}`).toBe(0);
      expect(result.stdout + result.stderr, args.join(' ')).not.toContain(
        'carries workflow artifacts',
      );
    }
    expect(existsSync(fx.marker)).toBe(false);
  });

  it('a lease with no worktree stamps runs its chain normally', () => {
    // The guard is `stamps !== null`; a plain claim has no checkout to compare
    // and must not be caught by a check written for worktrees.
    const fx = fixture('plain');
    expect(cli(fx.root, ['release', 'PRD-001', '--force']).code).toBe(0);
    expect(cli(fx.root, ['open', 'PRD-001']).code).toBe(0);
    const result = cli(fx.root, ['run', 'PRD-001']);
    expect(result.stderr).not.toContain('carries workflow artifacts');
    expect(existsSync(join(fx.root, 'ran.txt'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-5 — the stated boundary
// ─────────────────────────────────────────────────────────────────────────────

describe('the boundary is stated where the mechanism is described (FR-5)', () => {
  it('method.mdx names all three exclusions', () => {
    // Read the file DIRECTLY: `content-launch.test.ts` never opens method.mdx,
    // so an assertion added there would be a green that proves nothing.
    const mdx = readFileSync(
      resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/docs/content/docs/method.mdx'),
      'utf8',
    );
    // Anchor on the SECTION HEADING, not any mention: an earlier paragraph in
    // this file already says `git merge` bypasses the gates, and a slice that
    // started before it would satisfy the first exclusion without the new
    // section existing at all.
    const start = mdx.indexOf('### Control-artifact revalidation');
    expect(start, 'FR-5 section heading missing from method.mdx').toBeGreaterThan(-1);
    const section = mdx.slice(start);
    // A direct merge bypasses the runner entirely.
    expect(section).toMatch(/git merge/);
    // The read-only commands do not check, by design.
    expect(section).toMatch(/check[\s\S]{0,80}status[\s\S]{0,80}queue/);
    // A plan executes nothing, so it checks nothing.
    expect(section).toMatch(/--dry-run/);
  });
});
