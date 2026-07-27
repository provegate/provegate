import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { ManifestError, defaultManifest, loadManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';
import { isSafeCommand } from '../src/core/gates/safety.js';

/**
 * PRD-020 FR-3 — the cookbook entries, loaded by the REAL parser.
 *
 * A published manifest example is executable documentation: an adopter copies
 * the file verbatim. Reading it as JSON in a test would prove it parses; this
 * loads it through `loadManifest`, which is what an adopter's `gate run`
 * actually does — deep-merge over the floor, shape validation, and the command
 * safety check that refuses an unsafe row at run time.
 */

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = resolve(here, '../examples/manifests');
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** `loadManifest(config, root)` always reads `<root>/gates.manifest.json`, so
 * each example is loaded from a temp root holding a copy under that exact name
 * — the same read an adopter's repository root gets. */
function loadExample(name: string, mutate?: (raw: Record<string, unknown>) => void) {
  const source = join(examplesDir, name, 'gates.manifest.json');
  expect(existsSync(source), `${name}: example manifest missing`).toBe(true);
  const raw = JSON.parse(readFileSync(source, 'utf8')) as Record<string, unknown>;
  mutate?.(raw);
  const root = mkdtempSync(join(tmpdir(), `provegate-example-${name}-`));
  roots.push(root);
  writeFileSync(join(root, 'gates.manifest.json'), JSON.stringify(raw, null, 2));
  return loadManifest(DEFAULT_CONFIG, root);
}

const EXAMPLES = ['single-package', 'monorepo'] as const;

/** The minimum PRD `lintPrd` will parse: one FR with a Targets line and a §11
 * row, so the cap assertions fail on the cap and not on the scaffolding. */
function prdBody({ targets, extra = '' }: { targets: string; extra?: string }): string {
  return [
    '# PRD-001: Cap fixture',
    '',
    '## 4. Functional Requirements',
    '',
    '1. **FR-1**: does a thing',
    `   - **Targets:** \`${targets}\``,
    extra,
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command / Check | Scope | Notes |',
    '| ---- | --------------- | ----- | ----- |',
    '| FR-1 | `node -e "0"`   |       |       |',
    '',
  ].join('\n');
}

/** Every command the manifest can put in front of the runner. */
function allCommands(manifest: ReturnType<typeof loadExample>): string[] {
  return [
    ...Object.values(manifest.phases).flat(),
    ...Object.values(manifest.classDefaults).flatMap((rules) => rules.flatMap((r) => r.run)),
    ...manifest.postMerge,
  ];
}

describe('cookbook manifests load through the real parser (FR-3)', () => {
  for (const name of EXAMPLES) {
    it(`${name}: loads without a ManifestError`, () => {
      const manifest = loadExample(name);
      expect(Object.keys(manifest.phases).length).toBeGreaterThan(0);
    });

    it(`${name}: every declared command would survive the runner's safety check`, () => {
      // A cookbook entry the runner would refuse is not a cookbook entry. The
      // check covers all three lists, not just `phases` — a class default or a
      // postMerge row is just as executable.
      const commands = allCommands(loadExample(name));
      expect(commands.length).toBeGreaterThan(0);
      for (const cmd of commands) {
        expect(isSafeCommand(DEFAULT_CONFIG, cmd), `${name}: ${cmd}`).toBe(true);
      }
    });
  }

  it('single-package: phase 4 is the four floor commands in the SHIPPED order', () => {
    // Derived from `defaultManifest`, not restated as a literal: the promise
    // the README makes is "this is the shipped order, build before test", and
    // a literal here would keep passing after the default changed.
    const floor = defaultManifest(DEFAULT_CONFIG).phases['4']!;
    const shape = floor.map((cmd) => cmd.replace(/^pnpm /, ''));
    expect(shape).toEqual(['check-types', 'lint', 'build', 'test']);

    const phase4 = loadExample('single-package').phases['4']!;
    expect(phase4).toEqual(shape.map((s) => `npm run ${s}`));
  });

  it('monorepo: the hard cap is complete and its requireLine compiles', () => {
    const manifest = loadExample('monorepo');
    expect(manifest.hardCaps.length).toBeGreaterThan(0);
    const cap = manifest.hardCaps[0]!;
    expect(cap.id.length).toBeGreaterThan(0);
    expect(cap.when.targetsMatch.length).toBeGreaterThan(0);
    expect(cap.requireLine.length).toBeGreaterThan(0);
    expect(cap.message.length).toBeGreaterThan(0);
    expect(() => new RegExp(cap.requireLine)).not.toThrow();
    for (const cls of ['feature', 'hotfix', 'infra']) {
      expect(manifest.classDefaults[cls], cls).toBeDefined();
      expect(manifest.classDefaults[cls]!.length).toBeGreaterThan(0);
    }
  });

  it('monorepo: the cap fires and clears THROUGH lintPrd, not through RegExp.test', () => {
    // `RegExp.test` proves the pattern; it does not prove the cap. Target
    // extraction, the executable view, and the `m` flag are all production and
    // all skipped by a direct regex call — an independent review pointed out
    // that a wrong-but-non-empty `targetsMatch` would pass such a test.
    const manifest = loadExample('monorepo');
    const capIssues = (prd: string): string[] =>
      lintPrd(DEFAULT_CONFIG, manifest, prd, undefined).issues.filter((i) =>
        i.startsWith('hard cap route-deny-test'),
      );

    expect(capIssues(prdBody({ targets: 'src/routes/admin.route.ts' }))).toHaveLength(1);
    // Not armed: the same PRD with targets elsewhere never sees the cap.
    expect(capIssues(prdBody({ targets: 'src/lib/util.ts' }))).toHaveLength(0);
    // Armed and satisfied.
    expect(
      capIssues(
        prdBody({
          targets: 'src/routes/admin.route.ts',
          extra: '   Deny test: `npm run test -- src/routes/admin.guard.test.ts`',
        }),
      ),
    ).toHaveLength(0);
  });

  it('monorepo: the cap accepts every runner it names and refuses prose and bare paths', () => {
    const cap = loadExample('monorepo').hardCaps[0]!;
    // The `m` flag is production's (`prd-ready.ts` compiles it that way); a
    // test that omits it is testing a different pattern.
    const pattern = () => new RegExp(cap.requireLine, 'm');

    // The advertised prefixes are READ OUT OF the pattern, not listed here: a
    // hand-written list covers whatever it covered the day it was written, and
    // an independent review found this one testing four of eight.
    const advertised = /\(\?:([^)]+)\)/.exec(cap.requireLine)?.[1]?.split('|') ?? [];
    expect(advertised.length, 'no runner alternation found in requireLine').toBeGreaterThan(3);
    // Every advertised runner is one the runner would actually accept, and the
    // set covers the package managers and JS runtimes in the shipped allowlist.
    // The README tells adopters to mirror `commands.allowedPrefixes`; this is
    // what keeps that instruction true of the value it is written next to.
    const allowed = DEFAULT_CONFIG.commands.allowedPrefixes.map((p) => p.trim());
    for (const runner of advertised) expect(allowed, runner).toContain(runner);
    // The EXACT set, not a subset: a partial pin let `tsx` and `vitest`
    // disappear silently, which an independent round caught.
    expect(advertised).toEqual(['pnpm', 'npm', 'npx', 'yarn', 'bun', 'node', 'tsx', 'vitest']);
    for (const runner of advertised) {
      expect(pattern().test(`Deny test: \`${runner} run x.test.ts\``), runner).toBe(true);
    }
    // …and the indentation forms the READMEs show.
    for (const line of [
      '- Deny test: `npm run test -- src/routes/admin.guard.test.ts`',
      '   Deny test: `node --test src/routes/admin.guard.test.ts`',
    ]) {
      expect(pattern().test(line), line).toBe(true);
    }
    for (const line of [
      'We will test the deny path thoroughly.',
      'Deny test: `path/to/x.test.ts`',
      // Mid-sentence promise. Without the `^\\s*-?\\s*` anchor this one
      // satisfies the cap, which is what the README used to deny.
      'We will add a Deny test: `pnpm vitest run x.test.ts` next sprint',
    ]) {
      expect(pattern().test(line), line).toBe(false);
    }
  });

  it('monorepo: the cap is NOT satisfied by the shipped template placeholder', () => {
    // The reason this cap requires a runner prefix. The PRD template carries
    // `- Deny test: \`path/to/x.test.ts\`` under its hard-caps reminder, so the
    // obvious pattern (`Deny test: \`[^\`]+\``) passes on every PRD `gate new`
    // produces — a cap that fires only if an author happened to delete a line
    // nobody told them to delete. Measured in a scratch adopter repo before the
    // pattern was changed; this is the regression that keeps it changed.
    const template = readFileSync(resolve(here, '../templates/prd-template.md'), 'utf8');
    const placeholder = template
      .split('\n')
      .find((l) => l.includes('Deny test:'));
    expect(placeholder, 'template no longer carries the placeholder').toBeDefined();

    const cap = loadExample('monorepo').hardCaps[0]!;
    expect(new RegExp(cap.requireLine, 'm').test(placeholder!)).toBe(false);
    // …and the loose pattern this one replaced would have accepted it.
    expect(/Deny test: `[^`]+`/.test(placeholder!)).toBe(true);
  });

  it('every README names every command its own manifest declares', () => {
    // The README claim is part of the artifact. A cookbook entry whose prose
    // omits a command it ships is one an adopter cannot reason about — and this
    // is the assertion that fails when someone adds a command and not a
    // paragraph.
    for (const name of EXAMPLES) {
      const readme = readFileSync(join(examplesDir, name, 'README.md'), 'utf8');
      for (const cmd of new Set(allCommands(loadExample(name)))) {
        expect(readme, `${name}: README does not mention ${cmd}`).toContain(cmd);
      }
      // …the failure each key catches, not just the key name…
      for (const key of ['phases', 'classDefaults', 'hardCaps', 'postMerge', 'wiringExceptions']) {
        // The heading is the key as the file writes it — `phases["4"]`, not
        // `phases` — so match the heading LINE by prefix.
        const start = readme.search(new RegExp(`^## \`${key}`, 'm'));
        expect(start, `${name}: README has no section for ${key}`).toBeGreaterThan(-1);
        const next = readme.indexOf('\n## ', start + 1);
        const section = readme.slice(start, next === -1 ? undefined : next);
        expect(section, `${name}: ${key} section names no failure`).toMatch(/\*\*Catches/);
      }
      // …and the warning that copying over an existing manifest deletes a gate,
      // ABOVE the instruction to copy. A warning after the action it prevents
      // is a warning the sequential reader meets too late — which is exactly
      // where an independent review found both of these.
      const warn = readme.search(/^## Before you copy/m);
      expect(warn, `${name}: no pre-copy overwrite warning`).toBeGreaterThan(-1);
      const copy = readme.search(/copy `gates\.manifest\.json`/i);
      expect(copy, `${name}: no copy instruction`).toBeGreaterThan(-1);
      expect(warn, `${name}: the overwrite warning follows the copy instruction`).toBeLessThan(
        copy,
      );
      expect(readme.slice(warn, copy)).toMatch(/deletes that gate|merge these keys/i);
    }
  });
});

describe('the parser rejects the mutations these examples must not carry (FR-3)', () => {
  // Proven by mutation, not by asserting today's green: each case takes the
  // shipped example and breaks exactly one thing.
  it('an unknown top-level key throws ManifestError', () => {
    expect(() =>
      loadExample('single-package', (raw) => {
        raw['phasez'] = {};
      }),
    ).toThrow(ManifestError);
  });

  it('a hard cap missing requireLine throws ManifestError', () => {
    expect(() =>
      loadExample('monorepo', (raw) => {
        const caps = raw['hardCaps'] as Record<string, unknown>[];
        delete caps[0]!['requireLine'];
      }),
    ).toThrow(ManifestError);
  });

  it('an unsafe command in a class default is refused at load', () => {
    // `assertCommandsSafe` runs inside `loadManifest`, so the runner never
    // reaches a shell-metacharacter row. This is why the safety assertion above
    // is a real gate and not a restatement.
    expect(() =>
      loadExample('monorepo', (raw) => {
        const classes = raw['classDefaults'] as Record<string, { run: string[] }[]>;
        classes['infra']![0]!.run = ['pnpm verify:workflow && rm -rf /'];
      }),
    ).toThrow();
  });
});
