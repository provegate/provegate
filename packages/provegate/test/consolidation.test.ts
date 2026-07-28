import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { loadManifest } from '../src/core/gates/index.js';
import { sweepReviewArtifacts } from '../src/core/gates/review.js';
import { declaredArtifacts, durableDeclarationIssue } from '../src/core/run/durable.js';

// PRD-026: the consolidation's own proofs — the review sweep's selection and
// binding predicates, the declaration lint, the manifest-resolution rule, the
// documentation boundary with its vacuity control, and the class ledger's
// mutate-one-green-baseline fixtures.

const cfg = DEFAULT_CONFIG;
const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-consolidation-'));
  roots.push(root);
  return root;
}

// ————————————— FR-1: the review sweep —————————————

const VALID_REVIEW = (id: string): string =>
  [
    `# Independent Review: ${id} — fixture`,
    '',
    `> **PRD:** ${id}`,
    '> **Verdict:** pass',
    '> **Reviewer:** somebody else',
    '> **Base SHA:** 0123456789abcdef0123456789abcdef01234567',
    '> **Critical:** 0',
    '> **Quorum:** 1/1 pass',
    '',
  ].join('\n');

function reviewsRepo(files: Record<string, string>): string {
  const root = tempRoot();
  mkdirSync(resolve(root, cfg.dirs.reviewsDir), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(resolve(root, cfg.dirs.reviewsDir, name), content);
  }
  return root;
}

describe('sweepReviewArtifacts (FR-1: selection then binding)', () => {
  it('a valid record filed under the WRONG PRD name fails; the right name passes', () => {
    const wrong = reviewsRepo({ 'review-023-fixture.md': VALID_REVIEW('PRD-024') });
    expect(sweepReviewArtifacts(cfg, wrong)).toEqual([
      expect.objectContaining({
        file: 'review-023-fixture.md',
        issues: expect.arrayContaining([expect.stringContaining('does not match expected PRD-023')]),
      }),
    ]);
    // paired control on the same shape
    const right = reviewsRepo({ 'review-023-fixture.md': VALID_REVIEW('PRD-023') });
    expect(sweepReviewArtifacts(cfg, right)).toEqual([]);
  });

  it('a selected name yielding no identifier fails as unparseable, never skipped', () => {
    const root = reviewsRepo({
      'review-notes.md': VALID_REVIEW('PRD-001'),
      'review-abc-fix.md': VALID_REVIEW('PRD-001'),
    });
    const out = sweepReviewArtifacts(cfg, root);
    expect(out.map((e) => e.file).sort()).toEqual(['review-abc-fix.md', 'review-notes.md']);
    for (const entry of out) {
      expect(entry.issues[0]).toContain('yields no work-item identifier');
    }
  });

  it('a template-shaped file is not selected — even one carrying digits', () => {
    const root = reviewsRepo({
      'review-026-copy.template.md': 'not even markdown metadata',
      'review-artifact.template.md': 'the shipped template shape',
    });
    expect(sweepReviewArtifacts(cfg, root)).toEqual([]);
    // paired control: the same digits WITHOUT .template. are selected and bound
    const selected = reviewsRepo({ 'review-026-copy.md': VALID_REVIEW('PRD-026') });
    expect(sweepReviewArtifacts(cfg, selected)).toEqual([]);
  });

  it('a pass-with-criticals record fails across the whole directory (the scope)', () => {
    const bad = VALID_REVIEW('PRD-030').replace('**Critical:** 0', '**Critical:** 2');
    const root = reviewsRepo({
      'review-023-good.md': VALID_REVIEW('PRD-023'),
      'review-030-bad.md': bad,
    });
    const out = sweepReviewArtifacts(cfg, root);
    expect(out).toHaveLength(1);
    expect(out[0]!.file).toBe('review-030-bad.md');
  });

  it('the LIVE reviews directory validates end to end', () => {
    expect(sweepReviewArtifacts(cfg, repoRoot)).toEqual([]);
  });
});

