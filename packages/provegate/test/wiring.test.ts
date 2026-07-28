import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import {
  auditWiring,
  bundleMembers,
  interpreterInvokedFile,
  scanCommandSurface,
  yamlRunText,
} from '../src/core/gates/wiring.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function repo(options: {
  scripts?: Record<string, string>;
  ci?: string;
  /** hook name → file body, written under the default `.githooks/`. */
  hooks?: Record<string, string>;
  /** bundle body, written at the default `scripts/verify/verify-workflow.mjs`. */
  bundle?: string;
  /** filenames created under the default `scripts/verify/`. */
  scriptFiles?: string[];
}): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-wiring-'));
  roots.push(root);
  writeFileSync(
    resolve(root, 'package.json'),
    JSON.stringify({ name: 'x', scripts: options.scripts ?? {} }),
  );
  if (options.ci) {
    mkdirSync(resolve(root, '.github/workflows'), { recursive: true });
    writeFileSync(resolve(root, '.github/workflows/ci.yml'), options.ci);
  }
  if (options.hooks) {
    mkdirSync(resolve(root, '.githooks'), { recursive: true });
    for (const [name, body] of Object.entries(options.hooks)) {
      writeFileSync(resolve(root, '.githooks', name), body);
    }
  }
  if (options.bundle !== undefined || options.scriptFiles) {
    mkdirSync(resolve(root, 'scripts/verify'), { recursive: true });
    if (options.bundle !== undefined) {
      writeFileSync(resolve(root, 'scripts/verify/verify-workflow.mjs'), options.bundle);
    }
    for (const name of options.scriptFiles ?? []) {
      writeFileSync(resolve(root, 'scripts/verify', name), '// fixture');
    }
  }
  return root;
}

/** The four floor scripts every fixture repo needs to keep the manifest happy. */
const FLOOR = { 'check-types': 'x', lint: 'x', build: 'x', test: 'x' };

/** True when the audit wires `verify:foo` (no "wired nowhere" issue for it). */
function fooWired(root: string): boolean {
  const report = auditWiring(cfg, defaultManifest(cfg), root);
  return !report.issues.some((i) => i.includes('"verify:foo" is wired nowhere'));
}

/** A repo whose only wiring for `verify:foo` could come from the given hook body. */
function hookRepo(hookBody: string): string {
  return repo({
    scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
    hooks: { 'pre-commit': hookBody },
    scriptFiles: ['verify-foo.mjs'],
  });
}

describe('yamlRunText', () => {
  it('extracts run lines and block bodies from live jobs only', () => {
    const yml = [
      'name: CI',
      'jobs:',
      '  live:',
      '    steps:',
      '      - name: mentions pnpm verify:ghost in a name only',
      '      - run: pnpm verify:one',
      '      - run: |',
      '          pnpm verify:two',
      '          pnpm build',
      '  dead:',
      '    if: false',
      '    steps:',
      '      - run: pnpm verify:dead',
    ].join('\n');
    const text = yamlRunText(yml);
    expect(text).toContain('pnpm verify:one');
    expect(text).toContain('pnpm verify:two');
    expect(text.join(' ')).not.toContain('verify:dead');
    expect(text.join(' ')).not.toContain('verify:ghost');
  });
});

