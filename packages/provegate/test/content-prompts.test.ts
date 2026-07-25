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
      file: 'phase-5-testing.md',
      anchors: ['Name the memory-derived constraints', "ledger's Notes column"],
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
    expect(OBLIGATIONS.map((o) => o.file).sort()).toEqual(
      [...PHASE_PROMPTS, 'knowledge-ingest.md', 'knowledge-lint.md', 'orchestration-runner.md']
        .slice()
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

  it('every obligation traces to the addendum, not to this PRD', () => {
    // Method content may only come from the frozen snapshot or an owner-approved
    // addendum. §8 is where these ten obligations come from, so the prompts are
    // checked against IT rather than against the PRD that transcribed it.
    const addendum = flat(
      readFileSync(
        join(
          pkgRoot,
          '../../docs/research/provegate-bootstrap/source-snapshot',
          'addenda/agent-memory-closed-loop-2026-07-25.md',
        ),
        'utf8',
      ),
    );
    for (const source of [
      'select relevant records, write Memory Inputs with dispositions and rationales',
      'challenge an unreasoned `none`',
      'Carry the selected slugs into executable task context',
      'confirm the paths and commands it names still exist before relying on it',
      'No memory obligation. Verification is verification.',
      'Audit whether the selected records were actually applied',
      'Capture the actual outputs at their exact declared paths',
      'run the configured validator after capture — not before',
    ]) {
      expect(addendum, source).toContain(flat(source));
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
