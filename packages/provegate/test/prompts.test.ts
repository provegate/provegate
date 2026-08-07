import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { initWorkspace, planPrompts } from '../src/core/run/init.js';
import {
  DISPOSITIONS,
  PromptsError,
  bannerFor,
  planStore,
  promptsPackageDir,
  artifactGlobs,
  assertNoCollision,
  generatedPaths,
  packageVersion,
  bannerVersion,
  renderAdapters,
  parseRegistry,
  renderPrompts,
  requiredValues,
  scanTokens,
  substituteOnce,
} from '../src/core/run/prompts.js';

const readFileSyncUtf8 = (p: string): string => readFileSync(p, 'utf8');
const DIRECTIVE_TEXT = 'Read the protocol below and follow it verbatim; do not summarise it.';
const registryDeps = { parseRegistry, planStore, requiredValues };

/** Every regular file under `root`, repo-relative, sorted. */
function listAll(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir)) {
      const abs = join(dir, entry);
      const rel = prefix === '' ? entry : `${prefix}/${entry}`;
      if (statSync(abs).isDirectory()) visit(abs, rel);
      else out.push(rel);
    }
  };
  visit(root, '');
  return out.sort();
}

function writeAt(root: string, rel: string, body: string): void {
  const abs = join(root, rel);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, body);
}

const roots: string[] = [];

