import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { validateReviewArtifact } from '../src/core/gates/review.js';
import {
  createCompanion,
  createPrd,
  initWorkspace,
  instantiateTemplate,
  unresolvedTokens,
} from '../src/core/run/index.js';
import { buildState } from '../src/core/state/build.js';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const shippedTemplate = fileURLToPath(new URL('../templates/prd-template.md', import.meta.url));
const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function tempRoot(scaffold = true): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-new-'));
  roots.push(root);
  if (scaffold) initWorkspace(cfg, root);
  return root;
}

describe('createPrd (FR-1)', () => {
  it('allocates PRD-001 in an empty tree and the file parses in state build', () => {
    const root = tempRoot();
    const result = createPrd(cfg, root, { slug: 'first-item' });
    expect(result.id).toBe('PRD-001');
    expect(result.relPath).toBe('_prds/wip/prd-001-first-item.md');
    expect(existsSync(result.path)).toBe(true);
    const state = buildState(cfg, root);
    expect(state.records.map((r) => r.prd)).toContain('PRD-001');
  });

  it('never reuses ids from completed/deferred states (max across ALL states + 1)', () => {
    const root = tempRoot();
    writeFileSync(join(root, '_prds/completed/prd-007-done.md'), '# PRD-007: Done\n');
    writeFileSync(join(root, '_prds/deferred/prd-003-later.md'), '# PRD-003: Later\n');
    const result = createPrd(cfg, root, { slug: 'next-one' });
    expect(result.id).toBe('PRD-008');
  });

  it('substitutes ID, dates, slug, and class against the SHIPPED template (W4)', () => {
    const root = tempRoot();
    const now = new Date('2026-07-23T10:00:00Z');
    const result = createPrd(cfg, root, { slug: 'my-fix', cls: 'hotfix', now });
    const content = readFileSync(result.path, 'utf8');
    expect(content).toMatch(/^# PRD-001: /m);
    expect(content).toContain('> **Created**: 2026-07-23');
    expect(content).toContain('> **Updated**: 2026-07-23');
    expect(content).toContain('> **Slug**: `my-fix`');
    expect(content).toContain('> **PRD Class**: hotfix');
    expect(content).toContain('> **Status**: Draft');
    expect(content).not.toContain('{{ID_PREFIX}}');
    expect(content).not.toContain('[YYYY-MM-DD]');
  });

  it('a drifted template (missing anchor) fails loudly, never silently skips (W4)', () => {
    const root = tempRoot();
    const drifted = readFileSync(shippedTemplate, 'utf8').replace(
      '> **Slug**: `[short-name]`',
      '> Slug missing now',
    );
    const driftedPath = join(root, 'drifted-template.md');
    writeFileSync(driftedPath, drifted);
    expect(() => createPrd(cfg, root, { slug: 'x-item', templatePath: driftedPath })).toThrow(
      /anchor not found/,
    );
    expect(existsSync(join(root, '_prds/wip/prd-001-x-item.md'))).toBe(false);
  });

  it('never overwrites: an exact-path rival in the race window survives; we take the next id', () => {
    const root = tempRoot();
    // Rival wins the EXACT path (same id, same slug) inside the race window:
    // wx throws EEXIST, the rival's bytes survive untouched, we retry to 002.
    let planted = false;
    const result = createPrd(cfg, root, {
      slug: 'dupe',
      raceWindow: (attempt) => {
        if (!planted) {
          planted = true;
          writeFileSync(attempt, 'rival bytes\n');
        }
      },
    });
    expect(readFileSync(join(root, '_prds/wip/prd-001-dupe.md'), 'utf8')).toBe('rival bytes\n');
    expect(result.id).toBe('PRD-002');
    expect(result.retries).toBe(1);
  });

  it('rejects bad slugs and unknown classes', () => {
    const root = tempRoot();
    for (const slug of ['Bad_Slug', 'UPPER', 'with space', '-lead', 'trail-', 'ünïcode']) {
      expect(() => createPrd(cfg, root, { slug }), slug).toThrow(/invalid slug/);
    }
    expect(() => createPrd(cfg, root, { slug: 'ok-slug', cls: 'not-a-class' })).toThrow(
      /unknown class/,
    );
  });

  it('id-allocation race: duplicate number is withdrawn and retried (W1)', () => {
    const root = tempRoot();
    // Plant the rival INSIDE the race window (after our write, before the
    // re-scan) via the test-only hook: first attempt lands prd-001-mine, the
    // rival prd-001-rival appears, our file is withdrawn, retry lands PRD-002.
    let planted = false;
    const result = createPrd(cfg, root, {
      slug: 'mine',
      raceWindow: () => {
        if (!planted) {
          planted = true;
          writeFileSync(join(root, '_prds/wip/prd-001-rival.md'), '# PRD-001: Rival\n');
        }
      },
    });
    expect(result.id).toBe('PRD-002');
    expect(result.retries).toBe(1);
    expect(existsSync(join(root, '_prds/wip/prd-001-mine.md'))).toBe(false);
    expect(existsSync(join(root, '_prds/wip/prd-002-mine.md'))).toBe(true);
  });

  it('id-allocation race storm: gives up loudly after bounded retries (W1)', () => {
    const root = tempRoot();
    let n = 0;
    expect(() =>
      createPrd(cfg, root, {
        slug: 'stormy',
        raceWindow: () => {
          n += 1;
          const padded = String(n).padStart(3, '0');
          writeFileSync(join(root, `_prds/wip/prd-${padded}-rival.md`), `# PRD-${padded}: R\n`);
        },
      }),
    ).toThrow(/raced 3 times/);
  });

  it('same slug twice refuses (§6) — even with a free id', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'once-only' });
    expect(() => createPrd(cfg, root, { slug: 'once-only' })).toThrow(/already used by PRD-001/);
  });

  it('destination is role-keyed: a config whose wip state is not states[0] still lands in wip', () => {
    const root = tempRoot();
    const rotated = {
      ...cfg,
      dirs: {
        ...cfg.dirs,
        states: ['completed', 'wip', 'deferred'],
        stateRoles: { wip: 'wip', completed: 'completed', deferred: 'deferred' },
      },
    };
    const result = createPrd(rotated, root, { slug: 'role-keyed' });
    expect(result.relPath).toBe('_prds/wip/prd-001-role-keyed.md');
  });

  it('config templates.prd override resolves (contained) and drift in it still fails loud', () => {
    const root = tempRoot();
    const forked = readFileSync(shippedTemplate, 'utf8').replace(
      '[Feature Name]',
      '[Forked Feature]',
    );
    writeFileSync(join(root, 'my-template.md'), forked);
    const withTemplate = { ...cfg, templates: { prd: 'my-template.md' } };
    const result = createPrd(withTemplate, root, { slug: 'forked' });
    expect(readFileSync(result.path, 'utf8')).toContain('[Forked Feature]');
    const escaping = { ...cfg, templates: { prd: '../outside.md' } };
    expect(() => createPrd(escaping, root, { slug: 'escapee' })).toThrow(/escap/);
  });

  it('a template missing its class line fails even without --class (anchors always validated)', () => {
    const root = tempRoot();
    const drifted = readFileSync(shippedTemplate, 'utf8').replace(
      '> **PRD Class**: feature',
      '> classless now',
    );
    writeFileSync(join(root, 'no-class.md'), drifted);
    expect(() =>
      createPrd(cfg, root, { slug: 'no-class', templatePath: join(root, 'no-class.md') }),
    ).toThrow(/anchor not found/);
  });

  it('only supported date sites are substituted; the changelog row is one of them', () => {
    const root = tempRoot();
    const result = createPrd(cfg, root, { slug: 'dated', now: new Date('2026-07-23T09:00:00Z') });
    const content = readFileSync(result.path, 'utf8');
    expect(content).toContain('| 2026-07-23 | [role] | Initial draft |');
    expect(content).not.toContain('[YYYY-MM-DD]');
  });

  it('uninitialized repo: parents created, init pointer signaled (W2)', () => {
    const root = tempRoot(false);
    const result = createPrd(cfg, root, { slug: 'cold-start' });
    expect(result.createdParents).toBe(true);
    expect(existsSync(join(root, '_prds/wip/prd-001-cold-start.md'))).toBe(true);
  });
});

