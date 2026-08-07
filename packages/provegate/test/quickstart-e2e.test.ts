// quickstart-e2e — the QUICKSTART.md scenario region executes, or it fails
// (PRD-038). The committed doc is the runtime source: extraction parses the
// tagged region at run time and the harness stores no command copy. The
// sequence runs in a hermetic scratch repository against the packed tarball —
// unreachable registry, scrubbed git config, remapped HOME/XDG/npm/TMP — and
// the three measured chain stops are pinned as negative fixtures with their
// exact production reason strings. Written red-first: the extraction cases
// failed against the unmarked doc.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  writeFileSync,
  readFileSync,
  rmSync,
  mkdirSync,
  chmodSync,
  existsSync,
  readdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { repoPath } from './helpers/repo-reads.js';
import { QUICKSTART_TASKS_FIXTURE } from './helpers/escape-fixtures.js';

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const DOC_PATH = join(PKG_DIR, 'QUICKSTART.md');

// ---------------------------------------------------------------- extraction
const SCENARIO_START = '<!-- qs:scenario -->';
const SCENARIO_END = '<!-- /qs:scenario -->';
const SKIP_MARK = '<!-- qs:skip -->';

interface DocCommand {
  line: number;
  command: string;
}
interface Extraction {
  commands: DocCommand[];
  skippedFences: number;
}

/** The closed scenario grammar (FR-1): one region; ```sh fences executable;
 * ```text fences are output illustration; a qs:skip marker binds to exactly
 * the next ```sh fence; an untagged fence inside the region is a named
 * failure; one command per line, backslash continuations joined, comments and
 * blanks skipped, doc line numbers retained. */
export function extractScenario(doc: string): Extraction {
  const starts = doc.split('\n').flatMap((l, i) => (l.trim() === SCENARIO_START ? [i] : []));
  const ends = doc.split('\n').flatMap((l, i) => (l.trim() === SCENARIO_END ? [i] : []));
  const startIdx = starts[0];
  const endIdx = ends[0];
  if (starts.length !== 1 || ends.length !== 1 || startIdx === undefined || endIdx === undefined) {
    throw new Error(
      `qs:scenario — exactly one region required (found ${starts.length} start, ${ends.length} end)`,
    );
  }
  if (endIdx < startIdx) throw new Error('qs:scenario — end precedes start');
  const lines = doc.split('\n');
  const commands: DocCommand[] = [];
  let skippedFences = 0;
  let pendingSkip = false;
  let i = startIdx + 1;
  while (i < endIdx) {
    const line = lines[i] ?? '';
    if (line.trim() === SKIP_MARK) {
      if (pendingSkip) throw new Error(`qs:skip — two markers before one fence (line ${i + 1})`);
      // binds to the IMMEDIATELY next ```sh fence: only blank lines may intervene
      let j = i + 1;
      while (j < endIdx && (lines[j] ?? '').trim() === '') j++;
      if (!/^```sh\s*$/.test(lines[j] ?? '')) {
        throw new Error(
          `qs:skip — marker must be immediately followed by a \`\`\`sh fence (line ${i + 1})`,
        );
      }
      pendingSkip = true;
      i++;
      continue;
    }
    const fence = /^```(\S*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const close = lines.indexOf('```', i + 1);
      if (close < 0 || close >= endIdx) throw new Error(`unclosed fence at line ${i + 1}`);
      if (lang === 'sh') {
        if (pendingSkip) {
          skippedFences++;
          pendingSkip = false;
        } else {
          let joined = '';
          for (let j = i + 1; j < close; j++) {
            const t = (lines[j] ?? '').trim();
            if (t === '' || t.startsWith('#')) continue;
            if (t.endsWith('\\')) {
              joined += t.slice(0, -1) + ' ';
              continue;
            }
            commands.push({ line: j + 1, command: (joined + t).trim() });
            joined = '';
          }
          if (joined !== '') {
            throw new Error(
              `unterminated backslash continuation in the fence closing at line ${close + 1}`,
            );
          }
        }
      } else if (lang === 'text' || lang === 'json') {
        // illustration — never executed
      } else {
        throw new Error(`untagged fence inside the region at line ${i + 1}`);
      }
      i = close + 1;
      continue;
    }
    i++;
  }
  if (pendingSkip) throw new Error('qs:skip — dangling marker at region end');
  return { commands, skippedFences };
}

