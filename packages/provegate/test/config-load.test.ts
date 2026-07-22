import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  ConfigError,
  DEFAULT_CONFIG,
  deepMerge,
  findRepoRoot,
  loadConfig,
  resolveConfig,
  validateConfig,
} from '../src/core/config/index.js';

const roots: string[] = [];

function tempRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-config-'));
  roots.push(root);
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('validateConfig', () => {
  it('accepts an empty partial', () => {
    expect(validateConfig({})).toEqual([]);
  });

  it('flags unknown keys with their path', () => {
    const issues = validateConfig({ idPatern: { prefix: 'X' } });
    expect(issues).toEqual([{ path: 'idPatern', message: 'unknown key' }]);
  });

  it('flags wrong types with path-tagged messages', () => {
    const issues = validateConfig({ dirs: { artifacts: { prd: { dir: 42 } } } });
    expect(issues).toContainEqual({
      path: 'dirs.artifacts.prd.dir',
      message: 'must be a non-empty string',
    });
  });

  it('collects every issue, not just the first', () => {
    const issues = validateConfig({
      idPattern: { width: 0 },
      owners: 'me',
      bogus: true,
    });
    expect(issues.length).toBe(3);
  });
});

describe('deepMerge', () => {
  it('merges nested objects recursively', () => {
    const merged = deepMerge(DEFAULT_CONFIG, { idPattern: { prefix: 'TASK' } });
    expect(merged.idPattern.prefix).toBe('TASK');
    expect(merged.idPattern.width).toBe(3);
    expect(merged.dirs.stateFile).toBe('_state/prds.json');
  });

  it('replaces arrays wholesale (no concat)', () => {
    const merged = deepMerge(DEFAULT_CONFIG, { owners: ['maintainer'] });
    expect(merged.owners).toEqual(['maintainer']);
  });

  it('replaces scalars', () => {
    const merged = deepMerge(DEFAULT_CONFIG, { branches: { base: 'trunk' } });
    expect(merged.branches.base).toBe('trunk');
    expect(merged.branches.protected).toEqual(['main', 'master', 'staging']);
  });
});

describe('findRepoRoot / loadConfig', () => {
  it('finds root by workflow.config.json', () => {
    const root = tempRepo();
    writeFileSync(resolve(root, 'workflow.config.json'), '{}');
    const nested = resolve(root, 'a/b');
    mkdirSync(nested, { recursive: true });
    expect(findRepoRoot(nested)).toBe(root);
  });

  it('finds root by .git directory', () => {
    const root = tempRepo();
    mkdirSync(resolve(root, '.git'));
    const nested = resolve(root, 'x');
    mkdirSync(nested);
    expect(findRepoRoot(nested)).toBe(root);
  });

  it('throws a clear error when neither marker exists', () => {
    const root = tempRepo();
    expect(() => findRepoRoot(root)).toThrow(/no workflow\.config\.json or \.git found/);
  });

  it('absent config file yields pure defaults', () => {
    const root = tempRepo();
    mkdirSync(resolve(root, '.git'));
    const { config } = loadConfig(root);
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('merges a valid config file over defaults', () => {
    const root = tempRepo();
    writeFileSync(
      resolve(root, 'workflow.config.json'),
      JSON.stringify({ idPattern: { prefix: 'TASK', width: 4 } }),
    );
    const { config } = loadConfig(root);
    expect(config.idPattern).toEqual({ prefix: 'TASK', width: 4 });
    expect(config.dirs.artifacts.prd.dir).toBe('_prds');
  });

  it('throws an aggregate ConfigError listing all issues', () => {
    const root = tempRepo();
    writeFileSync(
      resolve(root, 'workflow.config.json'),
      JSON.stringify({ idPattern: { width: -1 }, nope: 1 }),
    );
    try {
      resolveConfig(root);
      expect.unreachable('should have thrown');
    } catch (error) {
      const err = error as ConfigError;
      expect(err).toBeInstanceOf(ConfigError);
      expect(err.issues.length).toBe(2);
      expect(err.message).toContain('idPattern.width');
      expect(err.message).toContain('nope');
    }
  });

  it('throws on malformed JSON', () => {
    const root = tempRepo();
    writeFileSync(resolve(root, 'workflow.config.json'), '{ nope');
    expect(() => resolveConfig(root)).toThrow(/not valid JSON/);
  });
});
