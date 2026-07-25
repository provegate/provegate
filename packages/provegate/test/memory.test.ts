import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  deepMerge,
  validateConfig,
  validateResolvedConfig,
  type PartialWorkflowConfig,
} from '../src/core/config/index.js';
import { validateRecord } from '../src/core/memory/index.js';

const fixturesDir = fileURLToPath(new URL('./fixtures', import.meta.url));

/**
 * PRD-017 FR-2: the memory configuration surface. Two properties carry the
 * whole safety argument of this PRD — memory is off unless someone turns it on,
 * and nothing infers enablement from a `_brain` directory existing — so they are
 * asserted rather than assumed.
 */

const resolved = (memory: Partial<typeof DEFAULT_CONFIG.memory>) =>
  validateResolvedConfig(
    deepMerge(DEFAULT_CONFIG, { memory } as PartialWorkflowConfig) as typeof DEFAULT_CONFIG,
  );

const paths = (issues: { path: string }[]) => issues.map((i) => i.path);

describe('memory configuration defaults (FR-2)', () => {
  it('ships disabled, with the conventional layout but no entrypoints claimed', () => {
    expect(DEFAULT_CONFIG.memory).toEqual({
      enabled: false,
      root: '_brain',
      index: '_brain/INDEX.md',
      entrypoints: [],
      verifyCommand: '',
      retroAfterCompleted: 0,
    });
  });

  it('a repository with no memory block resolves clean', () => {
    expect(validateResolvedConfig(DEFAULT_CONFIG)).toEqual([]);
  });
});

describe('memory shape validation (FR-2)', () => {
  it('rejects a non-boolean switch and a typo\u0027d key', () => {
    const issues = validateConfig({ memory: { enabled: 'yes', rooot: '_brain' } });
    expect(paths(issues)).toEqual(expect.arrayContaining(['memory.enabled', 'memory.rooot']));
    expect(issues.find((i) => i.path === 'memory.enabled')?.message).toContain('boolean');
    expect(issues.find((i) => i.path === 'memory.rooot')?.message).toBe('unknown key');
  });

  it('accepts 0 as a disabled cadence but refuses negative and fractional ones', () => {
    expect(validateConfig({ memory: { retroAfterCompleted: 0 } })).toEqual([]);
    expect(validateConfig({ memory: { retroAfterCompleted: 5 } })).toEqual([]);
    for (const bad of [-1, 1.5, true, '3']) {
      const issues = validateConfig({ memory: { retroAfterCompleted: bad } });
      expect(paths(issues), String(bad)).toContain('memory.retroAfterCompleted');
    }
  });

  it('allows an empty verifyCommand (the field is off, not missing)', () => {
    expect(validateConfig({ memory: { verifyCommand: '' } })).toEqual([]);
  });
});

describe('memory path containment (FR-2)', () => {
  it('refuses absolute, parent-escaping, home-relative, and drive-letter paths', () => {
    for (const bad of ['/etc/brain', '../outside', '~/brain', 'C:\\brain', '\\\\server\\share']) {
      const issues = resolved({ root: bad, index: `${bad}/INDEX.md` });
      expect(paths(issues), bad).toContain('memory.root');
    }
  });

  it('tags the offending entrypoint by index, not just the array', () => {
    const issues = resolved({ entrypoints: ['CLAUDE.md', '../elsewhere/AGENTS.md'] });
    expect(paths(issues)).toContain('memory.entrypoints[1]');
    expect(paths(issues)).not.toContain('memory.entrypoints[0]');
  });

  it('checks containment even while memory is disabled', () => {
    // A bad path parked in a disabled block is a trap that springs on the day
    // someone flips the switch — the point of catching it now.
    const issues = resolved({ enabled: false, root: '../elsewhere' });
    expect(paths(issues)).toContain('memory.root');
  });

  it('refuses an index that lives outside the store it indexes', () => {
    const issues = resolved({ root: '_brain', index: '_docs/INDEX.md' });
    expect(issues.find((i) => i.path === 'memory.index')?.message).toContain('must live under');
  });

  it('accepts a nested store and its index', () => {
    expect(resolved({ root: 'docs/_brain', index: 'docs/_brain/INDEX.md' })).toEqual([]);
  });
});