describe('codex review regressions (r8)', () => {
  it('a configured prefix with regex metacharacters still allocates sequential ids', () => {
    const root = tempRoot();
    const plused = {
      ...cfg,
      dirs: {
        ...cfg.dirs,
        artifacts: { ...cfg.dirs.artifacts, prd: { dir: '_prds', prefix: 'prd+' } },
      },
    };
    // Pre-fix, `prd+` compiled as a PATTERN (`prd`, one-or-more `d`): the id
    // scan never matched its own files, so both creates allocated PRD-001.
    const first = createPrd(plused, root, { slug: 'metachar-one' });
    const second = createPrd(plused, root, { slug: 'metachar-two' });
    expect(first.relPath).toBe('_prds/wip/prd+-001-metachar-one.md');
    expect(first.id).toBe('PRD-001');
    expect(second.id).toBe('PRD-002');
    // The slug-uniqueness scan must see literal-prefix files too.
    expect(() => createPrd(plused, root, { slug: 'metachar-one' })).toThrow(/already used/);
  });

  it('omitted class defaults to the FIRST configured class, not the template literal', () => {
    const root = tempRoot();
    const rotated = { ...cfg, classes: ['test-hardening', 'feature'] };
    const result = createPrd(rotated, root, { slug: 'classy' });
    expect(readFileSync(result.path, 'utf8')).toContain('> **PRD Class**: test-hardening');
  });
});