// ————————————— FR-2: the declaration lint —————————————

describe('durableDeclarationIssue (FR-2)', () => {
  const doc = (section: string[]): string =>
    ['# PRD-999: fixture', '', '## Durable Artifacts', '', ...section, ''].join('\n');

  it('mixed real paths plus an explicit none passes', () => {
    expect(
      durableDeclarationIssue(
        doc([
          '- `_docs/reviews/review-999-x.md` — the review artifact',
          '- Learning: `_brain/learnings/x.md` — the fact',
          '- Decision: `none` — nothing decided here',
        ]),
      ),
    ).toBeNull();
  });

  it('absent section, empty section, and a bullet that is neither each fail', () => {
    expect(durableDeclarationIssue('# PRD-999\n\nno section\n')).toContain('section missing');
    expect(durableDeclarationIssue(doc([]))).toContain('section missing or empty');
    expect(durableDeclarationIssue(doc(['- just prose with no claim at all']))).toContain(
      'neither a `none` nor a path-bearing claim',
    );
  });

  it('placeholder bullets are tolerated until filled in — the retired script’s rule', () => {
    expect(
      durableDeclarationIssue(doc(['- `{{DOCS_ROOT}}/[page].md` — [what is learned] | `none`'])),
    ).toBeNull();
  });

  it('an asterisk value is excluded from claims, exactly as the retired script excluded it', () => {
    // The observable is the EXTRACTION, not the lint verdict: without the
    // exclusion the lint stays green here too (a glob would satisfy it as a
    // "path"), which made the first version of this fixture vacuous — the
    // mutation check caught the fixture, not the rule.
    expect(declaredArtifacts(doc(['- `_docs/*.md` — a glob is not a claim']))).toEqual([]);
    expect(durableDeclarationIssue(doc(['- `_docs/*.md` — a glob is not a claim']))).toBeNull();
    // control: the same bullet without the glob IS a claim
    expect(declaredArtifacts(doc(['- `_docs/real.md` — a claim']))).toEqual(['_docs/real.md']);
  });

  it('the LIVE wip corpus passes the declaration lint (measured before landing, held after)', () => {
    const wipDir = resolve(repoRoot, cfg.dirs.artifacts.prd.dir, cfg.dirs.stateRoles.wip);
    for (const name of readdirSync(wipDir)) {
      if (!name.endsWith('.md')) continue;
      const issue = durableDeclarationIssue(readFileSync(resolve(wipDir, name), 'utf8'));
      expect(issue, name).toBeNull();
    }
  });
});

// ————————————— FR-4: every manifest command resolves —————————————

describe('manifest resolution after the consolidation (FR-4)', () => {
  it('every manifest command naming a package script resolves, and none names a deleted one', () => {
    const manifest = loadManifest(cfg, repoRoot);
    const scripts = (
      JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf8')) as {
        scripts: Record<string, string>;
      }
    ).scripts;
    const commands = [
      ...Object.values(manifest.phases).flat(),
      ...manifest.postMerge,
    ] as string[];
    for (const cmd of commands) {
      const m = /^pnpm\s+([\w:@/.-]+)$/.exec(cmd.trim());
      if (m === null) continue; // not a bare package-manager invocation
      expect(scripts[m[1]!], cmd).toBeDefined();
    }
    for (const gone of ['verify:review-artifact', 'verify:durable-artifacts', 'verify:gates-wired']) {
      expect(scripts[gone]).toBeUndefined();
      expect(commands.some((c) => c.includes(gone))).toBe(false);
    }
  });
});

// ————————————— FR-6: the documentation boundary —————————————

const DELETED_NAMES = [
  'verify:review-artifact',
  'verify:durable-artifacts',
  'verify:gates-wired',
  'verify-review-artifact.mjs',
  'verify-durable-artifacts.mjs',
  'verify-gates-wired.mjs',
];

