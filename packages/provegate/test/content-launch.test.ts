import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

const run = promisify(execFile);
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));

const read = (rel: string) => readFileSync(join(repoRoot, rel), 'utf8');

/**
 * Do-not-say lint (FR-8, W2). Two page classes with different rule sets:
 * - self-copy (READMEs, landing source, quickstart, announcement): we wrote the
 *   claims, so the full banned set applies — "first ever" variants, unmeasured
 *   percentage speedup/defect claims, and the dead project's badge-jargon
 *   verdict labels.
 * - evidence (case study, whitepaper): these pages quote measured figures,
 *   including external studies with percentages, so only "first ever" and
 *   badge-jargon are banned; number discipline is enforced by the
 *   figure-consistency checks below instead.
 */
type PageClass = 'self-copy' | 'evidence';

const RULES: { name: string; pattern: RegExp; classes: PageClass[] }[] = [
  {
    name: 'first-ever claim',
    pattern: /\bfirst[- ]ever\b/i,
    classes: ['self-copy', 'evidence'],
  },
  {
    name: 'badge-jargon verdict label',
    // Upper-case only: the verb "prove" and the tagline are fine; the dead
    // project's PROVEN/VIOLATED badge vocabulary is not.
    pattern: /\b(PROVEN|VIOLATED)\b/,
    classes: ['self-copy', 'evidence'],
  },
  {
    name: 'unmeasured percentage claim',
    pattern: /\d+(?:\.\d+)?\s*%\s*(?:faster|slower|fewer|less|more|speedup|productivity)|\d+(?:\.\d+)?\s*%\s*(?:fewer|less)?\s*(?:bugs?|defects?)/i,
    classes: ['self-copy'],
  },
];

function lintContent(text: string, cls: PageClass): string[] {
  const violations: string[] = [];
  for (const rule of RULES) {
    if (!rule.classes.includes(cls)) continue;
    const m = rule.pattern.exec(text);
    if (m) violations.push(`${rule.name}: "${m[0]}"`);
  }
  return violations;
}

const SELF_COPY_PAGES = [
  'README.md',
  'packages/provegate/README.md',
  'packages/provegate/QUICKSTART.md',
  'apps/web/app/page.tsx',
  '_docs/launch/announcement-draft.md',
];

const EVIDENCE_PAGES = [
  'apps/docs/content/docs/case-study.mdx',
  'apps/docs/content/docs/whitepaper.mdx',
];

describe('do-not-say lint over the launch surfaces (FR-8, W2)', () => {
  it.each(SELF_COPY_PAGES)('%s is clean under the strict self-copy rules', (page) => {
    expect(existsSync(join(repoRoot, page))).toBe(true);
    expect(lintContent(read(page), 'self-copy')).toEqual([]);
  });

  it.each(EVIDENCE_PAGES)('%s is clean under the evidence-page rules', (page) => {
    expect(existsSync(join(repoRoot, page))).toBe(true);
    expect(lintContent(read(page), 'evidence')).toEqual([]);
  });

  it('deliberate violations are caught (the lint is not vacuous)', () => {
    expect(lintContent('the first ever gated workflow', 'self-copy')).toHaveLength(1);
    expect(lintContent('the first-ever gated workflow', 'evidence')).toHaveLength(1);
    expect(lintContent('ships 50% faster than manual review', 'self-copy')).toHaveLength(1);
    expect(lintContent('40% fewer bugs, guaranteed', 'self-copy')).toHaveLength(1);
    expect(lintContent('verdict: PROVEN', 'self-copy')).toHaveLength(1);
    expect(lintContent('gate VIOLATED', 'evidence')).toHaveLength(1);
  });

  it('deliberate non-violations pass (the lint is not overbroad)', () => {
    // The verb is fine; only the badge vocabulary is banned.
    expect(lintContent('prove it, then let it propagate', 'self-copy')).toEqual([]);
    expect(lintContent('a proven approach to gating', 'self-copy')).toEqual([]);
    // Quoted external percentages are legitimate on evidence pages.
    expect(lintContent('the study measured a 19% slowdown', 'evidence')).toEqual([]);
    // r-values are figures, not speedup claims.
    expect(lintContent('r = −0.03 with post-ship defects', 'self-copy')).toEqual([]);
  });
});

