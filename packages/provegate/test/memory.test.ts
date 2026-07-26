import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultManifest, type GatesManifest } from '../src/core/gates/manifest.js';
import { afterEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_CONFIG,
  deepMerge,
  validateConfig,
  resolveConfig,
  validateResolvedConfig,
  type PartialWorkflowConfig,
} from '../src/core/config/index.js';
import {
  FIND_DEFAULT_LIMIT,
  FIND_MAX_LIMIT,
  memoryDoctor,
  memoryFind,
  validateRecord,
} from '../src/core/memory/index.js';
import { watchMatches } from '../src/core/memory/artifacts.js';

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
      "x.md:structure duplicate key 'description'",
    );
  });

  it('refuses an unknown key — a typo is not an extension', () => {
    expect(messages([...base, 'provanance: seed']).join('|')).toContain(
      "x.md:structure unknown key 'provanance'",
    );
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
    const issues = validateRecord(fm([...base, 'watch: [../outside/**]']), 'x.md', 'sample').issues;
    expect(issues.map((i) => i.message).join('|')).toContain('escapes the workspace');
  });

  it('accepts a contained watch glob', () => {
    expect(
      validateRecord(fm([...base, 'watch: [packages/provegate/src/**]']), 'x.md', 'sample').issues,
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

  it('has unique case ids', () => {
    // The standalone results are keyed by id. A duplicate id would silently keep
    // only the last, and a real disagreement in the shadowed case would then be
    // compared against a different case's result and pass.
    const ids = corpus.cases.map((c) => c.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it('binds every matrix cell to exactly one case, and every claim to real behaviour', () => {
    // Counting cases proves nothing: deleting every watch case while adding
    // filler elsewhere would keep the totals up. Each case CLAIMS the cells it
    // exercises, and every declared cell must be claimed by someone — so a new
    // rule with no case, or a deleted case, fails here rather than silently
    // shrinking what the two parsers are held to.
    const claims: [string, string][] = corpus.cases.flatMap((c) =>
      (c.matrix ?? []).map((cell): [string, string] => [c.id, cell]),
    );
    const declared = Object.entries(corpus._matrix).flatMap(([field, modes]) =>
      modes.map((mode) => `${field}:${mode}`),
    );
    const claimed = new Set(claims.map(([, cell]) => cell));

    // Both directions of membership: no unclaimed cell, no undeclared claim.
    expect(declared.filter((cell) => !claimed.has(cell))).toEqual([]);
    expect([...claimed].filter((cell) => !declared.includes(cell))).toEqual([]);

    // EXACTLY one case per cell. With duplicates allowed, deleting a case can
    // leave every cell still claimed, so the corpus shrinks in silence — which
    // is the same vacuous coverage this file exists to prevent, one level up.
    const perCell = new Map<string, string[]>();
    for (const [id, cell] of claims) perCell.set(cell, [...(perCell.get(cell) ?? []), id]);
    expect([...perCell].filter(([, ids]) => ids.length > 1)).toEqual([]);

    // A claim must match BEHAVIOUR, not just be written down; otherwise a case
    // can claim any cell and the matrix proves nothing. Both directions carry
    // weight: a deny cell must actually fail on the field it names, and a cell
    // asserting something is LEGAL must produce no issues at all.
    for (const [id, cell] of claims) {
      const c = corpus.cases.find((x) => x.id === id)!;
      const failing = new Set(
        validateRecord(c.content, 'x.md', c.slug, { isAdr: c.isAdr }).issues.map((i) =>
          tsField(i.path),
        ),
      );
      if (c.valid) {
        expect([...failing], `${id} claims ${cell} but is not accepted`).toEqual([]);
      } else {
        expect(
          failing.has(cell.split(':')[0]!),
          `${id} claims ${cell} but does not fail on that field`,
        ).toBe(true);
      }
    }
  });

  it('the typed parser reaches the expected verdict on every case', () => {
    for (const c of corpus.cases) {
      const issues = validateRecord(c.content, 'x.md', c.slug, { isAdr: c.isAdr }).issues;
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
      `    .issues.map((i) => (i.entry === undefined ? i.field : i.field + '#' + i.entry))`,
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
      // Keyed by field AND the offending entry: a field name alone let one
      // implementation reject the first bad element and the other the second
      // while both reported the same field.
      const ts = validateRecord(c.content, 'x.md', c.slug, { isAdr: c.isAdr })
        .issues.map((i) =>
          i.entry === undefined ? tsField(i.path) : `${tsField(i.path)}#${i.entry}`,
        )
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

  it('the parser is reachable only from the places that earned it', () => {
    // PRD-017 shipped this parser INERT and asserted that nothing invoked it —
    // the substrate was a capability, not a behaviour change, and the tripwire
    // protected the default-off argument.
    //
    // PRD-019 is one of the two work items that tripwire named. `gate doctor`
    // exists to tell an adopter whether their records actually parse, which it
    // cannot do without calling the parser. So the assertion is not deleted, it
    // is TIGHTENED: the list of callers is now enumerated, and a new one still
    // fails here. What the original protected is unchanged and still true —
    // memory stays off by default, and nothing infers enablement.
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
        // By PATH or by SYMBOL: importing `validateRecord` from the core barrel
        // makes memory behaviour reachable without naming the memory directory,
        // so a path-only tripwire would stay green through exactly the change it
        // exists to catch.
        const byPath = /from ['"].*memory\/(parse|index)\.js['"]/.test(text);
        const bySymbol = /\b(validateRecord|readRecord|validateMemoryRecord)\b/.test(text);
        if (byPath || bySymbol) offenders.push(full);
      }
    };
    walk(src);
    // `core/index.ts` re-exports the barrel — publication, not consumption.
    // `cli.ts` consumes it for `gate doctor --memory`, which is PRD-019's whole
    // subject. Anything else appearing here is a new caller and wants its own
    // justification, which is what this assertion is for.
    expect(offenders.map((f) => f.slice(src.length + 1)).sort()).toEqual([
      'cli.ts',
      'core/index.ts',
    ]);
    // The property the original guarded, asserted directly rather than inferred
    // from the caller list: reachability is not enablement.
    expect(DEFAULT_CONFIG.memory.enabled).toBe(false);
  });
});

/**
 * PRD-017 FR-2 containment, against a REAL filesystem. Watch globs are checked
 * lexically and need no tree; the CONFIGURED paths are read, so those are the
 * ones worth resolving — and the three cases below each defeated a simpler
 * version during review.
 */
describe('configured memory paths against a real tree (FR-2)', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  /** A repo with a direct escape, a dangling link, a CHAIN, a loop, and a clean dir. */
  function tree(): string {
    const base = mkdtempSync(join(tmpdir(), 'provegate-contain-'));
    roots.push(base);
    const repo = join(base, 'repo');
    mkdirSync(join(repo, 'inside'), { recursive: true });
    mkdirSync(join(base, 'outside'), { recursive: true });
    symlinkSync(join(base, 'outside'), join(repo, 'direct'));
    symlinkSync(join(base, 'gone', 'nowhere'), join(repo, 'nested'));
    symlinkSync('nested', join(repo, 'alias')); // chain: alias -> nested -> outside
    symlinkSync('loop', join(repo, 'loop'));
    return repo;
  }

  const load = (repo: string, root: string): string[] => {
    writeFileSync(
      join(repo, 'workflow.config.json'),
      JSON.stringify({
        memory: {
          enabled: true,
          root,
          index: `${root}/INDEX.md`,
          entrypoints: ['CLAUDE.md'],
        },
      }),
    );
    try {
      resolveConfig(repo);
      return [];
    } catch (error) {
      return (error as { issues?: { path: string }[] }).issues?.map((i) => i.path) ?? ['threw'];
    }
  };

  it.each([
    ['a symlink straight out of the workspace', 'direct', false],
    ['a dangling symlink pointing outside', 'nested', false],
    ['a CHAIN whose first hop looks in-repo', 'alias', false],
    ['a symlink loop', 'loop', false],
    ['an ordinary contained directory', 'inside', true],
  ])('%s', (_label, root, shouldLoad) => {
    const issues = load(tree(), root);
    if (shouldLoad) {
      // Over-rejection is a defect too: a plain directory must still load.
      expect(issues).toEqual([]);
    } else {
      expect(issues).toContain('memory.root');
    }
  });
});

describe('phase 6 round 21 regressions — the record validator', () => {
  const FRONT = [
    'name: r',
    'description: d',
    'type: convention',
    'scope: workflow',
    'status: active',
  ];
  const RECORD = (body: string, front: string[] = FRONT): string =>
    ['---', ...front, '---', body].join('\n');
  const BODY = 'Body.\n\n**Why:** a reason.\n**How to apply:** a method.\n';

  it('[R21-8] a rationale hidden in a comment or a fence is not a rationale', () => {
    // A record whose entire rationale lives inside an HTML comment renders as a
    // heading with nothing under it. The raw-text search called it satisfied —
    // the ceremonial record this validator exists to reject, wearing its
    // approval. Both readers consume the same scan now.
    const commented = validateRecord(
      RECORD('Body.\n\n<!--\n**Why:** hidden\n**How to apply:** hidden\n-->\n'),
      'learnings/r.md',
      'r',
    );
    expect(commented.record).toBeNull();
    const fenced = validateRecord(
      RECORD('Body.\n\n```\n**Why:** hidden\n**How to apply:** hidden\n```\n'),
      'learnings/r.md',
      'r',
    );
    expect(fenced.record).toBeNull();
    // A visible one still passes.
    expect(validateRecord(RECORD(BODY), 'learnings/r.md', 'r').record).not.toBeNull();
  });

  it('[R21-9] a quoted value is refused, not stored with its quotes', () => {
    // `watch: ["packages/**"]` compiled to a glob containing a quote character
    // and matched nothing — a watch that is present, valid-looking and
    // permanently dead.
    const quoted = validateRecord(
      RECORD(BODY, [...FRONT, 'watch: ["packages/**"]']),
      'learnings/r.md',
      'r',
    );
    expect(quoted.record).toBeNull();
    expect(quoted.issues.map((i) => i.message).join('; ')).toContain('quoted');
    // The bare form is what the subset takes, and it matches.
    const bare = validateRecord(
      RECORD(BODY, [...FRONT, 'watch: [packages/**]']),
      'learnings/r.md',
      'r',
    );
    expect(bare.record?.watch).toEqual(['packages/**']);
  });

  it('[R21-9b] a flow mapping is refused rather than read as a scalar', () => {
    const flow = validateRecord(
      RECORD(BODY, ['name: r', 'description: {nested: map}', 'type: convention', 'scope: workflow', 'status: active']),
      'learnings/r.md',
      'r',
    );
    expect(flow.record).toBeNull();
    expect(flow.issues.map((i) => i.message).join('; ')).toContain('flow mapping');
  });

  it('[R21-13] a CRLF record is read, not reported as having no frontmatter', () => {
    const crlf = RECORD(BODY).replace(/\n/g, '\r\n');
    const result = validateRecord(crlf, 'learnings/r.md', 'r');
    expect(result.issues).toEqual([]);
    expect(result.record).not.toBeNull();
  });
});

describe('phase 6 round 21 — one spelling for one path', () => {
  it('[R21-10] a watch fires whatever spelling either side uses', () => {
    // `globToRegExp` compiles a backslash as a LITERAL, so a Windows-spelled
    // watch matched nothing at all; and `./packages/x/a.ts` evaded
    // `packages/x/**`. A watch that is present, valid-looking and permanently
    // dead is worse than a missing one, because the record looks covered.
    expect(watchMatches(['packages/x/**'], ['./packages/x/a.ts'])).toEqual(['packages/x/a.ts']);
    expect(watchMatches(['packages/x/**'], ['packages//x/a.ts'])).toEqual(['packages/x/a.ts']);
    expect(watchMatches(['packages\\x\\**'], ['packages/x/a.ts'])).toEqual(['packages/x/a.ts']);
    expect(watchMatches(['packages/x/**'], ['packages/x/a.ts::doThing'])).toEqual([
      'packages/x/a.ts',
    ]);
    // And it still does NOT match something outside the glob.
    expect(watchMatches(['packages/x/**'], ['./docs/a.md'])).toEqual([]);
  });
});

describe('phase 6 round 22 — one step over', () => {
  it('[R22-7] a rationale marker inside inline code is a snippet, not a section', () => {
    // `contractView` preserves code spans on purpose — the contract grammar
    // reads slugs and paths out of backticks — so a body made of
    // `` `**Why:** fake` `` rendered as a snippet and validated as a rationale.
    const body = 'Body.\n\n`**Why:** fake reason`\n`**How to apply:** fake method`\n';
    const doc = [
      '---',
      'name: r',
      'description: d',
      'type: convention',
      'scope: workflow',
      'status: active',
      '---',
      body,
    ].join('\n');
    expect(validateRecord(doc, 'learnings/r.md', 'r').record).toBeNull();
  });

  it('[R22-8] a real filename containing `::` is matched literally', () => {
    // `::` is a symbol selector by convention and a legal filename character by
    // rule, so stripping unconditionally left a watch on `src/a::b.ts` unable to
    // fire — it was asked about `src/a`.
    expect(watchMatches(['src/a::b.ts'], ['src/a::b.ts'])).toEqual(['src/a::b.ts']);
    // And the symbol form still resolves to the path a maintainer wrote.
    expect(watchMatches(['packages/x/**'], ['packages/x/a.ts::doThing'])).toEqual([
      'packages/x/a.ts',
    ]);
  });
});

describe('FR-1 — read-only memory doctor', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  const RECORD = [
    '---',
    'name: sample-record',
    'description: a record the doctor resolves',
    'type: convention',
    'scope: workflow',
    'status: active',
    '---',
    '',
    'Body.',
    '',
    '**Why:** a reason.',
    '**How to apply:** a method.',
    '',
  ].join('\n');

  /** A minimal but COMPLETE install: everything the mandatory checks look for. */
  function install(over: { entrypoints?: string[]; index?: string } = {}): {
    root: string;
    config: typeof DEFAULT_CONFIG;
    manifest: GatesManifest;
  } {
    const root = mkdtempSync(join(tmpdir(), 'provegate-doctor-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      '# INDEX\n\n- [sample](learnings/sample-record.md) — hook\n',
    );
    writeFileSync(join(root, '_brain/learnings/sample-record.md'), RECORD);
    writeFileSync(join(root, 'CLAUDE.md'), 'Read `_brain/INDEX.md` before any work.\n');
    // A COMPLETE install means the validator's implementation is on disk too.
    // The first version wrote `node x` and never created `x`, so the fixture the
    // suite called "complete" was itself a broken install — and every assertion
    // built on it was measuring the wrong thing.
    mkdirSync(join(root, 'scripts/verify'), { recursive: true });
    writeFileSync(join(root, 'scripts/verify/verify-brain.mjs'), '// noop\n');
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ scripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' } }),
    );
    const config = deepMerge(DEFAULT_CONFIG, {
      memory: {
        enabled: true,
        entrypoints: over.entrypoints ?? ['CLAUDE.md'],
        ...(over.index === undefined ? {} : { index: over.index }),
      },
    } as PartialWorkflowConfig) as typeof DEFAULT_CONFIG;
    const manifest: GatesManifest = {
      ...defaultManifest(config),
      phases: { ...defaultManifest(config).phases, '7': ['pnpm verify:brain'] },
    };
    return { root, config, manifest };
  }

  const run = (o: { root: string; config: typeof DEFAULT_CONFIG; manifest: GatesManifest }) =>
    memoryDoctor({
      config: o.config,
      manifest: o.manifest,
      root: o.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
    });

  const check = (r: ReturnType<typeof memoryDoctor>, id: string) =>
    r.checks.filter((c) => c.id === id);

  it('a complete install is reachable, and the doctor writes nothing', () => {
    const site = install();
    const before = readdirSync(site.root).sort();
    const report = run(site);
    expect(report.ok).toBe(true);
    expect(report.code).toBe(0);
    expect(report.checks.some((c) => c.severity === 'fail')).toBe(false);
    // READ-ONLY is the contract, not an implementation detail: an adopter runs
    // this when something is already wrong.
    expect(readdirSync(site.root).sort()).toEqual(before);
  });

  it('memory OFF is not a failure — every check is skipped and says so', () => {
    const site = install();
    const off = deepMerge(site.config, { memory: { enabled: false } } as PartialWorkflowConfig);
    const report = memoryDoctor({
      config: off as typeof DEFAULT_CONFIG,
      manifest: site.manifest,
      root: site.root,
    });
    expect(report.disabled).toBe(true);
    expect(report.ok).toBe(true);
    expect(report.code).toBe(0);
    expect(report.checks).toHaveLength(1);
  });

  it('a validator whose script body names a missing file FAILS', () => {
    // "the script key exists" and "the script runs" are different facts. The
    // first version checked only the key, so `"verify:brain": "node x"` with no
    // `x` reported a healthy install that failed the moment Phase 7 ran it.
    const site = install();
    rmSync(join(site.root, 'scripts/verify/verify-brain.mjs'));
    const report = run(site);
    expect(check(report, 'memory.verify.script.wired')[0]!.severity).toBe('fail');
    expect(check(report, 'memory.verify.script.wired')[0]!.detail).toContain('verify-brain.mjs');
    expect(report.code).toBe(1);
  });

  it('every mandatory check fails on absence — all seven of them', () => {
    // The earlier version of this test named "every mandatory check" and
    // exercised two. Each row below removes exactly one thing and asserts the
    // check that owns it.
    const cases: [string, (root: string, site: ReturnType<typeof install>) => unknown][] = [
      ['memory.index.resolvable', (root) => rmSync(join(root, '_brain/INDEX.md'))],
      ['memory.root.resolvable', (root) => rmSync(join(root, '_brain'), { recursive: true })],
      [
        'memory.records.valid',
        (root) => writeFileSync(join(root, '_brain/learnings/sample-record.md'), 'broken\n'),
      ],
      [
        'memory.entrypoint.pointer',
        (root) => writeFileSync(join(root, 'CLAUDE.md'), 'no pointer here\n'),
      ],
      ['memory.verify.script.wired', (root) => rmSync(join(root, 'scripts/verify/verify-brain.mjs'))],
    ];
    for (const [id, breakIt] of cases) {
      const site = install();
      breakIt(site.root, site);
      const report = run(site);
      expect(check(report, id).some((c) => c.severity === 'fail'), id).toBe(true);
      expect(report.code, id).toBe(1);
    }
    // And the two that live in the manifest rather than on disk.
    const site = install();
    const bare: GatesManifest = { ...site.manifest, phases: { ...site.manifest.phases, '7': [] } };
    const report = memoryDoctor({
      config: site.config,
      manifest: bare,
      root: site.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
    });
    expect(check(report, 'memory.phase7.reachable')[0]!.severity).toBe('fail');
  });

  it('a backslash-spelled configured path resolves like a slash-spelled one', () => {
    // The config validator and the store loader both accept it, so a doctor that
    // passed the raw string to `resolve` failed a legitimate portable config.
    const site = install();
    const windows = deepMerge(site.config, {
      memory: { index: '_brain\\INDEX.md', root: '_brain' },
    } as PartialWorkflowConfig) as typeof DEFAULT_CONFIG;
    const report = memoryDoctor({
      config: windows,
      manifest: site.manifest,
      root: site.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
    });
    expect(check(report, 'memory.index.resolvable')[0]!.severity).toBe('pass');
  });

  it('a legacy check that a single removal still fails closed', () => {
    // `false-green-on-missing-file` from the other end: a doctor that skips what
    // it cannot find reports a broken install as healthy.
    const site = install();
    rmSync(join(site.root, '_brain/INDEX.md'));
    rmSync(join(site.root, '_brain/learnings/sample-record.md'));
    const report = run(site);
    expect(report.ok).toBe(false);
    expect(report.code).toBe(1);
    expect(check(report, 'memory.index.resolvable')[0]!.severity).toBe('fail');
    expect(check(report, 'memory.records.valid').some((c) => c.severity === 'fail')).toBe(true);
  });

  it('[W1] an in-repo symlinked entrypoint is VALID', () => {
    // This repository ships `AGENTS.md` as a symlink to `CLAUDE.md`. Containment
    // rejects escapes, not symlinks.
    const site = install({ entrypoints: ['AGENTS.md'] });
    symlinkSync(join(site.root, 'CLAUDE.md'), join(site.root, 'AGENTS.md'));
    const report = run(site);
    expect(check(report, 'memory.entrypoint.pointer')[0]!.severity).toBe('pass');
  });

  it('[W1] two entrypoints resolving to one real file count as ONE', () => {
    const site = install({ entrypoints: ['CLAUDE.md', 'AGENTS.md'] });
    symlinkSync(join(site.root, 'CLAUDE.md'), join(site.root, 'AGENTS.md'));
    const report = run(site);
    const entry = check(report, 'memory.entrypoint.pointer')[0]!;
    expect(entry.severity).toBe('pass');
    // Counting the link and its target as two would overstate coverage.
    expect(entry.detail).toContain('1 entrypoint');
  });

  it('[W1] an entrypoint resolving OUTSIDE the repository fails as an escape', () => {
    const outside = mkdtempSync(join(tmpdir(), 'provegate-outside-'));
    roots.push(outside);
    writeFileSync(join(outside, 'elsewhere.md'), 'Read `_brain/INDEX.md`.\n');
    const site = install({ entrypoints: ['AGENTS.md'] });
    symlinkSync(join(outside, 'elsewhere.md'), join(site.root, 'AGENTS.md'));
    const report = run(site);
    const entry = check(report, 'memory.entrypoint.pointer');
    expect(entry.some((c) => c.severity === 'fail')).toBe(true);
    expect(entry.map((c) => c.detail).join('; ')).toContain('outside the repository');
  });

  it('an entrypoint that mentions the index only inside a comment does not count', () => {
    // A commented pointer renders as nothing — the same rule the contract
    // grammar applies to a declaration.
    const site = install();
    writeFileSync(join(site.root, 'CLAUDE.md'), '<!-- read `_brain/INDEX.md` -->\n');
    const report = run(site);
    expect(check(report, 'memory.entrypoint.pointer')[0]!.severity).toBe('fail');
  });

  it('a validator wired to a missing package script fails', () => {
    const site = install();
    const report = memoryDoctor({
      config: site.config,
      manifest: site.manifest,
      root: site.root,
      packageScripts: {},
    });
    expect(check(report, 'memory.verify.script.wired')[0]!.severity).toBe('fail');
    expect(report.code).toBe(1);
  });

  it('no Phase 7 validator at all is a failure, not a warning', () => {
    const site = install();
    const bare: GatesManifest = { ...site.manifest, phases: { ...site.manifest.phases, '7': [] } };
    const report = memoryDoctor({
      config: site.config,
      manifest: bare,
      root: site.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
    });
    expect(check(report, 'memory.phase7.reachable')[0]!.severity).toBe('fail');
  });

  it('CI absence WARNS — layouts are user-defined and absence proves nothing', () => {
    const site = install();
    const report = memoryDoctor({
      config: site.config,
      manifest: site.manifest,
      root: site.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
      ciTexts: [],
    });
    const ci = check(report, 'memory.ci.reachable')[0]!;
    expect(ci.severity).toBe('warn');
    // A warning must not change the exit code.
    expect(report.ok).toBe(true);
    expect(report.code).toBe(0);
  });

  it('CI presence passes when a workflow mentions the validator', () => {
    const site = install();
    const report = memoryDoctor({
      config: site.config,
      manifest: site.manifest,
      root: site.root,
      packageScripts: { 'verify:brain': 'node scripts/verify/verify-brain.mjs' },
      ciTexts: ['jobs:\n  gates:\n    steps:\n      - run: pnpm verify:brain\n'],
    });
    expect(check(report, 'memory.ci.reachable')[0]!.severity).toBe('pass');
  });

  it('an unfilled template placeholder warns without blocking', () => {
    const site = install();
    writeFileSync(
      join(site.root, '_brain/INDEX.md'),
      '# {{PROJECT_NAME}} INDEX\n\n- [sample](learnings/sample-record.md) — hook\n',
    );
    const report = run(site);
    const ph = check(report, 'memory.placeholders.filled')[0]!;
    expect(ph.severity).toBe('warn');
    expect(ph.detail).toContain('PROJECT_NAME');
    expect(report.code).toBe(0);
  });
});

describe('FR-3 — deterministic local recall', () => {
  const roots: string[] = [];
  afterEach(() => {
    while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
  });

  const record = (name: string, over: Record<string, string> = {}): string =>
    [
      '---',
      `name: ${name}`,
      `description: ${over.description ?? 'a record about nothing in particular'}`,
      `type: ${over.type ?? 'convention'}`,
      'scope: workflow',
      `status: ${over.status ?? 'active'}`,
      ...(over.superseded === undefined ? [] : [`superseded-by: ${over.superseded}`]),
      ...(over.watch === undefined ? [] : [`watch: [${over.watch}]`]),
      ...(over.tags === undefined ? [] : [`tags: [${over.tags}]`]),
      '---',
      '',
      'Body.',
      '',
      '**Why:** a reason.',
      '**How to apply:** a method.',
      '',
    ].join('\n');

  /** A store whose records are chosen to separate every ranking tier. */
  function store(): { root: string; config: typeof DEFAULT_CONFIG } {
    const root = mkdtempSync(join(tmpdir(), 'provegate-find-'));
    roots.push(root);
    mkdirSync(join(root, '_brain/learnings'), { recursive: true });
    const files: [string, string][] = [
      ['watcher', record('watcher', { watch: 'packages/x/**', description: 'guards the x tree' })],
      ['tagged', record('tagged', { tags: 'caching', description: 'about storage' })],
      ['described', record('described', { description: 'a note about caching behaviour' })],
      ['caching', record('caching', { description: 'unrelated words here' })],
      // ZZZ FIRST in the index, deliberately: if the store's own order decided,
      // this pair would come back reversed and the tie-break assertion below
      // would pass without the tie-break existing.
      ['zzz-tie', record('zzz-tie', { description: 'a note about caching behaviour' })],
      ['aaa-tie', record('aaa-tie', { description: 'a note about caching behaviour' })],
      ['retired', record('retired', { status: 'superseded', superseded: 'watcher', description: 'about caching' })],
    ];
    for (const [slug, body] of files) {
      writeFileSync(join(root, `_brain/learnings/${slug}.md`), body);
    }
    writeFileSync(
      join(root, '_brain/INDEX.md'),
      ['# INDEX', '', ...files.map(([slug]) => `- [${slug}](learnings/${slug}.md) — hook`), ''].join(
        '\n',
      ),
    );
    const config = deepMerge(DEFAULT_CONFIG, {
      memory: { enabled: true, entrypoints: ['CLAUDE.md'] },
    } as PartialWorkflowConfig) as typeof DEFAULT_CONFIG;
    return { root, config };
  }

  const slugs = (r: ReturnType<typeof memoryFind>) => r.hits.map((h) => h.slug);

  it('requires a selector — a bare find would be `cat INDEX.md` with extra steps', () => {
    const { root, config } = store();
    const result = memoryFind(config, root, {});
    expect(result.ok).toBe(false);
    expect(result.problem).toContain('no selector');
  });

  it('disabled memory REFUSES rather than returning an empty list', () => {
    // An empty list reads as "nothing relevant", which is a lie about a store
    // that was never consulted.
    const { root, config } = store();
    const off = deepMerge(config, { memory: { enabled: false } } as PartialWorkflowConfig);
    const result = memoryFind(off as typeof DEFAULT_CONFIG, root, { query: 'caching' });
    expect(result.ok).toBe(false);
    expect(result.hits).toEqual([]);
    expect(result.remedy).toContain('memory.enabled');
  });

  it('ranks watch overlap above every other signal', () => {
    const { root, config } = store();
    const result = memoryFind(config, root, { paths: ['packages/x/a.ts'], query: 'caching' });
    expect(result.ok).toBe(true);
    expect(slugs(result)[0]).toBe('watcher');
    expect(result.hits[0]!.reasons).toContain('watch');
    expect(result.hits[0]!.matchedPaths).toEqual(['packages/x/a.ts']);
  });

  it('ranks an exact name or tag above a token match', () => {
    const { root, config } = store();
    const byTag = memoryFind(config, root, { tag: 'caching', query: 'caching' });
    // `caching` matches by exact NAME; `tagged` by exact TAG; both outrank the
    // records that merely mention the word.
    expect(slugs(byTag).slice(0, 2).sort()).toEqual(['caching', 'tagged']);
  });

  it('breaks ties lexically, which is what makes a run byte-stable', () => {
    const { root, config } = store();
    const first = memoryFind(config, root, { query: 'caching' });
    const second = memoryFind(config, root, { query: 'caching' });
    expect(slugs(first)).toEqual(slugs(second));
    // `aaa-tie` and `zzz-tie` carry identical signals, so only the slug decides.
    const tied = slugs(first).filter((s) => s.endsWith('-tie'));
    expect(tied).toEqual(['aaa-tie', 'zzz-tie']);
  });

  it('never surfaces a superseded record', () => {
    // Recall must not hand an agent a record the validator would reject: acting
    // on a superseded record is worse than finding nothing.
    const { root, config } = store();
    const result = memoryFind(config, root, { query: 'caching' });
    expect(slugs(result)).not.toContain('retired');
    expect(result.searched).toBe(6);
  });

  it('bounds the limit, and refuses out of range BEFORE computing anything', () => {
    const { root, config } = store();
    expect(memoryFind(config, root, { query: 'caching' }).limit).toBe(FIND_DEFAULT_LIMIT);
    expect(memoryFind(config, root, { query: 'caching', limit: 2 }).hits).toHaveLength(2);
    for (const limit of [0, -1, FIND_MAX_LIMIT + 1, 1.5, Number.NaN]) {
      const bad = memoryFind(config, root, { query: 'caching', limit });
      expect(bad.ok, String(limit)).toBe(false);
      expect(bad.hits, String(limit)).toEqual([]);
      // Nothing was searched: the refusal is free and store-independent.
      expect(bad.searched, String(limit)).toBe(0);
    }
  });

  it('refuses a path selector that is not repo-relative', () => {
    // A `..` selector cannot match any watch glob, so accepting it would answer
    // a malformed question with an empty list.
    const { root, config } = store();
    for (const path of ['/etc/passwd', '../outside/a.ts', 'C:/x/a.ts']) {
      const bad = memoryFind(config, root, { paths: [path] });
      expect(bad.ok, path).toBe(false);
      expect(bad.problem, path).toContain('repo-relative');
    }
  });

  it('every hit carries the reasons it matched', () => {
    // Ranking is deterministic rather than relevant, so the reasons are how an
    // author sees WHY a record is here.
    const { root, config } = store();
    const result = memoryFind(config, root, { paths: ['packages/x/a.ts'], tag: 'caching' });
    for (const hit of result.hits) {
      expect(hit.reasons.length).toBeGreaterThan(0);
      expect(hit.slug.length).toBeGreaterThan(0);
      expect(hit.path).toMatch(/^(learnings|adr)\//);
      expect(typeof hit.description).toBe('string');
    }
  });
});