describe('instantiateTemplate anchors track the shipped template (W4)', () => {
  it('every anchor createPrd substitutes exists in the template as shipped', () => {
    const template = readFileSync(shippedTemplate, 'utf8');
    const out = instantiateTemplate(
      cfg,
      template,
      'PRD-042',
      'anchor-proof',
      'infra',
      new Date('2026-07-23T00:00:00Z'),
    );
    expect(out).toContain('# PRD-042: ');
    expect(out).toContain('> **PRD Class**: infra');
  });
});

describe('gate new (live CLI)', () => {
  it('creates, reports, and points at gate check; rejects missing slug', async () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-new-cli-'));
    roots.push(root);
    await run(process.execPath, [cliPath, 'init'], { cwd: root });
    const created = await run(process.execPath, [cliPath, 'new', 'cli-item', '--class=hotfix'], {
      cwd: root,
    });
    expect(created.stdout).toContain('prd-001-cli-item.md');
    expect(created.stdout).toContain('gate check PRD-001');
    await expect(run(process.execPath, [cliPath, 'new'], { cwd: root })).rejects.toMatchObject({
      code: 1,
    });
  });
});

/* ------------------------------------------------------------------ *
 * PRD-042 — the adopter's first hour.
 * ------------------------------------------------------------------ */

describe('gate new argument grammar (PRD-042 FR-1)', () => {
  const cli = (root: string, args: string[]) =>
    run('node', [cliPath, 'new', ...args], { cwd: root }).catch((e: unknown) => e as {
      code: number;
      stdout: string;
      stderr: string;
    });

  it('--tasks with --review refuses', async () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'item' });
    const r = (await cli(root, ['--tasks', '--review', 'PRD-001'])) as { stderr: string };
    expect(r.stderr).toContain('separate artifacts');
  });

  it('a positional argument beside --tasks refuses', async () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'item' });
    const r = (await cli(root, ['a-slug', '--tasks', 'PRD-001'])) as { stderr: string };
    expect(r.stderr).toContain('takes exactly one id');
    expect(r.stderr).toContain('"a-slug"');
  });

  it('--class beside --review refuses', async () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'item' });
    const r = (await cli(root, ['--review', 'PRD-001', '--class=hotfix'])) as { stderr: string };
    expect(r.stderr).toContain('belong to the PRD production');
  });

  it('a repeated --tasks refuses', async () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'item' });
    const r = (await cli(root, ['--tasks', 'PRD-001', '--tasks', 'PRD-001'])) as { stderr: string };
    expect(r.stderr).toContain('given twice');
  });

  it('--tasks without an id refuses', async () => {
    const root = tempRoot();
    const r = (await cli(root, ['--tasks'])) as { stderr: string };
    expect(r.stderr).toContain('needs an id');
  });

  it('a bare gate new refuses', async () => {
    const root = tempRoot();
    const r = (await cli(root, [])) as { stderr: string };
    expect(r.stderr).toContain('usage: gate new');
  });

  it('an id with no wip PRD refuses', async () => {
    const root = tempRoot();
    const r = (await cli(root, ['--tasks', 'PRD-404'])) as { stderr: string };
    expect(r.stderr).toContain('no work item PRD-404');
  });

  it('an ambiguous id names both candidates', async () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'first' });
    // A second file with the SAME number and a different slug — the shape a
    // hand-copied artifact leaves behind.
    writeFileSync(join(root, '_prds/wip/prd-001-second.md'), '# PRD-001: second\n');
    const r = (await cli(root, ['--tasks', 'PRD-001'])) as { stderr: string };
    expect(r.stderr).toContain('matches 2 files');
    expect(r.stderr).toContain('prd-001-second.md');
  });
});

