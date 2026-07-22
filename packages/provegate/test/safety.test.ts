import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, deepMerge } from '../src/core/config/index.js';
import { isSafeCommand, parseVerificationCommands } from '../src/core/gates/safety.js';

const cfg = DEFAULT_CONFIG;

describe('isSafeCommand', () => {
  it('accepts allowlisted single and piped commands', () => {
    expect(isSafeCommand(cfg, 'pnpm test')).toBe(true);
    expect(isSafeCommand(cfg, 'pnpm build && node dist/cli.js status')).toBe(true);
    expect(isSafeCommand(cfg, 'grep -c foo bar.txt | test -n')).toBe(true);
  });

  it('rejects shell metachars', () => {
    for (const cmd of [
      'pnpm test > out.txt',
      'pnpm test < in.txt',
      'pnpm run $(evil)',
      'pnpm run `evil`',
      'pnpm run $FOO',
    ]) {
      expect(isSafeCommand(cfg, cmd), cmd).toBe(false);
    }
  });

  it('rejects git push wherever it hides', () => {
    expect(isSafeCommand(cfg, 'node -e "git push"')).toBe(false);
    expect(isSafeCommand(cfg, 'pnpm test && git push origin main')).toBe(false);
    expect(isSafeCommand(cfg, 'curl -X POST http://x && git  push')).toBe(false);
  });

  it('rejects non-allowlisted segment prefixes', () => {
    expect(isSafeCommand(cfg, 'rm -rf /')).toBe(false);
    expect(isSafeCommand(cfg, 'pnpm test && rm -rf dist')).toBe(false);
    expect(isSafeCommand(cfg, 'git commit -m x')).toBe(false);
  });

  it('honors a custom prefix allowlist', () => {
    const custom = deepMerge(cfg, { commands: { allowedPrefixes: ['make '] } });
    expect(isSafeCommand(custom, 'make test')).toBe(true);
    expect(isSafeCommand(custom, 'pnpm test')).toBe(false);
  });
});

describe('parseVerificationCommands', () => {
  const PRD = [
    '## 11. Verification Commands',
    '',
    '| FR    | Command / Check                        | Scope |',
    '| ----- | -------------------------------------- | ----- |',
    '| FR-1  | `pnpm test test/a.test.ts`             | pkg   |',
    '| FR-2  | `pnpm build && node dist/cli.js x`     | pkg   |',
    '| FR-3  | `pnpm run $(evil)` and `not-a-command` | pkg   |',
    '| FR-4  | `pnpm test test/a.test.ts`             | dupe  |',
    '',
    '- `pnpm check-types` — cross-cutting bullet, never runnable by the runner',
    '',
    '## 12. Next',
  ].join('\n');

  it('collects FR-row commands with safety flags, deduped, ignoring bullets', () => {
    const cmds = parseVerificationCommands(cfg, PRD);
    expect(cmds).toEqual([
      { cmd: 'pnpm test test/a.test.ts', safe: true },
      { cmd: 'pnpm build && node dist/cli.js x', safe: true },
      { cmd: 'pnpm run $(evil)', safe: false },
    ]);
  });

  it('returns empty when the section is missing', () => {
    expect(parseVerificationCommands(cfg, '# nothing')).toEqual([]);
  });
});

describe('codex review regressions (round 1)', () => {
  it('rejects a lone & (backgrounding escapes the segment check)', () => {
    expect(isSafeCommand(cfg, 'pnpm test & rm -rf /tmp/victim')).toBe(false);
    expect(isSafeCommand(cfg, 'pnpm test & PROVEGATE_RUN_ACTIVE= node cli.js run PRD-002')).toBe(
      false,
    );
    // && chaining stays legal
    expect(isSafeCommand(cfg, 'pnpm test && pnpm build')).toBe(true);
  });

  it('surfaces command-shaped non-prefix tokens as unsafe instead of hiding them', () => {
    const prd = [
      '## 11. Verification Commands',
      '| FR   | Command |',
      '| ---- | ------- |',
      '| FR-1 | `pnpm test` then `rm -rf /` |',
    ].join('\n');
    const cmds = parseVerificationCommands(cfg, prd);
    expect(cmds).toContainEqual({ cmd: 'rm -rf /', safe: false });
  });
});