describe('quickstart extraction', () => {
  const doc = readFileSync(DOC_PATH, 'utf8');

  it('the committed doc carries exactly one scenario region', () => {
    expect(() => extractScenario(doc)).not.toThrow();
  });

  it('the region yields the canonical command sequence with doc lines retained', () => {
    const { commands } = extractScenario(doc);
    expect(commands.length).toBeGreaterThanOrEqual(8);
    expect(commands[0]?.command).toBe('npm install -D provegate');
    expect(commands.every((c) => c.line > 0)).toBe(true);
    const gateCmds = commands.filter((c) => c.command.includes('gate '));
    expect(gateCmds.some((c) => c.command.includes('gate init'))).toBe(true);
    expect(gateCmds.some((c) => c.command.includes('gate new'))).toBe(true);
    expect(gateCmds.some((c) => c.command.includes('gate check'))).toBe(true);
    expect(gateCmds.some((c) => c.command.includes('gate run'))).toBe(true);
  });

  it('the worktree alternative is skipped — documented, never executed', () => {
    const { commands, skippedFences } = extractScenario(doc);
    expect(skippedFences).toBe(1);
    expect(commands.some((c) => c.command.includes('--worktree'))).toBe(false);
  });

  it('a dangling qs:skip is a named failure', () => {
    const broken = doc.replace(SCENARIO_END, `${SKIP_MARK}\n\nprose\n${SCENARIO_END}`);
    expect(() => extractScenario(broken)).toThrow(/immediately followed/);
  });

  it('qs:skip with an intervening non-sh fence is a named failure (round-1 P1)', () => {
    const broken = doc.replace(SKIP_MARK, `${SKIP_MARK}\n\n\`\`\`text\nx\n\`\`\``);
    expect(() => extractScenario(broken)).toThrow(/immediately followed/);
  });

  it('an unterminated backslash continuation is a named failure (round-1 P1)', () => {
    // the continuation must sit on the fence's LAST command line to stay open
    const broken = doc.replace('npx gate init\n```', 'npx gate init \\\n```');
    expect(() => extractScenario(broken)).toThrow(/unterminated backslash/);
  });

  it('two regions are a named failure', () => {
    const broken = `${doc}\n${SCENARIO_START}\n${SCENARIO_END}\n`;
    expect(() => extractScenario(broken)).toThrow(/exactly one region/);
  });

  it('an untagged fence inside the region is a named failure', () => {
    const { commands } = extractScenario(doc);
    const anchor = '```sh';
    const broken = doc.replace(anchor, '```\nrogue\n```\n\n' + anchor);
    expect(() => extractScenario(broken)).toThrow(/untagged fence/);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('the exhaustive install mapping: exactly one install line exists', () => {
    const { commands } = extractScenario(doc);
    const installs = commands.filter((c) => /\binstall\b/.test(c.command));
    expect(installs).toHaveLength(1);
    expect(installs[0]?.command).toBe('npm install -D provegate');
  });
});

// ------------------------------------------------------------------- scratch
const IS_POSIX = process.platform !== 'win32';
let tarballPath = '';
let scratchRoot = '';

function childEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith('GIT_CONFIG')) continue; // COUNT, KEY_n, VALUE_n, PARAMETERS
    if (k.startsWith('PROVEGATE_')) continue; // runner sentinels
    if (/^npm_config_/i.test(k) || /^NPM_CONFIG_/.test(k)) continue; // registry/cache/prefix overrides
    if (
      [
        'HOME',
        'XDG_CONFIG_HOME',
        'XDG_DATA_HOME',
        'XDG_CACHE_HOME',
        'XDG_STATE_HOME',
        'TMPDIR',
      ].includes(k)
    )
      continue;
    env[k] = v;
  }
  const home = join(scratchRoot, 'home');
  mkdirSync(home, { recursive: true });
  env.HOME = home;
  env.XDG_CONFIG_HOME = join(home, '.config');
  env.XDG_DATA_HOME = join(home, '.data');
  env.XDG_CACHE_HOME = join(home, '.cache');
  env.XDG_STATE_HOME = join(home, '.state');
  env.TMPDIR = join(scratchRoot, 'tmp');
  mkdirSync(env.TMPDIR, { recursive: true });
  // every npm/npx invocation — not only the install — is pinned to the
  // unreachable registry and a scratch cache via the child's own .npmrc
  const npmrc = join(home, '.npmrc');
  if (!existsSync(npmrc)) {
    writeFileSync(
      npmrc,
      `registry=http://127.0.0.1:9\ncache=${join(scratchRoot, 'npm-cache')}\nupdate-notifier=false\naudit=false\nfund=false\n`,
    );
  }
  env.npm_config_userconfig = npmrc;
  env.GIT_CONFIG_GLOBAL = '/dev/null';
  env.GIT_CONFIG_SYSTEM = '/dev/null';
  env.GIT_CONFIG_NOSYSTEM = '1';
  return env;
}

