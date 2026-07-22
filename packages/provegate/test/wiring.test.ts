import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { auditWiring, yamlRunText } from '../src/core/gates/wiring.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function repo(options: { scripts?: Record<string, string>; ci?: string }): string {
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
  return root;
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
    expect(auditWiring(cfg, defaultManifest(cfg), root)).toEqual({ ok: true, issues: [] });
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