/** A scratch package tree: only the two source directories the rules address. */
function tempPackage(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-corpus-'));
  roots.push(root);
  mkdirSync(join(root, 'prompts'), { recursive: true });
  mkdirSync(join(root, 'templates'), { recursive: true });
  for (const [rel, body] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(join(abs, '..'), { recursive: true });
    writeFileSync(abs, body);
  }
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

// --- FR-2: dispositions -----------------------------------------------------

describe('disposition rules (PRD-029 FR-2)', () => {
  it('is TOTAL by refusal: a file matching no rule fails the plan by name', () => {
    // The totality lives in the failure, not the rule list. No finite list
    // covers a directory anyone may add a file to. This is reachable today:
    // a `.txt` beside a protocol matches nothing.
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry\n',
      'prompts/notes.txt': 'stray\n',
    });
    expect(() => planStore(root)).toThrow(PromptsError);
    try {
      planStore(root);
    } catch (error) {
      const message = (error as PromptsError).message;
      expect(message).toContain('prompts/notes.txt');
      // The diagnostic must name the dispositions available, so the reader can
      // choose one rather than guess.
      expect(message).toContain('available dispositions');
    }
  });

  it('is TOTAL by refusal for a nested template, which rule 6 deliberately excludes', () => {
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry\n',
      'templates/legacy/x-template.md': 'body\n',
    });
    expect(() => planStore(root)).toThrow(/matches no disposition rule/);
  });

  it('refuses a symlink by name — neither followed nor silently skipped', () => {
    // Following one reads outside the shipped tree; skipping one drops content
    // with no signal. The refusal names the remedy.
    const root = tempPackage({ 'prompts/PLACEHOLDERS.md': '# registry\n' });
    const outside = mkdtempSync(join(tmpdir(), 'provegate-outside-'));
    roots.push(outside);
    writeFileSync(join(outside, 'real.md'), 'x\n');
    symlinkSync(join(outside, 'real.md'), join(root, 'prompts', 'linked.md'));
    expect(() => planStore(root)).toThrow(/symlink/);
    try {
      planStore(root);
    } catch (error) {
      expect((error as PromptsError).message).toContain('replace it with a regular file');
    }
  });

  it('matches rule 4 BEFORE rule 5, so a fragment is never emitted', () => {
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry\n',
      'prompts/_fragments/AUTONOMY_MODE.human-gated.md': 'gated\n',
      'prompts/phase-1-x.md': 'body\n',
    });
    const planned = planStore(root);
    const dests = planned.map((p) => p.storeRel);
    expect(dests).toContain('prompts/phase-1-x.md');
    expect(dests.some((d) => d.includes('_fragments'))).toBe(false);
  });

  it('preserves a nested prompts path and flattens nothing', () => {
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry\n',
      'prompts/adapters/codex-starter.md': 'body\n',
    });
    const planned = planStore(root);
    expect(planned.map((p) => p.storeRel)).toContain('prompts/adapters/codex-starter.md');
  });

  it('omits both package READMEs and copies the registry verbatim', () => {
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry {{CMD_TEST}}\n',
      'prompts/README.md': 'internal map\n',
      'templates/README.md': 'internal map\n',
    });
    const planned = planStore(root);
    const dests = planned.map((p) => p.storeRel);
    expect(dests).toEqual(['prompts/PLACEHOLDERS.md']);
    expect(planned[0]!.rule.disposition).toBe('verbatim');
  });

  it('refuses a case-twin fixture fail-closed on any volume', () => {
    const root = tempPackage({
      'prompts/PLACEHOLDERS.md': '# registry\n',
      'templates/a-template.md': 'one\n',
      'templates/A-Template.md': 'two\n',
    });
    // On a case-insensitive volume the two collapse into one file and at most
    // two files ship. On a case-sensitive one the uppercase twin is refused at
    // the RULE layer — the lowercase-anchored template rule does not match it,
    // and the unmatched check runs before the collision guard, so 'one
    // destination' is unreachable from this fixture there. The guard itself is
    // exercised directly in M3 below; this test pins that neither volume ships
    // the twin silently.
    const planned = (() => {
      try {
        return planStore(root);
      } catch (error) {
        expect((error as PromptsError).message).toMatch(
          /one destination|matches no disposition rule/,
        );
        return null;
      }
    })();
    if (planned !== null) expect(planned.length).toBeLessThanOrEqual(2);
  });

  it('selects exactly what the shipped corpus states it selects', () => {
    // The rules are the specification; this pins the measurement so it cannot
    // drift unnoticed. 12 rendered protocols, 7 rendered templates, 1 verbatim.
    const planned = planStore(promptsPackageDir());
    const rendered = planned.filter((p) => p.rule.disposition === 'render');
    const verbatim = planned.filter((p) => p.rule.disposition === 'verbatim');
    expect(rendered.filter((p) => p.storeRel.startsWith('prompts/'))).toHaveLength(12);
    expect(rendered.filter((p) => p.storeRel.startsWith('templates/'))).toHaveLength(7);
    expect(verbatim.map((p) => p.storeRel)).toEqual(['prompts/PLACEHOLDERS.md']);
    expect(planned.map((p) => p.storeRel)).not.toContain('prompts/README.md');
  });

  it('lists its rules in the order the specification states', () => {
    expect(DISPOSITIONS.map((r) => r.disposition)).toEqual([
      'refuse',
      'omit',
      'verbatim',
      'input',
      'render',
      'render',
    ]);
  });
});

// --- FR-3: token grammar ----------------------------------------------------

