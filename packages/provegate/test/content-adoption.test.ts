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

  it('recommends `gate init --practices` as the install COMMAND, not as a mention', () => {
    // Substring presence passes on a page that only names the flag in prose
    // while still telling the reader to run plain `gate init`. The claim is
    // about the install block, so read the install block.
    const text = page();
    const fences = [...text.matchAll(/```sh\n([\s\S]*?)```/g)].map((m) => m[1]!);
    // PRD-038 converged the canonical region to plain `gate init` (the parity
    // rule with the package quickstart) and moved the practices install to its
    // own section — still a runnable COMMAND fence, which is this test's claim.
    const practices = fences.find((f) => f.includes('gate init --practices'));
    expect(practices, 'no shell fence runs gate init --practices').toBeDefined();
  });

  it('states exactly what the pack wires and what it leaves manual', () => {
    // An earlier version said the pack "does not wire itself", which an
    // independent round showed is false: `--practices` writes the Phase 7
    // validator into the manifest. Blanket claims in either direction are the
    // defect; the page must name the one thing it does wire.
    const text = page();
    expect(text).toMatch(/Phase 7[\s\S]{0,200}only\s+thing it wires/);
    expect(text.toLowerCase()).toMatch(/manual step/);
    expect(text).toContain('NEXT_STEPS.md');
    expect(text.toLowerCase()).not.toContain('does **not** do: wire itself');
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
    // PAIRED, not counted: four rungs and four stop-here paragraphs can both
    // be true while one rung carries two and another carries none.
    const text = page();
    const sections = text.split(/^## (?=Rung \d)/m).slice(1);
    expect(sections.length, 'expected four rungs').toBe(4);
    for (const section of sections) {
      const title = section.split('\n')[0]!;
      expect(section, `${title}: no stop-here paragraph`).toMatch(
        /\*\*Stop here and this stays unprotected/,
      );
    }
  });

  it('describes the two fresh-install manifests as the CODE writes them', () => {
    // An earlier draft said `gate init` writes an empty manifest and `gate run`
    // is therefore green having run nothing. An independent review showed both
    // halves wrong: the two install modes write DIFFERENT manifests, and the
    // built-in gates plus the PRD's §11 commands run either way.
    //
    // So the claim is asserted against the source that produces it. `init.ts`
    // is the only place the scaffolded manifest is written, and this reads the
    // literal out of it — a change there fails this test instead of quietly
    // making the page false.
    const init = readFileSync(
      join(pkgRoot, 'src/core/run/init.ts'),
      'utf8',
    );
    const line = init.split('\n').find((l) => l.includes("memory ? { phases:"));
    expect(line, 'init.ts no longer writes the manifest on one line').toBeDefined();
    expect(line).toContain("{ phases: { '7': [PACK_BRAIN_GATE] } }");
    expect(line).toContain("{ phases: { '4': [] }, postMerge: [] }");

    const text = page();
    // The practices manifest OMITS phases 4 → inherits the floor.
    expect(text).toMatch(/--practices` writes[\s\S]{0,200}absent[\s\S]{0,120}inherits/);
    // The plain manifest writes an EMPTY ARRAY → erases it.
    expect(text).toMatch(/empty array[\s\S]{0,40}erases/);
    // And it does not claim a run does nothing and passes.
    expect(text.toLowerCase()).not.toContain('honestly green');
    expect(text).toMatch(/not a blanket green/);
  });

  it('warns that copying a manifest over the practices one deletes a gate', () => {
    // Routine data loss with no error: the `--practices` manifest carries the
    // Phase 7 validator, and a cookbook copy replaces the file.
    expect(page()).toMatch(/merge keys rather than replacing|merge keys/i);
  });

  it('is registered in the docs nav', () => {
    const meta = JSON.parse(read('apps/docs/content/docs/meta.json')) as { pages: string[] };
    expect(meta.pages).toContain('brownfield');
  });
});

describe('the cookbook cross-links resolve (FR-6, FR-7)', () => {
  it('examples/README.md LINKS both cookbook entries and the targets resolve', () => {
    // Parse the Markdown link targets and resolve those, rather than finding a
    // path string and separately checking a path the test itself built — which
    // is two true facts that do not imply the link works.
    const text = readFileSync(join(pkgRoot, 'examples/README.md'), 'utf8');
    const targets = [...text.matchAll(/\]\(([^)]+)\)/g)].map((m) => m[1]!);
    for (const entry of ['manifests/single-package/README.md', 'manifests/monorepo/README.md']) {
      expect(targets, `${entry} is not a Markdown link target`).toContain(entry);
      expect(existsSync(join(pkgRoot, 'examples', entry)), entry).toBe(true);
      // …and the entry it points at ships the manifest it describes.
      expect(existsSync(join(pkgRoot, 'examples', entry.replace('README.md', 'gates.manifest.json')))).toBe(
        true,
      );
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