describe('companion artifacts (PRD-042 FR-1)', () => {
  it('writes the tasks artifact at the configured path and refuses to overwrite', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'card-truncation' });
    const first = createCompanion(cfg, root, 'tasks', 'PRD-001');
    expect(first.relPath).toBe('_tasks/wip/tasks-001-card-truncation.md');
    const bytes = readFileSync(first.path, 'utf8');
    expect(() => createCompanion(cfg, root, 'tasks', 'PRD-001')).toThrow(/already exists/);
    expect(readFileSync(first.path, 'utf8')).toBe(bytes);
  });

  it('writes the review artifact and leaves Base SHA and Quorum for the reviewer', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'card-truncation' });
    const result = createCompanion(cfg, root, 'review', 'PRD-001');
    expect(result.relPath).toBe('_docs/reviews/review-001-card-truncation.md');
    const text = readFileSync(result.path, 'utf8');
    expect(text).toContain('> **PRD:** PRD-001');
    // Every reviewer-owned field is BLANK: a pre-filled SHA claims a diff
    // nobody read, and a supplied quorum is a panel nobody convened. Phase-6
    // round 1 showed the template's own placeholders SATISFY the review gate,
    // so leaving them was worse than leaving nothing.
    expect(text).toContain('> **Base SHA:**\n');
    expect(text).toContain('> **Quorum:**\n');
  });

  it('takes identity from the artifact basename, not the heading', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'real-slug' });
    const prdPath = join(root, '_prds/wip/prd-001-real-slug.md');
    writeFileSync(
      prdPath,
      readFileSync(prdPath, 'utf8').replace(/^# PRD-001: .*$/m, '# PRD-001: an edited heading'),
    );
    expect(createCompanion(cfg, root, 'tasks', 'PRD-001').relPath).toBe(
      '_tasks/wip/tasks-001-real-slug.md',
    );
  });

  it('does not resolve ids from the completed state', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'shipped-item' });
    const from = join(root, '_prds/wip/prd-001-shipped-item.md');
    writeFileSync(join(root, '_prds/completed/prd-001-shipped-item.md'), readFileSync(from));
    rmSync(from);
    expect(() => createCompanion(cfg, root, 'tasks', 'PRD-001')).toThrow(/work in flight/);
  });
});

describe('configured token pass (PRD-042 FR-2)', () => {
  it('substitutes every token whose source is non-empty', () => {
    const root = tempRoot();
    const text = readFileSync(createPrd(cfg, root, { slug: 'tokens' }).path, 'utf8');
    for (const token of ['{{CMD_CHECK_TYPES}}', '{{CMD_LINT}}', '{{CMD_TEST}}', '{{CMD_BUILD}}']) {
      expect(text).not.toContain(token);
    }
    expect(text).toContain(cfg.commands.checkTypes);
  });

  it('keeps a token whose configured source is empty, and reports it', () => {
    const root = tempRoot();
    const config = { ...cfg, commands: { ...cfg.commands, lint: '' } };
    const result = createPrd(config, root, { slug: 'empty-source' });
    const text = readFileSync(result.path, 'utf8');
    expect(text).toContain('{{CMD_LINT}}');
    expect(result.unresolved).toContain('{{CMD_LINT}}');
  });

  it('reports unresolved tokens sorted and deduplicated', () => {
    expect(unresolvedTokens('{{B_TOKEN}} {{A_TOKEN}} {{B_TOKEN}}')).toEqual([
      '{{A_TOKEN}}',
      '{{B_TOKEN}}',
    ]);
  });

  it('leaves the anchored substitutions alone (the pass is additive)', () => {
    const root = tempRoot();
    const text = readFileSync(createPrd(cfg, root, { slug: 'anchors' }).path, 'utf8');
    expect(text).toContain('# PRD-001: ');
    expect(text).not.toContain('{{ID_PREFIX}}');
  });
});

describe('memory sections (PRD-042 FR-3)', () => {
  it('omits both sections when the contract is off — the template HAS them', () => {
    const root = tempRoot();
    expect(readFileSync(shippedTemplate, 'utf8')).toContain('## Memory Inputs');
    const text = readFileSync(createPrd(cfg, root, { slug: 'memory-off' }).path, 'utf8');
    expect(cfg.memory.enabled).toBe(false);
    expect(text).not.toContain('## Memory Inputs');
    expect(text).not.toContain('## Memory Outputs');
    // The sections around them survive intact.
    expect(text).toContain('## Conflict Surface');
    expect(text).toContain('## 10. References');
  });

  it('keeps both sections when the contract is on', () => {
    const root = tempRoot();
    const config = { ...cfg, memory: { ...cfg.memory, enabled: true } };
    const text = readFileSync(createPrd(config, root, { slug: 'memory-on' }).path, 'utf8');
    expect(text).toContain('## Memory Inputs');
    expect(text).toContain('## Memory Outputs');
  });
});