describe('memory verifyCommand safety (FR-2)', () => {
  it('runs the configured validator through the same allowlist as a gate command', () => {
    for (const unsafe of [
      'node scripts/verify/verify-brain.mjs && git push',
      'node x.mjs `whoami`',
      'node x.mjs; rm -rf /',
      'node x.mjs > /tmp/out',
      'verify-brain.mjs',
    ]) {
      const issues = resolved({ verifyCommand: unsafe });
      expect(paths(issues), unsafe).toContain('memory.verifyCommand');
    }
  });

  it('accepts an allowlisted validator invocation', () => {
    expect(resolved({ verifyCommand: 'node scripts/verify/verify-brain.mjs' })).toEqual([]);
    expect(resolved({ verifyCommand: 'pnpm verify:brain' })).toEqual([]);
  });
});

describe('memory enablement preconditions (FR-2)', () => {
  it('requires at least one entrypoint once enabled', () => {
    const issues = resolved({ enabled: true, entrypoints: [] });
    expect(issues.find((i) => i.path === 'memory.entrypoints')?.message).toContain('at least one');
  });

  it('accepts a complete enabled block', () => {
    expect(
      resolved({
        enabled: true,
        root: '_brain',
        index: '_brain/INDEX.md',
        entrypoints: ['CLAUDE.md', 'AGENTS.md'],
        verifyCommand: 'node scripts/verify/verify-brain.mjs',
        retroAfterCompleted: 5,
      }),
    ).toEqual([]);
  });

  it('an empty entrypoint list is legal while disabled', () => {
    expect(resolved({ enabled: false, entrypoints: [] })).toEqual([]);
  });
});

/**
 * PRD-017 FR-3: the record parser. The headline case is the empty folded
 * description — the previous validator stored the literal `>-` and never read
 * the fold at all, so no folded description in the repository was ever checked.
 */
describe('frontmatter subset parser (FR-3)', () => {
  const fm = (lines: string[], body = '\n**Why:** w\n**How to apply:** h\n'): string =>
    `---\n${lines.join('\n')}\n---\n${body}`;

  const base = [
    'name: sample',
    'description: a real one-line description',
    'type: gotcha',
    'scope: workflow',
    'status: active',
  ];

  const check = (lines: string[], body?: string, slug = 'sample') =>
    validateRecord(fm(lines, body), 'x.md', slug);

  const messages = (lines: string[], body?: string, slug?: string) =>
    check(lines, body, slug).issues.map((i) => `${i.path} ${i.message}`);

  it('reads a folded scalar body instead of storing the fold marker', () => {
    const { record, issues } = check([
      'name: sample',
      'description: >-',
      '  first line of the fold',
      '  second line of the fold',
      'type: gotcha',
      'scope: workflow',
      'status: active',
    ]);
    expect(issues).toEqual([]);
    expect(record?.description).toBe('first line of the fold second line of the fold');
  });

  it('rejects a folded scalar with an empty body', () => {
    // The exact record the old validator accepted.
    expect(
      messages([
        'name: sample',
        'description: >-',
        'type: gotcha',
        'scope: workflow',
        'status: active',
      ]).join('|'),
    ).toContain('x.md:description missing or empty');
  });

  it('parses inline lists and distinguishes empty links from empty selectors', () => {
    expect(check([...base, 'links: [a-slug, b-slug]']).record?.links).toEqual(['a-slug', 'b-slug']);
    expect(check([...base, 'links: []']).issues).toEqual([]);
    // A record claiming `tags: []` claims a selector it does not have.
    expect(messages([...base, 'tags: []']).join('|')).toContain('must not be empty when present');
    expect(messages([...base, 'watch: []']).join('|')).toContain('must not be empty when present');
  });

  it('fails loud on every unsupported YAML form rather than guessing', () => {
    expect(messages([...base, 'links:', '  - a-slug']).join('|')).toContain('block list');
    expect(messages([...base, 'description2: |', '  literal']).join('|')).toContain('unknown key');
    expect(messages([...base, 'watch: |', '  literal']).join('|')).toContain(
      "block scalar form '|'",
    );
    // Modifiers are block scalars too: `>+` and `>2` used to fall through as
    // ordinary strings, which is the guessing the subset exists to forbid.
    expect(
      messages([...base.slice(0, 1), 'description: >+', '  x', ...base.slice(2)]).join('|'),
    ).toContain("block scalar form '>+'");
    expect(messages(['nested:', '  key: value', ...base]).join('|')).toContain('unknown key');
    expect(messages([...base, 'not a mapping line']).join('|')).toContain('unparseable');
  });

  it('refuses a duplicate key instead of letting the last one win', () => {
    expect(messages([...base, 'description: a second one']).join('|')).toContain(
      'x.md:description duplicate key',
    );
  });

  it('refuses an unknown key — a typo is not an extension', () => {
    expect(messages([...base, 'provanance: seed']).join('|')).toContain('x.md:provanance unknown');
  });

  it('treats a whitespace-preceded `#` as a comment, matching YAML', () => {
    // Both parser implementations must agree on where a value ends, so the rule
    // is YAML's rather than a house variant: ` #` opens a comment, `x#y` does not.
    expect(
      check([
        'name: sample',
        'description: token#fragment is part of the value  # this part is not',
        'type: gotcha',
        'scope: workflow',
        'status: active',
      ]).record?.description,
    ).toBe('token#fragment is part of the value');
  });
});