describe('auditWiring', () => {
  it('clean repo with wired gates passes', () => {
    const root = repo({
      scripts: { 'check-types': 'x', lint: 'x', build: 'x', test: 'x', 'verify:one': 'x' },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:one\n',
    });
    // PRD-025 added `surfaces` to the report — an FR-required output field
    // (the surface count is what makes a silently-lost surface visible), so
    // the exact-shape assertion grows by that field rather than being loosened.
    expect(auditWiring(cfg, defaultManifest(cfg), root)).toEqual({
      ok: true,
      issues: [],
      surfaces: ['manifest', 'ci:1', 'scripts:4'],
    });
  });

  it('flags manifest commands naming nonexistent scripts', () => {
    const root = repo({ scripts: { lint: 'x', build: 'x', test: 'x' } }); // no check-types
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('"check-types" which does not exist'),
    );
  });

  it('flags unwired verify scripts (wire-or-delete)', () => {
    const root = repo({
      scripts: { 'check-types': 'x', lint: 'x', build: 'x', test: 'x', 'verify:orphan': 'x' },
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('"verify:orphan" is wired nowhere'),
    );
  });

  it('exceptions silence unwired gates; stale exceptions fail (shrink-only)', () => {
    const scripts = { 'check-types': 'x', lint: 'x', build: 'x', test: 'x', 'verify:pending': 'x' };
    const excepted: GatesManifest = {
      ...defaultManifest(cfg),
      wiringExceptions: { 'verify:pending': 'wired by PRD-009' },
    };
    expect(auditWiring(cfg, excepted, repo({ scripts })).ok).toBe(true);

    // stale: now wired AND excepted
    const wiredRoot = repo({
      scripts,
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:pending\n',
    });
    expect(auditWiring(cfg, excepted, wiredRoot).issues).toContainEqual(
      expect.stringContaining('stale wiring exception: "verify:pending" is wired now'),
    );

    // stale: excepted but script gone
    const goneRoot = repo({ scripts: { 'check-types': 'x', lint: 'x', build: 'x', test: 'x' } });
    expect(auditWiring(cfg, excepted, goneRoot).issues).toContainEqual(
      expect.stringContaining('names no package.json script'),
    );
  });
});

// ————————————————— PRD-025 FR-3(b): the one-pass scanner —————————————————
// Every deny case sits beside its positive control on the same shape
// (`assert-absent-needs-an-independent-cause`): the pairing is what makes a
// "does not wire" mean "this rule rejected it" rather than "something did".

