import { describe, expect, it } from 'vitest';
import { declaredArtifacts, durableArtifactsOk } from '../src/core/run/durable.js';

describe('declaredArtifacts', () => {
  it('extracts backticked paths, dropping none and template tokens', () => {
    const content = [
      '## Durable Artifacts',
      '',
      '- `apps/docs/content/docs/cli.mdx` — reference update',
      '- `packages/provegate/README.md` — runner docs',
      '- ADR: `none`',
      '- Pattern: `docs/{pattern}.md`',
      '',
      '## 11. Next',
    ].join('\n');
    expect(declaredArtifacts(content)).toEqual([
      'apps/docs/content/docs/cli.mdx',
      'packages/provegate/README.md',
    ]);
  });

  it('empty section or all-none declares nothing', () => {
    expect(declaredArtifacts('## Durable Artifacts\n\n- none\n')).toEqual([]);
    expect(declaredArtifacts('# no section')).toEqual([]);
  });
});

describe('durableArtifactsOk', () => {
  it('passes when every declared path is in the diff (file or dir prefix)', () => {
    expect(
      durableArtifactsOk(['a/b.md', 'docs/wiki'], ['a/b.md', 'docs/wiki/page.md', 'x.ts']).ok,
    ).toBe(true);
  });

  it('fails naming the missing paths', () => {
    const result = durableArtifactsOk(['a/b.md', 'c/d.md'], ['a/b.md']);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['c/d.md']);
    expect(result.why).toContain('c/d.md');
  });

  it('no declarations = pass', () => {
    expect(durableArtifactsOk([], []).ok).toBe(true);
  });
});
