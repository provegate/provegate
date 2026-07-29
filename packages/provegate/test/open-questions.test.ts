import {
  existsSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join,  } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorkflowConfig } from '../src/core/config/index.js';
import { loadConfig } from '../src/core/config/load.js';
import { defaultManifest, loadManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';
import { parseArtifactName } from '../src/core/state/artifacts.js';
import { repoPath } from './helpers/repo-reads.js';

/**
 * PRD-028: the closed §9 grammar. Eight successive exemption rules produced
 * nine hiding places, each created by the previous fix; the ninth rule is a
 * closed set of allowed raw lines whose deferral form is RESOLVED through the
 * state layer to a distinct, registered, unfinished work item. The deny matrix
 * below is the requirement: one fixture per history row (nine), plus the seven
 * resolution rejections — sixteen rows, each paired with a positive control on
 * the same shape, because a deny fixture whose input would fail anyway is not
 * evidence (`assert-absent-needs-an-independent-cause`).
 */

const cfg = DEFAULT_CONFIG;
const manifest = defaultManifest(cfg);

/** A lint-green document apart from what a test plants in §9. The declaring
 * number is 42 everywhere — the fifth production argument. */
const doc = (section9: string[]): string =>
  [
    '# PRD-042: Fixture',
    '',
    '## 4. Functional Requirements',
    '',
    '1. **FR-1**: does a thing.',
    '   - **Targets:** `packages/x/src/a.ts`',
    '',
    '## 9. Open Questions',
    '',
    ...section9,
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command |',
    '| ---- | ------- |',
    '| FR-1 | `pnpm test test/a.test.ts` |',
    '',
    '## 12. DO NOT (Anti-Patterns)',
    '',
    '- DO NOT do bad things.',
    '',
    '## Durable Artifacts',
    '',
    '- none — fixture: no durable output expected',
    '',
  ].join('\n');

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** A workspace holding the declaring PRD (042) and a real, distinct,
 * unfinished follow-up (123) with its own H1 — the referent every positive
 * control resolves to. Symlink fixtures are created at test runtime, never
 * committed as repository symlinks. */
function workspace(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-oq-'));
  roots.push(root);
  for (const state of cfg.dirs.states) mkdirSync(join(root, '_prds', state), { recursive: true });
  writeFileSync(join(root, '_prds/wip/prd-042-declaring.md'), '# PRD-042: Declaring\n\nBody.\n');
  writeFileSync(join(root, '_prds/wip/prd-123-followup.md'), '# PRD-123: Followup\n\nBody.\n');
  return root;
}

/** The §9-class issues only: the matrix proves the grammar, so an unrelated
 * issue (value header, memory) must not be what a deny row rides on. */
const oq = (
  content: string,
  root?: string,
  num: number | null | undefined = 42,
  config: WorkflowConfig = cfg,
): string[] =>
  lintPrd(config, defaultManifest(config), content, root, num).issues.filter((i) =>
    i.startsWith('Open Questions'),
  );

const VALID_DEFERRAL = '- Deferred to [PRD-123](_prds/wip/prd-123-followup.md)';

describe('FR-1 — the sixteen-row deny matrix, each row paired with its positive control', () => {
  interface Row {
    name: string;
    deny: string[];
    reason: string;
    positive: string[];
  }

  const rows: Row[] = [
    {
      name: 'row 0 — a bullet that merely mentions the word',
      deny: ['- We deferred the auth decision pending security review'],
      reason: 'is not in the closed grammar',
      positive: ['- (none)'],
    },
    {
      name: 'row 1 — free text carrying a link',
      deny: ['- Why was this deferred? See [background](docs/background.md)'],
      reason: 'is not in the closed grammar',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'row 2 — a same-line tail after the marker',
      deny: ['- (none) — why is auth still undecided?'],
      reason: 'a tail after the `- (none)` marker',
      positive: ['- (none)'],
    },
    {
      name: 'row 3a — an indented continuation under the exempt bullet',
      deny: ['- (none)', '  why is auth still undecided?'],
      reason: 'an indented continuation',
      positive: ['- (none)'],
    },
    {
      name: 'row 3b — an HTML comment',
      deny: ['- (none)', '<!-- Who owns the authorization decision? -->'],
      reason: 'an HTML comment',
      positive: ['- (none)'],
    },
    {
      name: 'row 4 — a question in the link label',
      deny: ['- Deferred: [Who owns authorization?](background.md)'],
      reason: 'is not in the closed grammar',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'row 5 — a target that does not exist',
      deny: ['- Deferred to [PRD-777](_prds/wip/prd-777-who-owns-authorization.md)'],
      reason: 'does not exist',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'row 6 — a self-link by number',
      deny: ['- Deferred to [PRD-042](_prds/wip/prd-042-declaring.md)'],
      reason: 'the declaring PRD itself',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'row 7 — a symlink alias to the declaring PRD',
      deny: ['- Deferred to [PRD-124](_prds/wip/prd-124-alias.md)'],
      reason: 'not a regular file',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'rejection — a completed-role target is finished work',
      deny: ['- Deferred to [PRD-125](_prds/completed/prd-125-done.md)'],
      reason: 'not the configured wip or deferred role',
      positive: ['- Deferred to [PRD-126](_prds/deferred/prd-126-later.md)'],
    },
    {
      name: 'rejection — a wrong-width label',
      deny: ['- Deferred to [PRD-23](_prds/wip/prd-023-x.md)'],
      reason: 'is not in the closed grammar',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'rejection — a basename the artifact parser refuses',
      deny: ['- Deferred to [PRD-123](_prds/wip/prd-123.md)'],
      reason: 'does not parse as a registered work item',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'rejection — label and target naming different numbers',
      deny: ['- Deferred to [PRD-123](_prds/wip/prd-124-other.md)'],
      reason: 'different numbers',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'rejection — a symlink alias to a DIFFERENT PRD (non-regular is refused outright)',
      deny: ['- Deferred to [PRD-127](_prds/wip/prd-127-alias-other.md)'],
      reason: 'not a regular file',
      positive: [VALID_DEFERRAL],
    },
    {
      name: 'rejection — an H1-less stub is not a filed work item',
      deny: ['- Deferred to [PRD-128](_prds/wip/prd-128-stub.md)'],
      reason: 'does not carry its own H1',
      positive: [VALID_DEFERRAL],
    },
  ];

  /** Disk state the deny rows above reference. */
  function populate(root: string): void {
    symlinkSync(
      join(root, '_prds/wip/prd-042-declaring.md'),
      join(root, '_prds/wip/prd-124-alias.md'),
    );
    symlinkSync(
      join(root, '_prds/wip/prd-123-followup.md'),
      join(root, '_prds/wip/prd-127-alias-other.md'),
    );
    writeFileSync(join(root, '_prds/completed/prd-125-done.md'), '# PRD-125: Done\n');
    writeFileSync(join(root, '_prds/deferred/prd-126-later.md'), '# PRD-126: Later\n');
    writeFileSync(join(root, '_prds/wip/prd-124-other.md'), '# PRD-124: Other\n');
    writeFileSync(join(root, '_prds/wip/prd-128-stub.md'), 'a smuggled question, no heading\n');
    // Round 1 (codex): the wrong-width and parser-rejected rows carry
    // otherwise-valid EXISTING targets, so the named rule is each row's only
    // failing cause — a deny riding on a missing file is not evidence.
    writeFileSync(join(root, '_prds/wip/prd-023-x.md'), '# PRD-023: X\n');
    writeFileSync(join(root, '_prds/wip/prd-123.md'), '# PRD-123: Parser Reject\n');
  }

  for (const row of rows) {
    it(row.name, () => {
      const root = workspace();
      populate(root);
      const denied = oq(doc(row.deny), root);
      expect(denied.length, `deny: ${row.deny.join(' | ')}`).toBeGreaterThan(0);
      expect(denied.join('; ')).toContain(row.reason);
      expect(oq(doc(row.positive), root), `positive: ${row.positive.join(' | ')}`).toEqual([]);
    });
  }

  it('row — a deferral linted without the declaring number fails closed as unverifiable', () => {
    const root = workspace();
    for (const absent of [undefined, null] as const) {
      // lintPrd called directly: the helper's default number would swallow an
      // explicit `undefined`, and the absent-argument path is the fixture.
      const denied = lintPrd(cfg, manifest, doc([VALID_DEFERRAL]), root, absent).issues.filter(
        (i) => i.startsWith('Open Questions'),
      );
      expect(denied.join('; ')).toContain('no declaring PRD number');
    }
    expect(oq(doc([VALID_DEFERRAL]), root, 42)).toEqual([]);
  });

  it('row — a deferral linted without a repository root fails closed too', () => {
    expect(oq(doc([VALID_DEFERRAL]), undefined, 42).join('; ')).toContain('no repository root');
  });

  it('a path escaping the artifact root is refused, lexically and canonically', () => {
    const root = workspace();
    expect(oq(doc(['- Deferred to [PRD-123](../elsewhere/prd-123-followup.md)']), root).join('; ')).toContain(
      'repository-relative with no `..` segments',
    );
    writeFileSync(join(root, 'prd-123-outside.md'), '# PRD-123: Outside\n');
    expect(oq(doc(['- Deferred to [PRD-123](prd-123-outside.md)']), root).join('; ')).toContain(
      'inside the configured artifact root',
    );
    expect(
      oq(doc(['- Deferred to [PRD-123](_prds/wip/nested/prd-123-followup.md)']), root).join('; '),
    ).toContain('directly inside a lifecycle state directory');
  });

  it('[R1-P1-1] a state DIRECTORY aliased to another role cannot relabel finished work', () => {
    // `_prds/deferred` → `_prds/completed`: the file-level lstat sees a regular
    // file, the realpath stays under the artifact root, and the H1 is real —
    // only the canonical state segment betrays the alias.
    const root = mkdtempSync(join(tmpdir(), 'provegate-oq-'));
    roots.push(root);
    mkdirSync(join(root, '_prds/wip'), { recursive: true });
    mkdirSync(join(root, '_prds/completed'), { recursive: true });
    writeFileSync(join(root, '_prds/wip/prd-042-declaring.md'), '# PRD-042: Declaring\n');
    writeFileSync(join(root, '_prds/completed/prd-129-done.md'), '# PRD-129: Done\n');
    symlinkSync(join(root, '_prds/completed'), join(root, '_prds/deferred'));
    expect(
      oq(doc(['- Deferred to [PRD-129](_prds/deferred/prd-129-done.md)']), root).join('; '),
    ).toContain('canonically sits outside its claimed state directory');
  });

  it('[R1-P1-2] a hardlinked target is refused — realpath canonicalizes names, not identity', () => {
    const root = workspace();
    writeFileSync(join(root, '_prds/completed/prd-130-done.md'), '# PRD-130: Done\n');
    linkSync(join(root, '_prds/completed/prd-130-done.md'), join(root, '_prds/wip/prd-130-alias.md'));
    expect(
      oq(doc(['- Deferred to [PRD-130](_prds/wip/prd-130-alias.md)']), root).join('; '),
    ).toContain('multiple hard links');
    // the same file with one link resolves — the refusal is about link count
    writeFileSync(join(root, '_prds/wip/prd-131-single.md'), '# PRD-131: Single\n');
    expect(oq(doc(['- Deferred to [PRD-131](_prds/wip/prd-131-single.md)']), root)).toEqual([]);
  });

  it('a state directory that is itself a symlink out of the root fails the canonical check', () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-oq-'));
    roots.push(root);
    mkdirSync(join(root, '_prds/wip'), { recursive: true });
    writeFileSync(join(root, '_prds/wip/prd-042-declaring.md'), '# PRD-042: Declaring\n');
    const outside = join(root, 'outside');
    mkdirSync(outside, { recursive: true });
    writeFileSync(join(outside, 'prd-123-followup.md'), '# PRD-123: Followup\n');
    symlinkSync(outside, join(root, '_prds/deferred'));
    expect(
      oq(doc(['- Deferred to [PRD-123](_prds/deferred/prd-123-followup.md)']), root).join('; '),
    ).toContain('canonically resolves outside the artifact root');
  });

  it('the roles are CONFIG, not literals: a custom wip role resolves, its completed role refuses', () => {
    const custom: WorkflowConfig = {
      ...cfg,
      dirs: {
        ...cfg.dirs,
        states: ['doing', 'done', 'later'],
        stateRoles: { wip: 'doing', completed: 'done', deferred: 'later' },
      },
    };
    const root = mkdtempSync(join(tmpdir(), 'provegate-oq-'));
    roots.push(root);
    for (const state of custom.dirs.states) mkdirSync(join(root, '_prds', state), { recursive: true });
    writeFileSync(join(root, '_prds/doing/prd-042-declaring.md'), '# PRD-042: Declaring\n');
    writeFileSync(join(root, '_prds/doing/prd-123-followup.md'), '# PRD-123: Followup\n');
    writeFileSync(join(root, '_prds/done/prd-125-done.md'), '# PRD-125: Done\n');
    expect(oq(doc(['- Deferred to [PRD-123](_prds/doing/prd-123-followup.md)']), root, 42, custom)).toEqual([]);
    expect(
      oq(doc(['- Deferred to [PRD-125](_prds/done/prd-125-done.md)']), root, 42, custom).join('; '),
    ).toContain("'done' is not the configured wip or deferred role");
  });

  it('[R2-P1-1] a target carrying `#`, `\\` or `:` is refused — two readers, one referent', () => {
    const root = workspace();
    writeFileSync(join(root, '_prds/wip/prd-133-a#b.md'), '# PRD-133: Fragmented\n');
    writeFileSync(join(root, '_prds/wip/prd-133-a?x.md'), '# PRD-133: Queried\n');
    writeFileSync(join(root, '_prds/wip/prd-133-a&quest;b.md'), '# PRD-133: Entity\n');
    writeFileSync(join(root, '_prds/wip/prd-133-a\u0007b.md'), '# PRD-133: Control\n');
    for (const target of [
      '_prds/wip/prd-133-a#b.md',
      '_prds/wip/prd-133-a?x.md',
      '_prds/wip/prd-123-follow%75p.md',
      '_prds/wip/prd-133-a&quest;b.md',
      '_prds\\wip\\prd-123-followup.md',
      'file:_prds/wip/prd-123-followup.md',
      '_prds/wip/prd-133-a\u0007b.md',
    ]) {
      expect(oq(doc([`- Deferred to [PRD-133](${target})`]), root).join('; '), target).toContain(
        'read differently',
      );
    }
  });

  it('[R2-P1-2] the on-disk basename must be byte-equal to the linked one', () => {
    // On a case-insensitive filesystem the lowercase link opens the uppercase
    // file while the state builder refuses its real basename; on a
    // case-sensitive one the open itself fails. Either way the deferral is
    // DENIED — the reason differs by platform, the verdict must not.
    const root = workspace();
    writeFileSync(join(root, '_prds/wip/PRD-132-CASE.md'), '# PRD-132: Case\n');
    const denied = oq(doc(['- Deferred to [PRD-132](_prds/wip/prd-132-case.md)']), root);
    expect(denied.length).toBeGreaterThan(0);
    // Round 3: where the filesystem CAN reproduce the bypass (the lowercase
    // spelling opens the uppercase file), the MECHANISM must be what denies it
    // — a generic does-not-exist pass here would go green with the on-disk
    // byte-equality check deleted. Case-sensitive platforms fall back to the
    // existence refusal, which is the correct verdict there.
    const caseInsensitive = existsSync(join(root, '_prds/wip/prd-132-case.md'));
    if (caseInsensitive) {
      expect(denied.join('; ')).toContain('on-disk name differs');
    } else {
      expect(denied.join('; ')).toContain('does not exist');
    }
  });

  it('the exact form tolerates nothing: case, spacing, punctuation', () => {
    const root = workspace();
    for (const line of [
      '- deferred to [PRD-123](_prds/wip/prd-123-followup.md)',
      '- Deferred to  [PRD-123](_prds/wip/prd-123-followup.md)',
      '- Deferred to [PRD-123](_prds/wip/prd-123-followup.md).',
      '- Deferred to [PRD-123] (_prds/wip/prd-123-followup.md)',
    ]) {
      expect(oq(doc([line]), root).length, line).toBeGreaterThan(0);
    }
  });
});