describe('token grammar (PRD-029 FR-3)', () => {
  it('leaves text in neither candidate class untouched', () => {
    // A rule that treated every `{{` as a token would make the render hostile
    // to prose it was never meant to interpret.
    for (const prose of ['{{lowercase}}', '{{ spaced }}', '{{1}}', '{{}}']) {
      const { found, bad } = scanTokens(`a ${prose} b\n`, 'f.md');
      expect(found).toEqual([]);
      expect(bad).toEqual([]);
      expect(substituteOnce(`a ${prose} b\n`, new Map())).toBe(`a ${prose} b\n`);
    }
  });

  it('reports a token that does not close on the same line as malformed', () => {
    const { bad } = scanTokens('start {{TO\nKEN}} end\n', 'f.md');
    expect(bad).toHaveLength(1);
    expect(bad[0]!.kind).toBe('malformed');
    expect(bad[0]!.line).toBe(1);
  });

  it('reports an out-of-charset identifier as malformed, not as a token', () => {
    const { found, bad } = scanTokens('{{Name}} {{FOO-BAR}}\n', 'f.md');
    expect(found).toEqual([]);
    expect(bad).toHaveLength(2);
    expect(bad.every((d) => d.kind === 'malformed')).toBe(true);
  });

  it('finds a well-formed token with its line', () => {
    const { found, bad } = scanTokens('one\ntwo {{CMD_TEST}}\n', 'f.md');
    expect(bad).toEqual([]);
    expect(found).toEqual([{ token: 'CMD_TEST', line: 2 }]);
  });

  it('applies the ESCAPE class first, so the escape is reachable at all', () => {
    // Under a token-only candidate rule `{{!NAME}}` is not a candidate and this
    // renders nothing — the escape would be unreachable by its own grammar.
    expect(substituteOnce('{{!CMD_TEST}}', new Map([['CMD_TEST', 'X']]))).toBe('{{CMD_TEST}}');
  });

  it('escapes recursively, so any literal a document needs can be written', () => {
    expect(substituteOnce('{{!!CMD_TEST}}', new Map([['CMD_TEST', 'X']]))).toBe('{{!CMD_TEST}}');
  });

  it('treats a value as OPAQUE and never re-scans it', () => {
    // A value containing another token must be emitted as-is. Re-scanning would
    // make the output depend on replacement order.
    const out = substituteOnce(
      '{{CMD_TEST}}',
      new Map([
        ['CMD_TEST', 'run {{ID_PREFIX}}'],
        ['ID_PREFIX', 'PRD'],
      ]),
    );
    expect(out).toBe('run {{ID_PREFIX}}');
  });

  it('replaces every occurrence exactly once', () => {
    expect(substituteOnce('{{A}} {{A}}', new Map([['A', 'x']]))).toBe('x x');
  });

  it('leaves an unresolved token in place for the caller to diagnose', () => {
    expect(substituteOnce('{{CMD_TEST}}', new Map())).toBe('{{CMD_TEST}}');
  });
});

// --- FR-3: banner -----------------------------------------------------------

describe('generated banner (PRD-029 FR-3)', () => {
  it('goes first in an ordinary Markdown file', () => {
    expect(bannerFor('# Title\n', '0.2.0').startsWith('<!-- GENERATED')).toBe(true);
  });

  it('goes AFTER frontmatter, so line 1 stays `---`', () => {
    // Every `.cursor/rules/*.mdc` here and in the source snapshot opens with
    // `---`; a banner above it moves the frontmatter and the rule may not
    // attach at all.
    const mdc = '---\ndescription: x\nglobs: y\nalwaysApply: false\n---\n\n## Body\n';
    const out = bannerFor(mdc, '0.2.0');
    expect(out.split('\n')[0]).toBe('---');
    expect(out.indexOf('<!-- GENERATED')).toBeGreaterThan(out.indexOf('\n---\n', 4));
  });

  it('names the version and the one-way reinstall rule', () => {
    const banner = bannerFor('# T\n', '9.9.9');
    expect(banner).toContain('9.9.9');
    expect(banner).toContain('ONE WAY');
  });
});

// --- FR-5: the installer contract and the reinstall unit --------------------

/** Every required value supplied, so the render succeeds. */
function filledConfig(dir = '.provegate') {
  const packageDir = promptsPackageDir();
  const rows = parseRegistryFromPackage(packageDir);
  const values: Record<string, string> = {};
  for (const row of rows) values[row.token] = row.enumerated?.[0] ?? `v-${row.token}`;
  return {
    ...DEFAULT_CONFIG,
    prompts: { ...DEFAULT_CONFIG.prompts, enabled: true, dir, values },
  };
}

function parseRegistryFromPackage(packageDir: string) {
  // Local import kept inline so this block reads as one unit with its fixtures.
  const { parseRegistry, planStore: plan, requiredValues } = registryDeps;
  return requiredValues(
    packageDir,
    plan(packageDir),
    parseRegistry(readFileSyncUtf8(join(packageDir, 'prompts/PLACEHOLDERS.md'))),
  );
}

