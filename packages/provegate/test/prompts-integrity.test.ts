import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, resolveConfig } from '../src/core/config/index.js';
import * as api from '../src/index.js';
import { initWorkspace, planPractices, practicesPackDir } from '../src/core/run/init.js';
import {
  PROMPTS_DISABLED_NOTE,
  PromptsError,
  evaluatePromptReconciliation,
  generatedPaths,
  packageVersion,
  parseRegistry,
  planStore,
  promptsPackageDir,
  reconcilePrompts,
  renderAdapters,
  renderPrompts,
  requiredValues,
  type PromptFinding,
  type RenderConfig,
} from '../src/core/run/prompts.js';
import { repoPath } from './helpers/repo-reads.js';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const twinPath = fileURLToPath(new URL('../practices/verify/verify-prompts.mjs', import.meta.url));
const changesetPath = repoPath('.changeset/prompt-store-reconciliation.md');
const packageDir = promptsPackageDir();
const installed = packageVersion(packageDir);

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function scratch(prefix: string): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function requiredRows() {
  return requiredValues(
    packageDir,
    planStore(packageDir),
    parseRegistry(readFileSync(join(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8')),
  );
}

/** Every required value supplied. `suffix` varies the free-text values so two
 * calls can render provably different bytes at the same version. */
function filledValues(suffix = ''): Record<string, string> {
  const values: Record<string, string> = {};
  for (const row of requiredRows()) {
    values[row.token] = row.enumerated?.[0] ?? `v${suffix}-${row.token}`;
  }
  return values;
}

interface StoreOverrides {
  dir?: string;
  adapters?: string[];
  values?: Record<string, string>;
}

function storeConfig(overrides: StoreOverrides = {}): RenderConfig {
  return {
    ...DEFAULT_CONFIG,
    prompts: {
      ...DEFAULT_CONFIG.prompts,
      enabled: true,
      dir: overrides.dir ?? '.provegate',
      adapters: overrides.adapters ?? [...DEFAULT_CONFIG.prompts.adapters],
      values: overrides.values ?? filledValues(),
    },
  } as unknown as RenderConfig;
}

function writeAt(root: string, rel: string, body: string): void {
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, body);
}

/** A tree whose every planned path is byte-identical to a fresh render. */
function freshTree(config: RenderConfig = storeConfig()): {
  root: string;
  paths: Map<string, string>;
} {
  const root = scratch('pg-recon-');
  const paths = generatedPaths(config, renderPrompts(packageDir, config), installed);
  for (const [rel, body] of paths) writeAt(root, rel, body);
  return { root, paths };
}

const byPath = (findings: PromptFinding[]): Map<string, PromptFinding> =>
  new Map(findings.map((f) => [f.path, f]));

const notCurrent = (findings: PromptFinding[]): PromptFinding[] =>
  findings.filter((f) => f.kind !== 'current');

const firstKey = (paths: Map<string, string>, marker: string): string => {
  const key = [...paths.keys()].find((p) => p.includes(marker));
  expect(key, `no planned path containing '${marker}'`).toBeDefined();
  return key!;
};

/** Spawn the real CLI in `root` — production shape, never hand-shaped args. */
async function gate(root: string, ...args: string[]) {
  try {
    const { stdout, stderr } = await run(process.execPath, [cliPath, ...args], { cwd: root });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}

interface ConfigJson {
  enabled?: boolean;
  dir?: string;
  adapters?: string[];
  values?: Record<string, string>;
  exceptions?: unknown[];
}

function writeConfigJson(
  root: string,
  prompts: ConfigJson,
  extra: Record<string, unknown> = {},
): void {
  writeFileSync(
    join(root, 'workflow.config.json'),
    `${JSON.stringify(
      {
        prompts: {
          enabled: prompts.enabled ?? true,
          dir: prompts.dir ?? '.provegate',
          adapters: prompts.adapters ?? [...DEFAULT_CONFIG.prompts.adapters],
          values: prompts.values ?? filledValues(),
          ...(prompts.exceptions === undefined ? {} : { exceptions: prompts.exceptions }),
        },
        ...extra,
      },
      null,
      2,
    )}\n`,
  );
}

// --- FR-1: classification ----------------------------------------------------

describe('classification (PRD-034 FR-1)', () => {
  it('a byte-identical tree is entirely current, and the domain is exactly the planned set', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const findings = reconcilePrompts(config, root, packageDir);
    expect(findings).toHaveLength(paths.size);
    expect(findings.every((f) => f.kind === 'current')).toBe(true);
    expect(new Set(findings.map((f) => f.path))).toEqual(new Set(paths.keys()));
  });

  it('missing: a deleted planned file, by ENOENT and nothing broader', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-3');
    rmSync(join(root, victim));
    const findings = byPath(reconcilePrompts(config, root, packageDir));
    expect(findings.get(victim)?.kind).toBe('missing');
    expect(notCurrent([...findings.values()])).toHaveLength(1);
  });

  it('stale: an older banner version reports stale naming both versions; the unbannered pair stays current', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    // Age every banner in place: same bytes the old package would have written.
    for (const [rel, body] of paths) {
      writeAt(root, rel, body.replaceAll(`provegate ${installed}`, 'provegate 0.0.1'));
    }
    const findings = reconcilePrompts(config, root, packageDir);
    const stale = findings.filter((f) => f.kind === 'stale');
    expect(stale.length).toBeGreaterThan(0);
    for (const f of stale) {
      expect(f.bannerVersion).toBe('0.0.1');
      expect(f.installedVersion).toBe(installed);
    }
    // The two deliberately unbannered planned paths carry no version, so aging
    // the banners changed nothing in them: byte-identical → current.
    const snippet = firstKey(paths, 'AGENTS.md.provegate.snippet');
    const registry = firstKey(paths, 'PLACEHOLDERS.md');
    const map = byPath(findings);
    expect(map.get(snippet)?.kind).toBe('current');
    expect(map.get(registry)?.kind).toBe('current');
    // And the split is exhaustive: everything is stale or current here.
    expect(findings.every((f) => f.kind === 'stale' || f.kind === 'current')).toBe(true);
  });

  it('modified: a byte edit at the installed version, and the finding carries the same-version attribution', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-1');
    writeAt(root, victim, `${paths.get(victim)!}\nlocal note\n`);
    const findings = byPath(reconcilePrompts(config, root, packageDir));
    const finding = findings.get(victim);
    expect(finding?.kind).toBe('modified');
    expect(finding?.bannerVersion).toBe(installed);
    expect(notCurrent([...findings.values()])).toHaveLength(1);
  });

  it('modified by a prompts.values change at the same version — the banner-blind case, detected by bytes', () => {
    const written = storeConfig({ values: filledValues('A') });
    const { root } = freshTree(written);
    const reconciledWith = storeConfig({ values: filledValues('B') });
    const findings = reconcilePrompts(reconciledWith, root, packageDir);
    const modified = findings.filter((f) => f.kind === 'modified');
    expect(modified.length).toBeGreaterThan(0);
    for (const f of modified) expect(f.bannerVersion).toBe(installed);
    // No other class appears: a values change is invisible to the banner.
    expect(findings.every((f) => f.kind === 'modified' || f.kind === 'current')).toBe(true);
  });

  it('unattributable: a stripped banner, an edited PLACEHOLDERS.md, an edited codex snippet; a removed snippet is missing', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const protocol = firstKey(paths, 'prompts/phase-2');
    const registry = firstKey(paths, 'PLACEHOLDERS.md');
    const snippet = firstKey(paths, 'AGENTS.md.provegate.snippet');
    writeAt(root, protocol, paths.get(protocol)!.replace(/<!-- GENERATED[\s\S]*?-->\n?/, ''));
    writeAt(root, registry, `${paths.get(registry)!}\nextra row\n`);
    writeAt(root, snippet, `${paths.get(snippet)!}\nedited\n`);
    const findings = byPath(reconcilePrompts(config, root, packageDir));
    expect(findings.get(protocol)?.kind).toBe('unattributable');
    expect(findings.get(registry)?.kind).toBe('unattributable');
    expect(findings.get(snippet)?.kind).toBe('unattributable');
    for (const rel of [protocol, registry, snippet]) {
      expect(findings.get(rel)?.bannerVersion).toBeNull();
    }
    rmSync(join(root, snippet));
    expect(byPath(reconcilePrompts(config, root, packageDir)).get(snippet)?.kind).toBe('missing');
  });

  it('byte-identical copies of both unbannered paths report current', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const findings = byPath(reconcilePrompts(config, root, packageDir));
    expect(findings.get(firstKey(paths, 'AGENTS.md.provegate.snippet'))?.kind).toBe('current');
    expect(findings.get(firstKey(paths, 'PLACEHOLDERS.md'))?.kind).toBe('current');
  });

  it('limit pin T4: an adapter removed from config leaves its file with NO finding', () => {
    const full = storeConfig();
    const { root, paths } = freshTree(full);
    const snippet = firstKey(paths, 'AGENTS.md.provegate.snippet');
    const withoutCodex = storeConfig({ adapters: ['claude-code', 'cursor'] });
    const findings = reconcilePrompts(withoutCodex, root, packageDir);
    // The surviving file is invisible — the recorded model limit, asserted so a
    // future discovery item must flip this consciously.
    expect(findings.some((f) => f.path === snippet)).toBe(false);
    expect(findings.every((f) => f.kind === 'current')).toBe(true);
  });

  it('limit pin T5: a renamed store reconciles clean, the abandoned tree is invisible, and the current adapters report diverged', () => {
    const oldConfig = storeConfig({ dir: '.provegate' });
    const { root } = freshTree(oldConfig);
    const newConfig = storeConfig({ dir: '.protocols' });
    // The adopter's rename+reinstall: new store written, existing adapter
    // destinations skipped by the additive installer (they exist).
    const fresh = generatedPaths(newConfig, renderPrompts(packageDir, newConfig), installed);
    for (const [rel, body] of fresh) {
      if (rel.startsWith('.protocols/')) writeAt(root, rel, body);
    }
    const findings = byPath(reconcilePrompts(newConfig, root, packageDir));
    // The abandoned tree produces no finding — no walk exists to see it.
    expect([...findings.keys()].some((p) => p.startsWith('.provegate/'))).toBe(false);
    // The new store reconciles.
    for (const [path, finding] of findings) {
      if (path.startsWith('.protocols/')) expect(finding.kind, path).toBe('current');
    }
    // T5's adapter-staleness consequence: the existing Claude/Cursor adapters
    // embed the OLD store path, so they diverge through the planned set —
    // visible without any search.
    for (const [path, finding] of findings) {
      if (path.startsWith('.claude/') || path.startsWith('.cursor/')) {
        expect(finding.kind, path).toBe('modified');
      }
    }
  });

  it('limit pin 6: unplanned bannered or banner-stripped files anywhere produce NO finding', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const donor = paths.get(firstKey(paths, 'prompts/phase-4'))!;
    writeAt(root, '.provegate/prompts/extra-unplanned.md', donor);
    writeAt(root, 'docs/stray.md', donor.replace(/<!-- GENERATED[\s\S]*?-->\n?/, ''));
    const findings = reconcilePrompts(config, root, packageDir);
    expect(findings.some((f) => f.path.includes('extra-unplanned'))).toBe(false);
    expect(findings.some((f) => f.path.includes('stray'))).toBe(false);
    expect(findings.every((f) => f.kind === 'current')).toBe(true);
  });

  it('canonical spelling: prompts.dir `.` reports clean repo-relative paths, never `./`', () => {
    const config = storeConfig({ dir: '.' });
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-5');
    writeAt(root, victim, `${paths.get(victim)!}\nedit\n`);
    const findings = reconcilePrompts(config, root, packageDir);
    expect(findings.length).toBe(paths.size);
    for (const f of findings) {
      expect(f.path.startsWith('./'), f.path).toBe(false);
      expect(f.path.includes('//'), f.path).toBe(false);
      expect(f.path.includes('\\'), f.path).toBe(false);
    }
    expect(findings.filter((f) => f.kind === 'modified').map((f) => f.path)).toEqual([
      victim.replace(/^\.\//, ''),
    ]);
  });

  it('read-error contract: a directory where a file was planned fails the run closed, naming the path', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-6');
    rmSync(join(root, victim));
    mkdirSync(join(root, victim));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(PromptsError);
    try {
      reconcilePrompts(config, root, packageDir);
    } catch (error) {
      expect((error as PromptsError).message).toContain(victim);
    }
  });

  it('containment: a leaf symlink escaping the repository fails closed naming the escape', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const outside = scratch('pg-outside-');
    const victim = firstKey(paths, 'prompts/phase-7');
    writeFileSync(join(outside, 'target.md'), paths.get(victim)!);
    rmSync(join(root, victim));
    symlinkSync(join(outside, 'target.md'), join(root, victim));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(/outside the repository/);
    try {
      reconcilePrompts(config, root, packageDir);
    } catch (error) {
      expect((error as PromptsError).message).toContain(victim);
    }
  });

  it('containment: a symlinked PARENT escaping the repository fails closed (watch item 1)', () => {
    const config = storeConfig();
    const { root } = freshTree(config);
    const outside = scratch('pg-outside-parent-');
    // The real templates content, relocated outside; the parent inside becomes
    // a link. The full destination realpath escapes even though the leaf is a
    // regular file.
    cpSync(join(root, '.provegate/templates'), join(outside, 'templates'), { recursive: true });
    rmSync(join(root, '.provegate/templates'), { recursive: true });
    symlinkSync(join(outside, 'templates'), join(root, '.provegate/templates'));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(/outside the repository/);
  });

  it('containment: a DANGLING leaf symlink fails closed — never classified missing', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const outside = scratch('pg-outside-dangling-');
    const victim = firstKey(paths, 'prompts/phase-1');
    rmSync(join(root, victim));
    // The target never exists: realpath ENOENTs exactly like true absence,
    // but SOMETHING sits at the planned path and its destination is outside.
    symlinkSync(join(outside, 'never-created.md'), join(root, victim));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(/unresolvable symlink/);
  });

  it('containment: a DANGLING parent symlink fails closed — the chain is checked, not only the leaf', () => {
    const config = storeConfig();
    const { root } = freshTree(config);
    // The parent link points at nothing: lstat on any planned child ENOENTs
    // (lstat follows parents), so a leaf-only check reads this as absence
    // while a link still sits on the chain.
    rmSync(join(root, '.provegate/templates'), { recursive: true });
    symlinkSync(join(root, 'no-such-target'), join(root, '.provegate/templates'));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(/unresolvable symlink/);
  });

  it('containment: a missing leaf beneath an OUTSIDE-pointing parent fails closed — never missing', () => {
    const config = storeConfig();
    const { root } = freshTree(config);
    const outside = scratch('pg-outside-empty-');
    mkdirSync(join(outside, 'templates'), { recursive: true });
    // The parent escapes and the planned files are absent at the destination:
    // realpath of each leaf ENOENTs, but the escape must win over `missing`.
    rmSync(join(root, '.provegate/templates'), { recursive: true });
    symlinkSync(join(outside, 'templates'), join(root, '.provegate/templates'));
    expect(() => reconcilePrompts(config, root, packageDir)).toThrow(/outside the repository/);
  });

  it('a leaf symlink resolving INSIDE the repository is read, not refused', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const a = firstKey(paths, 'prompts/phase-1');
    const b = firstKey(paths, 'prompts/phase-2');
    rmSync(join(root, a));
    symlinkSync(join(root, b), join(root, a));
    const findings = byPath(reconcilePrompts(config, root, packageDir));
    // Read succeeds; the bytes are b's, which differ from a's fresh render at
    // the same version → modified, never a refusal.
    expect(findings.get(a)?.kind).toBe('modified');
  });

  it('writes nothing: a full reconcile leaves every byte on disk untouched', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-3');
    const edited = `${paths.get(victim)!}\nedit\n`;
    writeAt(root, victim, edited);
    reconcilePrompts(config, root, packageDir);
    expect(readFileSync(join(root, victim), 'utf8')).toBe(edited);
    for (const [rel, body] of paths) {
      if (rel === victim) continue;
      expect(readFileSync(join(root, rel), 'utf8')).toBe(body);
    }
  });
});