describe('scanCommandSurface (one pass, three state variables, four rules)', () => {
  const flat = (text: string): string[][] | null => scanCommandSurface(text);

  it('quoted separator does not cut; the same separator unquoted does', () => {
    // deny: the only && sits inside a quoted run — one command, no second invocation
    const quoted = flat('echo "build && deploy"');
    expect(quoted).toEqual([['echo', 'build && deploy']]);
    // control: unquoted && cuts and the second command exists
    const cut = flat('echo build && node scripts/verify/verify-foo.mjs');
    expect(cut).toEqual([
      ['echo', 'build'],
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });

  it('escaped separator: `\\;` does not cut, `\\\\;` does — scanner state, not adjacency', () => {
    const escaped = flat('echo done\\; node scripts/verify/verify-foo.mjs');
    expect(escaped).toEqual([['echo', 'done;', 'node', 'scripts/verify/verify-foo.mjs']]);
    const doubled = flat('echo done\\\\; node scripts/verify/verify-foo.mjs');
    expect(doubled).toEqual([
      ['echo', 'done\\'],
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });

  it('a quote still open at a newline makes the WHOLE surface unparseable', () => {
    // deny: a valid invocation on a later line is NOT salvaged
    expect(flat('echo "open\nnode scripts/verify/verify-foo.mjs')).toBeNull();
    // control: the quote closed before its newline — the later invocation is read
    expect(flat('echo "closed"\nnode scripts/verify/verify-foo.mjs')).toEqual([
      ['echo', 'closed'],
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });

  it('backslash-newline cuts regardless: a continued invocation is two fragments', () => {
    const split = flat('node \\\nscripts/verify/verify-foo.mjs');
    expect(split).toEqual([['node', '\\'], ['scripts/verify/verify-foo.mjs']]);
    // control: the same two tokens on one line are one command
    expect(flat('node scripts/verify/verify-foo.mjs')).toEqual([
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });

  it('a # beginning a token starts a comment discarded through the newline', () => {
    // deny: the separator inside the comment cannot cut a live command out of a dead line
    expect(flat('# build && node scripts/verify/verify-foo.mjs')).toEqual([]);
    // control: the same line uncommented cuts and the invocation exists
    expect(flat('build && node scripts/verify/verify-foo.mjs')).toEqual([
      ['build'],
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });

  it('W1: # mid-token, # inside quotes, # after a separator, the shebang, # in a quoted path', () => {
    expect(flat('echo a#b')).toEqual([['echo', 'a#b']]); // ordinary character
    expect(flat('echo "# not a comment"')).toEqual([['echo', '# not a comment']]);
    expect(flat('echo x; # node scripts/verify/verify-foo.mjs')).toEqual([['echo', 'x']]);
    expect(flat('#!/bin/sh\nnode scripts/verify/verify-foo.mjs')).toEqual([
      ['node', 'scripts/verify/verify-foo.mjs'],
    ]);
    expect(flat('node "scripts/verify/#odd/verify-foo.mjs"')).toEqual([
      ['node', 'scripts/verify/#odd/verify-foo.mjs'],
    ]);
  });

  it('a single | or & is not a separator (matches the production set); fail closed', () => {
    expect(flat('cat x | node scripts/verify/verify-foo.mjs')).toEqual([
      ['cat', 'x', '|', 'node', 'scripts/verify/verify-foo.mjs'],
    ]);
  });
});

// ————————————— PRD-025 FR-3(b): the narrow command shape —————————————

describe('interpreterInvokedFile (no flag semantics at all)', () => {
  const file = (command: string): string | null => {
    const commands = scanCommandSurface(command);
    if (commands === null || commands.length !== 1) return null;
    return interpreterInvokedFile(commands[0]!);
  };

  it('interpreter plus path wires; any dash token before the path refuses, uniformly', () => {
    expect(file('node scripts/verify/verify-foo.mjs')).toBe('scripts/verify/verify-foo.mjs');
    // the four table rows, one rule, one verdict
    expect(file('node --check scripts/verify/verify-foo.mjs')).toBeNull();
    expect(file("node -e \"import('./scripts/verify/verify-foo.mjs')\"")).toBeNull();
    expect(file('node --require verify-foo.mjs app.mjs')).toBeNull();
    expect(file('node --enable-source-maps scripts/verify/verify-foo.mjs')).toBeNull();
  });

  it('the preload reversal is stated: --require with a real path after it still refuses', () => {
    // Under the deleted arity table `node --require ./setup.mjs <path>` WIRED.
    // Under the dash rule it does not — same verdict as the deny cell, same
    // rule, which is the point of removing the table. The independent cause:
    expect(file('node --require ./setup.mjs scripts/verify/verify-foo.mjs')).toBeNull();
    expect(file('node scripts/verify/verify-foo.mjs')).toBe('scripts/verify/verify-foo.mjs');
  });

  it('a quoted script path wires — the scanner strips the quotes', () => {
    expect(file('node "scripts/verify/verify-foo.mjs"')).toBe('scripts/verify/verify-foo.mjs');
  });

  it('everything after the path is a script argument, never a path', () => {
    expect(file('node app.mjs verify-foo.mjs')).toBe('app.mjs');
    expect(file('node scripts/verify/verify-foo.mjs --quiet')).toBe(
      'scripts/verify/verify-foo.mjs',
    );
  });

  it('deno takes the literal run and only deno takes it; both deno forms wire', () => {
    expect(file('deno run scripts/verify/verify-foo.mjs')).toBe('scripts/verify/verify-foo.mjs');
    expect(file('deno scripts/verify/verify-foo.mjs')).toBe('scripts/verify/verify-foo.mjs');
    // deny: any other deno subcommand is read as the path and matches nothing
    expect(file('deno check scripts/verify/verify-foo.mjs')).toBe('check');
    // deny: bun run reads `run` as the path — the stated false negative
    expect(file('bun run scripts/verify/verify-foo.mjs')).toBe('run');
    // control: bun without the subcommand wires
    expect(file('bun scripts/verify/verify-foo.mjs')).toBe('scripts/verify/verify-foo.mjs');
  });

  it('env wrappers strip; env carrying anything else leaves a non-interpreter head', () => {
    expect(file('env NODE_ENV=test node scripts/verify/verify-foo.mjs')).toBe(
      'scripts/verify/verify-foo.mjs',
    );
    expect(file('NODE_ENV=test node scripts/verify/verify-foo.mjs')).toBe(
      'scripts/verify/verify-foo.mjs',
    );
    // deny: the wrapper strips and the head is then echo — not an interpreter
    expect(file('env NODE_ENV=test echo scripts/verify/verify-foo.mjs')).toBeNull();
    // deny: env -i is not NAME=value, so the head is `-i`
    expect(file('env -i node scripts/verify/verify-foo.mjs')).toBeNull();
  });

  it('a directory-prefixed interpreter counts; echo/cat/managers never do', () => {
    expect(file('/usr/bin/node scripts/verify/verify-foo.mjs')).toBe(
      'scripts/verify/verify-foo.mjs',
    );
    expect(file('echo scripts/verify/verify-foo.mjs')).toBeNull();
    expect(file('pnpm scripts/verify/verify-foo.mjs')).toBeNull();
  });
});

// ————————————— PRD-025 FR-3(c): the bundle grammar —————————————

describe('bundleMembers (line- and column-anchored, fail closed)', () => {
  const DECL = "const CHECKS = [\n  'verify-foo.mjs',\n  'verify-bar.mjs',\n];\n";

  it('reads a conforming declaration: members, comments, blanks, trailing comma', () => {
    const body = [
      'import { x } from "./lib.mjs";',
      'const CHECKS = [',
      "  'verify-foo.mjs',",
      '',
      '  // a whole-line comment',
      "  'verify-bar.mjs', // trailing comment after the comma",
      '];',
      'for (const c of CHECKS) run(c);',
    ].join('\n');
    expect(bundleMembers(body)).toEqual(['verify-foo.mjs', 'verify-bar.mjs']);
  });

  it('column anchor: an indented sole declaration is no declaration', () => {
    expect(bundleMembers(' ' + DECL)).toBeNull();
    expect(bundleMembers(DECL)).toEqual(['verify-foo.mjs', 'verify-bar.mjs']); // control
  });

  it('impostor inside a template literal: two opening lines, ambiguous, no membership', () => {
    const impostor = 'const T = `\nconst CHECKS = [\n];\n`;\n' + DECL;
    expect(bundleMembers(impostor)).toBeNull();
    // control: the impostor indented by one space — the real declaration is read
    const indentedImpostor = 'const T = `\n const CHECKS = [\n];\n`;\n' + DECL;
    expect(bundleMembers(indentedImpostor)).toEqual(['verify-foo.mjs', 'verify-bar.mjs']);
  });

  it('an escape or the own delimiting quote in a member kills the DECLARATION', () => {
    expect(bundleMembers("const CHECKS = [\n  'a\\\\b.mjs',\n];\n")).toBeNull();
    expect(bundleMembers("const CHECKS = [\n  'it''s.mjs',\n];\n")).toBeNull();
    // the other quote inside is that literal's problem only when it is the delimiter
    expect(bundleMembers('const CHECKS = [\n  "verify-foo.mjs",\n];\n')).toEqual([
      'verify-foo.mjs',
    ]);
  });

  it('duplicate declarations in ordinary code: no membership from either', () => {
    expect(bundleMembers(DECL + '\n' + DECL)).toBeNull();
  });

  it('a VALID empty declaration is a surface declaring nothing — distinct from refusal', () => {
    expect(bundleMembers('const CHECKS = [\n];\n')).toEqual([]);
  });

  it('a non-conforming body line (expression, spread, two literals) kills the declaration', () => {
    expect(bundleMembers("const CHECKS = [\n  ...extra,\n  'verify-foo.mjs',\n];\n")).toBeNull();
    expect(bundleMembers("const CHECKS = [\n  'a.mjs', 'b.mjs',\n];\n")).toBeNull();
    expect(bundleMembers('const CHECKS = [\n  name,\n];\n')).toBeNull();
  });

  it('a never-closed declaration is unparseable — no membership', () => {
    expect(bundleMembers("const CHECKS = [\n  'verify-foo.mjs',\n")).toBeNull();
  });

  it('the SHIPPED bundle parses to exactly its declared members (grammar admits the corpus)', () => {
    // The grammar was written against the one real bundle; this fixture is
    // what notices the day the bundle stops satisfying it. NOTE: an
    // out-of-package read — recorded in the task file's Deferrals and handed
    // to PRD-036's input census (CI checks out fresh; the local cache gap is
    // that PRD's subject).
    const real = readFileSync(
      fileURLToPath(new URL('../../../scripts/verify/verify-workflow.mjs', import.meta.url)),
      'utf8',
    );
    const members = bundleMembers(real);
    expect(members).not.toBeNull();
    // assert the SHAPE (parseable, non-trivial, well-known members present)
    // rather than pinning today's count: the count moved from ten to eleven
    // WHILE THIS PRD WAS CLOSING (PRD-035 added verify-memory-corpus.mjs on
    // main), which is this fixture doing its job — a pinned count would make
    // every legitimate bundle addition red here instead of visible in the
    // audit's surface report.
    expect(members!.length).toBeGreaterThanOrEqual(10);
    expect(members).toContain('verify-gates-wired.mjs');
    expect(members).toContain('verify-turbo-inputs.mjs');
  });
});

// ————————————— PRD-025 FR-2: the three surfaces, through the audit —————————————

describe('auditWiring surfaces (FR-2)', () => {
  it('a check wired ONLY through a hook registers as wired', () => {
    expect(fooWired(hookRepo('#!/bin/sh\nnode scripts/verify/verify-foo.mjs\n'))).toBe(true);
    // control-of-the-control: with no hook at all it is wired nowhere
    expect(
      fooWired(
        repo({
          scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
          scriptFiles: ['verify-foo.mjs'],
        }),
      ),
    ).toBe(false);
  });

  it('a check wired only through the bundle membership registers as wired', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      bundle: "const CHECKS = [\n  'verify-foo.mjs',\n];\n",
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(root)).toBe(true);
  });

  it('a check wired only through a NON-verify script body registers as wired', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:foo': 'node scripts/verify/verify-foo.mjs',
        'ship:pre': 'node scripts/verify/verify-foo.mjs',
      },
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(root)).toBe(true);
  });

  it('a verify-prefixed body wires nothing — the exclusion is load-bearing', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:foo': 'node scripts/verify/verify-foo.mjs',
        'verify:other': 'node scripts/verify/verify-foo.mjs',
      },
      scriptFiles: ['verify-foo.mjs', 'verify-other.mjs'],
    });
    // verify:other's body names foo's file, and that is NOT wiring for foo
    expect(fooWired(root)).toBe(false);
  });

  it('an echoed basename in a non-verify body does not wire (head-token deny)', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:foo': 'node scripts/verify/verify-foo.mjs',
        'ship:pre': 'echo scripts/verify/verify-foo.mjs',
      },
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(root)).toBe(false);
  });

  it('the hook deny set holds through the audit: comment, dash flag, quoted separator', () => {
    expect(fooWired(hookRepo('# build && node scripts/verify/verify-foo.mjs\n'))).toBe(false);
    expect(fooWired(hookRepo('node --check scripts/verify/verify-foo.mjs\n'))).toBe(false);
    expect(fooWired(hookRepo('echo "run && node scripts/verify/verify-foo.mjs"\n'))).toBe(false);
    // the paired control for all three shapes
    expect(fooWired(hookRepo('env CI=1 node "scripts/verify/verify-foo.mjs"\n'))).toBe(true);
  });

  it('an absent hooks directory and an unparseable bundle are not surfaces, not errors', () => {
    // The bundle file itself is an on-disk verify-*.mjs, so the fixture
    // registers and wires it the way the real repo does — otherwise FR-1's
    // direction correctly flags it, which is its own test above.
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:one': 'x',
        'verify:workflow': 'node scripts/verify/verify-workflow.mjs',
      },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:one\n      - run: pnpm verify:workflow\n',
      bundle: 'export const NOT_CHECKS = [];\n',
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.ok).toBe(true);
    // an unparseable bundle is NOT a surface, and the report must not claim
    // it was read — its absence from the list is the visible signal
    expect(report.surfaces.some((s) => s.startsWith('bundle:'))).toBe(false);
    expect(report.surfaces.some((s) => s.startsWith('hooks:'))).toBe(false);
  });

  it('a hooks directory that resolves outside the repository is refused loudly', () => {
    const outside = mkdtempSync(join(tmpdir(), 'provegate-outside-'));
    roots.push(outside);
    const root = repo({ scripts: { ...FLOOR, 'verify:one': 'x' } });
    symlinkSync(outside, resolve(root, '.githooks'));
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('wiring.hooksDir resolves outside the workspace'),
    );
  });

  it('the surface report names what was read', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      bundle: "const CHECKS = [\n  'verify-foo.mjs',\n];\n",
      scriptFiles: ['verify-foo.mjs'],
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.surfaces).toEqual(
      expect.arrayContaining(['manifest', 'hooks:1', 'scripts:4', 'bundle:1', 'scriptsDir:2']),
    );
  });
});