describe('installer contract (PRD-029 FR-5)', () => {
  it('a refused run writes NOTHING — asserted over the whole destination set', () => {
    // `absence-must-be-asserted`: the requirement is "no store file exists",
    // not "one named path is missing". And the scenario must be one in which
    // something WOULD otherwise have written: the same config with values
    // filled installs 21 files, which the next test shows.
    const root = mkdtempSync(join(tmpdir(), 'provegate-refuse-'));
    roots.push(root);
    const before = listAll(root);
    const config = { ...filledConfig(), prompts: { ...filledConfig().prompts, values: {} } };
    expect(() => planPrompts(config, promptsPackageDir())).toThrow(PromptsError);
    expect(listAll(root)).toEqual(before);
  });

  it('installs the store AND the two destinations outside it', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-install-'));
    roots.push(root);
    const config = filledConfig();
    const actions = planPrompts(config, promptsPackageDir());
    initWorkspace(config, root, { extra: actions });
    const written = listAll(root);
    expect(written).toContain('.provegate/prompts/phase-3-task-generator.md');
    // The reinstall unit is NOT the store directory. These two live outside it.
    expect(written).toContain('.claude/commands/prd-3.md');
    expect(written).toContain('.cursor/rules/prd-workflow.mdc');
  });

  it('a re-run reports every existing path as skipped and overwrites nothing', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-rerun-'));
    roots.push(root);
    const config = filledConfig();
    const actions = planPrompts(config, promptsPackageDir());
    initWorkspace(config, root, { extra: actions });
    const second = initWorkspace(config, root, { extra: actions });
    expect(second.created).toEqual([]);
    expect(second.skipped.length).toBeGreaterThan(19);
  });

  it('REINSTALL: deleting only the store directory leaves stale adapters behind', () => {
    // This is the defect readiness iteration 6 found, kept as a regression: the
    // reinstall instruction named only `<dir>`, and two of three adapter
    // destinations live outside it, so an adopter following it believed they
    // had reinstalled while `.claude/` and `.cursor/` stayed at the old version.
    const root = mkdtempSync(join(tmpdir(), 'provegate-stale-'));
    roots.push(root);
    const config = filledConfig();
    const v1 = generatedPaths(config, renderPrompts(promptsPackageDir(), config), '1.0.0');
    for (const [rel, body] of v1) writeAt(root, rel, body);

    rmSync(join(root, '.provegate'), { recursive: true, force: true });
    const v2 = generatedPaths(config, renderPrompts(promptsPackageDir(), config), '2.0.0');
    const actions = [...v2].map(([path, content]) => ({ path, kind: 'file' as const, content }));
    initWorkspace(config, root, { extra: actions });

    const adapter = readFileSyncUtf8(join(root, '.claude/commands/prd-3.md'));
    expect(adapter).toContain('1.0.0'); // still v1 — the instruction was wrong
  });

  it('REINSTALL: deleting the PRINTED SET leaves no path carrying the old banner', () => {
    // The corrected procedure. This is the whole migration story of a one-way
    // installer, and nothing tested it before.
    const root = mkdtempSync(join(tmpdir(), 'provegate-reinstall-'));
    roots.push(root);
    const config = filledConfig();
    const v1 = generatedPaths(config, renderPrompts(promptsPackageDir(), config), '1.0.0');
    for (const [rel, body] of v1) writeAt(root, rel, body);

    for (const rel of v1.keys()) rmSync(join(root, rel), { force: true });
    const v2 = generatedPaths(config, renderPrompts(promptsPackageDir(), config), '2.0.0');
    const actions = [...v2].map(([path, content]) => ({ path, kind: 'file' as const, content }));
    initWorkspace(config, root, { extra: actions });

    for (const rel of v2.keys()) {
      expect(readFileSyncUtf8(join(root, rel))).not.toContain('provegate 1.0.0');
    }
  });

  it('the printed set equals the plan destinations exactly', () => {
    const config = filledConfig();
    const packageDir = promptsPackageDir();
    const version = packageVersion(packageDir);
    const expected = new Set(
      generatedPaths(config, renderPrompts(packageDir, config), version).keys(),
    );
    const printed = new Set(
      planPrompts(config, packageDir)
        .filter((a) => a.kind === 'file')
        .map((a) => a.path),
    );
    expect(printed).toEqual(expected);
  });

  it('honours a non-default prompts.dir for the store and the snippet', () => {
    const config = filledConfig('.protocols');
    const paths = [...generatedPaths(config, renderPrompts(promptsPackageDir(), config), '1.0.0')];
    expect(paths.some(([p]) => p.startsWith('.protocols/prompts/'))).toBe(true);
    expect(paths.some(([p]) => p === '.protocols/AGENTS.md.provegate.snippet')).toBe(true);
    // The two tool-owned destinations are fixed by the tool, not by the store dir.
    expect(paths.some(([p]) => p === '.cursor/rules/prd-workflow.mdc')).toBe(true);
  });
});

