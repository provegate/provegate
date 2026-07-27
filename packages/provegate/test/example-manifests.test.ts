import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { ManifestError, defaultManifest, loadManifest } from '../src/core/gates/manifest.js';
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

  it('monorepo: the cap fires on a PRD with no deny-test line and clears with one', () => {
    // The README walks this exact sequence. If the pattern were wrong in either
    // direction — never matching, or matching prose — the walk-through would be
    // instructions for a gate that does not behave that way.
    const cap = loadExample('monorepo').hardCaps[0]!;
    const pattern = new RegExp(cap.requireLine);
    const without = '# PRD-001\n\n- **Targets:** `src/routes/admin.route.ts`\n\nWe will test the deny path thoroughly.\n';
    expect(pattern.test(without)).toBe(false);
    for (const line of [
      'Deny test: `pnpm vitest run src/routes/admin.guard.test.ts`',
      'Deny test: `npm run test -- src/routes/admin.guard.test.ts`',
      'Deny test: `node --test src/routes/admin.guard.test.ts`',
    ]) {
      expect(pattern.test(`${without}\n${line}\n`), line).toBe(true);
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
    expect(new RegExp(cap.requireLine).test(placeholder!)).toBe(false);
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
      // …and the failure each key catches, not just the key name.
      expect(readme.match(/\*\*Catches:?\*\*|\*\*Catches \(/g)?.length ?? 0).toBeGreaterThanOrEqual(4);
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