// ————————————— PRD-025 FR-1: on-disk → registered —————————————

describe('auditWiring key derivation hardening (review round 1)', () => {
  it('a traversal inside the invoked path is no key: the file is not "under scriptsDir"', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:foo': 'node scripts/verify/../../outside/verify-foo.mjs',
      },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    // no key derived → the hook cannot wire it, and the on-disk file is unregistered
    expect(fooWired(root)).toBe(false);
    expect(auditWiring(cfg, defaultManifest(cfg), root).issues).toContainEqual(
      expect.stringContaining('script on disk "verify-foo.mjs" is not registered'),
    );
  });

  it('a ./-prefixed invocation still derives its key (both sides normalized alike)', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node ./scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(root)).toBe(true);
  });

  it('a hook entry that is a symlink is skipped — external content cannot wire a check', () => {
    const outside = mkdtempSync(join(tmpdir(), 'provegate-hooklink-'));
    roots.push(outside);
    writeFileSync(join(outside, 'evil'), 'node scripts/verify/verify-foo.mjs\n');
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: {},
      scriptFiles: ['verify-foo.mjs'],
    });
    mkdirSync(resolve(root, '.githooks'), { recursive: true });
    symlinkSync(join(outside, 'evil'), resolve(root, '.githooks', 'pre-commit'));
    expect(fooWired(root)).toBe(false);
    // control: the same body as a regular file wires
    expect(fooWired(hookRepo('node scripts/verify/verify-foo.mjs\n'))).toBe(true);
  });

  it('a directory named like a verify script is not an on-disk candidate', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    mkdirSync(resolve(root, 'scripts/verify/verify-cache.mjs'), { recursive: true });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues.some((i) => i.includes('verify-cache.mjs'))).toBe(false);
  });

  it('a YAML comment does not wire; the same text in run: position does (FR-2 pair)', () => {
    const commented = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      ci: 'jobs:\n  a:\n    steps:\n      # pnpm verify:foo\n      - run: pnpm build\n',
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(commented)).toBe(false);
    const run = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:foo\n',
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(fooWired(run)).toBe(true);
  });

  it('the eval and preload shapes stay unwired through the audit, each beside its control', () => {
    expect(fooWired(hookRepo('node -e "import(\'scripts/verify/verify-foo.mjs\')"\n'))).toBe(
      false,
    );
    expect(
      fooWired(hookRepo('node --require ./setup.mjs scripts/verify/verify-foo.mjs\n')),
    ).toBe(false);
    expect(fooWired(hookRepo('node scripts/verify/verify-foo.mjs\n'))).toBe(true);
  });
});

