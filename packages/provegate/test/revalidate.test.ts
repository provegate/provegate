import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import {
  claimPrd,
  createPrd,
  initWorkspace,
  revalidateControlArtifacts,
} from '../src/core/run/index.js';
import { repoPath } from './helpers/repo-reads.js';

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

  it('a present but unhashable control file refuses, in the canonical words', () => {
    // Both comparators read null === null as "equal", so this is the one case
    // that could pass an unknowable file as clean. Fail closed — and say it in
    // the SAME sentence as ordinary drift, because `git hash-object` can fail
    // on a legitimate file (a failing clean filter) that `open.ts` used to
    // report as drift, and a second sentence would change bytes FR-3 promises.
    //
    // The directory here is a defensive stand-in, not a modelled production
    // state: the CLI's loaders reject an unreadable config before the primitive
    // is reached. What IS production-reachable is the filter case, which this
    // same branch covers and which no fixture can create portably.
    const u = unitRepo('unreadable', []);
    mkdirSync(join(u.root, 'workflow.config.json'));
    const result = check(u);
    expect(result.drifted).toEqual(['workflow.config.json']);
    expect(result.refusal).toBe(
      `the checkout at ${u.relPath} carries workflow artifacts differing from 'main' (workflow.config.json) — merge or rebase main into ${u.branch} first`,
    );
  });

  it('drifted order is extra, then config, then manifest — deduplicated by FIRST occurrence', () => {
    // The refusal joins this list, and FR-3 promises the claim refusal's bytes
    // are unchanged, so ORDER is contract. Alphabetical would put
    // gates.manifest.json first; a Set built ref-side-then-checkout-side would
    // still pass a membership assertion. Both must fail here.
    const u = unitRepo('order', ['workflow.config.json', 'gates.manifest.json']);
    // Both differ from base, so both enter the REF-side half in derivation
    // order. Then the worktree is given the root's manifest but not its
    // config, so only the config also enters the CHECKOUT-side half. Raw:
    // [prd, config, manifest, prd, config]. First-occurrence → prd, config,
    // manifest. Last-occurrence → manifest, prd, config. A sort → manifest
    // before config. All three differ, which is the only construction that can
    // tell the rules apart — an earlier version had every entry failing both
    // comparators, where first-wins and last-wins produce identical output
    // (found by independent review).
    writeFileSync(join(u.root, 'workflow.config.json'), '{ "owners": ["x"] }\n');
    writeFileSync(join(u.root, 'gates.manifest.json'), '{ "phases": {} }\n');
    copyFileSync(
      join(u.root, 'gates.manifest.json'),
      join(u.root, u.relPath, 'gates.manifest.json'),
    );
    const result = check(u, [{ rel: '_prds/wip/prd-001-x.md', sha: 'f'.repeat(40) }]);
    expect(result.drifted).toEqual([
      '_prds/wip/prd-001-x.md',
      'workflow.config.json',
      'gates.manifest.json',
    ]);
    expect(result.refusal).toBe(
      `the checkout at ${u.relPath} carries workflow artifacts differing from 'main' (_prds/wip/prd-001-x.md, workflow.config.json, gates.manifest.json) — merge or rebase main into ${u.branch} first`,
    );
  });
});