// --- FR-6: the adapter grammar ----------------------------------------------

describe('adapter grammar (PRD-029 FR-6)', () => {
  const config = filledConfig();
  const files = renderPrompts(promptsPackageDir(), config).files;
  const adapters = renderAdapters(config, files, '1.0.0');

  it('emits exactly the three named destinations', () => {
    const paths = [...adapters.keys()].sort();
    expect(paths.filter((p) => p.startsWith('.claude/commands/prd-'))).toHaveLength(7);
    expect(paths).toContain('.cursor/rules/prd-workflow.mdc');
    expect(paths).toContain('.provegate/AGENTS.md.provegate.snippet');
  });

  it('every Claude command lists phase-descriptively: first line is prose derived from the store filename, not the banner (PRD-032 FR-7)', () => {
    for (const [path, content] of adapters) {
      if (!path.startsWith('.claude/commands/prd-')) continue;
      const first = content.split('\n')[0] ?? '';
      // the listing line: human prose naming the phase and its protocol —
      // Claude Code shows a command file's FIRST LINE as its description
      expect(first.startsWith('<!--'), `${path} lists as a comment`).toBe(false);
      expect(first, path).toMatch(/^Phase \d+ of the gated PRD workflow — [a-z0-9 ]+\.$/);
    }
  });

  it('the banner stays present and parseable in every Claude command under the listing fix (PRD-032 FR-7)', () => {
    for (const [path, content] of adapters) {
      if (!path.startsWith('.claude/commands/prd-')) continue;
      expect(content, path).toContain('GENERATED by provegate 1.0.0');
      expect(bannerVersion(content), path).toBe('1.0.0');
    }
  });

  it('keeps `.mdc` frontmatter on line 1, with exactly three keys in order', () => {
    const mdc = adapters.get('.cursor/rules/prd-workflow.mdc') ?? '';
    const lines = mdc.split('\n');
    expect(lines[0]).toBe('---');
    expect(lines[1]?.startsWith('description:')).toBe(true);
    expect(lines[2]?.startsWith('globs:')).toBe(true);
    expect(lines[3]?.startsWith('alwaysApply:')).toBe(true);
    expect(lines[4]).toBe('---');
    // The banner follows the frontmatter, never precedes it.
    expect(mdc.indexOf('GENERATED')).toBeGreaterThan(mdc.indexOf('\n---\n', 4));
  });

  it('derives globs exactly as the source snapshot spells them', () => {
    expect(artifactGlobs(config)).toBe(
      '_prds/**/*.md, _readiness/**/*.md, _tasks/**/*.md, _docs/**/*.md',
    );
  });

  it('carries a PATH and no protocol prose', () => {
    // One protocol in one place. An adapter that restated a rule would be the
    // defect this whole delivery mechanism exists to avoid.
    //
    // The generated banner is stripped from BOTH sides first: it appears in
    // every rendered file by design, so comparing it against protocols would
    // report the one thing that is supposed to be shared. That is a property of
    // the check, not an exemption for the adapter — the first version of this
    // test failed on it, which is how the filter got written.
    const stripBanner = (text: string): string => text.replace(/<!-- GENERATED[\s\S]*?-->\n?/g, '');
    const protocolBodies = [...files.values()].map(stripBanner);
    for (const [path, body] of adapters) {
      for (const line of stripBanner(body).split('\n')) {
        const trimmed = line.trim();
        if (trimmed.length < 40) continue; // headings, paths, table rows, blanks
        if (trimmed.startsWith('|')) continue;
        if (trimmed.startsWith('description:') || trimmed.startsWith('globs:')) continue;
        if (trimmed === DIRECTIVE_TEXT) continue;
        expect(
          protocolBodies.some((p) => p.includes(trimmed)),
          `${path} carries prose that also appears in a protocol: ${trimmed.slice(0, 60)}`,
        ).toBe(false);
      }
    }
  });

  it('emits only the configured adapters', () => {
    const only = { ...config, prompts: { ...config.prompts, adapters: ['cursor'] } };
    const some = renderAdapters(only, files, '1.0.0');
    expect([...some.keys()]).toEqual(['.cursor/rules/prd-workflow.mdc']);
  });

  it('never writes AGENTS.md — the Codex adapter is a snippet inside the store', () => {
    expect([...adapters.keys()].some((p) => p === 'AGENTS.md')).toBe(false);
    expect(adapters.has('.provegate/AGENTS.md.provegate.snippet')).toBe(true);
  });
});

