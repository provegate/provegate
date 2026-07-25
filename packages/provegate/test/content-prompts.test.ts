import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** FR-2..5 + W3: prompt census, calibrated-number spot checks vs the snapshot
 * values, codex-starter drift fix, CLI-mention audit. */

const pkgRoot = fileURLToPath(new URL('..', import.meta.url));
const prompt = (name: string): string => readFileSync(join(pkgRoot, 'prompts', name), 'utf8');

const PHASE_PROMPTS = [
  'phase-1-prd-generator.md',
  'phase-2-readiness-scorer.md',
  'phase-3-task-generator.md',
  'phase-4-implementation.md',
  'phase-5-testing.md',
  'phase-6-final-auditing.md',
  'phase-7-learning.md',
];

describe('prompt census (FR-2..5)', () => {
  it('ships 7 phase prompts + orchestration + 2 knowledge + 2 adapters + registry', () => {
    for (const name of [
      ...PHASE_PROMPTS,
      'orchestration-runner.md',
      'knowledge-ingest.md',
      'knowledge-lint.md',
      'adapters/cursor-bootstrap.md',
      'adapters/codex-starter.md',
      'PLACEHOLDERS.md',
    ]) {
      expect(existsSync(join(pkgRoot, 'prompts', name)), name).toBe(true);
    }
  });
});

describe('calibrated core is byte-faithful (FR-2, §12)', () => {
  const scorer = prompt('phase-2-readiness-scorer.md');

  it('class-conditional weights match the snapshot values', () => {
    // The full weight rows, straight from the calibrated source table.
    expect(scorer).toContain(
      '| **Clarity**                  | 15%     | 25%            | 25%    | 15%   |',
    );
    expect(scorer).toContain(
      '| **Completeness**             | 20%     | 30%            | 25%    | 20%   |',
    );
    expect(scorer).toContain(
      '| **Technical Depth**          | 25%     | 33%            | 30%    | 20%   |',
    );
    expect(scorer).toContain(
      '| **Multi-Tenancy & Security** | 20%     | N/A            | 10%    | 10%   |',
    );
    expect(scorer).toContain(
      '| **Scope & Testability**      | 10%     | 12%            | 10%    | 15%   |',
    );
    expect(scorer).toContain(
      '| **Migration & Rollback**     | 10%     | N/A            | N/A    | 20%   |',
    );
  });

  it('binary verdict + hard caps + calibration count preserved', () => {
    expect(scorer).toContain('143 post-ship findings');
    expect(scorer).toMatch(/binary \(PASS \/ ITERATE\)/);
    expect(scorer).toContain('7/10 on Clarity');
  });

  it('the 5-lens panel and quorum are intact in the orchestration prompt', () => {
    const orch = prompt('orchestration-runner.md');
    for (const lens of ['correctness', 'security', 'cross-tenant', 'contract', 'perf']) {
      expect(orch).toContain(lens);
    }
    expect(orch).toContain('≥3 of 5');
    expect(orch).toContain('never push');
  });
});

describe('codex-starter renumber drift is fixed (FR-5)', () => {
  it('names Phase 4 and never claims to be Phase 3', () => {
    const starter = prompt('adapters/codex-starter.md');
    expect(starter).toContain('Phase 4');
    expect(/\bPhase 3 execution\b|Cycle Phase: 3/.test(starter)).toBe(false);
    // Phase 5 handoff mention is fine; the starter itself is a Phase 4 entry.
    expect(starter).toMatch(/Phase 4 (execution|handoff|preflight|implementing)/i);
  });
});

