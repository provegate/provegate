import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** FR-1: every {{TOKEN}} used in prompts/ + templates/ is declared in
 * PLACEHOLDERS.md; the registry carries no orphans; tokens are UPPER_SNAKE. */

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.md')) out.push(full);
  }
  return out;
}

const registryPath = join(pkgRoot, 'prompts/PLACEHOLDERS.md');
const registry = readFileSync(registryPath, 'utf8');
const declared = new Set([...registry.matchAll(/`\{\{([A-Z0-9_]+)\}\}`/g)].map((m) => m[1]!));

const contentFiles = [
  ...walk(join(pkgRoot, 'prompts')),
  ...walk(join(pkgRoot, 'templates')),
].filter((f) => f !== registryPath);

const usedTokens = new Map<string, Set<string>>();
for (const file of contentFiles) {
  const content = readFileSync(file, 'utf8');
  for (const m of content.matchAll(/\{\{([^}]+)\}\}/g)) {
    const token = m[1]!;
    if (!usedTokens.has(token)) usedTokens.set(token, new Set());
    usedTokens.get(token)!.add(file.slice(pkgRoot.length));
  }
}

describe('placeholder registry (FR-1)', () => {
  it('declares a non-trivial token set, all UPPER_SNAKE', () => {
    expect(declared.size).toBeGreaterThanOrEqual(10);
    for (const token of declared) {
      expect(token, token).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('every used token is declared (no undeclared tokens anywhere)', () => {
    const undeclared = [...usedTokens.keys()].filter((t) => !declared.has(t));
    expect(undeclared, `undeclared tokens: ${undeclared.join(', ')}`).toEqual([]);
  });

  it('every used token is well-formed UPPER_SNAKE', () => {
    for (const token of usedTokens.keys()) {
      expect(token, token).toMatch(/^[A-Z][A-Z0-9_]*$/);
    }
  });

  it('the registry has no orphan declarations', () => {
    const orphans = [...declared].filter((t) => !usedTokens.has(t));
    expect(orphans, `declared but never used: ${orphans.join(', ')}`).toEqual([]);
  });
});
