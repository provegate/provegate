import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import {
  assertFragmentTerminal,
  parseRegistry,
  planStore,
  promptsPackageDir,
  readConfigPath,
  renderPrompts,
  requiredValues,
} from '../src/core/run/prompts.js';

/** FR-1: every {{TOKEN}} used in prompts/, templates/ and practices/templates/ is
 * declared in PLACEHOLDERS.md; the registry carries no orphans; tokens are UPPER_SNAKE.
 *
 * `practices/templates/` was added by PRD-021 FR-10. It had been shipping an undeclared
 * `{{VALUE_AXES_TABLE}}` for as long as the pack existed, because the walk covered only
 * the first two directories — the check's coverage was narrower than its own docstring
 * claimed. */

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
  ...walk(join(pkgRoot, 'practices/templates')),
].filter((f) => f !== registryPath);

/** HTML comments are stripped before tokens are read. The practices bootstrap
 * template instructs its adopter with "Fill every {{PLACEHOLDER}} and delete
 * this comment" — that is the WORD placeholder inside an instruction, not a
 * token anything substitutes. Registering it would declare a token nothing
 * fills; deleting the sentence would remove the instruction that makes the
 * real tokens usable. Masking the comment is the only answer that keeps both. */
const withoutComments = (content: string): string => content.replace(/<!--[\s\S]*?-->/g, '');

const usedTokens = new Map<string, Set<string>>();
for (const file of contentFiles) {
  const content = withoutComments(readFileSync(file, 'utf8'));
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

// --- PRD-029 FR-4: values derived from the CONSUMER, not the catalogue -------

describe('required values (PRD-029 FR-4)', () => {
  const packageDir = promptsPackageDir();
  const planned = planStore(packageDir);
  const rows = parseRegistry(readFileSync(join(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8'));

  it('parses every registry row, with its config field, empty policy and enumeration', () => {
    expect(rows).toHaveLength(21);
    expect(rows.filter((r) => r.configField !== null)).toHaveLength(7);
    expect(rows.filter((r) => r.emptyAllowed).map((r) => r.token).sort()).toEqual([
      'DOMAIN_CHECKS',
      'ENV_NOTES',
    ]);
    // PRD-031 ships the first enumerated token; its two legal values are the
    // whole set (the enumerated-aware value builders below key off this).
    const enumerated = rows.filter((r) => r.enumerated !== null);
    expect(enumerated.map((r) => r.token)).toEqual(['AUTONOMY_MODE']);
    expect(enumerated[0]?.enumerated).toEqual(['human-gated', 'autonomous']);
  });

  it('derives TEN required values from the rendered corpus, not twenty-one from the table', () => {
    // The registry also covers practices/templates/, which the store does not
    // render. Deriving the requirement from the catalogue would make an adopter
    // answer four questions that cannot change one byte of the store.
    const required = requiredValues(packageDir, planned, rows);
    expect(required).toHaveLength(10);
  });

  it('excludes exactly the four tokens no rendered file consumes', () => {
    const required = new Set(requiredValues(packageDir, planned, rows).map((r) => r.token));
    for (const practicesOnly of [
      'LINK_TO_VISION_DOC',
      'ONE_LINE_PRODUCT_FRAMING',
      'PROJECT_SPECIFIC_HARD_RULES',
      'VISION_OR_DECISIONS_DOC',
    ]) {
      expect(rows.some((r) => r.token === practicesOnly)).toBe(true); // declared
      expect(required.has(practicesOnly)).toBe(false); // and not demanded
    }
  });

  it('every config-backed row names a path the resolved config actually has', () => {
    // A registry row pointing at a field WorkflowConfig lacks would become a
    // silent unresolved token at an adopter's first render.
    for (const row of rows) {
      if (row.configField === null) continue;
      expect(readConfigPath(DEFAULT_CONFIG, row.configField)).not.toBeNull();
    }
  });

  it('REFUSES the shipped corpus with an empty values map, naming every survivor', () => {
    // Proved against the corpus this package ships, not a hand-written sample:
    // the tokens the check hunts are the ones we ship, and a fixture without
    // them proves nothing about the artefact that has them.
    const config = { ...DEFAULT_CONFIG, prompts: { ...DEFAULT_CONFIG.prompts, values: {} } };
    const message = ((): string => {
      try {
        renderPrompts(packageDir, config);
        return '';
      } catch (error) {
        return (error as Error).message;
      }
    })();
    expect(message).toContain('cannot be rendered');
    for (const row of requiredValues(packageDir, planned, rows)) {
      expect(message).toContain(row.token);
    }
    // And it must NOT demand the four the store does not render.
    expect(message).not.toContain('LINK_TO_VISION_DOC');
  });

  it('renders cleanly once every required value is supplied', () => {
    const values: Record<string, string> = {};
    for (const row of requiredValues(packageDir, planned, rows)) values[row.token] = row.enumerated?.[0] ?? 'x';
    const config = { ...DEFAULT_CONFIG, prompts: { ...DEFAULT_CONFIG.prompts, values } };
    const result = renderPrompts(packageDir, config);
    expect(result.files.size).toBeGreaterThan(19);
    expect(result.required).toHaveLength(10);
    for (const [path, body] of result.files) {
      if (path === 'prompts/PLACEHOLDERS.md') continue; // verbatim by disposition
      expect(body).not.toMatch(/\{\{[A-Z][A-Z0-9_]*\}\}/);
    }
  });

  it('leaves the verbatim registry unsubstituted — rendering it would eat the table', () => {
    const values: Record<string, string> = {};
    for (const row of requiredValues(packageDir, planned, rows)) values[row.token] = row.enumerated?.[0] ?? 'x';
    const result = renderPrompts(packageDir, {
      ...DEFAULT_CONFIG,
      prompts: { ...DEFAULT_CONFIG.prompts, values },
    });
    const registry = result.files.get('prompts/PLACEHOLDERS.md');
    expect(registry).toContain('{{ARCHITECTURE_DOC}}');
    expect(registry).not.toContain('GENERATED by provegate');
  });

  it('enforces the per-token empty policy in BOTH directions', () => {
    const base: Record<string, string> = {};
    for (const row of requiredValues(packageDir, planned, rows)) base[row.token] = row.enumerated?.[0] ?? 'x';

    const allowed = { ...base, DOMAIN_CHECKS: '' };
    expect(() =>
      renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values: allowed },
      }),
    ).not.toThrow();

    const refused = { ...base, ARCHITECTURE_DOC: '' };
    expect(() =>
      renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values: refused },
      }),
    ).toThrow(/ARCHITECTURE_DOC is empty/);
  });

  it('reports a values key no rendered token consumes as `unused`', () => {
    const values: Record<string, string> = { NOT_A_TOKEN: 'x' };
    for (const row of requiredValues(packageDir, planned, rows)) values[row.token] = row.enumerated?.[0] ?? 'x';
    expect(() =>
      renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      }),
    ).toThrow(/\[unused\].*NOT_A_TOKEN/s);
  });

  it('names a registry-declared but unrendered token as unused, with the reason', () => {
    const values: Record<string, string> = { LINK_TO_VISION_DOC: 'docs/vision.md' };
    for (const row of requiredValues(packageDir, planned, rows)) values[row.token] = row.enumerated?.[0] ?? 'x';
    expect(() =>
      renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      }),
    ).toThrow(/the store does not render/);
  });

  it('refuses a fragment that is not terminal', () => {
    // A fragment's token would survive into the output unresolved: substitution
    // is one pass, and re-scanning would break the opacity guarantee.
    expect(() => assertFragmentTerminal('f.md', 'body {{CMD_TEST}}\n')).toThrow(/not terminal/);
    expect(() => assertFragmentTerminal('f.md', 'plain body\n')).not.toThrow();
  });
});