describe('CLI mentions are shipped commands only (W3)', () => {
  const CLI_SUBCOMMANDS = new Set([
    'status',
    'queue',
    'check',
    'run',
    'land',
    'push',
    'init',
    'new',
    'open',
  ]);

  it('every `gate <sub>` mention across prompts is a real subcommand', () => {
    for (const name of [
      ...PHASE_PROMPTS,
      'orchestration-runner.md',
      'knowledge-ingest.md',
      'knowledge-lint.md',
      'adapters/cursor-bootstrap.md',
      'adapters/codex-starter.md',
    ]) {
      const content = prompt(name);
      // audit COMMAND mentions (backticked) — prose like "the gate checks" is English
      for (const m of content.matchAll(/`gate\s+([a-z-]+)/g)) {
        expect(CLI_SUBCOMMANDS.has(m[1]!), `${name}: gate ${m[1]}`).toBe(true);
      }
    }
  });

  it('no parent script names survive (pnpm verify:* / prd:* / state:*)', () => {
    for (const name of PHASE_PROMPTS) {
      const content = prompt(name);
      expect(/pnpm (verify|prd|state):/.test(content), name).toBe(false);
    }
  });
});

describe('knowledge prompts carry the generic taxonomy (FR-4)', () => {
  it('ingest + lint both use the four page families', () => {
    for (const name of ['knowledge-ingest.md', 'knowledge-lint.md']) {
      const content = prompt(name);
      for (const family of ['architecture', 'decisions', 'patterns', 'operations']) {
        expect(content, `${name}: ${family}`).toContain(family);
      }
    }
  });
});

/**
 * FR-3 + W3: each prompt states EXACTLY the obligation the PRD's table assigns it.
 *
 * The assertion is per file and keyed to that table on purpose. A suite that proved
 * "the prompts directory mentions memory" would pass with nine files untouched and one
 * carrying every obligation — which is the failure W3 exists to prevent, and the shape
 * a directory-level assertion cannot see.
 */
/**
 * Vocabulary that signals a memory instruction, however it is phrased.
 *
 * Module scope on purpose: round 4 caught the mutation fixture holding its OWN
 * copy, so reverting this value to its original four tokens left the fixture
 * green while the prompts went unguarded. One value, both users.
 */
const MEMORY_VOCABULARY =
  /Memory Input|Memory Output|memory-derived|selected record|_brain|memory index|memory store|durable memory|`INDEX\.md`|detail file|capture protocol|record's watch/i;

/** Obligations live in the numbered constraint list, so that is what the
 * vocabulary is applied to. Scanning the whole file made ordinary prose — "write
 * fixtures outside `_brain`" — read as an obligation it does not impose. */
const constraintsOf = (file: string): string => {
  const body = prompt(file);
  const start = body.search(/^## Agent Constraints[ \t]*$/m);
  if (start === -1) return '';
  const rest = body.slice(start);
  const end = rest.search(/^---[ \t]*$/m);
  return end === -1 ? rest : rest.slice(0, end);
};

describe('FR-3 per-file prompt obligations (W3)', () => {
  /** Prose wraps, and a formatter may re-wrap it; the obligation is the sentence, not
   * its line breaks. Comparing on collapsed whitespace keeps this suite measuring
   * content rather than `prettier`'s column budget. */
  const flat = (value: string): string => value.replace(/\s+/g, ' ').trim();

  const OBLIGATIONS: Array<{ file: string; anchors: string[] }> = [
    {
      file: 'phase-1-prd-generator.md',
      anchors: [
        'Select Memory Inputs',
        '`applied`, `reviewed`, or `not-applicable`',
        'Emit `none` only with a reason',
      ],
    },
    {
      file: 'phase-2-readiness-scorer.md',
      anchors: [
        'Challenge each Memory Input',
        "Challenge each input's relevance",
        'Score a ceremonial or unexamined `none` down',
      ],
    },
    {
      file: 'phase-3-task-generator.md',
      anchors: ['Carry the selected slugs', '`## Memory Context`', 're-opening each'],
    },
    {
      file: 'phase-4-implementation.md',
      anchors: [
        'Re-open each selected record',
        'confirm the paths and commands it names still exist',
      ],
    },
    {
      file: 'phase-6-final-auditing.md',
      anchors: [
        'Audit the memory contract',
        'whether each Memory Input was actually applied',
        '`none` is a finding',
      ],
    },
    {
      file: 'phase-7-learning.md',
      anchors: [
        'Capture exact output paths',
        'Memory Outputs and Durable Artifacts before writing the record',
        'validator **after** capture',
      ],
    },
    {
      file: 'knowledge-ingest.md',
      anchors: ['only after the PRD declares its exact path'],
    },
    {
      file: 'knowledge-lint.md',
      anchors: ['Validate the declared grammar, not prose quality'],
    },
    {
      file: 'orchestration-runner.md',
      anchors: ['refuse a Phase 7 close whose declared Memory Outputs are absent'],
    },
  ];

  it('covers every file the obligation table names, and no more', () => {
    // phase-5 is absent BY THE ADDENDUM: §8 grants it no obligation, so there is
    // nothing for this table to assert about it.
    expect(OBLIGATIONS.map((o) => o.file).sort()).toEqual(
      [...PHASE_PROMPTS, 'knowledge-ingest.md', 'knowledge-lint.md', 'orchestration-runner.md']
        .filter((f) => f !== 'phase-5-testing.md')
        .sort(),
    );
  });

  for (const { file, anchors } of OBLIGATIONS) {
    it(`${file} states its obligation`, () => {
      const content = flat(prompt(file));
      for (const anchor of anchors) {
        expect(content, `${file}: ${anchor}`).toContain(flat(anchor));
      }
    });
  }

  it('adapters stay vendor-neutral and gain no obligation of their own', () => {
    for (const name of ['adapters/cursor-bootstrap.md', 'adapters/codex-starter.md']) {
      const content = prompt(name);
      expect(/Memory Inputs|Memory Outputs/.test(content), name).toBe(false);
    }
  });

  /** The addendum's §8 row for each phase — the ONLY source a phase prompt's
   * memory obligation may trace to. `null` means the row grants none. */
  const ADDENDUM_SOURCE: Array<{ file: string; source: string | null }> = [
    {
      file: 'phase-1-prd-generator.md',
      source: 'select relevant records, write Memory Inputs with dispositions and rationales',
    },
    { file: 'phase-2-readiness-scorer.md', source: 'challenge an unreasoned `none`' },
    {
      file: 'phase-3-task-generator.md',
      source: 'Carry the selected slugs into executable task context',
    },
    {
      file: 'phase-4-implementation.md',
      source: 'confirm the paths and commands it names still exist before relying on it',
    },
    { file: 'phase-5-testing.md', source: null },
    {
      file: 'phase-6-final-auditing.md',
      source: 'Audit whether the selected records were actually applied',
    },
    {
      file: 'phase-7-learning.md',
      source: 'Capture the actual outputs at their exact declared paths',
    },
  ];

  const addendumText = (): string =>
    readFileSync(
      join(
        pkgRoot,
        '../../docs/research/provegate-bootstrap/source-snapshot',
        'addenda/agent-memory-closed-loop-2026-07-25.md',
      ),
      'utf8',
    );

  it('each phase obligation traces to its own §8 row, and §8 is quoted exactly', () => {
    // Asserting that some addendum phrases exist proves nothing about the file
    // that carries them: the previous version of this test passed while
    // `phase-5-testing.md` shipped an obligation §8 explicitly denies. Bind per
    // file, and hold the source row to the phase it belongs to.
    const addendum = flat(addendumText());
    for (const { source } of ADDENDUM_SOURCE) {
      if (source === null) continue;
      expect(addendum, source).toContain(flat(source));
    }
    expect(addendum).toContain(flat('5 Testing | No memory obligation. Verification is verification.'));
  });

  it('phase 5 carries NO memory instruction — §8 denies it one', () => {
    // The row is a stated position, not an omission: "Verification is
    // verification." A prompt that adds an instruction §8 does not name is out
    // of scope for the addendum, which makes it fabricated method content.
    expect(MEMORY_VOCABULARY.test(constraintsOf('phase-5-testing.md'))).toBe(false);
  });

  it('no phase prompt carries a memory instruction its §8 row does not grant', () => {
    for (const { file, source } of ADDENDUM_SOURCE) {
      expect(MEMORY_VOCABULARY.test(constraintsOf(file)), `${file} vs addendum §8`).toBe(
        source !== null,
      );
    }
  });

  it('a granted phase carries ITS OWN obligation, not another phase clause', () => {
    // A boolean "mentions memory" cannot tell phase 4's obligation from phase
    // 7's. Each granted file must contain its own §8 clause, and must not carry
    // the distinctive clause of a different phase.
    const OWN: Record<string, RegExp> = {
      'phase-1-prd-generator.md': /Select Memory Inputs/,
      'phase-2-readiness-scorer.md': /Challenge each Memory Input/,
      'phase-3-task-generator.md': /Carry the selected slugs/,
      'phase-4-implementation.md': /Re-open each selected record/,
      'phase-6-final-auditing.md': /Audit the memory contract/,
      'phase-7-learning.md': /Capture exact output paths/,
    };
    for (const [file, own] of Object.entries(OWN)) {
      const content = prompt(file);
      expect(own.test(content), `${file}: own clause`).toBe(true);
      for (const [other, clause] of Object.entries(OWN)) {
        if (other === file) continue;
        expect(clause.test(content), `${file} must not carry ${other}'s clause`).toBe(false);
      }
    }
  });

  it('every placeholder token the new content introduces is registered', () => {
    const registry = prompt('PLACEHOLDERS.md');
    for (const { file } of OBLIGATIONS) {
      for (const match of prompt(file).matchAll(/\{\{[A-Z_]+\}\}/g)) {
        expect(registry, `${file}: ${match[0]}`).toContain(match[0]);
      }
    }
  });
});

/**
 * FR-1 (PRD-017): method provenance. Shipped method content may trace to the frozen
 * snapshot or to an owner-approved addendum beside it — nothing else. Freezing is only
 * meaningful if something notices when it breaks, so the snapshot's bytes are pinned by
 * digest rather than by discipline.
 *
 * `MANIFEST.md` and `addenda/**` are excluded on purpose: the manifest is the inventory
 * and must change when an addendum is added, and addenda are the sanctioned way to extend.
 * Everything else is frozen.
 *
 * Known limitation, recorded rather than hidden: this suite's turbo task hashes package
 * files, so a docs-only edit to the snapshot could replay a cached pass locally. CI checks
 * out fresh with no restored turbo cache, so the gate is real there.
 */
describe('frozen source snapshot (PRD-017 FR-1)', () => {
  const repoRoot = join(pkgRoot, '..', '..');
  const snapshot = join(repoRoot, 'docs/research/provegate-bootstrap/source-snapshot');
  const ADDENDUM = 'addenda/agent-memory-closed-loop-2026-07-25.md';

  /** Every frozen file, path and content, folded into one digest. */
  const FROZEN_DIGEST = 'eb81acd9dcb4923cedb2aec6ffed9fc4ae9ba248c37dfdde1b2bc4e43b92b374';
  const FROZEN_FILE_COUNT = 74;

  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((entry) => {
      const full = join(dir, entry);
      return statSync(full).isDirectory() ? walk(full) : [full];
    });

  const frozenFiles = (): string[] =>
    walk(snapshot)
      .map((f) => relative(snapshot, f).split(sep).join('/'))
      .filter((p) => p !== 'MANIFEST.md' && !p.startsWith('addenda/'))
      .sort();

  it('is byte-unchanged: no file added, removed, or edited', () => {
    const files = frozenFiles();
    expect(files).toHaveLength(FROZEN_FILE_COUNT);
    const digest = createHash('sha256');
    for (const path of files) {
      digest
        .update(path)
        .update('\0')
        .update(
          createHash('sha256')
            .update(readFileSync(join(snapshot, path)))
            .digest('hex'),
        )
        .update('\n');
    }
    // A mismatch means the frozen copy moved. That is not a test to update — it is a
    // change to revert, or an addendum to write instead.
    expect(digest.digest('hex')).toBe(FROZEN_DIGEST);
  });

  it('routes the memory extension through an addendum, not through the frozen bytes', () => {
    expect(existsSync(join(snapshot, ADDENDUM))).toBe(true);
    expect(readFileSync(join(snapshot, 'MANIFEST.md'), 'utf8')).toContain(ADDENDUM);
    const decisions = readFileSync(
      join(repoRoot, 'docs/research/provegate-bootstrap/DECISIONS.md'),
      'utf8',
    );
    expect(decisions).toContain('Post-bootstrap method extensions');
    expect(decisions).toContain(ADDENDUM);
  });

  it('states the grammar rules the later PRDs must implement', () => {
    const addendum = readFileSync(join(snapshot, ADDENDUM), 'utf8');
    // The rule the retired single-PRD draft violated in its own Memory Outputs.
    expect(addendum).toContain('A non-empty output set may not contain `none`');
    expect(addendum).toContain('as committed on the configured base');
    expect(addendum).toContain('review trigger, not a staleness verdict');
  });
});

describe('phase 6 round 3 — the provenance oracle is tested, not trusted', () => {
  /** The deny-list is only worth its comment if a violation actually trips it.
   * The value under test is the module-level one the prompts are judged by. */
  it('catches an obligation phrased without the original four tokens', () => {
    const paraphrased = [
      '5. **Reopen the store.** Before choosing fixtures, open every `_brain` detail file',
      '   the work item selected and confirm it still holds.',
    ].join('\n');
    expect(MEMORY_VOCABULARY.test(paraphrased)).toBe(true);
    for (const phrasing of [
      'run the capture protocol before verifying',
      'consult the memory index for prior constraints',
      "honour each record's watch when picking a fixture",
    ]) {
      expect(MEMORY_VOCABULARY.test(phrasing), phrasing).toBe(true);
    }
  });

  it('does not fire on verification prose that mentions no store at all', () => {
    for (const phrasing of [
      'Every command in the §11 table is executed and its output pasted into the ledger.',
      'Integration commands run against the real environment, not mocks.',
      'Write at least one deny-path test where the PRD touches permissions.',
    ]) {
      expect(MEMORY_VOCABULARY.test(phrasing), phrasing).toBe(false);
    }
  });
});
