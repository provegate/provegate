import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * PRD-021 FR-12 / W9 — ONE semantic assertion over ONE entry.
 *
 * The obvious shape is two recursive greps: one for a `provegate` minor
 * front-matter line, one for the compatibility sentence. That passes on a
 * checkout carrying an unrelated minor changeset plus an unrelated note — two
 * true facts about two different files, and the entry this work item owes is
 * missing. W9 stayed open for four readiness iterations on exactly that.
 *
 * `pnpm changeset status` is not evidence either: it exits 0 on a checkout with
 * no changesets at all.
 *
 * So: parse each entry's front-matter, and require that a SINGLE entry declares
 * `provegate` at `minor` AND carries the compatibility instruction. The failure
 * names which half was found, so a half-written changeset is diagnosable rather
 * than merely red.
 */

const changesetDir = fileURLToPath(new URL('../../../.changeset', import.meta.url));

interface Entry {
  file: string;
  bumps: Map<string, string>;
  body: string;
}

/** Parse the `---`-delimited front matter changesets actually emit. Quote
 * styles vary by version and by hand-editing — `'provegate'`, `"provegate"`
 * and bare all occur — so the parser tolerates all three rather than pinning
 * whichever one this repo happened to write today. */
function entries(): Entry[] {
  return parseEntries(changesetDir);
}