describe('the claim path emits the canonical refusal, byte for byte (FR-3)', () => {
  it('drift on reuse: prefix + core, asserted as a whole string', () => {
    // The extraction was verified during implementation by capturing this text
    // from a real run before the edit and comparing after. That comparison
    // lived in a scratch directory and left nothing behind — an independent
    // review pointed out that the repository therefore held no evidence for it.
    // This test IS the evidence: the exact bytes, pinned where a future edit to
    // the shared primitive has to walk past them.
    const root = newRepo('claimbytes');
    writeFileSync(join(root, 'seed.txt'), 'seed\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'seed']);
    initWorkspace(cfg, root);
    const { id, path } = createPrd(cfg, root, { slug: 'bytes' });
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        /## Conflict Surface\n[\s\S]*?(?=\n## |$)/,
        '## Conflict Surface\n\n- `src/bytes/**`\n\n',
      ),
    );
    writeFileSync(join(root, 'gates.manifest.json'), '{ "phases": {} }\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'workflow artifacts']);

    expect(claimPrd(cfg, root, id, { worktree: true }).ok).toBe(true);
    writeFileSync(join(root, 'gates.manifest.json'), '{ "phases": {}, "hardCaps": [] }\n');
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'advance base']);

    const stale = claimPrd(cfg, root, id, { worktree: true });
    expect(stale.ok).toBe(false);
    const slug = `${id.toLowerCase()}-bytes`;
    expect(stale.issues[0]).toBe(
      `claim rolled back: the checkout at .worktrees/${slug} carries workflow artifacts differing from 'main' (gates.manifest.json) — merge or rebase main into feat/${slug} first`,
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
function fixture(tag: string, opts: { advanceBase?: boolean; claims?: string[] } = {}): Fixture {
  const root = newRepo(tag);
  expect(cli(root, ['init']).code).toBe(0);
  expect(cli(root, ['new', 'drift-case']).code).toBe(0);

  const prdPath = join(root, '_prds/wip/prd-001-drift-case.md');
  const prd = readFileSync(prdPath, 'utf8')
    .replace(
      /## Conflict Surface\n[\s\S]*?(?=\n## |$)/,
      `## Conflict Surface\n\n${['src/x/**', ...(opts.claims ?? [])]
        .map((g) => `- \`${g}\``)
        .join('\n')}\n\n`,
    )
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
  it('the fixture command prefix is still allowlisted', () => {
    // Not proof that the command runs — the recovery test's marker file is
    // that. This exists so that removing `node ` from the allowlist fails here,
    // naming the cause, instead of failing three fixtures with a safety refusal
    // that reads like a drift bug.
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
    // The metric row, NOT the marker file. Measured with the seam disabled and
    // the manifest deleted: `_state/prd-metrics.jsonl` is written (the fallback
    // manifest's own gates run) while `ran.txt` is not (the fallback has no
    // marker command). Only the metric row has a cause independent of this
    // scenario, so only it is evidence that nothing ran.
    expect(existsSync(fx.metrics)).toBe(false);
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

  it('a control artifact the LEASE OWNS may differ from base — that is the work', () => {
    // PRD-021 was refused by this gate at its own close: its declared job is to
    // add a key to `workflow.config.json`, and the check could not tell a work
    // item editing a file it owns from a checkout that had fallen behind.
    //
    // The lease is the authorization. A `## Conflict Surface` claim means
    // exclusive write-ownership, so a control artifact inside `ownedPaths` is
    // one this branch is entitled to change.
    // The surface is declared BEFORE the claim, which is the only order that
    // works: `gate open --worktree` reads the PRD from the main checkout, so a
    // widening committed inside the worktree is invisible to it.
    const fx = fixture('owned', { advanceBase: false, claims: ['gates.manifest.json'] });
    writeFileSync(
      join(fx.wt, 'gates.manifest.json'),
      `${JSON.stringify({ ...MANIFEST, hardCaps: [] }, null, 2)}\n`,
    );

    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.stderr).not.toContain('carries workflow artifacts');
    expect(existsSync(fx.marker)).toBe(true);
  });

  it('an UNOWNED control artifact still refuses, and only that one is named', () => {
    // The other half. Ownership authorizes exactly what it covers — a file the
    // item never claimed is still drift, and the refusal must name it alone
    // rather than every artifact that happens to differ.
    const fx = fixture('unowned');
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('gates.manifest.json');
    expect(existsSync(fx.marker)).toBe(false);
  });

  it('a worktree that edits its own PRD is not refused', () => {
    // The normal state of a worktree mid-phase, and the reason the seam passes
    // no `extra`. Established by code reading until an independent review
    // pointed out no fixture actually did it — the seeding edits the PRD BEFORE
    // the claim, which proves nothing about the check.
    const fx = fixture('ownprd', { advanceBase: false });
    const prd = join(fx.wt, '_prds/wip/prd-001-drift-case.md');
    writeFileSync(prd, `${readFileSync(prd, 'utf8')}\n<!-- edited mid-phase -->\n`);
    const result = cli(fx.wt, ['run', 'PRD-001']);
    expect(result.stderr).not.toContain('carries workflow artifacts');
    expect(existsSync(fx.marker)).toBe(true);
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
    const mdx = readFileSync(repoPath('apps/docs/content/docs/method.mdx'), 'utf8');
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