function sh(repo: string, command: string, opts: { expectFail?: boolean } = {}) {
  const mapped =
    command === 'npm install -D provegate'
      ? `npm install -D ${JSON.stringify(tarballPath)} --no-audit --no-fund --registry http://127.0.0.1:9`
      : command;
  const r = spawnSync('/bin/sh', ['-c', mapped], {
    cwd: repo,
    encoding: 'utf8',
    env: childEnv(),
    timeout: 180_000,
  });
  if (!opts.expectFail && r.status !== 0) {
    throw new Error(`step failed: ${command}\nstderr tail: ${(r.stderr ?? '').slice(-800)}`);
  }
  return r;
}

function assertNoRemote(repo: string) {
  const r = spawnSync('git', ['remote'], { cwd: repo, encoding: 'utf8', env: childEnv() });
  expect(r.stdout.trim()).toBe('');
}

/** Harness scaffolding [H]: the artifacts the chain demands, pre-seeded so the
 * production path runs single-pass. Each helper names the CLI precondition. */
function seedPrd(repo: string) {
  // [H] minimal fill: the two {{CMD_TEST_SCOPED}} rows become a runnable
  // allowlisted command; eligible close (measured: check greens after only this).
  const p = join(repo, '_prds/wip/prd-001-fix-login-timeout.md');
  let s = readFileSync(p, 'utf8');
  s = s.replaceAll('`{{CMD_TEST_SCOPED}}`', '`node -e "process.exit(0)"`');
  s = s.replace(
    '- `{{CMD_CHECK_TYPES}}` — zero errors',
    '- `node -e "process.exit(0)"` — placeholder floor',
  );
  s = s.replace('- `{{CMD_LINT}}` — zero warnings', '');
  s = s.replace('- `{{CMD_TEST}}` — added tests pass; existing tests unchanged', '');
  s = s.replace('> **Autonomous Close**: operator-gated', '> **Autonomous Close**: eligible');
  writeFileSync(p, s);
}
function seedTasks(repo: string) {
  // [H] the phase-6 gate demands a tasks file whose ledger carries the
  // independent-review row naming the artifact path (measured stop (a)).
  writeFileSync(join(repo, '_tasks/wip/tasks-001-fix-login-timeout.md'), QUICKSTART_TASKS_FIXTURE);
}
function seedReview(repo: string, sha: string) {
  // [H] the review gate validates six metadata fields; a symbolic Base SHA is
  // refused (measured stop (b)) — the REAL head sha goes in.
  writeFileSync(
    join(repo, '_docs/reviews/review-001-fix-login-timeout.md'),
    `# Independent Review: PRD-001 — Fix Login Timeout

> **PRD:** PRD-001
> **Verdict:** pass
> **Reviewer:** scratch harness reviewer (not the implementing agent)
> **Base SHA:** \`${sha}\`
> **Critical:** 0
> **High:** 0
> **Medium:** 0
> **Quorum:** 1/1 pass

## Summary

Scratch harness review artifact.
`,
  );
}
function gitCommitAll(repo: string, msg: string) {
  sh(repo, 'git add -A');
  sh(repo, `git commit -q -m ${JSON.stringify(msg)}`);
}

function setupScratchRepo(): string {
  const repo = join(scratchRoot, `repo-${Math.random().toString(36).slice(2)}`);
  mkdirSync(repo, { recursive: true });
  sh(repo, 'git init -q -b main');
  sh(repo, 'git config user.email qs@harness.local');
  sh(repo, 'git config user.name "QS Harness"');
  writeFileSync(join(repo, '.gitignore'), 'node_modules/\n');
  writeFileSync(join(repo, 'README.md'), '# scratch\n');
  sh(repo, 'npm init -y >/dev/null 2>&1');
  gitCommitAll(repo, 'chore: init');
  return repo;
}

