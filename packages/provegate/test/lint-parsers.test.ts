import { readFileSync, readdirSync } from 'node:fs';
import { join,  } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { loadConfig } from '../src/core/config/load.js';
import { loadManifest } from '../src/core/gates/manifest.js';
import { lintPrd } from '../src/core/gates/prd-ready.js';
import { parseVerificationCommands, parseVerificationTable } from '../src/core/gates/safety.js';
import { repoPath } from './helpers/repo-reads.js';

const cfg = DEFAULT_CONFIG;

/**
 * The §11-parser-class: an exact issue-identity set (PRD-024 FR-2). Membership
 * is decided by these five predicates over `lintPrd`'s issue strings and by
 * nothing else — a prose class over an untyped string[] is satisfiable three
 * different ways, which is why the set is written out.
 */
const CLASS_PREDICATES: ReadonlyArray<(issue: string) => boolean> = [
  (i) => i.startsWith('§11 row is malformed'),
  (i) => i.startsWith('§11 verification section is missing'),
  (i) => i.startsWith('§11 verification section is declared more than once'),
  (i) => /^FR-\d+: §11 row has no runnable command$/.test(i),
  (i) => i.startsWith('unsafe §11 command'),
];

const inClass = (issue: string): boolean => CLASS_PREDICATES.some((p) => p(issue));

function section11(rows: string[]): string {
  return [
    '## 11. Verification Commands',
    '',
    '| FR   | Command / Check | Scope | Notes |',
    '| ---- | --------------- | ----- | ----- |',
    ...rows,
    '',
  ].join('\n');
}

describe('parseVerificationTable — row grammar', () => {
  it('reads the command from cell 2 only; Scope and Notes never become commands', () => {
    const table = parseVerificationTable(
      cfg,
      section11(['| FR-1 | `pnpm test test/a.test.ts` | pkg | run `reboot` first |']),
    );
    expect(table.issues).toEqual([]);
    expect(table.commands.map((c) => c.cmd)).toEqual(['pnpm test test/a.test.ts']);
  });

  it('parses a two-column row exactly as today', () => {
    const table = parseVerificationTable(cfg, section11(['| FR-1 | `pnpm test` |']));
    expect(table.issues).toEqual([]);
    expect(table.commands).toEqual([{ cmd: 'pnpm test', safe: true }]);
  });

  it('accepts and ignores a fifth or later cell', () => {
    const table = parseVerificationTable(
      cfg,
      section11(['| FR-1 | `pnpm test` | pkg | note | extra |']),
    );
    expect(table.issues).toEqual([]);
    expect(table.commands.map((c) => c.cmd)).toEqual(['pnpm test']);
  });

  it('reports a row under two cells as malformed rather than skipping it', () => {
    const table = parseVerificationTable(cfg, section11(['| FR-1 `pnpm test` |']));
    expect(table.issues).toHaveLength(1);
    expect(table.issues[0]).toMatch(/^§11 row is malformed/);
    expect(table.commands).toEqual([]);
  });

  it('reports a missing verification section under its exact prefix', () => {
    const table = parseVerificationTable(cfg, '# PRD\n\nno section here\n');
    expect(table.issues).toEqual(['§11 verification section is missing']);
  });

  it('reports a duplicate verification section under its exact prefix', () => {
    const doc = `${section11(['| FR-1 | `pnpm test` |'])}\n${section11(['| FR-2 | `pnpm build` |'])}`;
    const table = parseVerificationTable(cfg, doc);
    expect(table.issues).toHaveLength(1);
    expect(table.issues[0]).toMatch(/^§11 verification section is declared more than once/);
  });

  it('a longer heading variant is not the section', () => {
    const doc = section11(['| FR-1 | `pnpm test` |']).replace(
      '## 11. Verification Commands',
      '## Resolved Verification Commands',
    );
    const table = parseVerificationTable(cfg, doc);
    expect(table.issues).toEqual(['§11 verification section is missing']);
  });

  it('the exported parser keeps its array shape and Command-cell scoping', () => {
    const cmds = parseVerificationCommands(
      cfg,
      section11(['| FR-1 | `pnpm test` | pkg | see `pnpm build` |']),
    );
    expect(Array.isArray(cmds)).toBe(true);
    expect(cmds).toEqual([{ cmd: 'pnpm test', safe: true }]);
  });
});

/**
 * Corpus-shaped fixtures for lintPrd. Lint-green apart from what a test plants
 * (readiness W7): FR targets that overlap no active record's watch, a runnable
 * safe command per FR, DO NOT present, no open questions, and a PRD number
 * BELOW the configured `enforceFrom` — chosen deliberately, so the value
 * header cannot fail for an unrelated reason.
 */
