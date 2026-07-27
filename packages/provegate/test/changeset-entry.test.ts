import { readFileSync, readdirSync } from 'node:fs';
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
  return readdirSync(changesetDir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((file) => {
      const text = readFileSync(join(changesetDir, file), 'utf8');
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
    const entry = entries().find((e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body));
    expect(entry, 'no qualifying entry').toBeDefined();
    expect(entry!.body).toMatch(/remove the key/i);
  });

  it('that entry states the merge rule in BOTH directions', () => {
    // A note saying only that axes and weights go together makes the common
    // case — nudging one weight — look unsupported.
    const entry = entries().find((e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body));
    expect(entry!.body).toMatch(/requires the complete matching `?weights/i);
    expect(entry!.body).toMatch(/weights` alone is a legal partial retune|partial retune of the/i);
  });

  it('that entry says nothing changes for a config that does not set the key', () => {
    const entry = entries().find((e) => e.bumps.get('provegate') === 'minor' && COMPAT.test(e.body));
    expect(entry!.body).toMatch(/presence-triggered/i);
    expect(entry!.body).toMatch(/sees no new failures|nothing changes/i);
  });

  it('the front-matter parser tolerates the quote styles changesets emit', () => {
    // Guards the parser itself: pinning one style would make this suite fail on
    // a correctly-written entry the next changesets version happens to format
    // differently, which is a false red about a real release.
    const parse = (fm: string): string | undefined => {
      const kv = /^\s*['"]?([^'":]+)['"]?\s*:\s*['"]?([a-z]+)['"]?\s*$/.exec(fm);
      return kv?.[2];
    };
    expect(parse("'provegate': minor")).toBe('minor');
    expect(parse('"provegate": minor')).toBe('minor');
    expect(parse('provegate: minor')).toBe('minor');
  });
});