// --- FR-1: api-export --------------------------------------------------------

describe('api-export (PRD-034 FR-1)', () => {
  it('reconcilePrompts and evaluatePromptReconciliation resolve from the package root export', () => {
    // `core/run/index.ts` re-exports by name — a new symbol does not travel for
    // free, which is exactly what this pins.
    expect(typeof api.reconcilePrompts).toBe('function');
    expect(typeof api.evaluatePromptReconciliation).toBe('function');
  });
});

// --- FR-2: the exception contract -------------------------------------------

describe('exception (PRD-034 FR-2)', () => {
  const entry = (over: Partial<Record<'path' | 'reason' | 'owner' | 'expires', unknown>> = {}) => ({
    path: '.provegate/prompts/phase-1-prd-generator.md',
    reason: 'project-specific wording',
    owner: 'owner',
    expires: '2999-12-31',
    ...over,
  });

  function loadWith(exceptions: unknown[], prompts: ConfigJson = { enabled: false }): () => void {
    const root = scratch('pg-exc-');
    writeConfigJson(root, { ...prompts, values: prompts.values ?? {}, exceptions });
    return () => resolveConfig(root);
  }

  it('a malformed date is refused at load, naming the entry', () => {
    expect(loadWith([entry({ expires: '31-12-2999' })])).toThrow(/expires/);
    expect(loadWith([entry({ expires: '2999-12-31T00:00:00Z' })])).toThrow(/expires/);
  });

  it('a non-calendar date is refused — YYYY-MM-DD shape alone is not a date', () => {
    expect(loadWith([entry({ expires: '2026-02-30' })])).toThrow(/not a real calendar date/);
  });

  it('a backslash anywhere in the path refuses the entry — rejection, not canonicalization', () => {
    expect(loadWith([entry({ path: '.provegate\\prompts\\x.md' })])).toThrow(/backslash/);
    expect(loadWith([entry({ path: 'a/b\\c.md' })])).toThrow(/backslash/);
  });

  it('absolute, home-relative, drive-anchored, dot-segment, empty-segment and leading-./ forms are each refused', () => {
    expect(loadWith([entry({ path: '/etc/x.md' })])).toThrow(/absolute/);
    expect(loadWith([entry({ path: '~/x.md' })])).toThrow(/home-relative/);
    expect(loadWith([entry({ path: 'C:x.md' })])).toThrow(/drive/);
    expect(loadWith([entry({ path: 'a/../b.md' })])).toThrow(/segment/);
    expect(loadWith([entry({ path: 'a/./b.md' })])).toThrow(/segment/);
    expect(loadWith([entry({ path: 'a//b.md' })])).toThrow(/empty segment/);
    expect(loadWith([entry({ path: 'a/b.md/' })])).toThrow(/empty segment/);
    expect(loadWith([entry({ path: './a/b.md' })])).toThrow(/\.\//);
  });

  it('duplicate paths are refused at load, compared byte-wise after no transformation', () => {
    expect(loadWith([entry(), entry()])).toThrow(/duplicates/);
    // Two spellings that a canonicalizing contract would merge stay two
    // strings — but each must be legal on its own; the non-normalized one is
    // refused by ITS rule, which is the rejection-only contract at work.
    expect(loadWith([entry(), entry({ path: './' + entry().path })])).toThrow(/\.\//);
  });

  it('empty reason and owner after trimming are refused', () => {
    expect(loadWith([entry({ reason: '  ' })])).toThrow(/reason/);
    expect(loadWith([entry({ owner: '' })])).toThrow(/owner/);
  });

  it('unknown entry fields are refused structurally', () => {
    expect(loadWith([{ ...entry(), note: 'extra' }])).toThrow(/unknown key/);
  });

  it('a missing field and a non-string field are refused structurally', () => {
    const rest: Partial<ReturnType<typeof entry>> = entry();
    delete rest.path;
    expect(loadWith([rest])).toThrow(/path/);
    expect(loadWith([entry({ expires: 20991231 })])).toThrow(/string/);
  });

  it('prompts.dir with a backslash is refused at load naming the key — the FR-2 strictness clause', () => {
    const root = scratch('pg-dir-');
    writeConfigJson(root, { enabled: false, dir: 'pg\\store', values: {} });
    expect(() => resolveConfig(root)).toThrow(/prompts\.dir/);
    expect(() => resolveConfig(root)).toThrow(/backslash/);
  });

  it('disabled precedence: a malformed entry fails the load even when prompts is disabled', () => {
    expect(loadWith([entry({ expires: 'never' })], { enabled: false })).toThrow(/expires/);
  });

  it('disabled precedence: valid, expired and would-be-stale entries are inert while disabled', () => {
    const load = loadWith([entry(), entry({ path: 'other/path.md', expires: '2000-01-01' })], {
      enabled: false,
    });
    expect(load).not.toThrow();
  });

  it('suppression: the modified finding is proven first with the entry removed, then suppressed with it present', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-1');
    writeAt(root, victim, `${paths.get(victim)!}\nlocal decision\n`);
    const findings = reconcilePrompts(config, root, packageDir);

    // Independent cause: without the entry the run fails on `modified`.
    const bare = evaluatePromptReconciliation(findings, { todayUtc: '2026-07-29' });
    expect(bare.ok).toBe(false);
    expect(bare.lines.some((l) => l.startsWith(victim) && l.includes('modified'))).toBe(true);

    const excepted = evaluatePromptReconciliation(findings, {
      exceptions: [
        {
          path: victim,
          reason: 'kept different on purpose',
          owner: 'owner',
          expires: '2026-08-01',
        },
      ],
      todayUtc: '2026-07-29',
    });
    expect(excepted.ok).toBe(true);
    expect(excepted.problems).toEqual([]);
    expect(excepted.lines.some((l) => l === `${victim}: excepted (expires 2026-08-01)`)).toBe(true);
  });

  it('suppresses ONLY modified: a stale, missing or unattributable finding is never exceptable', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const staleVictim = firstKey(paths, 'prompts/phase-2');
    const missingVictim = firstKey(paths, 'prompts/phase-3');
    const strippedVictim = firstKey(paths, 'prompts/phase-4');
    writeAt(
      root,
      staleVictim,
      paths.get(staleVictim)!.replaceAll(`provegate ${installed}`, 'provegate 0.0.1'),
    );
    rmSync(join(root, missingVictim));
    writeAt(
      root,
      strippedVictim,
      paths.get(strippedVictim)!.replace(/<!-- GENERATED[\s\S]*?-->\n?/, ''),
    );
    const findings = reconcilePrompts(config, root, packageDir);
    const report = evaluatePromptReconciliation(findings, {
      exceptions: [staleVictim, missingVictim, strippedVictim].map((path) => ({
        path,
        reason: 'attempted bypass',
        owner: 'owner',
        expires: '2999-12-31',
      })),
      todayUtc: '2026-07-29',
    });
    expect(report.ok).toBe(false);
    // Every one of those entries is stale — its path is not `modified` — and a
    // stale entry fails the run by name.
    expect(report.problems).toHaveLength(3);
    for (const problem of report.problems) expect(problem).toMatch(/not currently modified/);
    // And the findings themselves still report: nothing was suppressed.
    expect(report.lines.some((l) => l.includes('stale'))).toBe(true);
    expect(report.lines.some((l) => l.includes('missing'))).toBe(true);
    expect(report.lines.some((l) => l.includes('unattributable'))).toBe(true);
  });

  it('expiry boundary: an entry expiring today still suppresses; yesterday fails naming entry and expiry', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-5');
    writeAt(root, victim, `${paths.get(victim)!}\nedit\n`);
    const findings = reconcilePrompts(config, root, packageDir);
    const exception = (expires: string) => ({
      path: victim,
      reason: 'r',
      owner: 'owner',
      expires,
    });

    // Independent cause first: without any entry, the run fails on `modified` —
    // so the boundary suppressions below suppress a PROVEN finding.
    const bare = evaluatePromptReconciliation(findings, { todayUtc: '2026-07-29' });
    expect(bare.ok).toBe(false);
    expect(bare.lines.some((l) => l.startsWith(victim) && l.includes('modified'))).toBe(true);

    const today = evaluatePromptReconciliation(findings, {
      exceptions: [exception('2026-07-29')],
      todayUtc: '2026-07-29',
    });
    expect(today.ok).toBe(true);

    const yesterday = evaluatePromptReconciliation(findings, {
      exceptions: [exception('2026-07-28')],
      todayUtc: '2026-07-29',
    });
    expect(yesterday.ok).toBe(false);
    expect(yesterday.problems.some((p) => p.includes(victim) && p.includes('2026-07-28'))).toBe(
      true,
    );
  });

  it('a stale entry — its path currently current — fails the run', () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const findings = reconcilePrompts(config, root, packageDir);
    const report = evaluatePromptReconciliation(findings, {
      exceptions: [
        {
          path: firstKey(paths, 'prompts/phase-6'),
          reason: 'left over',
          owner: 'owner',
          expires: '2999-12-31',
        },
      ],
      todayUtc: '2026-07-29',
    });
    expect(report.ok).toBe(false);
    expect(report.problems.some((p) => p.includes('not currently modified'))).toBe(true);
  });
});

