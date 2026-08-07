import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { contractView } from '../src/core/memory/artifacts.js';
import { repoPath } from './helpers/repo-reads.js';
import { withSnapshotLock } from './helpers/snapshot-lock.js';

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
/**
 * `phase-5-testing.md` as the addendum leaves it. §8 grants phase 5 no memory
 * obligation, and a deny-vocabulary cannot cover paraphrase, so the file is
 * pinned by digest: any edit fails here and must be looked at. Update this ONLY
 * after confirming the change adds no memory instruction.
 */
const PHASE_5_DIGEST = '55cab84570da8ef05a7cbcf6c2dda7acfcad320d5e019f4419db1cd16763facc';

const MEMORY_VOCABULARY =
  /Memory Input|Memory Output|memory-derived|selected record|_brain|memory index|memory store|durable memory|`INDEX\.md`|detail file|capture protocol|record's watch/i;

/** Obligations live in the numbered constraint list, so that is what the
 * vocabulary is applied to. Scanning the whole file made ordinary prose — "write
 * fixtures outside `_brain`" — read as an obligation it does not impose. */
const constraintsOf = (file: string): string => {
  // The executable view: a heading inside a comment or a fence is not a
  // heading, so hiding `## Agent Constraints` in one and putting a visible
  // obligation outside it made the obligation look authorized.
  const body = contractView(prompt(file));
  const start = body.search(/^ {0,3}## Agent Constraints[ \t]*$/m);
  if (start === -1) return '';
  const rest = body.slice(start + 1);
  // The next H2 ends it, not the `---` rule. Deleting that rule would have made
  // this consume the rest of the file, so everything after it would have counted
  // as authorized — the boundary must be the thing that actually ends a section.
  // Every valid ATX H2 ends it, not just `## ` — `##\tExecution Loop` is a
  // heading, and treating it as body text made an obligation below it count as
  // authorized.
  const end = rest.search(/^ {0,3}##(?:[ \t]|\r?$)/m);
  return end === -1 ? rest : rest.slice(0, end);
};

/** Numbered constraint entries in a prompt's Agent Constraints list. */
/** Numbered constraint entries in a block of prompt text — bold or not.
 * Matching `^\d+\. \*\*` let an unstyled `5. Reopen every prior learning...`
 * ship without moving the count. ONE implementation: the mutation fixture must
 * exercise the value the production assertion uses, or reverting the production
 * regex leaves the fixture green. */
const constraintCountIn = (content: string): number =>
  (content.match(/^\d+\.[ \t]/gm) ?? []).length;

const constraintCount = (file: string): number => constraintCountIn(constraintsOf(file));

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
        repoPath('docs/research/provegate-bootstrap/source-snapshot'),
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
    expect(addendum).toContain(
      flat('5 Testing | No memory obligation. Verification is verification.'),
    );
  });

  it('phase 5 carries NO memory instruction — §8 denies it one', () => {
    // The row is a stated position, not an omission: "Verification is
    // verification." A prompt that adds an instruction §8 does not name is out
    // of scope for the addendum, which makes it fabricated method content.
    // WHOLE FILE for the denied phase. Scoping the scan to the constraint list
    // created an escape: an obligation written after that section's `---` would
    // have passed. §8 denies phase 5 a memory obligation anywhere, not just in
    // one section.
    expect(MEMORY_VOCABULARY.test(prompt('phase-5-testing.md'))).toBe(false);
  });

  it('no phase prompt carries a memory instruction its §8 row does not grant', () => {
    for (const { file, source } of ADDENDUM_SOURCE) {
      expect(MEMORY_VOCABULARY.test(constraintsOf(file)), `${file} vs addendum §8`).toBe(
        source !== null,
      );
    }
  });

  it('every phase prompt has exactly one Agent Constraints section', () => {
    // `constraintsOf` returns '' for a file without one, which would make the
    // scoped assertions vacuously true. The assumption is now checked.
    for (const file of PHASE_PROMPTS) {
      const headings =
        contractView(prompt(file)).match(/^ {0,3}## Agent Constraints[ \t]*$/gm) ?? [];
      expect(headings.length, file).toBe(1);
      expect(constraintsOf(file).length, file).toBeGreaterThan(0);
    }
  });

  it('no memory obligation lives OUTSIDE the authorized constraints section', () => {
    // Scoping the granted-phase check to Agent Constraints left an escape: an
    // obligation added after that section's `---` satisfied nothing and broke
    // nothing. The authorized section is where an obligation may live; anywhere
    // else in the prompt it is unauthorized wherever it appears.
    for (const { file } of ADDENDUM_SOURCE) {
      const constraints = constraintsOf(file);
      const outside = prompt(file).split(constraints).join(' ');
      expect(
        MEMORY_VOCABULARY.test(outside),
        `${file}: memory instruction outside constraints`,
      ).toBe(false);
    }
  });

  it('phase 5 carries exactly its four non-memory constraints', () => {
    // A vocabulary scan cannot catch every paraphrase — "reopen every prior
    // learning the work item chose" imposes the obligation §8 denies while
    // matching no listed term. Counting the constraints closes that: §8 grants
    // phase 5 none, so ANY fifth entry, however phrased, fails here.
    expect(constraintCount('phase-5-testing.md')).toBe(4);
  });

  it('phase 5 is byte-pinned: §8 grants it no obligation, so any edit is a decision', () => {
    // A deny-vocabulary cannot cover paraphrase — "reopen every prior learning
    // chosen by the work item" imposes the forbidden obligation while matching
    // no listed term. The addendum gives this file no memory obligation at all,
    // so the honest guard is a digest: any edit fails here and has to be looked
    // at. Update the digest ONLY after confirming the change adds no memory
    // instruction.
    const digest = createHash('sha256').update(prompt('phase-5-testing.md')).digest('hex');
    expect(digest).toBe(PHASE_5_DIGEST);
  });

  it('the phase-5 denial is discriminating, not merely satisfied', () => {
    // The checked-in prompt is clean, so the assertion above cannot distinguish
    // a working scanner from a broken one. Inject the exact mutation the scanner
    // exists to catch, in the place the earlier scoped version missed.
    const clean = prompt('phase-5-testing.md');
    const mutated = `${clean}\n\n## Extra\n\nBefore testing, open every \`_brain\` detail file.\n`;
    expect(MEMORY_VOCABULARY.test(clean)).toBe(false);
    expect(MEMORY_VOCABULARY.test(mutated)).toBe(true);
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
  const snapshot = repoPath('docs/research/provegate-bootstrap/source-snapshot');
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

  it('is byte-unchanged: no file added, removed, or edited', () =>
    // Locked: the stale-probe test (verify-test-inputs) plants a probe in this
    // REAL tree from a parallel worker, and an unlocked walk counts it as a
    // 75th frozen file.
    withSnapshotLock(() => {
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
    }));

  it('routes the memory extension through an addendum, not through the frozen bytes', () => {
    expect(existsSync(join(snapshot, ADDENDUM))).toBe(true);
    expect(readFileSync(join(snapshot, 'MANIFEST.md'), 'utf8')).toContain(ADDENDUM);
    const decisions = readFileSync(
      repoPath('docs/research/provegate-bootstrap/DECISIONS.md'),
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

describe('phase 6 round 8 — the constraint count is discriminating', () => {
  const countIn = constraintCountIn;

  it('[R8-P2-6] an UNSTYLED numbered constraint moves the count', () => {
    // `^\d+\. \*\*` counted only bold entries, so a plain
    // `5. Reopen every prior learning...` shipped without moving the number the
    // phase-5 guard rests on.
    const four = ['1. **A**', '2. **B**', '3. **C**', '4. **D**'].join('\n');
    expect(countIn(four)).toBe(4);
    expect(countIn(`${four}\n5. Reopen every prior learning before running tests.`)).toBe(5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRD-031 — the addendum (FR-1, read DIRECTLY: the frozen-snapshot digest
// deliberately excludes MANIFEST.md and addenda/**, so no digest row can prove
// this file), the configured exception (FR-2/FR-3), the orchestration proceed
// rule (FR-4), and the two-copy bootstrap identity (FR-5).
// ─────────────────────────────────────────────────────────────────────────────

const SNAPSHOT_ROOT = repoPath('docs/research/provegate-bootstrap/source-snapshot');
const A2 = join(SNAPSHOT_ROOT, 'addenda/autonomy-mode-and-proceed-rule-2026-07-27.md');

describe('the autonomy addendum — shape and clauses, never approval (PRD-031 FR-1)', () => {
  // This suite proves ARTIFACT SHAPE and the two authorized clauses. It cannot
  // and does not prove the owner's approval ACT — that is the operator-owned
  // task row plus the committed acceptance naming this exact path (ADR-0003).
  it('exists at the exact declared path and would fail without it', () => {
    expect(existsSync(A2), 'the FR-1 addendum is missing').toBe(true);
  });

  it('carries owner approval status with a date, the scope, and the unchanged-snapshot statement', () => {
    const a2 = readFileSync(A2, 'utf8');
    expect(a2).toMatch(/\*\*Status:\*\* approved by the owner, \d{4}-\d{2}-\d{2}/);
    expect(a2).toContain('PRD-031');
    expect(a2).toContain('the frozen snapshot under `../` is unchanged and stays');
  });

  it('states both authorized clauses', () => {
    const a2 = readFileSync(A2, 'utf8');
    expect(a2).toContain('configured value, never a self-assessment');
    expect(a2).toContain('proceed rule beside the stop rules');
  });

  it('is listed in the snapshot manifest addenda table', () => {
    const manifest = readFileSync(join(SNAPSHOT_ROOT, 'MANIFEST.md'), 'utf8');
    expect(manifest).toContain('addenda/autonomy-mode-and-proceed-rule-2026-07-27.md');
    expect(manifest).toMatch(/autonomy-mode-and-proceed-rule[^|]*\| 2026-07-28 \| owner \|/);
  });
});

describe('the configured exception (PRD-031 FR-2/FR-3)', () => {
  it('the shipped protocol carries the token, not a self-granted exception', () => {
    const phase3 = prompt('phase-3-task-generator.md');
    expect(phase3).toContain('{{AUTONOMY_MODE}}');
    // the old unconditioned one-liner is gone from the shipped source
    expect(phase3).not.toMatch(/Exception: in\s+autonomous-execution mode, document/);
  });

  it('the human-gated fragment has no exception and no self-assessment; the autonomous one reproduces the snapshot text', () => {
    const gated = readFileSync(
      join(pkgRoot, 'prompts/_fragments/AUTONOMY_MODE.human-gated.md'),
      'utf8',
    );
    const auto = readFileSync(
      join(pkgRoot, 'prompts/_fragments/AUTONOMY_MODE.autonomous.md'),
      'utf8',
    );
    expect(gated).toContain('This STOP has no exception');
    expect(gated).not.toContain('Exception:');
    // FR-3: the snapshot's sentence, parenthetical included, byte-anchored to
    // the snapshot itself so an abridgement cannot recur unnoticed
    const snapshot = readFileSync(
      join(SNAPSHOT_ROOT, 'prompts/phase-3-task-generator.md'),
      'utf8',
    ).replace(/\s+/g, ' ');
    const sentence =
      "Exception: in autonomous-execution mode (single-session test runs, agent-led sweeps), document the skipped approval gate in the task file's **Deferrals & Decisions** before proceeding.";
    expect(snapshot).toContain(sentence);
    expect(auto.replace(/\s+/g, ' ')).toContain(sentence);
    // both fragments state the configured-statement rule
    for (const f of [gated, auto]) {
      expect(f.replace(/\s+/g, ' ')).toContain(
        'an agent never assesses which mode its own session is in',
      );
    }
  });
});

describe('the proceed rule (PRD-031 FR-4/FR-5)', () => {
  const PROCEED_HEAD = '## The proceed rule (Phases 4–7)';

  it('the orchestration protocol states it, wording traced to the addendum clause', () => {
    const runner = prompt('orchestration-runner.md');
    expect(runner).toContain(PROCEED_HEAD);
    // the addendum's clause-2 core, quoted so the trace is checked not narrated
    expect(runner.replace(/\s+/g, ' ')).toContain(
      'the only legitimate stops are the enumerated stop-and-ask checkpoints and a failed gate',
    );
  });

  it('both bootstrap copies carry the proceed rule IDENTICALLY — a pattern in each would be satisfied by the template alone', () => {
    const live = readFileSync(repoPath('AGENT_BOOTSTRAP.md'), 'utf8');
    const tmpl = readFileSync(
      join(pkgRoot, 'practices/templates/AGENT_BOOTSTRAP.template.md'),
      'utf8',
    );
    const block = (s: string): string => {
      const i = s.indexOf(PROCEED_HEAD);
      expect(i, 'proceed rule missing from a bootstrap copy').toBeGreaterThanOrEqual(0);
      const j = s.indexOf('\n## ', i + 1);
      return s.slice(i, j === -1 ? undefined : j).trim();
    };
    expect(block(live)).toBe(block(tmpl));
  });
});
