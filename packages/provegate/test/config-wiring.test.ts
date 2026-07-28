import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { validateConfig, validateResolvedConfig } from '../src/core/config/validate.js';
import { defaultManifest } from '../src/core/gates/manifest.js';
import { auditWiring } from '../src/core/gates/wiring.js';

// PRD-025 FR-2: the three `wiring.*` keys — defaults, lexical validation, and
// the runtime containment that lexical validation cannot provide.

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function bareRepo(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-config-wiring-'));
  roots.push(root);
  writeFileSync(
    resolve(root, 'package.json'),
    JSON.stringify({
      name: 'x',
      scripts: { 'check-types': 'x', lint: 'x', build: 'x', test: 'x' },
    }),
  );
  return root;
}

describe('wiring config defaults', () => {
  it('ships this repository’s shapes as defaults', () => {
    expect(DEFAULT_CONFIG.wiring).toEqual({
      scriptsDir: 'scripts/verify',
      hooksDir: '.githooks',
      bundlePath: 'scripts/verify/verify-workflow.mjs',
    });
  });

  it('accepts a conforming wiring block and rejects unknown keys inside it', () => {
    expect(
      validateConfig({ wiring: { scriptsDir: 'tools/checks', hooksDir: '.hooks' } }),
    ).toEqual([]);
    expect(validateConfig({ wiring: { bundleDir: 'x' } })).toContainEqual(
      expect.objectContaining({ path: 'wiring.bundleDir', message: 'unknown key' }),
    );
    expect(validateConfig({ wiring: { hooksDir: 7 } })).toContainEqual(
      expect.objectContaining({ path: 'wiring.hooksDir' }),
    );
  });
});

describe('wiring path validation (lexical)', () => {
  const resolved = (wiring: Partial<typeof DEFAULT_CONFIG.wiring>): ReturnType<
    typeof validateResolvedConfig
  > => validateResolvedConfig({ ...DEFAULT_CONFIG, wiring: { ...DEFAULT_CONFIG.wiring, ...wiring } });

  it('rejects an absolute path, per key', () => {
    for (const key of ['scriptsDir', 'hooksDir', 'bundlePath'] as const) {
      expect(resolved({ [key]: '/etc/hooks' })).toContainEqual(
        expect.objectContaining({ path: `wiring.${key}`, message: 'must be repo-relative' }),
      );
    }
  });

  it('rejects a parent-escaping path, per key', () => {
    for (const key of ['scriptsDir', 'hooksDir', 'bundlePath'] as const) {
      expect(resolved({ [key]: '../outside' })).toContainEqual(
        expect.objectContaining({
          path: `wiring.${key}`,
          message: 'must not contain a `..` segment',
        }),
      );
    }
  });

  it('does NOT require the configured paths to exist — absence is not a surface', () => {
    expect(resolved({ hooksDir: 'no/such/dir', bundlePath: 'no/such/bundle.mjs' })).toEqual([]);
    const report = auditWiring(DEFAULT_CONFIG, defaultManifest(DEFAULT_CONFIG), bareRepo());
    expect(report.ok).toBe(true);
    expect(report.surfaces.some((s) => s.startsWith('hooks:'))).toBe(false);
    expect(report.surfaces.some((s) => s.startsWith('bundle:'))).toBe(false);
  });
});

describe('wiring runtime containment (what lexical validation cannot see)', () => {
  // One symlink-escape fixture per key: the validator's own comment records
  // that a lexical check must be paired with a runtime resolver, and these
  // three reads are the runtime half.
  const escaped = (
    plant: (root: string, outside: string) => void,
    label: string,
  ): readonly string[] => {
    const outside = mkdtempSync(join(tmpdir(), 'provegate-escape-'));
    roots.push(outside);
    const root = bareRepo();
    plant(root, outside);
    const report = auditWiring(DEFAULT_CONFIG, defaultManifest(DEFAULT_CONFIG), root);
    return report.issues.filter((i) => i.includes(label));
  };

  it('refuses a scriptsDir that resolves outside the repository', () => {
    const issues = escaped((root, outside) => {
      symlinkSync(outside, resolve(root, 'scripts'));
    }, 'wiring.scriptsDir');
    expect(issues).toContainEqual(
      expect.stringContaining('resolves outside the workspace through a symlink'),
    );
  });

  it('refuses a hooksDir that resolves outside the repository', () => {
    const issues = escaped((root, outside) => {
      symlinkSync(outside, resolve(root, '.githooks'));
    }, 'wiring.hooksDir');
    expect(issues).toContainEqual(
      expect.stringContaining('resolves outside the workspace through a symlink'),
    );
  });

  it('refuses a bundlePath that resolves outside the repository', () => {
    const issues = escaped((root, outside) => {
      writeFileSync(resolve(outside, 'verify-workflow.mjs'), 'const CHECKS = [\n];\n');
      symlinkSync(outside, resolve(root, 'scripts'));
    }, 'wiring.bundlePath');
    expect(issues).toContainEqual(
      expect.stringContaining('resolves outside the workspace through a symlink'),
    );
  });
});