// --- FR-3: the command -------------------------------------------------------

describe('command (PRD-034 FR-3)', () => {
  async function cliTree(over: StoreOverrides = {}) {
    const config = storeConfig(over);
    const { root, paths } = freshTree(config);
    writeConfigJson(root, {
      dir: over.dir,
      adapters: over.adapters,
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
    });
    return { root, paths, config };
  }

  it('a current tree exits 0 with exactly the summary — per-path lines exist only for findings', async () => {
    const { root, paths } = await cliTree();
    const result = await gate(root, 'check', '--prompts');
    expect(result.code, result.stderr).toBe(0);
    // EXACTLY the one summary line — not containment: duplicate summaries,
    // stray `path: current` lines or any extra output must fail here.
    expect(result.stdout.trim().split('\n')).toEqual([
      `[check --prompts] ${paths.size} current, 0 excepted, 0 stale, 0 modified, 0 missing, 0 unattributable`,
    ]);
    expect(result.stderr.trim()).toBe('');
  });

  it('a modified path exits 1, says the cause may be a hand edit or a config change, and counts it', async () => {
    const { root, paths } = await cliTree();
    const victim = firstKey(paths, 'prompts/phase-1');
    writeAt(root, victim, `${paths.get(victim)!}\nedit\n`);
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(1);
    expect(result.stdout).toContain(`${victim}: modified`);
    expect(result.stdout).toContain('a hand edit or a config-value change');
    expect(result.stdout).toContain('1 modified');
  });

  it('a stale store exits 1 naming both versions and printing the T2 remedy verbatim — the command deletes nothing', async () => {
    const { root, paths } = await cliTree();
    for (const [rel, body] of paths) {
      writeAt(root, rel, body.replaceAll(`provegate ${installed}`, 'provegate 0.0.1'));
    }
    const before = readFileSync(join(root, firstKey(paths, 'prompts/phase-1')), 'utf8');
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(1);
    expect(result.stdout).toMatch(/stale — banner 0\.0\.1, installed \d+\.\d+\.\d+/);
    // The model's T2 remedy, pinned literally — the adopter deletes, the
    // command never does.
    expect(result.stdout).toContain(
      'upgrade remedy (state model T2): run `gate init --prompts` to print the reinstall unit,',
    );
    expect(result.stdout).toContain(
      'delete every path it prints, then run `gate init --prompts` again — this command deletes nothing.',
    );
    expect(readFileSync(join(root, firstKey(paths, 'prompts/phase-1')), 'utf8')).toBe(before);
  });

  it('disabled: exit 0 with the exact production note — never a bare silence', async () => {
    const root = scratch('pg-cli-disabled-');
    writeConfigJson(root, { enabled: false, values: {} });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code, result.stderr).toBe(0);
    // The full production constant, and its three load-bearing claims pinned
    // literally so the note cannot drift out from under this test.
    expect(result.stdout).toContain(PROMPTS_DISABLED_NOTE);
    expect(result.stdout).toContain('the planned-set reconciliation was NOT exercised');
    expect(result.stdout).toContain('clear `templates.prd` in the same change');
    expect(result.stdout).toContain('until a human deletes them');
  });

  it('disabled with bannered files on disk: the files produce no finding and the note is the whole output', async () => {
    const config = storeConfig();
    const { root } = freshTree(config);
    writeConfigJson(root, { enabled: false, values: {} });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(PROMPTS_DISABLED_NOTE);
    expect(result.stdout).not.toMatch(/: (modified|stale|missing|unattributable)/);
  });

  it('disabled with exceptions present: valid, expired and would-be-stale entries are inert and unmentioned', async () => {
    const root = scratch('pg-cli-inert-');
    writeConfigJson(root, {
      enabled: false,
      values: {},
      exceptions: [
        { path: 'a/b.md', reason: 'r', owner: 'owner', expires: '2999-12-31' },
        { path: 'c/d.md', reason: 'r', owner: 'owner', expires: '2000-01-01' },
      ],
    });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).toContain(PROMPTS_DISABLED_NOTE);
    expect(result.stdout + result.stderr).not.toMatch(/excepted|expired|a\/b\.md|c\/d\.md/);
  });

  it('disabled with a malformed entry: the load still fails — config validity is not feature-scoped', async () => {
    const root = scratch('pg-cli-malformed-');
    writeConfigJson(root, {
      enabled: false,
      values: {},
      exceptions: [{ path: 'a/b.md', reason: 'r', owner: 'owner', expires: 'never' }],
    });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('expires');
  });

  it('enabled with the store directory absent exits non-zero naming the directory', async () => {
    const root = scratch('pg-cli-absent-');
    writeConfigJson(root, { values: filledValues() });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('.provegate');
  });

  it('an excepted path reports excepted (expires <date>) through the CLI and does not fail the run', async () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    const victim = firstKey(paths, 'prompts/phase-2');
    writeAt(root, victim, `${paths.get(victim)!}\nkept\n`);

    // Independent cause, through the CLI: without the entry, the run fails.
    writeConfigJson(root, {
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
    });
    const bare = await gate(root, 'check', '--prompts');
    expect(bare.code).toBe(1);

    writeConfigJson(root, {
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
      exceptions: [{ path: victim, reason: 'kept', owner: 'owner', expires: '2999-12-31' }],
    });
    const excepted = await gate(root, 'check', '--prompts');
    expect(excepted.code, excepted.stderr).toBe(0);
    expect(excepted.stdout).toContain(`${victim}: excepted (expires 2999-12-31)`);
    expect(excepted.stdout).toContain('1 excepted');

    writeConfigJson(root, {
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
      exceptions: [{ path: victim, reason: 'kept', owner: 'owner', expires: '2000-01-02' }],
    });
    const expired = await gate(root, 'check', '--prompts');
    expect(expired.code).toBe(1);
    expect(expired.stderr).toContain('expired 2000-01-02');
  });

  it('a backslash prompts.dir is refused by the CLI at config load, naming the key', async () => {
    const root = scratch('pg-cli-backslash-');
    writeConfigJson(root, { enabled: false, dir: 'pg\\store', values: {} });
    const result = await gate(root, 'check', '--prompts');
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('prompts.dir');
    expect(result.stderr).toContain('backslash');
  });

  it('restatement sweep: the rendered store README names gate check --prompts and drops the nothing-detects claim', () => {
    const config = storeConfig();
    const readme = renderPrompts(packageDir, config).files.get('README.md') ?? '';
    expect(readme).toContain('gate check --prompts');
    expect(readme).not.toMatch(/staleness detection is deliberately not part/i);
    expect(readme).not.toMatch(/nothing detects/i);
    // The true halves survive: one-way install, no automatic repair.
    expect(readme).toMatch(/one way/i);
    expect(readme).toMatch(/repairs nothing|nothing repairs|deletes nothing/i);
  });

  it('restatement sweep: the CLI help and the check usage line both carry --prompts', async () => {
    const help = await gate(scratch('pg-cli-help-'), '--help');
    expect(help.code).toBe(0);
    // The full production phrase, not mere flag presence: the help must
    // DESCRIBE the check as the staleness detector, and must not claim
    // nothing detects staleness.
    expect(help.stdout).toContain('--prompts: prompt-store staleness check');
    expect(help.stdout).not.toMatch(/nothing detects/i);

    const root = scratch('pg-cli-usage-');
    writeConfigJson(root, { enabled: false, values: {} });
    const usage = await gate(root, 'check');
    expect(usage.code).toBe(1);
    expect(usage.stderr).toContain('gate check --prompts');
  });

  it('restatement sweep: gate init --prompts output no longer claims nothing detects staleness', async () => {
    const config = storeConfig();
    const root = scratch('pg-cli-init-');
    writeConfigJson(root, {
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
    });
    const result = await gate(root, 'init', '--prompts');
    expect(result.code, result.stderr).toBe(0);
    expect(result.stdout).not.toMatch(/no reconciliation/i);
    expect(result.stdout).toContain('gate check --prompts');
    // The one-way truth survives.
    expect(result.stdout).toMatch(/ONE WAY/);
  });
});