describe('auditWiring round-2 hardening', () => {
  it('P1: a nested invocation does not register the top-level candidate of the same basename', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:foo': 'node scripts/verify/nested/verify-foo.mjs',
      },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:foo\n',
      scriptFiles: ['verify-foo.mjs'],
    });
    mkdirSync(resolve(root, 'scripts/verify/nested'), { recursive: true });
    writeFileSync(resolve(root, 'scripts/verify/nested/verify-foo.mjs'), '// nested');
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    // the DIRECT candidate is unregistered even though a same-basename nested file is invoked
    expect(report.issues).toContainEqual(
      expect.stringContaining('script on disk "verify-foo.mjs" is not registered'),
    );
    // control: invoking the direct file registers it
    const direct = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:foo\n',
      scriptFiles: ['verify-foo.mjs'],
    });
    expect(
      auditWiring(cfg, defaultManifest(cfg), direct).issues.some((i) =>
        i.includes('is not registered'),
      ),
    ).toBe(false);
  });

  it('scriptsDir "." is legal: a root-level invocation derives its key and registers', () => {
    const dotCfg = { ...cfg, wiring: { ...cfg.wiring, scriptsDir: '.' } };
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node verify-foo.mjs' },
      hooks: { 'pre-commit': 'node verify-foo.mjs\n' },
    });
    writeFileSync(resolve(root, 'verify-foo.mjs'), '// fixture');
    const report = auditWiring(dotCfg, defaultManifest(dotCfg), root);
    expect(report.issues.some((i) => i.includes('"verify:foo" is wired nowhere'))).toBe(false);
    expect(report.issues.some((i) => i.includes('is not registered'))).toBe(false);
  });

  it('a hook symlink whose target stays inside the repository is read (git executes it)', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: {},
      scriptFiles: ['verify-foo.mjs'],
    });
    writeFileSync(resolve(root, 'real-hook.sh'), 'node scripts/verify/verify-foo.mjs\n');
    mkdirSync(resolve(root, '.githooks'), { recursive: true });
    symlinkSync(resolve(root, 'real-hook.sh'), resolve(root, '.githooks', 'pre-commit'));
    expect(fooWired(root)).toBe(true);
  });

  it('a dangling symlink named like a script neither crashes nor becomes a candidate', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    symlinkSync(
      resolve(root, 'scripts/verify/gone.mjs'),
      resolve(root, 'scripts/verify', 'verify-dangling.mjs'),
    );
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues.some((i) => i.includes('verify-dangling.mjs'))).toBe(false);
  });
});