describe('record schema (FR-3)', () => {
  const fm = (lines: string[], body = '\n**Why:** w\n**How to apply:** h\n'): string =>
    `---\n${lines.join('\n')}\n---\n${body}`;
  const base = [
    'name: sample',
    'description: a real one-line description',
    'type: gotcha',
    'scope: workflow',
    'status: active',
  ];
  const messages = (lines: string[], body?: string, slug = 'sample', isAdr = false) =>
    validateRecord(fm(lines, body), 'x.md', slug, { isAdr })
      .issues.map((i) => `${i.path} ${i.message}`)
      .join('|');

  it('requires the name to match the filename slug', () => {
    expect(messages(base, undefined, 'other-slug')).toContain('does not match the filename slug');
  });

  it('rejects placeholder values', () => {
    expect(messages(['name: sample', 'description: <one line>', ...base.slice(2)])).toContain(
      'placeholder',
    );
  });

  it('requires rationale sections for gotcha, convention, and decision', () => {
    expect(messages(base, '\nbody with no sections\n')).toContain('requires a **Why:** section');
    expect(messages(base, '\n**Why:** w\n')).toContain('requires a **How to apply:** section');
  });

  it('exempts a reference record from rationale sections', () => {
    expect(
      validateRecord(
        fm(
          ['name: sample', 'description: a pointer', 'type: reference', ...base.slice(3)],
          '\nSee the dashboard.\n',
        ),
        'x.md',
        'sample',
      ).issues,
    ).toEqual([]);
  });

  it('ties supersession to its target in both directions', () => {
    expect(messages([...base.slice(0, 4), 'status: superseded'])).toContain(
      'required when status is superseded',
    );
    expect(messages([...base, 'superseded-by: other-slug'])).toContain('status is not superseded');
  });

  it('enforces the ADR shape: decision type, name pattern, and four sections', () => {
    const adrBody =
      '\n## Context\nc\n## Decision\nd\n## Consequences\nq\n## Alternatives considered\na\n';
    const adrLines = [
      'name: ADR-0001-a-decision',
      'description: a real description',
      'type: decision',
      'scope: workflow',
      // ADRs carry the decision lifecycle, not the learning one.
      'status: accepted',
    ];
    expect(
      validateRecord(fm(adrLines, adrBody), 'x.md', 'ADR-0001-a-decision', { isAdr: true }).issues,
    ).toEqual([]);
    expect(messages(adrLines, '\n## Context\nc\n', 'ADR-0001-a-decision', true)).toContain(
      "requires a '## Decision' section",
    );
    expect(
      messages(
        [
          'name: ADR-0001-a-decision',
          ...adrLines.slice(1, 2),
          'type: gotcha',
          ...adrLines.slice(3),
        ],
        adrBody,
        'ADR-0001-a-decision',
        true,
      ),
    ).toContain('must be type: decision');
  });

  it('refuses a watch glob that escapes the workspace', () => {
    const issues = validateRecord(fm([...base, 'watch: [../outside/**]']), 'x.md', 'sample', {
      root: process.cwd(),
    }).issues;
    expect(issues.map((i) => i.message).join('|')).toContain('escapes the workspace');
  });

  it('accepts a contained watch glob', () => {
    expect(
      validateRecord(fm([...base, 'watch: [packages/provegate/src/**]']), 'x.md', 'sample', {
        root: process.cwd(),
      }).issues,
    ).toEqual([]);
  });
});