beforeAll(() => {
  scratchRoot = mkdtempSync(join(tmpdir(), 'qs-e2e-'));
  // setup (outside the write-boundary claim): build ONLY when dist is absent —
  // an unconditional rebuild here raced sibling test files over the shared dist
  // (pack.test packs while tsup cleans). Freshness is the floor's job: the
  // phase-4 chain runs `pnpm build` before `pnpm test`, so the gated run packs
  // a current dist; an ad-hoc run with no dist at all still self-heals.
  if (!existsSync(join(PKG_DIR, 'dist', 'cli.js'))) {
    execFileSync('pnpm', ['--filter', 'provegate', 'build'], {
      cwd: repoPath('.'),
      stdio: 'pipe',
    });
  }
  execFileSync('npm', ['pack', '--pack-destination', scratchRoot], {
    cwd: PKG_DIR,
    stdio: 'pipe',
  });
  const tgz = readdirSync(scratchRoot).find((f) => f.endsWith('.tgz'));
  if (!tgz) throw new Error('npm pack produced no tarball');
  tarballPath = join(scratchRoot, tgz);
}, 240_000);

/** The one cleanup path: first attempt may fail on a permission plant; reset
 * modes and retry, then verify deletion. Used by afterAll AND the plant test —
 * the plant exercises THIS code, not a lookalike. */
export function cleanupScratch(root: string): { initialFailure: boolean; diagnostic: string } {
  let initialFailure = false;
  let diagnostic = '';
  try {
    rmSync(root, { recursive: true });
  } catch (e) {
    initialFailure = true;
    diagnostic = String(e).slice(0, 200);
    const relax = (dir: string): void => {
      chmodSync(dir, 0o755);
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) relax(join(dir, entry.name));
      }
    };
    relax(root);
    rmSync(root, { recursive: true, force: true });
  }
  if (existsSync(root)) throw new Error(`cleanup failed to delete ${root}`);
  return { initialFailure, diagnostic };
}

afterAll(() => {
  if (scratchRoot) cleanupScratch(scratchRoot);
});

// ------------------------------------------------------------------ sequence
describe.skipIf(!IS_POSIX)('quickstart sequence (hermetic, single-pass)', () => {
  it('runs the doc commands in order to the handoff card', () => {
    const doc = readFileSync(DOC_PATH, 'utf8');
    const { commands } = extractScenario(doc);
    const repo = setupScratchRepo();
    assertNoRemote(repo);

    for (const { command, line } of commands) {
      // [H] pre-seed points, tied to the CLI preconditions the chain enforces
      if (command.includes('gate check')) {
        seedPrd(repo); // check demands runnable §11 rows
      }
      if (command.includes('gate run') && !command.includes('--dry-run')) {
        // the chain demands: tasks + review ledger row; a real Base SHA; a
        // feature branch (close from main is refused); committed state
        seedTasks(repo);
        gitCommitAll(repo, 'docs: prd + tasks');
        const sha = sh(repo, 'git rev-parse HEAD').stdout.trim();
        seedReview(repo, sha);
        sh(repo, 'git checkout -q -b feat/prd-001-fix-login-timeout');
        gitCommitAll(repo, 'docs: review artifact');
      }
      const r = sh(repo, command);
      if (command === 'npx gate run PRD-001') {
        expect(r.stdout).toContain('READY TO PUSH');
      }
      assertNoRemote(repo);
      expect(line).toBeGreaterThan(0);
    }

    // merged-base inspection: the close's promised artifacts on scratch main
    sh(repo, 'git checkout -q main');
    expect(existsSync(join(repo, '_prds/completed/prd-001-fix-login-timeout.md'))).toBe(true);
  }, 600_000);

  it('post-setup writes land under the scratch root (positive containment evidence)', () => {
    // the observation boundary (FR-2): every artifact class the run creates is
    // FOUND under scratchRoot — repo trees, the remapped home (npm userconfig,
    // caches), the remapped tmp. This is the observable half of the claim; no
    // global-filesystem proof is pretended.
    const entries = readdirSync(scratchRoot);
    expect(entries.some((e) => e.startsWith('repo-'))).toBe(true);
    expect(existsSync(join(scratchRoot, 'home', '.npmrc'))).toBe(true);
    expect(entries).toContain('tmp');
    expect(entries.some((e) => e.endsWith('.tgz'))).toBe(true);
  });
});