describe('FR-2 — the raw-line grammar and section cardinality', () => {
  const root = () => workspace();

  it('a paragraph section fails — prose reports its lines, never zero', () => {
    const issues = oq(doc(['Everything here is resolved, honestly.']), root());
    expect(issues.join('; ')).toContain('prose is not in the closed grammar');
  });

  it('a bold run fails — the reviewer-injected case that returned clean before', () => {
    expect(oq(doc(['**All questions were resolved in review.**']), root()).join('; ')).toContain(
      'is not in the closed grammar',
    );
  });

  it('fenced, raw-HTML and checkbox lines fail by name', () => {
    expect(oq(doc(['```', 'who owns auth?', '```']), root()).join('; ')).toContain(
      'a fenced code line',
    );
    expect(oq(doc(['<div>', 'who owns auth?', '</div>']), root()).join('; ')).toContain('raw HTML');
    expect(oq(doc(['- [ ] none.']), root()).join('; ')).toContain('a checkbox bullet');
  });

  it('[R3-P3] an NBSP-only line is refused and shown as a codepoint, not as nothing', () => {
    const issues = oq(doc(['- (none)', '\u00a0']), root());
    expect(issues.join('; ')).toContain('U+00A0');
  });

  it('one terminal `---` is furniture; a second, or a non-terminal one, fails', () => {
    expect(oq(doc(['- (none)', '', '---']), root())).toEqual([]);
    expect(oq(doc(['- (none)', '', '---', '', '---']), root()).join('; ')).toContain(
      'a second `---`',
    );
    expect(oq(doc(['---', '', '- (none)']), root()).join('; ')).toContain('terminal line');
  });

  it('zero sections fails as missing; two fail as ambiguous', () => {
    const missing = doc(['- (none)']).replace('## 9. Open Questions', '## 9. Notes');
    expect(oq(missing, root()).join('; ')).toContain('section missing');
    const twice = doc(['- (none)']).replace(
      '## 11. Verification Commands',
      '## Open Questions\n\n- (none)\n\n## 11. Verification Commands',
    );
    expect(oq(twice, root()).join('; ')).toContain('ambiguous: 2 sections');
  });

  it('a heading that merely contains the words is not the section', () => {
    const renamed = doc(['- (none)']).replace(
      '## 9. Open Questions',
      '## Resolved Open Questions',
    );
    expect(oq(renamed, root()).join('; ')).toContain('section missing');
    const suffixed = doc(['- (none)']).replace(
      '## 9. Open Questions',
      '## Open Questions and Answers',
    );
    expect(oq(suffixed, root()).join('; ')).toContain('section missing');
  });

  it('the ordinal is optional: `## Open Questions` is the section', () => {
    expect(oq(doc(['- (none)']).replace('## 9. Open Questions', '## Open Questions'), root())).toEqual(
      [],
    );
  });

  it('[R2-P1-3] a requirement written inside a fence is an example, not an FR', () => {
    const fenced = doc(['- (none)']).replace(
      '1. **FR-1**: does a thing.\n   - **Targets:** `packages/x/src/a.ts`',
      ['```markdown', '1. **FR-1**: does a thing.', '   - **Targets:** `packages/x/src/a.ts`', '```'].join(
        '\n',
      ),
    );
    expect(lintPrd(cfg, manifest, fenced, workspace(), 42).issues.join('; ')).toContain(
      'no functional requirements found',
    );
  });

  it('[R3-P2] a fenced target does not fire a hard cap; a live one does — declared semantics', () => {
    // Before round 2 the cap engine read raw section text, so a fenced example
    // could FIRE a cap; the executable view makes the target reader agree with
    // the evidence reader about what is on the page. The change is declared in
    // the PRD-028 changelog and pinned here.
    const capped = {
      ...manifest,
      hardCaps: [
        {
          id: 'cap',
          when: { targetsMatch: ['packages/capped/**'] },
          requireLine: 'Deny test: `[^`]+`',
          message: 'targets matched',
        },
      ],
    };
    const fencedTarget = doc(['- (none)']).replace(
      '## 9. Open Questions',
      [
        '```markdown',
        '2. **FR-2**: an example.',
        '   - **Targets:** `packages/capped/src/x.ts`',
        '```',
        '',
        '## 9. Open Questions',
      ].join('\n'),
    );
    expect(lintPrd(cfg, capped, fencedTarget, workspace(), 42).issues.join('; ')).not.toContain(
      'hard cap cap',
    );
    const liveTarget = doc(['- (none)']).replace('packages/x/src/a.ts', 'packages/capped/src/x.ts');
    expect(lintPrd(cfg, capped, liveTarget, workspace(), 42).issues.join('; ')).toContain(
      'hard cap cap',
    );
  });

  it('the same first-match hole in the FR block is closed the same way', () => {
    const twice = doc(['- (none)']).replace(
      '## 9. Open Questions',
      [
        '## Functional Requirements',
        '',
        '1. **FR-9**: a second requirements section.',
        '   - **Targets:** `packages/x/src/decoy.ts`',
        '',
        '## 9. Open Questions',
      ].join('\n'),
    );
    expect(lintPrd(cfg, manifest, twice, workspace(), 42).issues.join('; ')).toContain(
      'Functional Requirements section ambiguous: 2 sections',
    );
  });
});