/**
 * PRD-017 FR-4, watch item W12: the conformance corpus. The typed parser and the
 * standalone validator cannot import each other — the validator runs where this
 * package is not installed — so this corpus is their entire contract. Both are
 * executed against every case, and the assertion is deliberately
 * implementation-neutral: they must agree on WHETHER a record is valid and on
 * WHICH field is at fault, never on wording.
 *
 * The standalone side under test is the SHIPPED copy under `practices/`, not the
 * repository's own: an adopter runs that file, and `verify:pack-drift` is what
 * keeps the repository's copy reconciled with it.
 */
describe('record conformance corpus (FR-4, W12)', () => {
  const corpus = JSON.parse(
    readFileSync(join(fixturesDir, 'memory-record-cases.json'), 'utf8'),
  ) as {
    _matrix: Record<string, string[]>;
    cases: {
      id: string;
      slug: string;
      isAdr: boolean;
      valid: boolean;
      fields?: string[];
      matrix?: string[];
      content: string;
    }[];
  };

  /** `<file>:<field>` → field; a line-tagged issue belongs to no single key. */
  const tsField = (path: string): string => {
    const at = path.indexOf(':');
    if (at === -1) return 'structure';
    const field = path.slice(at + 1);
    return field.startsWith('line ') ? 'structure' : field;
  };

  it('binds every matrix cell to at least one case', () => {
    // Counting cases proves nothing: deleting every watch case while adding
    // filler elsewhere would keep the totals up. Each case CLAIMS the cells it
    // exercises, and every declared cell must be claimed by someone — so a new
    // rule with no case, or a deleted case, fails here rather than silently
    // shrinking what the two parsers are held to.
    const claimed = new Set(corpus.cases.flatMap((c) => c.matrix ?? []));
    const declared = Object.entries(corpus._matrix).flatMap(([field, modes]) =>
      modes.map((mode) => `${field}:${mode}`),
    );
    expect(declared.filter((cell) => !claimed.has(cell))).toEqual([]);
    // And no case may claim a cell the matrix does not declare.
    expect([...claimed].filter((cell) => !declared.includes(cell))).toEqual([]);
  });

  it('the typed parser reaches the expected verdict on every case', () => {
    for (const c of corpus.cases) {
      const issues = validateRecord(c.content, 'x.md', c.slug, {
        isAdr: c.isAdr,
        root: process.cwd(),
      }).issues;
      const fields = [...new Set(issues.map((i) => tsField(i.path)))];
      if (c.valid) expect(fields, c.id).toEqual([]);
      else for (const field of c.fields ?? []) expect(fields, c.id).toContain(field);
    }
  });

  it('the shipped standalone validator reaches the SAME verdict on every case', () => {
    // Spawned rather than imported: the validator is untyped `.mjs` on purpose —
    // it must run in a repository with no TypeScript and no package installed —
    // so the test exercises it the way an adopter does, as a real module.
    const libPath = join(fixturesDir, '..', '..', 'practices', 'verify', 'lib.mjs');
    const corpusPath = join(fixturesDir, 'memory-record-cases.json');
    const script = [
      `import { validateMemoryRecord } from ${JSON.stringify(libPath)};`,
      `import { readFileSync } from 'node:fs';`,
      `const corpus = JSON.parse(readFileSync(${JSON.stringify(corpusPath)}, 'utf8'));`,
      `const out = corpus.cases.map((c) => ({`,
      `  id: c.id,`,
      `  fields: validateMemoryRecord(c.content, { slug: c.slug, isAdr: c.isAdr })`,
      `    .issues.map((i) => i.field)`,
      `    .sort(),`,
      `}));`,
      `process.stdout.write(JSON.stringify(out));`,
    ].join('\n');
    const stdout = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    const standalone = new Map(
      (JSON.parse(stdout) as { id: string; fields: string[] }[]).map((r) => [r.id, r.fields]),
    );

    for (const c of corpus.cases) {
      // Sorted WITH duplicates, not de-duped: a field Set hides a divergence
      // inside a multi-entry field, where one side flags both bad globs and the
      // other flags only the first. Same field, different semantics.
      const ts = validateRecord(c.content, 'x.md', c.slug, {
        isAdr: c.isAdr,
        root: process.cwd(),
      })
        .issues.map((i) => tsField(i.path))
        .sort();
      expect(standalone.get(c.id), `${c.id}: the two implementations disagree`).toEqual(ts);
    }
  });

  it('keeps the two status vocabularies apart', () => {
    // An ADR carries a decision lifecycle, a learning a validity one. Merging
    // them would quietly accept `status: active` on an ADR.
    const adrActive = corpus.cases.find((c) => c.id === 'adr-status-from-learning-vocabulary');
    const learningAccepted = corpus.cases.find(
      (c) => c.id === 'learning-status-from-adr-vocabulary',
    );
    expect(adrActive?.valid).toBe(false);
    expect(learningAccepted?.valid).toBe(false);
  });
});