describe('rendered templates (PRD-042 FR-5)', () => {
  const rendered = (prefix: string) =>
    readFileSync(shippedTemplate, 'utf8').replaceAll('{{ID_PREFIX}}', prefix);

  it('instantiates a template whose ID_PREFIX token is already rendered', () => {
    const root = tempRoot();
    const path = join(root, 'rendered.md');
    writeFileSync(path, rendered(cfg.idPattern.prefix));
    const result = createPrd(cfg, root, { slug: 'rendered', templatePath: path });
    expect(readFileSync(result.path, 'utf8')).toContain('# PRD-001: ');
  });

  it('refuses a template rendered with a FOREIGN prefix', () => {
    const root = tempRoot();
    const path = join(root, 'foreign.md');
    writeFileSync(path, rendered('RFC'));
    expect(() => createPrd(cfg, root, { slug: 'foreign', templatePath: path })).toThrow(
      /template anchor not found/,
    );
  });

  it('refuses a malformed id heading', () => {
    const root = tempRoot();
    const path = join(root, 'malformed.md');
    writeFileSync(path, rendered(cfg.idPattern.prefix).replace('# PRD-XXX: ', '## PRD-XXX: '));
    expect(() => createPrd(cfg, root, { slug: 'malformed', templatePath: path })).toThrow(
      /template anchor not found/,
    );
  });

  it('refuses a template with no id anchor at all', () => {
    const root = tempRoot();
    const path = join(root, 'absent.md');
    writeFileSync(path, rendered(cfg.idPattern.prefix).replace(/^# PRD-XXX: .*$/m, '# Untitled'));
    expect(() => createPrd(cfg, root, { slug: 'absent', templatePath: path })).toThrow(
      /template anchor not found/,
    );
  });

  it('substitutes only the FIRST of two competing anchors and leaves the second visible', () => {
    // Two id anchors is drift the author must resolve: the instantiated file
    // keeps the second, so `gate check` and any reader see it immediately
    // rather than the tool silently picking one.
    const root = tempRoot();
    const path = join(root, 'competing.md');
    const base = rendered(cfg.idPattern.prefix);
    writeFileSync(path, base.replace('# PRD-XXX: ', '# PRD-XXX: \n\n# PRD-XXX: '));
    const result = createPrd(cfg, root, { slug: 'competing', templatePath: path });
    expect(readFileSync(result.path, 'utf8')).toContain('# PRD-XXX: ');
  });
});

describe('the token pass leaves author placeholders whole (PRD-042 FR-2)', () => {
  it('does not resolve a token on a line that still carries a [placeholder]', () => {
    const root = tempRoot();
    const text = readFileSync(createPrd(cfg, root, { slug: 'placeholders' }).path, 'utf8');
    // Durable Artifacts ships as `{{DOCS_ROOT}}/[page].md`. Resolving only the
    // token would produce `_docs/[page].md`, which the Phase-7 gate reads as a
    // DECLARED path and then demands. Measured: the executable quickstart
    // stopped at Phase 7 for exactly this before the rule existed.
    expect(text).not.toContain('_docs/[page].md');
    expect(text).not.toContain('_brain/learnings/[slug].md');
    expect(text).toContain('{{DOCS_ROOT}}/[page].md');
  });

  it('still resolves the same token on a line with no placeholder', () => {
    const root = tempRoot();
    const config = { ...cfg, memory: { ...cfg.memory, enabled: true } };
    const text = readFileSync(createPrd(config, root, { slug: 'mixed-lines' }).path, 'utf8');
    // The §11 floor bullets carry no `[placeholder]`, so they resolve.
    expect(text).toContain(`- \`${cfg.commands.build}\` — clean build`);
  });
});

describe('an instantiated review artifact cannot satisfy the gate (PRD-042, phase-6 round 1)', () => {
  it('flipping only the Verdict to pass is still refused', () => {
    const root = tempRoot();
    createPrd(cfg, root, { slug: 'review-shape' });
    const created = createCompanion(cfg, root, 'review', 'PRD-001');
    const text = readFileSync(created.path, 'utf8');
    // Every reviewer-owned field is blank; only identity is filled.
    for (const field of ['Verdict', 'Reviewer', 'Base SHA', 'Critical', 'High', 'Medium', 'Quorum']) {
      expect(text).toContain(`> **${field}:**\n`);
    }
    // The gate must refuse the artifact even after the one edit an author is
    // most tempted to make.
    const flipped = text.replace('> **Verdict:**', '> **Verdict:** pass');
    const report = validateReviewArtifact(flipped);
    expect(report.ok).toBe(false);
    expect(report.issues.join(' ')).toMatch(/Base SHA|Reviewer|Critical|Quorum/);
  });
});