describe('auditWiring round-3 hardening', () => {
  it('a dot-segment spelling of scriptsDir still derives keys and registrations', () => {
    const dotCfg = { ...cfg, wiring: { ...cfg.wiring, scriptsDir: 'scripts/./verify' } };
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    const report = auditWiring(dotCfg, defaultManifest(dotCfg), root);
    expect(report.issues.some((i) => i.includes('"verify:foo" is wired nowhere'))).toBe(false);
    expect(report.issues.some((i) => i.includes('is not registered'))).toBe(false);
  });

  it('a verify body chaining two checks registers BOTH files; the first is the key', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        'verify:both':
          'node scripts/verify/verify-a.mjs && node scripts/verify/verify-b.mjs',
      },
      ci: 'jobs:\n  a:\n    steps:\n      - run: pnpm verify:both\n',
      scriptFiles: ['verify-a.mjs', 'verify-b.mjs'],
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues.some((i) => i.includes('verify-a.mjs" is not registered'))).toBe(false);
    expect(report.issues.some((i) => i.includes('verify-b.mjs" is not registered'))).toBe(false);
  });

  it('a contained symlink candidate does not evade wire-or-delete; external ones stay out', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    // contained target, unregistered → must surface as an FR-1 orphan
    writeFileSync(resolve(root, 'shadow.mjs'), '// contained target');
    symlinkSync(resolve(root, 'shadow.mjs'), resolve(root, 'scripts/verify', 'verify-linked.mjs'));
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('script on disk "verify-linked.mjs" is not registered'),
    );
    // external target: not a candidate at all
    const outside = mkdtempSync(join(tmpdir(), 'provegate-ext-'));
    roots.push(outside);
    writeFileSync(join(outside, 'ext.mjs'), '// external');
    const root2 = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs'],
    });
    symlinkSync(join(outside, 'ext.mjs'), resolve(root2, 'scripts/verify', 'verify-ext.mjs'));
    expect(
      auditWiring(cfg, defaultManifest(cfg), root2).issues.some((i) =>
        i.includes('verify-ext.mjs'),
      ),
    ).toBe(false);
  });
});

