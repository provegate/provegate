import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import {
  collectDiffFiles,
  mergeGateCommands,
  parsePrdClass,
  resolveClassGates,
} from '../src/core/gates/classes.js';
import { defaultManifest } from '../src/core/gates/manifest.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function git(dir: string, args: string[]): string {
  return execFileSync('git', args, { cwd: dir, encoding: 'utf8' }).trim();
}

function gitRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-classes-'));
  roots.push(root);
  git(root, ['init', '-q', '-b', 'main']);
  git(root, ['config', 'user.email', 'test@example.invalid']);
  git(root, ['config', 'user.name', 'Test']);
  writeFileSync(resolve(root, 'a.txt'), 'a\n');
  git(root, ['add', '.']);
  git(root, ['commit', '-q', '-m', 'init']);
  return root;
}

describe('parsePrdClass', () => {
  it('parses the header field and validates against config classes', () => {
    expect(parsePrdClass(cfg, '> **PRD Class**: infra\n')).toBe('infra');
    expect(parsePrdClass(cfg, '> **PRD Class**: hotfix | x\n')).toBe('hotfix');
  });

  it('unknown or absent class falls back to the first configured class', () => {
    expect(parsePrdClass(cfg, '> **PRD Class**: yolo\n')).toBe('feature');
    expect(parsePrdClass(cfg, 'no header')).toBe('feature');
    const custom = deepMerge(cfg, { classes: ['ops', 'infra'] });
    expect(parsePrdClass(custom, 'no header')).toBe('ops');
  });
});

describe('collectDiffFiles', () => {
  it('diffs feature branch against local base via merge-base', () => {
    const root = gitRepo();
    git(root, ['checkout', '-q', '-b', 'feat/x']);
    mkdirSync(resolve(root, 'scripts'));
    writeFileSync(resolve(root, 'scripts/b.mjs'), 'b\n');
    git(root, ['add', '.']);
    git(root, ['commit', '-q', '-m', 'feat']);
    expect(collectDiffFiles(root, 'main')).toEqual(['scripts/b.mjs']);
  });

  it('falls back to working diff when no base ref resolves', () => {
    const root = gitRepo();
    writeFileSync(resolve(root, 'a.txt'), 'changed\n');
    expect(collectDiffFiles(root, 'no-such-branch')).toEqual(['a.txt']);
  });
});

describe('resolveClassGates', () => {
  const manifest = {
    ...defaultManifest(cfg),
    classDefaults: {
      infra: [
        { run: ['pnpm verify:wiring'] },
        { when: { diffMatches: ['scripts/**'] }, run: ['pnpm verify:scripts'] },
        { when: { diffMatches: ['apps/**'] }, run: ['pnpm verify:apps'] },
      ],
    },
  };

  it('applies unconditional rules always and conditional rules on diff match', () => {
    expect(resolveClassGates(manifest, 'infra', ['scripts/x.mjs'])).toEqual([
      'pnpm verify:wiring',
      'pnpm verify:scripts',
    ]);
    expect(resolveClassGates(manifest, 'infra', ['README.md'])).toEqual(['pnpm verify:wiring']);
    expect(resolveClassGates(manifest, 'feature', ['scripts/x.mjs'])).toEqual([]);
  });
});

describe('mergeGateCommands', () => {
  it('dedupes preserving order', () => {
    expect(mergeGateCommands(['a', 'b'], ['b', 'c', 'a'])).toEqual(['a', 'b', 'c']);
  });
});