// --- Phase 6 remediation: findings C1, M1, M3, m1, m2 -----------------------

describe('Phase 6 findings (PRD-029)', () => {
  it('M3: the collision guard is exercised DIRECTLY, not through the filesystem', () => {
    // The original test wrote `a-template.md` and `A-Template.md` into a temp
    // package. On a case-insensitive volume — which is where this was written —
    // the two collapse into one file, no collision occurs, and the only real
    // assertion sat in a `catch` that never ran. An exported guard had zero
    // effective coverage on the machine that produced it.
    const at = (rel: string, storeRel: string) => ({
      source: { rel, abs: `/x/${rel}`, isSymlink: false },
      rule: DISPOSITIONS[5]!,
      storeRel,
    });

    expect(() =>
      assertNoCollision([
        at('templates/a-template.md', 'templates/a-template.md'),
        at('templates/A-Template.md', 'templates/A-Template.md'),
      ]),
    ).toThrow(/one destination/);

    // And the NFC half, which no filesystem here can produce either.
    expect(() =>
      assertNoCollision([
        at('templates/caf\u00e9-template.md', 'templates/caf\u00e9-template.md'),
        at('templates/cafe\u0301-template.md', 'templates/cafe\u0301-template.md'),
      ]),
    ).toThrow(/one destination/);

    expect(() =>
      assertNoCollision([
        at('templates/a-template.md', 'templates/a-template.md'),
        at('templates/b-template.md', 'templates/b-template.md'),
      ]),
    ).not.toThrow();
  });

  it('m2: a candidate whose identifier contains a brace is malformed, not ignored', () => {
    // `{{A{B}}` matched neither candidate class, so it was emitted untouched and
    // diagnosed as nothing — §12 says an identifier outside the charset is
    // malformed, and a brace is outside it.
    const { found, bad } = scanTokens('x {{A{B}} y\n', 'f.md');
    expect(found).toEqual([]);
    expect(bad).toHaveLength(1);
    expect(bad[0]!.kind).toBe('malformed');
  });

  it('m1: a config-backed key placed in values is reported, not silently ignored', () => {
    // A config-backed token IS consumed by the corpus, so occurrence alone could
    // never see this — and it is the one dead key the registry invites an
    // adopter to set.
    const config = filledConfig();
    config.prompts.values = { ...config.prompts.values, MEMORY_ROOT: '_brain' };
    expect(() => renderPrompts(promptsPackageDir(), config)).toThrow(
      /MEMORY_ROOT is ignored — this token resolves from/,
    );
  });
});
