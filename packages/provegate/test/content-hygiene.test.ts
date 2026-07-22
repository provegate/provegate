import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Content hygiene (FR-9, W2): no parent-project names, no personal names, and an
 * explicit character policy — Turkish letters fail; typographic non-ASCII
 * (em-dashes, arrows, ticks, math) is legal English typography.
 */

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const contentFiles = [
  ...walk(join(pkgRoot, 'prompts')),
  ...walk(join(pkgRoot, 'templates')),
  ...walk(join(pkgRoot, 'examples')),
  join(pkgRoot, 'METHOD.md'),
];

const TURKISH_CHARS = /[çğıöşüÇĞİÖŞÜ]/;
const PARENT_NAMES = /emofy|rayvaz|ramazan/i;

describe('content hygiene (W2 policy)', () => {
  it('collects a plausible content census', () => {
    expect(contentFiles.length).toBeGreaterThanOrEqual(25);
  });

  for (const file of contentFiles) {
    const rel = file.slice(pkgRoot.length);
    it(`${rel}: no parent/personal names, no Turkish characters`, () => {
      const content = readFileSync(file, 'utf8');
      expect(PARENT_NAMES.test(content), 'parent/personal name residue').toBe(false);
      expect(TURKISH_CHARS.test(content), 'Turkish character found').toBe(false);
    });
  }

  it('the Turkish class is precise: typographic non-ASCII stays legal', () => {
    for (const ch of ['—', '–', '→', '≥', '✓', '`']) {
      expect(TURKISH_CHARS.test(ch), ch).toBe(false);
    }
    for (const ch of ['ç', 'ğ', 'ı', 'ş', 'İ']) {
      expect(TURKISH_CHARS.test(ch), ch).toBe(true);
    }
  });
});
