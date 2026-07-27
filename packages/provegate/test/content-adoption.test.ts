import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * PRD-020 FR-7 — the adoption pages, asserted SEMANTICALLY.
 *
 * "the page contains `--practices`" is the assertion that lets docs rot: it
 * stays green while every sentence around the token becomes false. Each case
 * below pairs a claim the page makes with the second half that makes the claim
 * usable — the caveat, the guarantee, the failure mode — and fails if either
 * side goes missing.
 *
 * The pages live in `apps/docs`, outside this package. That is deliberate (the
 * assertion belongs with the suite that can run the parser) and it has a known
 * cost recorded in the task plan: a root `pnpm test` hashes only this package's
 * files, so a change to `apps/docs` alone can replay a cached green. The §11
 * row runs the package script directly and is the uncached authority.
 */

const repoRoot = fileURLToPath(new URL('../../..', import.meta.url));
const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
const read = (rel: string): string => readFileSync(join(repoRoot, rel), 'utf8');
const docs = (name: string): string => read(`apps/docs/content/docs/${name}`);

describe('quickstart presents the practices install honestly (FR-5, FR-7)', () => {
  const page = () => docs('quickstart.mdx');

  it('recommends `gate init --practices`', () => {
    expect(page()).toContain('gate init --practices');
  });

  it('and states that wiring stays manual, naming what prints it', () => {
    // The token alone is not the claim. An adopter who runs the recommended
    // command and expects a wired repo has been misled by a page that stopped
    // at the invocation.
    const text = page();
    expect(text.toLowerCase()).toMatch(/manual|does \*\*not\*\* do|wire itself/);
    expect(text).toContain('NEXT_STEPS.md');
  });
});

describe('cli.mdx documents the flag without dropping what was there (FR-5, FR-7)', () => {
  const page = () => docs('cli.mdx');

  it('documents --practices under gate init, with the never-overwrite guarantee', () => {
    const text = page();
    const start = text.indexOf('### `gate init');
    expect(start, 'gate init section missing').toBeGreaterThan(-1);
    const section = text.slice(start, text.indexOf('### `gate new'));
    expect(section).toContain('--practices');
    expect(section.toLowerCase()).toMatch(/never overwrit|nothing is ever overwritten/);
    // The pack creates files and wires nothing — the same caveat quickstart
    // carries, in the reference page an adopter reaches for later.
    expect(section.toLowerCase()).toMatch(/manual|creates files only/);
  });

  it('and PRD-019\'s memory commands are still there', () => {
    // This edit was additive. A rewrite that dropped a shipped section would
    // pass every assertion above and remove a documented command surface.
    const text = page();
    expect(text).toContain('gate doctor');
    expect(text).toContain('memory find');
  });
});

describe('brownfield.mdx is a ladder with named failure modes (FR-4, FR-7)', () => {
  const page = () => docs('brownfield.mdx');

  it('names all four rungs', () => {
    const text = page();
    for (const rung of [
      'verify:workflow',
      'gate init',
      'cookbook',
      'class defaults and hard caps',
    ]) {
      expect(text.toLowerCase(), rung).toContain(rung.toLowerCase());
    }
  });

  it('every rung says what stays unprotected if you stop there', () => {
    // The rung list without the stop-here consequences is a tutorial. With
    // them it is a decision aid, which is the whole point of the page.
    const text = page();
    const rungs = text.match(/^## Rung \d+/gm) ?? [];
    expect(rungs.length).toBe(4);
    const stops = text.match(/\*\*Stop here and (this stays unprotected|nothing stays)/g) ?? [];
    expect(stops.length).toBe(rungs.length);
  });

  it('states the empty-manifest warning explicitly, and why the green is worthless', () => {
    // The single most load-bearing sentence for a fresh install: `gate init`
    // writes an empty manifest, so `gate run` is green having run nothing.
    const text = page();
    expect(text).toMatch(/writes an? \*\*empty\*\* `gates\.manifest\.json`/);
    expect(text.toLowerCase()).toContain('worthless');
    // …and that an ABSENT manifest is the other case, or the warning teaches
    // the wrong rule.
    expect(text.toLowerCase()).toMatch(/absent manifest[\s\S]{0,120}floor/);
  });

  it('is registered in the docs nav', () => {
    const meta = JSON.parse(read('apps/docs/content/docs/meta.json')) as { pages: string[] };
    expect(meta.pages).toContain('brownfield');
  });
});

describe('the cookbook cross-links resolve (FR-6, FR-7)', () => {
  it('examples/README.md points at both cookbook entries and they exist', () => {
    const text = readFileSync(join(pkgRoot, 'examples/README.md'), 'utf8');
    for (const entry of ['manifests/single-package/', 'manifests/monorepo/']) {
      expect(text, entry).toContain(entry);
      // Resolve it, do not just find the string: a link to a directory that
      // was renamed reads exactly the same as one that works.
      expect(existsSync(join(pkgRoot, 'examples', entry, 'gates.manifest.json')), entry).toBe(true);
      expect(existsSync(join(pkgRoot, 'examples', entry, 'README.md')), entry).toBe(true);
    }
  });

  it('QUICKSTART.md points at the cookbook and it exists', () => {
    const text = readFileSync(join(pkgRoot, 'QUICKSTART.md'), 'utf8');
    expect(text).toContain('examples/manifests/');
    expect(existsSync(join(pkgRoot, 'examples/manifests'))).toBe(true);
  });

  it('brownfield.mdx links both entries by path', () => {
    const text = docs('brownfield.mdx');
    for (const entry of ['examples/manifests/single-package', 'examples/manifests/monorepo']) {
      expect(text, entry).toContain(entry);
      expect(existsSync(join(pkgRoot, entry)), entry).toBe(true);
    }
  });
});