function parseEntries(dir: string): Entry[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((file) => {
      const text = readFileSync(join(dir, file), 'utf8');
      const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
      const bumps = new Map<string, string>();
      if (match === null) return { file, bumps, body: text };
      for (const line of match[1]!.split('\n')) {
        const kv = /^\s*['"]?([^'":]+)['"]?\s*:\s*['"]?([a-z]+)['"]?\s*$/.exec(line);
        if (kv) bumps.set(kv[1]!.trim(), kv[2]!.trim());
      }
      return { file, bumps, body: match[2]! };
    });
}

/** The instruction an adopter must not miss: upgrade before adding the key. */
const COMPAT = /upgrade the cli first|upgrade the cli, then add|older cli rejects/i;

/**
 * PRD-025 FR-4: "minor + compatibility sentence" describes ANY new-config-key
 * release note — with two qualifying entries a bare `find` returns whichever
 * `readdirSync` yields first, and the suite goes red on filename order. So
 * each assertion group selects its OWN entry by a discriminator unique to it.
 * A SELECTION change only: every expectation below keeps its exact text.
 */
const VALUE_SCORING = /valueScoring/;
const WIRING_KEYS = /wiring\.(scriptsDir|hooksDir|bundlePath)/;
const CONSOLIDATION = /--review-artifacts[\s\S]{0,80}--durable-artifacts|check --review-artifacts/;
const qualifying = (own: RegExp): Entry | undefined =>
  entries().find(
    (e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body) && own.test(e.body),
  );

describe('the release entry for the config-surface change (FR-12, W9)', () => {
  it('some SINGLE entry declares provegate minor and carries the compatibility rule', () => {
    const all = entries();
    expect(all.length, 'no changeset entries at all').toBeGreaterThan(0);

    const minor = all.filter((e) => e.bumps.get('provegate') === 'minor');
    const compat = all.filter((e) => COMPAT.test(e.body));
    const both = all.filter((e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body));

    // Naming which half was found is the whole point: "no entry" and "two
    // entries each doing half the job" are different problems with different
    // fixes, and a bare red cannot tell them apart.
    expect(
      both.length,
      `entries declaring provegate minor: ${minor.map((e) => e.file).join(', ') || 'none'}; ` +
        `entries carrying the compatibility rule: ${compat.map((e) => e.file).join(', ') || 'none'}`,
    ).toBeGreaterThan(0);
  });

  it('that entry states the DOWNGRADE direction too', () => {
    // Half the rule is worse than none: an adopter who upgrades cleanly and
    // then rolls back hits a config error with no idea it was predictable.
    const entry = qualifying(VALUE_SCORING);
    expect(entry, 'no qualifying entry').toBeDefined();
    expect(entry!.body).toMatch(/remove the key/i);
  });

  it('that entry states the merge rule in BOTH directions', () => {
    // A note saying only that axes and weights go together makes the common
    // case — nudging one weight — look unsupported.
    const entry = qualifying(VALUE_SCORING);
    expect(entry!.body).toMatch(/requires the complete matching `?weights/i);
    expect(entry!.body).toMatch(/weights` alone is a legal partial retune|partial retune of the/i);
  });

  it('that entry says nothing changes for a config that does not set the key', () => {
    const entry = qualifying(VALUE_SCORING);
    expect(entry!.body).toMatch(/presence-triggered/i);
    expect(entry!.body).toMatch(/sees no new failures|nothing changes/i);
  });

  it('the wiring-audit entry (PRD-025) names its keys, surfaces, and both directions', () => {
    const entry = qualifying(WIRING_KEYS);
    expect(entry, 'no wiring-audit entry').toBeDefined();
    // the three keys with their defaults. [\s\S]{0,30} rather than `.*`: the
    // changeset wraps lines, and a dot never crosses a newline — the exact
    // split-across-a-line-break shape that once defeated a grep sweep here.
    expect(entry!.body).toMatch(/wiring\.scriptsDir[\s\S]{0,30}scripts\/verify/);
    expect(entry!.body).toMatch(/wiring\.hooksDir[\s\S]{0,30}\.githooks/);
    expect(entry!.body).toMatch(/wiring\.bundlePath[\s\S]{0,30}verify-workflow\.mjs/);
    // the three recognized surfaces and the verdict change worth announcing
    expect(entry!.body).toMatch(/hook/i);
    expect(entry!.body).toMatch(/bundle/i);
    expect(entry!.body).toMatch(/script bod/i);
    expect(entry!.body).toMatch(/wired nowhere/i);
    // the downgrade direction: the post-release rollback rule, stated where a
    // maintainer will find it (PRD-025 task 6.3)
    expect(entry!.body).toMatch(/remove the `?wiring`? block|deprecated-and-ignored/i);
  });

  it('the two qualifying entries are distinct files, each found by its own discriminator', () => {
    const valueScoring = qualifying(VALUE_SCORING);
    const wiring = qualifying(WIRING_KEYS);
    expect(valueScoring).toBeDefined();
    expect(wiring).toBeDefined();
    // readdirSync order can never decide which entry a group reads
    expect(valueScoring!.file).not.toBe(wiring!.file);
  });

  it('the consolidation entry (PRD-026) carries all five migration steps', () => {
    const entry = qualifying(CONSOLIDATION);
    expect(entry, 'no consolidation entry').toBeDefined();
    const body = entry!.body;
    // the five steps, each anchored on its own irreplaceable token
    expect(body).toMatch(/verify-review-artifact\.mjs/); // 1: the deletions by name
    expect(body).toMatch(/package\.json` script entries/); // 2
    expect(body).toMatch(/`CHECKS` array/); // 3
    expect(body).toMatch(/check --wiring/); // 4: the replacing surfaces
    expect(body).toMatch(/DROP every survivor[\s\S]{0,20}already wired/); // 5 — windowed: the note wraps lines and a dot never crosses a newline
    expect(body).toMatch(/wiringExceptions/); // 5: the destination store
    // and the manual-migration honesty
    expect(body).toMatch(/BY HAND|additive-only/i);
  });

  it('the three qualifying entries are distinct files, each found by its own discriminator', () => {
    const found = [qualifying(VALUE_SCORING), qualifying(WIRING_KEYS), qualifying(CONSOLIDATION)];
    for (const entry of found) expect(entry).toBeDefined();
    const files = found.map((e) => e!.file);
    expect(new Set(files).size).toBe(3); // readdirSync order can never decide
  });

  it('the front-matter parser tolerates the quote styles changesets emit', () => {
    // Exercises the REAL parser through a temp directory, not a copy of its
    // regex. An earlier version duplicated the expression locally and asserted
    // against the duplicate — breaking `entries()` would not have failed it,
    // which is the defect this whole file exists to avoid.
    const dir = mkdtempSync(join(tmpdir(), 'provegate-cs-'));
    try {
      const styles = ["'provegate': minor", '"provegate": minor', 'provegate: minor'];
      styles.forEach((fm, i) => {
        writeFileSync(join(dir, `e${i}.md`), `---\n${fm}\n---\n\nupgrade the CLI first\n`);
      });
      const parsed = parseEntries(dir);
      expect(parsed).toHaveLength(styles.length);
      for (const entry of parsed) {
        expect(entry.bumps.get('provegate'), entry.file).toBe('minor');
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
