import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';

const cfg = DEFAULT_CONFIG;
const manifest = defaultManifest(cfg);

const READY_PRD = [
  '## 4. Functional Requirements',
  '',
  '1. **FR-1 — Thing**: does a thing.',
  '   - **Targets:** `packages/x/src/a.ts`',
  '2. **FR-2 — Other**: does another.',
  '   - **Targets:** `packages/x/src/b.ts`',
  '',
  '## 9. Open Questions',
  '',
  '- (none — resolved)',
  '',
  '## 11. Verification Commands',
  '',
  '| FR   | Command |',
  '| ---- | ------- |',
  '| FR-1 | `pnpm test test/a.test.ts` |',
  '| FR-2 | `pnpm test test/b.test.ts` |',
  '',
  '## 12. DO NOT (Anti-Patterns)',
  '',
  '- DO NOT do bad things.',
].join('\n');

describe('lintPrd structural checks', () => {
  it('accepts a structurally ready PRD', () => {
    expect(lintPrd(cfg, manifest, READY_PRD)).toEqual({ ok: true, issues: [] });
  });

  it('flags missing Targets, missing §11 row, unrunnable row', () => {
    const noTargets = READY_PRD.replace('   - **Targets:** `packages/x/src/a.ts`\n', '');
    expect(lintPrd(cfg, manifest, noTargets).issues).toContainEqual(
      expect.stringContaining('FR-1: missing **Targets:**'),
    );

    const noRow = READY_PRD.replace('| FR-2 | `pnpm test test/b.test.ts` |\n', '');
    expect(lintPrd(cfg, manifest, noRow).issues).toContainEqual(
      expect.stringContaining('FR-2: no §11 verification row'),
    );

    const badRow = READY_PRD.replace('`pnpm test test/b.test.ts`', '`manual inspection`');
    expect(lintPrd(cfg, manifest, badRow).issues).toContainEqual(
      expect.stringContaining('FR-2: §11 row has no runnable command'),
    );
  });

  it('flags missing DO NOT, open questions, bare placeholders', () => {
    const noDont = READY_PRD.replace('## 12. DO NOT (Anti-Patterns)', '## 12. Notes');
    expect(lintPrd(cfg, manifest, noDont).issues).toContainEqual(
      expect.stringContaining('missing DO NOT'),
    );

    const openQ = READY_PRD.replace('- (none — resolved)', '- What about auth?');
    expect(lintPrd(cfg, manifest, openQ).issues).toContainEqual(
      expect.stringContaining('Open Questions not empty'),
    );

    const tbd = READY_PRD.replace('does a thing.', 'does a thing. TBD later.');
    expect(lintPrd(cfg, manifest, tbd).issues).toContainEqual(
      expect.stringContaining('placeholder text'),
    );
  });

  it('backtick-quoted lint vocabulary is exempt (W4)', () => {
    const cites = READY_PRD.replace('does a thing.', 'does a thing. The lint bans `TBD`/`???`.');
    expect(lintPrd(cfg, manifest, cites).ok).toBe(true);
  });

  it('reports unsafe §11 commands at lint time', () => {
    const unsafe = READY_PRD.replace('`pnpm test test/a.test.ts`', '`pnpm run $(evil)`');
    expect(lintPrd(cfg, manifest, unsafe).issues).toContainEqual(
      expect.stringContaining('unsafe §11 command'),
    );
  });
});

describe('hard caps', () => {
  const capped: GatesManifest = {
    ...manifest,
    hardCaps: [
      {
        id: 'route-deny-test',
        when: { targetsMatch: ['packages/x/**'] },
        requireLine: 'Deny test: `[^`]+`',
        message: 'targets touch packages/x — name a runnable deny test line',
      },
    ],
  };

  it('fires when targets match and the required line is absent', () => {
    const report = lintPrd(cfg, capped, READY_PRD);
    expect(report.issues).toContainEqual(expect.stringContaining('hard cap route-deny-test'));
  });

  it('passes when the required line is present or targets do not match', () => {
    const withLine = `${READY_PRD}\n\nDeny test: \`pnpm test test/deny.test.ts\`\n`;
    expect(lintPrd(cfg, capped, withLine).ok).toBe(true);

    const elsewhere: GatesManifest = {
      ...capped,
      hardCaps: [{ ...capped.hardCaps[0]!, when: { targetsMatch: ['apps/api/**'] } }],
    };
    expect(lintPrd(cfg, elsewhere, READY_PRD).ok).toBe(true);
  });
});

describe('self-application (W4 dogfood)', () => {
  it('PRD-002 itself passes the lint (wip or archived)', () => {
    // The artifact moves wip→completed at close; accept either location so
    // this test survives its own PRD's archive (lesson from PRD-001's lease test).
    const candidates = ['wip', 'completed'].map((state) =>
      fileURLToPath(
        new URL(`../../../_prds/${state}/prd-002-gate-manifest-runner.md`, import.meta.url),
      ),
    );
    const prdPath = candidates.find((p) => existsSync(p));
    expect(prdPath, 'PRD-002 artifact not found in wip or completed').toBeDefined();
    const report = lintPrd(cfg, manifest, readFileSync(prdPath!, 'utf8'));
    expect(report.issues).toEqual([]);
  });
});