// --------------------------------------------------------- negative fixtures
describe.skipIf(!IS_POSIX)('the three measured chain stops, pinned', () => {
  it('(a) omitted tasks file stops phase 6 with the exact reason', () => {
    const repo = setupScratchRepo();
    for (const cmd of [
      'npm install -D provegate',
      'npx gate init',
      'npx gate new fix-login-timeout --class=hotfix',
    ])
      sh(repo, cmd);
    seedPrd(repo);
    sh(repo, 'npx gate check PRD-001');
    const r = sh(repo, 'npx gate run PRD-001', { expectFail: true });
    expect(r.stdout + r.stderr).toContain(
      'PRD-001: no tasks file — independent-review ledger missing',
    );
  }, 600_000);

  it('(b) the planted literal `main` in Base SHA is refused with the exact reason', () => {
    const repo = setupScratchRepo();
    for (const cmd of [
      'npm install -D provegate',
      'npx gate init',
      'npx gate new fix-login-timeout --class=hotfix',
    ])
      sh(repo, cmd);
    seedPrd(repo);
    sh(repo, 'npx gate check PRD-001');
    seedTasks(repo);
    seedReview(repo, 'main'); // the planted value — no claim about symbolic refs generally
    const r = sh(repo, 'npx gate run PRD-001', { expectFail: true });
    expect(r.stdout + r.stderr).toContain('missing `> **Base SHA:** <git sha>` metadata');
  }, 600_000);

  it('(c) the close from the base checkout is refused with the exact reason', () => {
    const repo = setupScratchRepo();
    for (const cmd of [
      'npm install -D provegate',
      'npx gate init',
      'npx gate new fix-login-timeout --class=hotfix',
    ])
      sh(repo, cmd);
    seedPrd(repo);
    sh(repo, 'npx gate check PRD-001');
    seedTasks(repo);
    gitCommitAll(repo, 'docs: prd + tasks');
    seedReview(repo, sh(repo, 'git rev-parse HEAD').stdout.trim());
    gitCommitAll(repo, 'docs: review');
    const r = sh(repo, 'npx gate run --from-phase=merge PRD-001', { expectFail: true });
    expect(r.stdout + r.stderr).toContain(
      "current branch is 'main' — run from the feature branch, not the base checkout",
    );
  }, 600_000);
});

// ------------------------------------------------------------------ mutation
describe.skipIf(!IS_POSIX)('doc-sourcing proven by mutation', () => {
  it('a scratch copy with gate new/gate open swapped fails at the relocated open', () => {
    const doc = readFileSync(DOC_PATH, 'utf8');
    const mutated = doc
      .replace('npx gate new fix-login-timeout --class=hotfix', '@@OPEN@@')
      .replace('npx gate open PRD-001', 'npx gate new fix-login-timeout --class=hotfix')
      .replace('@@OPEN@@', 'npx gate open PRD-001');
    const { commands } = extractScenario(mutated);
    const openIdx = commands.findIndex((c) => c.command === 'npx gate open PRD-001');
    const newIdx = commands.findIndex((c) => c.command.includes('gate new'));
    expect(openIdx).toBeLessThan(newIdx); // the swap took

    const repo = setupScratchRepo();
    let failedAt: DocCommand | null = null;
    let stderrTail = '';
    for (const dc of commands) {
      if (dc.command.includes('gate check') || dc.command.includes('gate run')) break;
      const r = sh(repo, dc.command, { expectFail: true });
      if (r.status !== 0) {
        failedAt = dc;
        stderrTail = (r.stderr ?? r.stdout ?? '').slice(-400);
        break;
      }
    }
    expect(failedAt?.command).toBe('npx gate open PRD-001'); // nothing to claim yet
    expect(failedAt!.line).toBeGreaterThan(0); // retained line from the COPY
    expect(stderrTail.length).toBeGreaterThan(0); // diagnostic carries the tail
  }, 600_000);
});

// ------------------------------------------------------------------- cleanup
describe.skipIf(!IS_POSIX)('cleanup plant (POSIX/Ubuntu scope)', () => {
  it('a non-empty chmod-555 subdir fails first removal, then finally resets and deletes', () => {
    const plantRoot = mkdtempSync(join(tmpdir(), 'qs-plant-'));
    const locked = join(plantRoot, 'locked');
    mkdirSync(locked);
    writeFileSync(join(locked, 'file.txt'), 'x');
    chmodSync(locked, 0o555);
    // the HARNESS cleanup path, not a lookalike (review round-1 P2)
    const result = cleanupScratch(plantRoot);
    expect(result.initialFailure).toBe(true); // the plant bit the first attempt
    expect(result.diagnostic.length).toBeGreaterThan(0); // captured before reset
    expect(existsSync(plantRoot)).toBe(false); // reset + retry deleted it
  });
});