/**
 * PRD-017 task 6.0: the migration and rollback properties, asserted rather than
 * argued. This PRD's entire safety case is that it changes nothing until someone
 * opts in — a claim that is worthless unless something fails when it stops being
 * true.
 */
describe('default-off compatibility (task 6.2)', () => {
  it('a config without a memory block behaves exactly like one with memory disabled', () => {
    // Destructured rather than cast: the point is that the validator accepts a
    // config that genuinely lacks the key, which a cast would only pretend.
    const { memory, ...withoutBlock } = DEFAULT_CONFIG;
    expect(memory.enabled).toBe(false);
    expect(validateResolvedConfig(withoutBlock)).toEqual([]);
    expect(validateResolvedConfig(DEFAULT_CONFIG)).toEqual([]);
  });

  it('no default value enables anything', () => {
    // Enablement is a decision someone makes, never a side effect of the store
    // existing. If this ever reads `true`, every gate downstream turns on for
    // every adopter on upgrade.
    expect(DEFAULT_CONFIG.memory.enabled).toBe(false);
    expect(DEFAULT_CONFIG.memory.verifyCommand).toBe('');
    expect(DEFAULT_CONFIG.memory.retroAfterCompleted).toBe(0);
    expect(DEFAULT_CONFIG.memory.entrypoints).toEqual([]);
  });

  it('the parser is inert without a caller: nothing in this PRD invokes it', () => {
    // The substrate ships a capability, not a behaviour change. The runner, the
    // readiness lint, and the CLI gain their memory obligations in PRD-018/019;
    // if one of them starts calling this parser here, the default-off argument
    // stops being true and this assertion is the tripwire.
    const src = fileURLToPath(new URL('../src', import.meta.url));
    const offenders: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'memory') walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const text = readFileSync(full, 'utf8');
        if (/from '.*memory\/(parse|index)\.js'/.test(text)) offenders.push(full);
      }
    };
    walk(src);
    // core/index.ts re-exports the barrel; that is publication, not consumption.
    expect(offenders.map((f) => f.slice(src.length + 1))).toEqual(['core/index.ts']);
  });
});