describe('auditWiring round-4 hardening', () => {
  it('an absolute invocation derives no key even when scriptsDir is "." (empty prefix)', () => {
    const dotCfg = { ...cfg, wiring: { ...cfg.wiring, scriptsDir: '.' } };
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node /tmp/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node verify-foo.mjs\n' },
    });
    writeFileSync(resolve(root, 'verify-foo.mjs'), '// local file with the same basename');
    const report = auditWiring(dotCfg, defaultManifest(dotCfg), root);
    // no key from the absolute body → the hook cannot wire it
    expect(report.issues).toContainEqual(
      expect.stringContaining('"verify:foo" is wired nowhere'),
    );
    // control: the same body written repo-relative derives the key and wires
    const rel = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node verify-foo.mjs' },
      hooks: { 'pre-commit': 'node verify-foo.mjs\n' },
    });
    writeFileSync(resolve(rel, 'verify-foo.mjs'), '// fixture');
    expect(
      auditWiring(dotCfg, defaultManifest(dotCfg), rel).issues.some((i) =>
        i.includes('"verify:foo" is wired nowhere'),
      ),
    ).toBe(false);
  });
});

describe('auditWiring on-disk direction (FR-1)', () => {
  it('an unregistered on-disk verify script fails, naming the file', () => {
    const root = repo({
      scripts: { ...FLOOR, 'verify:foo': 'node scripts/verify/verify-foo.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-foo.mjs\n' },
      scriptFiles: ['verify-foo.mjs', 'verify-orphan.mjs'],
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('script on disk "verify-orphan.mjs" is not registered'),
    );
  });

  it('registration is the command rule, never a substring: an echo body does not register', () => {
    const root = repo({
      scripts: {
        ...FLOOR,
        // the only mention of the orphan is an echo inside a VERIFY body —
        // neither registration (not an invocation) nor wiring (excluded body)
        'verify:orphan': 'echo scripts/verify/verify-orphan.mjs',
      },
      scriptFiles: ['verify-orphan.mjs'],
    });
    const report = auditWiring(cfg, defaultManifest(cfg), root);
    expect(report.issues).toContainEqual(
      expect.stringContaining('script on disk "verify-orphan.mjs" is not registered'),
    );
    // the paired control: a real invocation registers the file
    const registered = repo({
      scripts: { ...FLOOR, 'verify:orphan': 'node scripts/verify/verify-orphan.mjs' },
      hooks: { 'pre-commit': 'node scripts/verify/verify-orphan.mjs\n' },
      scriptFiles: ['verify-orphan.mjs'],
    });
    expect(
      auditWiring(cfg, defaultManifest(cfg), registered).issues.some((i) =>
        i.includes('verify-orphan.mjs" is not registered'),
      ),
    ).toBe(false);
  });
});
