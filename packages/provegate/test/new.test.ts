import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { createPrd, initWorkspace, instantiateTemplate } from '../src/core/run/index.js';
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
    expect(() => createPrd(cfg, root, { slug: 'no-class', templatePath: join(root, 'no-class.md') })).toThrow(
      /anchor not found/,
    );
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