// --- FR-5: the packed twin ---------------------------------------------------

describe('packed (PRD-034 FR-5)', () => {
  async function twin(root: string) {
    try {
      const { stdout, stderr } = await run(process.execPath, [twinPath, root]);
      return { code: 0, stdout, stderr };
    } catch (error) {
      const e = error as { code?: number; stdout?: string; stderr?: string };
      return { code: e.code ?? -1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
    }
  }

  it('executes as a module and reaches the same verdict as the CLI on the same tree', async () => {
    const config = storeConfig();
    const { root, paths } = freshTree(config);
    writeConfigJson(root, {
      values: (config as unknown as { prompts: { values: Record<string, string> } }).prompts.values,
    });

    const cleanTwin = await twin(root);
    const cleanCli = await gate(root, 'check', '--prompts');
    expect(cleanTwin.code, cleanTwin.stderr).toBe(0);
    expect(cleanCli.code).toBe(0);

    const victim = firstKey(paths, 'prompts/phase-3');
    writeAt(root, victim, `${paths.get(victim)!}\ndrift\n`);
    const dirtyTwin = await twin(root);
    const dirtyCli = await gate(root, 'check', '--prompts');
    expect(dirtyTwin.code).toBe(1);
    expect(dirtyCli.code).toBe(1);
    expect(dirtyTwin.stdout).toContain(`${victim}: modified`);
  });

  it('imports the primitive and the evaluator from the installed package and reimplements nothing', () => {
    const source = readFileSync(twinPath, 'utf8');
    expect(source).toMatch(/from 'provegate'/);
    expect(source).toContain('reconcilePrompts');
    expect(source).toContain('evaluatePromptReconciliation');
    expect(source).toContain('promptsCheckPreflight');
    // No second implementation: the twin never opens a file or a directory
    // itself — the comparison and the interpretation both live in the package.
    expect(source).not.toContain('node:fs');
  });

  it('is delivered: PACK_MAP installs it and the pack manifest ships it', () => {
    const actions = planPractices(practicesPackDir());
    expect(actions.some((a) => a.path === 'scripts/verify/verify-prompts.mjs')).toBe(true);
    const manifest = JSON.parse(
      readFileSync(fileURLToPath(new URL('./pack-manifest.json', import.meta.url)), 'utf8'),
    ) as string[];
    expect(manifest).toContain('practices/verify/verify-prompts.mjs');
  });

  it('joins the packed verify-workflow CHECKS', () => {
    const bundle = readFileSync(
      fileURLToPath(new URL('../practices/verify/verify-workflow.mjs', import.meta.url)),
      'utf8',
    );
    expect(bundle).toContain("'verify-prompts.mjs'");
  });

  it('the packed NEXT_STEPS names the check and drops the nothing-detects claim', () => {
    const nextSteps = readFileSync(
      fileURLToPath(new URL('../practices/NEXT_STEPS.md', import.meta.url)),
      'utf8',
    );
    expect(nextSteps).toContain('gate check --prompts');
    expect(nextSteps).toContain('verify:prompts');
    expect(nextSteps).not.toMatch(/nothing detects/i);
  });
});

// --- §7: migration -----------------------------------------------------------

describe('migration (PRD-034 §7)', () => {
  it('a pre-034 practices tree through the additive installer: the new check is created, existing files untouched', () => {
    const root = scratch('pg-migrate-');
    // The adopter's PRD-029-era bundle: no verify-prompts member, their edits.
    const oldBundle = "const CHECKS = [\n  'verify-brain.mjs',\n];\n// local edit\n";
    writeAt(root, 'scripts/verify/verify-workflow.mjs', oldBundle);
    const report = initWorkspace(DEFAULT_CONFIG, root, {
      extra: planPractices(practicesPackDir()),
    });
    expect(report.created).toContain('scripts/verify/verify-prompts.mjs');
    expect(report.skipped).toContain('scripts/verify/verify-workflow.mjs');
    expect(readFileSync(join(root, 'scripts/verify/verify-workflow.mjs'), 'utf8')).toBe(oldBundle);
  });

  it('the changeset carries the three-step adopter migration verbatim', () => {
    const body = readFileSync(changesetPath, 'utf8');
    expect(body).toMatch(/provegate['"]?\s*:\s*['"]?minor/);
    expect(body).toMatch(/upgrade the package/i);
    expect(body).toContain('gate init --practices');
    expect(body).toContain('CHECKS');
    expect(body).toContain('verify-prompts.mjs');
  });

  it('the changeset carries the backslash-dir procedure including the templates.prd step, and the downgrade order', () => {
    const body = readFileSync(changesetPath, 'utf8');
    expect(body).toMatch(/git mv/);
    expect(body).toContain('templates.prd');
    expect(body).toMatch(/renderAdapters|every generated file whose content embeds/i);
    expect(body).toMatch(/entire `?prompts\.exceptions`? key/);
    expect(body).toMatch(/before downgrading/i);
  });

  it('backslash-dir migration end-to-end: the moved store reconciles clean and gate new resolves the moved template', async () => {
    const root = scratch('pg-backslash-');
    // The pre-034 state: a literal backslash dirname on POSIX, built in memory
    // because the new validator refuses to LOAD such a config — that refusal is
    // the reason the migration exists.
    const oldConfig = storeConfig({ dir: 'pg\\store' });
    const oldRender = renderPrompts(packageDir, oldConfig);
    const oldPaths = generatedPaths(oldConfig, oldRender, installed);
    for (const [rel, body] of oldPaths) writeAt(root, rel, body);

    // Step 1: git mv equivalent — the store directory moves to the clean name.
    renameSync(join(root, 'pg\\store'), join(root, 'pg-store'));

    // Step 2: one config edit — prompts.dir AND templates.prd together.
    const newConfig = storeConfig({ dir: 'pg-store' });
    writeConfigJson(
      root,
      {
        dir: 'pg-store',
        values: (newConfig as unknown as { prompts: { values: Record<string, string> } }).prompts
          .values,
      },
      { templates: { prd: 'pg-store/templates/prd-template.md' } },
    );

    // Step 3: delete every generated file whose CONTENT embeds the old dir —
    // the set comes from renderAdapters(), not from memory.
    const embedding = [...renderAdapters(oldConfig, oldRender.files, installed).keys()];
    expect(embedding.length).toBeGreaterThan(2); // claude phase files + cursor rule + snippet
    for (const rel of embedding) {
      rmSync(join(root, rel.replace('pg\\store', 'pg-store')), { force: true });
    }
    const reinit = await gate(root, 'init', '--prompts');
    expect(reinit.code, reinit.stderr).toBe(0);

    // The migrated set reconciles clean.
    const check = await gate(root, 'check', '--prompts');
    expect(check.code, check.stdout + check.stderr).toBe(0);

    // And the production template resolver reads the MOVED template. The §7
    // claim is resolution — `gate new` reads `templates.prd` at the new
    // spelling, never the abandoned one — and the error classes discriminate:
    // the moved template is READ and fails on its content (the anchor-drift
    // error: rendering substitutes `{{ID_PREFIX}}`, which `gate new`'s anchor
    // still expects — an inherited PRD-029 defect, recorded as a deferral),
    // while the abandoned spelling never gets that far.
    const created = await gate(root, 'new', 'migration-probe');
    expect(created.stderr).toContain('template anchor not found');
    expect(created.stderr).not.toMatch(/ENOENT|no such file/);

    // Control: the ABANDONED spelling fails as a missing file, proving the
    // assertion above discriminates read-the-moved-bytes from cannot-find.
    writeConfigJson(
      root,
      {
        dir: 'pg-store',
        values: (newConfig as unknown as { prompts: { values: Record<string, string> } }).prompts
          .values,
      },
      { templates: { prd: 'pg\\store/templates/prd-template.md' } },
    );
    const stale = await gate(root, 'new', 'migration-probe');
    expect(stale.code).toBe(1);
    expect(stale.stderr).not.toContain('template anchor not found');
  });
});
