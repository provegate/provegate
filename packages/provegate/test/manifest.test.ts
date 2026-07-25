import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import {
  ManifestError,
  defaultManifest,
  loadManifest,
  manifestCommands,
  validateManifest,
} from '../src/core/gates/manifest.js';

const cfg = DEFAULT_CONFIG;
const roots: string[] = [];

function tempRepo(manifest?: unknown): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-manifest-'));
  roots.push(root);
  if (manifest !== undefined) {
    writeFileSync(resolve(root, 'gates.manifest.json'), JSON.stringify(manifest));
  }
  return root;
}

afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('defaultManifest', () => {
  it('floor phase 4 = the four config commands; postMerge = checkTypes + build', () => {
    const m = defaultManifest(cfg);
    expect(m.phases['4']).toEqual(['pnpm check-types', 'pnpm lint', 'pnpm build', 'pnpm test']);
    expect(m.postMerge).toEqual(['pnpm check-types', 'pnpm build']);
    expect(m.classDefaults).toEqual({});
    expect(m.hardCaps).toEqual([]);
  });
});

describe('validateManifest', () => {
  it('accepts a well-formed manifest', () => {
    expect(
      validateManifest(cfg, {
        phases: { '4': ['pnpm test'] },
        classDefaults: {
          infra: [{ when: { diffMatches: ['scripts/**'] }, run: ['pnpm verify:x'] }],
        },
        hardCaps: [
          {
            id: 'deny-test',
            when: { targetsMatch: ['apps/api/**'] },
            requireLine: 'Cross-tenant test:',
            message: 'route touched — name a deny test',
          },
        ],
        postMerge: ['pnpm build'],
        wiringExceptions: { 'verify:legacy': 'wired in PRD-009' },
      }),
    ).toEqual([]);
  });

  it('flags unknown keys, unknown classes, empty commands, bad regex', () => {
    const issues = validateManifest(cfg, {
      bogus: 1,
      phases: { '4': [''] },
      classDefaults: { yolo: [{ run: ['x'] }] },
      hardCaps: [{ id: 'a', when: { targetsMatch: ['x'] }, requireLine: '([', message: 'm' }],
    });
    const paths = issues.map((i) => i.path);
    expect(paths).toContain('bogus');
    expect(paths).toContain('phases.4');
    expect(paths).toContain('classDefaults.yolo');
    expect(paths).toContain('hardCaps[0].requireLine');
  });

  it('flags rule-level unknown keys and missing run', () => {
    const issues = validateManifest(cfg, {
      classDefaults: { infra: [{ extra: true, run: [] }] },
    });
    expect(issues.map((i) => i.path)).toContain('classDefaults.infra[0]');
  });
});

describe('loadManifest', () => {
  it('absent file yields defaults', () => {
    expect(loadManifest(cfg, tempRepo())).toEqual(defaultManifest(cfg));
  });

  it('merges over defaults (objects merge, arrays replace)', () => {
    const m = loadManifest(cfg, tempRepo({ postMerge: ['pnpm build'] }));
    expect(m.postMerge).toEqual(['pnpm build']);
    expect(m.phases['4']).toEqual(defaultManifest(cfg).phases['4']);
  });

  it('throws an aggregate ManifestError on invalid content', () => {
    const root = tempRepo({ nope: 1, postMerge: [42] });
    try {
      loadManifest(cfg, root);
      expect.unreachable('should throw');
    } catch (error) {
      expect(error).toBeInstanceOf(ManifestError);
      expect((error as ManifestError).issues.length).toBe(2);
    }
  });

  it('throws on malformed JSON', () => {
    const root = tempRepo();
    writeFileSync(resolve(root, 'gates.manifest.json'), '{ nope');
    expect(() => loadManifest(cfg, root)).toThrow(/not valid JSON/);
  });
});

describe('manifestCommands', () => {
  it('collects phases, class rules, and postMerge deduped', () => {
    const m = loadManifest(
      cfg,
      tempRepo({
        classDefaults: { infra: [{ run: ['pnpm verify:x', 'pnpm build'] }] },
      }),
    );
    const cmds = manifestCommands(m);
    expect(cmds).toContain('pnpm verify:x');
    expect(cmds.filter((c) => c === 'pnpm build')).toHaveLength(1);
  });
});

describe('codex review regressions (round 1)', () => {
  it('rejects unknown phase keys (unreachable chains must not validate)', () => {
    const issues = validateManifest(cfg, { phases: { '99': ['pnpm test'] } });
    expect(issues).toContainEqual(
      expect.objectContaining({
        path: 'phases.99',
        message: expect.stringContaining('unknown phase key'),
      }),
    );
  });

  it('refuses a manifest whose commands fail the safety gate (git push, metachars)', () => {
    expect(() => loadManifest(cfg, tempRepo({ postMerge: ['git push origin main'] }))).toThrow(
      /safety gate/,
    );
    expect(() => loadManifest(cfg, tempRepo({ phases: { '4': ['pnpm test > out.txt'] } }))).toThrow(
      /safety gate/,
    );
  });
});

describe('codex review regressions (round 2)', () => {
  it('an absent manifest does NOT let unsafe workflow.config commands escape', () => {
    const evilCfg = deepMerge(cfg, { commands: { test: 'git push origin main' } });
    expect(() => loadManifest(evilCfg, tempRepo())).toThrow(/safety gate/);
  });
});

describe('FR-6 practices manifest semantics (deep-merge, not style)', () => {
  it('an ABSENT phases.4 leaves the configured floor intact', () => {
    // What `gate init --practices` writes: phase 7 only.
    const root = tempRepo({ phases: { '7': ['node scripts/verify/verify-brain.mjs'] } });
    const loaded = loadManifest(cfg, root);
    expect(loaded.phases['4']).toEqual(['pnpm check-types', 'pnpm lint', 'pnpm build', 'pnpm test']);
    expect(loaded.phases['7']).toEqual(['node scripts/verify/verify-brain.mjs']);
  });

  it('`phases.4: []` ERASES the floor — the shape the pack must never generate', () => {
    const root = tempRepo({ phases: { '4': [] } });
    expect(loadManifest(cfg, root).phases['4']).toEqual([]);
  });

  it('the difference is the whole rule: absent inherits, empty erases', () => {
    const absent = loadManifest(cfg, tempRepo({ phases: { '7': ['node -e "process.exit(0)"'] } }));
    const emptied = loadManifest(cfg, tempRepo({ phases: { '4': [], '7': ['node -e "process.exit(0)"'] } }));
    expect(absent.phases['4']).toHaveLength(4);
    expect(emptied.phases['4']).toHaveLength(0);
    expect(absent.phases['7']).toEqual(emptied.phases['7']);
  });
});