/** The enumerated exclusions, exactly as FR-6 states them. */
function excluded(rel: string): boolean {
  if (rel.includes('source-snapshot/')) return true;
  if (/^_prds\/(wip|completed|deferred)\//.test(rel)) return true;
  if (/^_readiness\//.test(rel) || /^_tasks\//.test(rel)) return true;
  if (/^_docs\/(reviews|completed|wip|retros)\//.test(rel)) return true;
  if (/^_brain\//.test(rel)) return true;
  if (/^\.changeset\//.test(rel)) return true;
  if (/^node_modules\//.test(rel) || rel.includes('/node_modules/')) return true;
  if (/^\.worktrees\//.test(rel)) return true;
  return false;
}

function liveMarkdown(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name.startsWith('.git')) continue;
      const childRel = rel === '' ? name.name : `${rel}/${name.name}`;
      if (name.isDirectory()) {
        if (!excluded(`${childRel}/`)) walk(join(dir, name.name), childRel);
        continue;
      }
      if (!name.name.endsWith('.md')) continue;
      if (excluded(childRel)) continue;
      out.push(childRel);
    }
  };
  walk(root, '');
  return out;
}

/** STATUS.md's live text: everything above `## Recent activity` (the historical
 * log), with the Deferrals table's NOTE column stripped per row — the Note cell
 * quotes history by the board's own rule, while Topic/Item/Owner are live. */
function statusLiveText(content: string): string {
  const live = content.split('## Recent activity')[0] ?? content;
  return live
    .split('\n')
    .map((line) => {
      if (!/^\|/.test(line)) return line;
      const cells = line.split('|');
      return cells.length > 2 ? cells.slice(0, -2).join('|') : line; // drop the last (Note) cell
    })
    .join('\n');
}

describe('no live document names a deleted check (FR-6)', () => {
  it('the real repository tree is clean under the enumerated boundary', () => {
    for (const rel of liveMarkdown(repoRoot)) {
      const raw = readFileSync(resolve(repoRoot, rel), 'utf8');
      const text = rel === 'STATUS.md' ? statusLiveText(raw) : raw;
      for (const name of DELETED_NAMES) {
        expect(text.includes(name), `${rel} still names ${name}`).toBe(false);
      }
    }
  });

  it('vacuity control: a planted live-shaped mention inside the scan set is refused', () => {
    const root = tempRoot();
    mkdirSync(resolve(root, 'docs'), { recursive: true });
    writeFileSync(resolve(root, 'docs/guide.md'), 'run `pnpm verify:gates-wired` weekly\n');
    const hits = liveMarkdown(root).filter((rel) =>
      DELETED_NAMES.some((n) => readFileSync(resolve(root, rel), 'utf8').includes(n)),
    );
    expect(hits).toEqual(['docs/guide.md']);
  });

  it('the exclusions do not swallow the board’s live sections', () => {
    const status = readFileSync(resolve(repoRoot, 'STATUS.md'), 'utf8');
    const live = statusLiveText(status);
    expect(live).toContain('## Active Agents'); // the live part survives the boundary
    expect(live).toContain('## Deferrals'); // the table's live columns stay scannable
    expect(liveMarkdown(repoRoot)).toContain('STATUS.md');
  });

  it('vacuity, board edition: a deleted-check instruction in a live Deferrals cell is seen', () => {
    const planted = [
      '# Status',
      '## Deferrals',
      '| Topic | Item | Owner | Due | Renewals | Note |',
      '| --- | --- | --- | --- | --- | --- |',
      '| fix wiring | run `pnpm verify:gates-wired` weekly | owner | 2026-09-01 | 0 | historical quote of `verify:gates-wired` is fine |',
      '## Recent activity',
      '- old entry naming verify:gates-wired stays invisible',
    ].join('\n');
    const live = statusLiveText(planted);
    // the live Item cell is scanned…
    expect(live).toContain('run `pnpm verify:gates-wired` weekly');
    // …while the Note column and Recent activity are not
    expect(live).not.toContain('historical quote');
    expect(live).not.toContain('old entry');
  });
});

// ————————————— FR-8: the class ledger, mutate-one-green-baseline —————————————

const LEDGER_SCRIPT = resolve(repoRoot, 'scripts/verify/verify-script-classes.mjs');

interface LedgerEntry {
  class: string;
  owner?: string;
  reviewBy?: string;
  supersededBy?: string;
}

function ledgerRepo(
  ledger: Record<string, LedgerEntry>,
  adrRows: [string, string][],
  onDisk: string[],
): string {
  const root = tempRoot();
  mkdirSync(resolve(root, 'scripts/verify'), { recursive: true });
  mkdirSync(resolve(root, '_brain/adr'), { recursive: true });
  writeFileSync(resolve(root, 'scripts/verify/script-classes.json'), JSON.stringify(ledger));
  for (const f of onDisk) writeFileSync(resolve(root, 'scripts/verify', f), '// fixture');
  const table = ['| Script | Class |', '| --- | --- |', ...adrRows.map(([s, c]) => `| ${s} | ${c} |`)];
  writeFileSync(
    resolve(root, '_brain/adr/ADR-0004-method-rule-vs-repo-rule.md'),
    ['# ADR-0004', '', '## Classification', '', ...table, ''].join('\n'),
  );
  return root;
}

function runLedger(root: string): { status: number; output: string } {
  try {
    const output = execFileSync(process.execPath, [LEDGER_SCRIPT, root], { encoding: 'utf8' });
    return { status: 0, output };
  } catch (error) {
    const e = error as { status?: number; stdout?: string; stderr?: string };
    return { status: e.status ?? 1, output: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
}

const GREEN: [Record<string, LedgerEntry>, [string, string][], string[]] = [
  {
    'verify-a.mjs': { class: 'repo' },
    'verify-b.mjs': { class: 'method-pending', owner: 'owner', reviewBy: '2099-01-01' },
  },
  [
    ['verify-a.mjs', 'repo'],
    ['verify-b.mjs', 'method-pending'],
  ],
  ['verify-a.mjs', 'verify-b.mjs'],
];

describe('verify:script-classes (FR-8) — every deny mutates one green baseline', () => {
  it('the green baseline passes', () => {
    const { status, output } = runLedger(ledgerRepo(...GREEN));
    expect(output).toContain('PASS');
    expect(status).toBe(0);
  });

  it('an unclassified on-disk script fails by name', () => {
    const [ledger, adr, disk] = GREEN;
    const { output } = runLedger(ledgerRepo(ledger, adr, [...disk, 'verify-orphan.mjs']));
    expect(output).toContain('verify-orphan.mjs: unclassified');
  });

  it('a stale entry (script gone) fails by name', () => {
    const [ledger, adr] = GREEN;
    const { output } = runLedger(ledgerRepo(ledger, adr, ['verify-a.mjs'])); // b gone
    expect(output).toContain('verify-b.mjs: ledger entry is stale');
  });

  it('an expired method-pending fails on its date', () => {
    const [, adr, disk] = GREEN;
    const expired = {
      'verify-a.mjs': { class: 'repo' },
      'verify-b.mjs': { class: 'method-pending', owner: 'owner', reviewBy: '2020-01-01' },
    };
    const { output } = runLedger(ledgerRepo(expired, adr, disk));
    expect(output).toContain('expired on 2020-01-01');
  });

  it('a pending entry missing owner or date fails on the missing field', () => {
    const [, adr, disk] = GREEN;
    const malformed = {
      'verify-a.mjs': { class: 'repo' },
      'verify-b.mjs': { class: 'method-pending' },
    };
    const { output } = runLedger(ledgerRepo(malformed, adr, disk));
    expect(output).toContain('requires an owner');
    expect(output).toContain('requires reviewBy');
  });

  it('a method-class script that still exists fails — the state a new duplicate lands in', () => {
    const [, , disk] = GREEN;
    const ledger = {
      'verify-a.mjs': { class: 'method', supersededBy: 'gate check --a' },
      'verify-b.mjs': { class: 'method-pending', owner: 'owner', reviewBy: '2099-01-01' },
    };
    const adr: [string, string][] = [
      ['verify-a.mjs', 'method'],
      ['verify-b.mjs', 'method-pending'],
    ];
    const { output } = runLedger(ledgerRepo(ledger, adr, disk));
    expect(output).toContain('method-class script still exists');
  });

  it('a method row whose script is GONE is stale — method is never a resting place', () => {
    const [, , ] = GREEN;
    const ledger = {
      'verify-a.mjs': { class: 'repo' },
      'verify-gone.mjs': { class: 'method', supersededBy: 'gate check --gone' },
    };
    const adr: [string, string][] = [
      ['verify-a.mjs', 'repo'],
      ['verify-gone.mjs', 'method'],
    ];
    const { output } = runLedger(ledgerRepo(ledger, adr, ['verify-a.mjs']));
    expect(output).toContain('verify-gone.mjs: ledger entry is stale');
  });

  it('a calendar-invalid reviewBy fails even when the shape matches', () => {
    const [, adr, disk] = GREEN;
    const bad = {
      'verify-a.mjs': { class: 'repo' },
      'verify-b.mjs': { class: 'method-pending', owner: 'owner', reviewBy: '2099-99-99' },
    };
    const { output } = runLedger(ledgerRepo(bad, adr, disk));
    expect(output).toContain('a real YYYY-MM-DD date');
  });

  it('a script classified twice in the ADR table is contradictory, not last-wins', () => {
    const [ledger, , disk] = GREEN;
    const dup: [string, string][] = [
      ['verify-a.mjs', 'method-pending'],
      ['verify-a.mjs', 'repo'],
      ['verify-b.mjs', 'method-pending'],
    ];
    const { output } = runLedger(ledgerRepo(ledger, dup, disk));
    expect(output).toContain('verify-a.mjs classified twice');
  });

  it('table-versus-ledger disagreement fails in both directions', () => {
    const [ledger, , disk] = GREEN;
    const disagree: [string, string][] = [
      ['verify-a.mjs', 'method-pending'], // class mismatch
      ['verify-b.mjs', 'method-pending'],
    ];
    const { output } = runLedger(ledgerRepo(ledger, disagree, disk));
    expect(output).toContain('ledger says repo, ADR-0004 says method-pending');

    const missingRow: [string, string][] = [['verify-a.mjs', 'repo']];
    const { output: out2 } = runLedger(ledgerRepo(ledger, missingRow, disk));
    expect(out2).toContain("the ledger lists verify-b.mjs; ADR-0004's table does not");
  });

  it('the LIVE repository pair passes and lists the trio in neither store', () => {
    const { status, output } = runLedger(repoRoot);
    expect(output).toContain('PASS');
    expect(status).toBe(0);
    const ledger = readFileSync(resolve(repoRoot, 'scripts/verify/script-classes.json'), 'utf8');
    const adr = readFileSync(
      resolve(repoRoot, '_brain/adr/ADR-0004-method-rule-vs-repo-rule.md'),
      'utf8',
    );
    // The ADR's PROSE names the trio once, deliberately — the born-agreeing
    // note explaining why they are unlisted. The stores are the ledger and the
    // Classification TABLE, so the assertion reads table rows, not prose.
    const tableRows = adr
      .split('\n')
      .filter((l) => /^\|/.test(l))
      .join('\n');
    for (const gone of ['verify-review-artifact', 'verify-durable-artifacts', 'verify-gates-wired']) {
      expect(ledger.includes(gone)).toBe(false);
      expect(tableRows.includes(gone)).toBe(false);
    }
  });
});