function fixturePrd(commandCell: string, notesCell: string): string {
  return [
    '# PRD-001: Fixture',
    '',
    '## 4. Functional Requirements',
    '',
    '1. **FR-1**: The fixture behaves.',
    '   - **Targets:** `docs/fixture-target.txt`',
    '',
    '## 11. Verification Commands',
    '',
    '| FR   | Command / Check | Scope | Notes |',
    '| ---- | --------------- | ----- | ----- |',
    `| FR-1 | ${commandCell} | pkg | ${notesCell} |`,
    '',
    '## 9. Open Questions',
    '',
    '- (none)',
    '',
    '## 12. DO NOT (Anti-Patterns)',
    '',
    '- DO NOT anything.',
    '',
    '## Memory Inputs',
    '',
    '- none — synthetic classification fixture; no repository record applies to it.',
    '',
    '## Memory Outputs',
    '',
    '- none — a fixture produces no durable knowledge.',
    '',
    '## Durable Artifacts',
    '',
    '- Decision: `none` — fixture.',
    '',
  ].join('\n');
}

describe('the wip corpus and the classification pair (PRD-024 FR-2)', () => {
  // The production caller's exact shape (cli.ts — five arguments): config,
  // manifest, content, repository root, PRD number. A short call fails on an
  // unrelated memory error or skips missing-header enforcement —
  // `fixture-must-reach-production-shape`.
  const repoRoot = repoPath('.');
  const { config } = loadConfig(repoRoot);
  const manifest = loadManifest(config, repoRoot);

  it('no PRD in the configured wip directory reports a §11-parser-class issue', () => {
    const wipDir = join(repoRoot, config.dirs.artifacts.prd.dir, config.dirs.stateRoles.wip);
    // An empty wip corpus is legal (the queue drains between waves); readdirSync
    // throwing on a missing dir keeps the wrong-directory vacuity covered, and
    // the planted positive control below proves the parser detects in-class reds.
    const files = readdirSync(wipDir).filter((f) => f.endsWith('.md'));
    for (const file of files) {
      const content = readFileSync(join(wipDir, file), 'utf8');
      const number = Number.parseInt(/-(\d+)-/.exec(file)?.[1] ?? '0', 10);
      const report = lintPrd(config, manifest, content, repoRoot, number);
      const classIssues = report.issues.filter(inClass);
      // A file red on a rule OUTSIDE the class does not fail this sweep; a
      // new in-class red is reported by name and is a stop, never an
      // allowlist entry (`known-red-ledger-must-expire`).
      expect(classIssues, `${file} carries §11-parser-class issues`).toEqual([]);
    }
  });

  it('positive control: an unsafe Command-cell command is reported, in class', () => {
    // The cell carries a runnable safe command BESIDE the unsafe token, so the
    // only class issue is the unsafe one — not a no-runnable side effect.
    const report = lintPrd(
      config,
      manifest,
      fixturePrd('`pnpm test` then `rm -rf /tmp/x > /dev/null`', 'prose only'),
      repoRoot,
      1,
    );
    const classIssues = report.issues.filter(inClass);
    expect(classIssues).toHaveLength(1);
    expect(classIssues[0]).toMatch(/^unsafe §11 command/);
    // In class AND nothing else red: the fixture is lint-green apart from the
    // planted cell, so this failure has an independent cause.
    expect(report.issues).toEqual(classIssues);
  });

  it('negative control: the same token in the Notes cell produces no issue at all', () => {
    const report = lintPrd(
      config,
      manifest,
      fixturePrd('`pnpm test`', 'clean up with `rm -rf /tmp/x > /dev/null` afterwards'),
      repoRoot,
      1,
    );
    expect(report.issues).toEqual([]);
  });

  it('the declared turbo input covers the configured artifact root', () => {
    // The corpus test above reads from config; the cache key is a literal
    // glob. Nothing else connects them (`verify:turbo-inputs` checks only
    // that the exception reason is non-empty), so this assertion is the
    // binding: a rename of the artifact root fails here, by name, instead of
    // moving the corpus reads outside the cache key.
    const turbo = JSON.parse(readFileSync(repoPath('turbo.json'), 'utf8')) as {
      tasks: Record<string, { inputs?: string[] }>;
    };
    const inputs = turbo.tasks['test']?.inputs ?? [];
    const artifactRoot = config.dirs.artifacts.prd.dir;
    const covering = inputs.filter((glob) => {
      const m = /^\$TURBO_ROOT\$\/(.+?)\/\*\*$/.exec(glob);
      if (!m) return false;
      const globRoot = m[1]!;
      return artifactRoot === globRoot || artifactRoot.startsWith(`${globRoot}/`);
    });
    expect(
      covering,
      `no declared input glob on the test task sits at or above the configured artifact root '${artifactRoot}'`,
    ).not.toEqual([]);
  });
});