describe('figure consistency between the evidence pages (FR-8)', () => {
  const caseStudy = () => read('apps/docs/content/docs/case-study.mdx');
  const whitepaper = () => read('apps/docs/content/docs/whitepaper.mdx');

  // Every headline figure must appear in BOTH pages — a number that drifts in
  // one place is exactly the miscalibrated claim this method exists to gate.
  const SHARED_FIGURES: { label: string; token: string }[] = [
    { label: 'calibration finding count', token: '143' },
    { label: 'work-item count', token: '390' },
    { label: 'score/defect correlation', token: 'r = −0.03' },
    { label: 'cross-model catch rate', token: '3 of 19' },
  ];

  it.each(SHARED_FIGURES)('$label ($token) appears in both pages', ({ token }) => {
    expect(caseStudy()).toContain(token);
    expect(whitepaper()).toContain(token);
  });

  it('the whitepaper stays anonymized', () => {
    expect(whitepaper().toLowerCase()).not.toContain('emofy');
    expect(caseStudy().toLowerCase()).not.toContain('emofy');
  });
});

describe('quickstart command audit + execution (FR-3, FR-9, W4)', () => {
  const quickstart = () => read('packages/provegate/QUICKSTART.md');
  const dirs: string[] = [];
  afterEach(() => {
    for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  });

  it('every backticked gate subcommand in QUICKSTART.md exists in the CLI usage', async () => {
    // Only code is audited (W3 precedent): fenced blocks + inline backticks.
    // Prose like "quality gate skeleton" is English, not a command.
    const text = quickstart();
    const code = [
      ...[...text.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1] ?? ''),
      ...[...text.matchAll(/`([^`\n]+)`/g)].map((m) => m[1] ?? ''),
    ].join('\n');
    const mentioned = new Set<string>();
    for (const m of code.matchAll(/\bgate ([a-z-]+)/g)) if (m[1]) mentioned.add(m[1]);
    expect(mentioned.size).toBeGreaterThan(0);
    const usage = await run(process.execPath, [cliPath, '--help']).then(
      (r) => r.stdout + r.stderr,
      (e: { stdout?: string; stderr?: string }) => (e.stdout ?? '') + (e.stderr ?? ''),
    );
    for (const sub of mentioned) {
      expect(usage, `QUICKSTART mentions "gate ${sub}" but the CLI usage does not`).toContain(sub);
    }
  });

  it('the install-section init sequence runs in a fixture repo and produces the promised tree (W4)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'provegate-quickstart-'));
    dirs.push(dir);
    await run('git', ['init', '--quiet'], { cwd: dir });
    await run(process.execPath, [cliPath, 'init'], { cwd: dir });

    // The tree QUICKSTART §1 promises, verbatim.
    const promised = [
      '_prds/wip',
      '_prds/completed',
      '_prds/deferred',
      '_readiness/wip',
      '_readiness/completed',
      '_readiness/deferred',
      '_tasks/wip',
      '_tasks/completed',
      '_tasks/deferred',
      '_docs/wip',
      '_docs/completed',
      '_docs/deferred',
      '_state/locks',
      'workflow.config.json',
      'gates.manifest.json',
    ];
    for (const p of promised) {
      expect(existsSync(join(dir, p)), `gate init did not create ${p}`).toBe(true);
    }

    // "It never overwrites anything — re-run it any time."
    const second = await run(process.execPath, [cliPath, 'init'], { cwd: dir });
    expect(second.stdout).toMatch(/skipped/i);
  });
});
