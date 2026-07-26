import { execFile, execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
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
 *   including external studies with percentages — so a percentage claim is
 *   allowed ONLY if the exact figure appears in the research source document
 *   (figure-to-source fidelity, mechanical). "first ever" and badge-jargon
 *   stay banned outright.
 */
type PageClass = 'self-copy' | 'evidence';

// Typographic hyphens (U+2010–U+2015, U+2212) must not smuggle "first‑ever"
// past an ASCII-only pattern.
const normalize = (text: string) => text.replace(/[‐-―−]/g, '-');

const PERCENT_CLAIM =
  /\d+(?:\.\d+)?\s*%\s*(?:faster|slower|fewer|less|more|speedup|slowdown|productivity)|\d+(?:\.\d+)?\s*%\s*(?:fewer|less)?\s*(?:bugs?|defects?)/gi;

function lintContent(text: string, cls: PageClass, sourceText = ''): string[] {
  const violations: string[] = [];
  const t = normalize(text);
  const m1 = /\bfirst[- ]ever\b/i.exec(t);
  if (m1) violations.push(`first-ever claim: "${m1[0]}"`);
  // Upper-case only: the verb "prove" and the tagline are fine; the dead
  // project's PROVEN/VIOLATED badge vocabulary is not.
  const m2 = /\b(PROVEN|VIOLATED)\b/.exec(t);
  if (m2) violations.push(`badge-jargon verdict label: "${m2[0]}"`);
  if (cls === 'self-copy') {
    for (const m of t.matchAll(PERCENT_CLAIM)) {
      violations.push(`unmeasured percentage claim: "${m[0]}"`);
    }
  } else {
    // Evidence pages: EVERY percentage figure — not just claim-phrases — must
    // trace verbatim to the research source; "17% of fixes" is as much a
    // fabrication risk as "17% faster".
    const source = normalize(sourceText);
    for (const m of t.matchAll(/\d+(?:\.\d+)?\s*%/g)) {
      if (source.includes(m[0])) continue;
      violations.push(`untraceable percentage figure: "${m[0]}"`);
    }
  }
  return violations;
}

const SELF_COPY_PAGES = [
  'README.md',
  'packages/provegate/README.md',
  'packages/provegate/QUICKSTART.md',
  'apps/web/app/page.tsx',
  'apps/docs/content/docs/index.mdx',
  'apps/docs/content/docs/quickstart.mdx',
  '_docs/launch/announcement-draft.md',
  'RELEASING.md',
];

const EVIDENCE_PAGES = [
  'apps/docs/content/docs/case-study.mdx',
  'apps/docs/content/docs/whitepaper.mdx',
];

// The figure-fidelity source: every percentage claim on an evidence page must
// appear verbatim here.
const RESEARCH_SOURCE = 'docs/research/provegate-bootstrap/whitepaper-gated-autonomy-2026-07-22.md';

describe('do-not-say lint over the launch surfaces (FR-8, W2)', () => {
  it.each(SELF_COPY_PAGES)('%s is clean under the strict self-copy rules', (page) => {
    expect(existsSync(join(repoRoot, page))).toBe(true);
    expect(lintContent(read(page), 'self-copy')).toEqual([]);
  });

  it.each(EVIDENCE_PAGES)('%s is clean under the evidence-page rules', (page) => {
    expect(existsSync(join(repoRoot, page))).toBe(true);
    expect(lintContent(read(page), 'evidence', read(RESEARCH_SOURCE))).toEqual([]);
  });

  it('deliberate violations are caught (the lint is not vacuous)', () => {
    expect(lintContent('the first ever gated workflow', 'self-copy')).toHaveLength(1);
    expect(lintContent('the first-ever gated workflow', 'evidence')).toHaveLength(1);
    // Typographic hyphen (U+2011) must not smuggle the claim past the lint.
    expect(lintContent('the first‑ever gated workflow', 'evidence')).toHaveLength(1);
    expect(lintContent('ships 50% faster than manual review', 'self-copy')).toHaveLength(1);
    expect(lintContent('40% fewer bugs, guaranteed', 'self-copy')).toHaveLength(1);
    expect(lintContent('verdict: PROVEN', 'self-copy')).toHaveLength(1);
    expect(lintContent('gate VIOLATED', 'evidence')).toHaveLength(1);
    // Evidence pages get no blanket percentage exemption: a figure absent
    // from the research source is a violation there too.
    expect(lintContent('ProveGate is 900% faster', 'evidence', 'no such figure here')).toHaveLength(
      1,
    );
    // ...including bare figures that aren't claim-phrases at all.
    expect(lintContent('found in 17% of fixes', 'evidence', 'source without it')).toHaveLength(1);
  });

  it('deliberate non-violations pass (the lint is not overbroad)', () => {
    // The verb is fine; only the badge vocabulary is banned.
    expect(lintContent('prove it, then let it propagate', 'self-copy')).toEqual([]);
    expect(lintContent('a proven approach to gating', 'self-copy')).toEqual([]);
    // Source-traceable external percentages are legitimate on evidence pages.
    expect(lintContent('made them 19% slower', 'evidence', 'it made them 19% slower [5]')).toEqual(
      [],
    );
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

/**
 * The package README is the npm listing — the one page an adopter reads before
 * installing. QUICKSTART already had a subcommand audit; the README did not, and it
 * spent eleven work items telling readers that shipped commands "exist but exit 1".
 * These two checks close that gap from the CLI's own help screen: every shipped
 * command must be documented, and none may be described as unbuilt.
 */
describe('package README command audit', () => {
  const readme = () => read('packages/provegate/README.md');
  /** The README's `## Commands` section, up to the next h2. */
  const commandsSection = () => readme().split('## Commands')[1]?.split(/\n## /)[0] ?? '';

  /** Command names from the help screen's COMMANDS block — the shipped surface. */
  async function shippedCommands(): Promise<string[]> {
    const usage = await run(process.execPath, [cliPath, '--help']).then(
      (r) => r.stdout + r.stderr,
      (e: { stdout?: string; stderr?: string }) => (e.stdout ?? '') + (e.stderr ?? ''),
    );
    const block = usage.split('COMMANDS')[1]?.split('OPTIONS')[0] ?? '';
    return [...block.matchAll(/^ {2}([a-z-]+)\s{2,}/gm)].map((m) => m[1]!);
  }

  it('documents every command the CLI ships', async () => {
    const commands = await shippedCommands();
    expect(commands.length).toBeGreaterThan(0);
    const section = commandsSection();
    for (const cmd of commands) {
      expect(
        section,
        `the CLI ships "gate ${cmd}" but README "## Commands" does not document it`,
      ).toMatch(new RegExp(`\`gate ${cmd}[ \`]`));
    }
  });

  it('never describes a shipped command as unimplemented', async () => {
    const commands = await shippedCommands();
    const unbuilt = /not implemented|not yet|coming soon|\bstub\b|roadmap phase/i;
    // A stub line may name the commands bare (`init` / `new`), without the `gate ` prefix.
    const namesACommand = (line: string) =>
      commands.some((c) => line.includes(`gate ${c}`) || line.includes(`\`${c}\``));
    const offenders = commandsSection()
      .split('\n')
      .filter((line) => unbuilt.test(line) && namesACommand(line));
    expect(offenders, 'README calls a shipped command unimplemented').toEqual([]);
  });
});

/**
 * FR-5 — the docs claims, asserted SEMANTICALLY.
 *
 * "the command name appears in the README" is the assertion that lets docs rot:
 * it stays green while every sentence around the name becomes false. Each case
 * below pairs a promise the docs make with the behaviour that makes it true, and
 * fails if either side moves.
 */
describe('adoption docs promise what the commands actually do (FR-5)', () => {
  const read = (rel: string): string =>
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '..', rel), 'utf8');
  const readRepo = (rel: string): string =>
    readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../..', rel), 'utf8');

  const surfaces = (): { name: string; text: string }[] => [
    { name: 'README.md', text: read('README.md') },
    { name: 'practices/NEXT_STEPS.md', text: read('practices/NEXT_STEPS.md') },
    { name: 'docs/cli.mdx', text: readRepo('apps/docs/content/docs/cli.mdx') },
  ];

  it('every surface that documents the doctor also states it is read-only', () => {
    // The claim is load-bearing: an adopter reaches for a doctor when something
    // is already broken, and needs to know it will not make things worse.
    for (const { name, text } of surfaces()) {
      if (!text.includes('gate doctor')) continue;
      expect(text.toLowerCase(), name).toMatch(/read-only|never edits/);
    }
  });

  it('the read-only claim is TRUE: the doctor has no write call', () => {
    // The other half of the pair. A docs assertion that nobody checks against
    // the code is a promise, not a test.
    const doctor = read('src/core/memory/doctor.ts');
    for (const writer of ['writeFileSync', 'appendFileSync', 'mkdirSync', 'rmSync', 'unlinkSync']) {
      expect(doctor, writer).not.toContain(writer);
    }
  });

  it('every surface that documents find also states it is local and deterministic', () => {
    for (const { name, text } of surfaces()) {
      if (!text.includes('memory find')) continue;
      expect(text.toLowerCase(), name).toContain('deterministic');
      // "no network / no embedding / local only" — the property adopters ask
      // about first, because recall is where tools usually phone home.
      expect(text.toLowerCase(), name).toMatch(/no network|local only/);
    }
  });

  it('the local-only claim is TRUE: find reaches nothing outside the store', () => {
    const find = read('src/core/memory/find.ts');
    for (const escape of ['fetch(', 'http', 'child_process', 'execFileSync']) {
      expect(find, escape).not.toContain(escape);
    }
  });

  it('the docs describe warnings and failures as different things', () => {
    // FR-1's whole design is that split; docs that flatten it teach an adopter
    // to treat a CI warning as a broken install.
    for (const { name, text } of surfaces()) {
      if (!text.includes('gate doctor')) continue;
      expect(text.toLowerCase(), name).toMatch(/warn/);
      expect(text.toLowerCase(), name).toMatch(/exit 1|fail/);
    }
  });

  it('NEXT_STEPS states the activation ORDER and the stats deferral', () => {
    const text = read('practices/NEXT_STEPS.md');
    // Running the doctor before the shims exist reports what you already know.
    expect(text.toLowerCase()).toMatch(/order matters|do steps 1-5 first/);
    // The deferral is explicit rather than an unexplained absence.
    expect(text.toLowerCase()).toMatch(/no usage statistics|deferred on purpose/);
  });

  it('bare `gate doctor` is documented as usage plus exit 1, and behaves that way', () => {
    const documented = surfaces().filter((s) => s.text.includes('gate doctor'));
    expect(documented.length).toBeGreaterThan(0);
    for (const { name, text } of documented) {
      // Whitespace-tolerant: Markdown wraps, so "Bare" and the command can land
      // on different lines. A regex that assumes they are adjacent fails on
      // correctly-formatted prose.
      expect(text.toLowerCase(), name).toMatch(/bare\s+`?gate doctor`?/);
    }
    let code = 0;
    let out = '';
    try {
      execFileSync(
        process.execPath,
        [resolve(dirname(fileURLToPath(import.meta.url)), '../dist/cli.js'), 'doctor'],
        { encoding: 'utf8' },
      );
    } catch (error) {
      const e = error as { status?: number; stderr?: string };
      code = e.status ?? -1;
      out = e.stderr ?? '';
    }
    expect(code).toBe(1);
    expect(out).toContain('usage: gate doctor');
  });

  it('the package still declares zero runtime dependencies (FR-6)', () => {
    // Both new commands are pure local computation; the moment either needs a
    // dependency, the local-only promise above is no longer free.
    const pkg = JSON.parse(read('package.json')) as { dependencies?: Record<string, string> };
    expect(pkg.dependencies ?? {}).toEqual({});
  });
});