describe('the first enumerated token (PRD-031 FR-6)', () => {
  const packageDir = promptsPackageDir();
  const planned = planStore(packageDir);
  const rows = parseRegistry(readFileSync(join(packageDir, 'prompts/PLACEHOLDERS.md'), 'utf8'));
  const baseValues = (): Record<string, string> => {
    const v: Record<string, string> = {};
    for (const row of requiredValues(packageDir, planned, rows))
      v[row.token] = row.enumerated?.[0] ?? 'x';
    return v;
  };

  it('every declared legal value has its exact fragment file', () => {
    const row = rows.find((r) => r.token === 'AUTONOMY_MODE');
    for (const value of row?.enumerated ?? []) {
      const rel = `prompts/_fragments/AUTONOMY_MODE.${value}.md`;
      expect(existsSync(join(packageDir, rel)), rel).toBe(true);
    }
  });

  it('both legal modes render, each carrying its own fragment text and never the other', () => {
    for (const [mode, marker, absent] of [
      ['human-gated', 'This STOP has no exception', 'Exception: in autonomous-execution mode'],
      ['autonomous', 'Exception: in autonomous-execution mode', 'This STOP has no exception'],
    ] as const) {
      const values = { ...baseValues(), AUTONOMY_MODE: mode };
      const result = renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      });
      const phase3 = result.files.get('prompts/phase-3-task-generator.md') ?? '';
      expect(phase3, mode).toContain(marker);
      expect(phase3, mode).not.toContain(absent);
      // neither rendering asks the agent to decide its own mode — both carry
      // the configured-statement sentence instead (wrap-normalized)
      expect(phase3.replace(/\s+/g, ' ')).toContain(
        'an agent never assesses which mode its own session is in',
      );
    }
  });

  it('the autonomous rendering reproduces the snapshot exception text, parenthetical included', () => {
    const snapshot = readFileSync(
      join(pkgRoot, '../../docs/research/provegate-bootstrap/source-snapshot/prompts/phase-3-task-generator.md'),
      'utf8',
    );
    const m = snapshot.replace(/\s+/g, ' ').includes(
      "Exception: in autonomous-execution mode (single-session test runs, agent-led sweeps), document the skipped approval gate in the task file's **Deferrals & Decisions** before proceeding.",
    );
    expect(m, 'the snapshot sentence moved — re-anchor this test').toBe(true);
    const values = { ...baseValues(), AUTONOMY_MODE: 'autonomous' };
    const result = renderPrompts(packageDir, {
      ...DEFAULT_CONFIG,
      prompts: { ...DEFAULT_CONFIG.prompts, values },
    });
    const phase3 = (result.files.get('prompts/phase-3-task-generator.md') ?? '').replace(/\n/g, ' ');
    expect(phase3).toContain(
      'Exception: in autonomous-execution mode (single-session test runs, agent-led sweeps), document the skipped approval gate in the task file\'s **Deferrals & Decisions** before proceeding.',
    );
  });

  it('an illegal key is refused at render, naming the legal values', () => {
    const values = { ...baseValues(), AUTONOMY_MODE: 'yolo' };
    expect(() =>
      renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      }),
    ).toThrow(/legal values are human-gated, autonomous/);
  });

  it('a missing fragment FAILS the render — mutation-run against a temp copy of the corpus', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'provegate-frag-'));
    try {
      cpSync(packageDir, tmp, { recursive: true });
      rmSync(join(tmp, 'prompts/_fragments/AUTONOMY_MODE.autonomous.md'));
      const values = { ...baseValues(), AUTONOMY_MODE: 'autonomous' };
      expect(() =>
        renderPrompts(tmp, {
          ...DEFAULT_CONFIG,
          prompts: { ...DEFAULT_CONFIG.prompts, values },
        }),
      ).toThrow(/does not exist in the package/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('no rendering instructs mode self-assessment — denylist after stripping the sanctioned sentence', () => {
    const SANCTIONED = new RegExp('an agent never assesses which mode its own session is in'.split(' ').join('\\s+'), 'g');
    const DENY = /(decide|determine|infer|assess)[^.]{0,60}\b(mode|autonomous)/i;
    for (const mode of ['human-gated', 'autonomous']) {
      const values = { ...baseValues(), AUTONOMY_MODE: mode };
      const result = renderPrompts(packageDir, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      });
      const phase3 = (result.files.get('prompts/phase-3-task-generator.md') ?? '')
        .replace(SANCTIONED, '');
      expect(DENY.test(phase3), `${mode}: ${phase3.match(DENY)?.[0] ?? ''}`).toBe(false);
    }
  });

  it('MUTATION: a doctored fragment carrying a self-assessment instruction fails the denylist', () => {
    const tmp = mkdtempSync(join(tmpdir(), 'provegate-selfassess-'));
    try {
      cpSync(packageDir, tmp, { recursive: true });
      const frag = join(tmp, 'prompts/_fragments/AUTONOMY_MODE.human-gated.md');
      writeFileSync(frag, readFileSync(frag, 'utf8') + '\nIf unsure, determine your own mode from the session.\n');
      const values = { ...baseValues(), AUTONOMY_MODE: 'human-gated' };
      const result = renderPrompts(tmp, {
        ...DEFAULT_CONFIG,
        prompts: { ...DEFAULT_CONFIG.prompts, values },
      });
      const SANCTIONED = new RegExp('an agent never assesses which mode its own session is in'.split(' ').join('\\s+'), 'g');
      const DENY = /(decide|determine|infer|assess)[^.]{0,60}\b(mode|autonomous)/i;
      const phase3 = (result.files.get('prompts/phase-3-task-generator.md') ?? '').replace(SANCTIONED, '');
      expect(DENY.test(phase3)).toBe(true); // the deny case CAN fail — not vacuous
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('both fragments are terminal', () => {
    for (const value of ['human-gated', 'autonomous']) {
      const text = readFileSync(
        join(packageDir, `prompts/_fragments/AUTONOMY_MODE.${value}.md`),
        'utf8',
      );
      expect(() => assertFragmentTerminal(`AUTONOMY_MODE.${value}.md`, text)).not.toThrow();
    }
  });
});