describe('FR-3 — the wip corpus under the closed grammar, five production arguments', () => {
  const repoRoot = repoPath('.');
  const { config } = loadConfig(repoRoot);
  const repoManifest = loadManifest(config, repoRoot);

  it('zero closed-grammar §9 failures, offenders named by filename — never an allowlist', () => {
    const wipDir = join(repoRoot, config.dirs.artifacts.prd.dir, config.dirs.stateRoles.wip);
    const files = readdirSync(wipDir).filter((f) => f.endsWith('.md'));
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files) {
      // Round 2: the declaring number comes from the state layer's own parser,
      // exactly as production resolves the record — an ad-hoc regex diverges
      // on legal exotic prefixes and mislabels a self-link.
      const parsed = parseArtifactName(config.idPattern, config.dirs.artifacts.prd.prefix, file);
      if (parsed === null) continue;
      const number = parsed.number;
      const issues = lintPrd(
        config,
        repoManifest,
        readFileSync(join(wipDir, file), 'utf8'),
        repoRoot,
        number,
      ).issues.filter((i) => i.startsWith('Open Questions'));
      if (issues.length > 0) offenders.push(`${file}: ${issues.join('; ')}`);
    }
    // The Phase-3 discovery record is discovery output; THIS is the oracle.
    expect(offenders).toEqual([]);
  });

  it('the test task declares all four root surfaces the lint reads (FR-3, `_brain` included)', () => {
    const turbo = JSON.parse(readFileSync(repoPath('turbo.json'), 'utf8')) as {
      tasks: Record<string, { inputs?: string[] }>;
    };
    const inputs = turbo.tasks['test']?.inputs ?? [];
    for (const required of [
      `$TURBO_ROOT$/${config.dirs.artifacts.prd.dir}/**`,
      `$TURBO_ROOT$/${config.memory.root}/**`,
      '$TURBO_ROOT$/workflow.config.json',
      '$TURBO_ROOT$/gates.manifest.json',
    ]) {
      expect(inputs, required).toContain(required);
    }
  });
});
