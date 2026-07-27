import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfigError, DEFAULT_CONFIG, resolveConfig } from '../src/core/config/index.js';
import { claimPrd, createPrd, initWorkspace } from '../src/core/run/index.js';
import { validateResolvedConfig } from '../src/core/config/validate.js';

/**
 * PRD-021 FR-1 — the `valueScoring` config surface.
 *
 * The load-bearing cases go through `resolveConfig`, not through
 * `validateResolvedConfig` alone. `deepMerge` runs BEFORE validation, so a
 * fixture that hands validation a resolved object it built by hand can pass
 * while the real loader fails — which is exactly the defect the loader
 * exception exists to fix, and exactly the fixture shape that would hide it.
 */

const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** Write a `workflow.config.json` and resolve it the way the CLI does. */
function resolve(config: unknown) {
  const root = mkdtempSync(join(tmpdir(), 'provegate-vs-'));
  roots.push(root);
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify(config, null, 2));
  return resolveConfig(root);
}

/** The issues a config produces, or [] when it resolves. */
function issuesOf(config: unknown): string[] {
  try {
    resolve(config);
    return [];
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
    return error.issues.map((i) => `${i.path}: ${i.message}`);
  }
}

describe('valueScoring defaults (FR-1)', () => {
  it('ships five axes, weights summing to 1, and NO enforceFrom', () => {
    const vs = DEFAULT_CONFIG.valueScoring;
    expect(vs.axes).toEqual(['MF', 'UI', 'TL', 'AR', 'RM']);
    expect(Object.keys(vs.weights).sort()).toEqual([...vs.axes].sort());
    // `enforceFrom` absent — not 0, and not 1. A default cutoff would fail an
    // adopter's first `gate check` for omitting a header the shipped template
    // never emits and no shipped prompt asks for.
    expect('enforceFrom' in vs).toBe(false);
    expect(vs.enforceFrom).toBeUndefined();
  });

  it('the shipped default resolves clean', () => {
    expect(validateResolvedConfig(DEFAULT_CONFIG)).toEqual([]);
  });
});

describe('valueScoring resolution — the loader exception (FR-1)', () => {
  it('a three-axis config resolves to exactly three weight keys', () => {
    // THE regression. Without the pre-merge replacement, `weights` merges
    // recursively, this config arrives at validation carrying the five default
    // keys, and set-equality fails — making every legal custom-axis config an
    // error. A validation-only fixture cannot see that.
    const resolved = resolve({
      valueScoring: { axes: ['A', 'B', 'C'], weights: { A: 0.5, B: 0.3, C: 0.2 } },
    });
    expect(resolved.valueScoring.axes).toEqual(['A', 'B', 'C']);
    expect(Object.keys(resolved.valueScoring.weights).sort()).toEqual(['A', 'B', 'C']);
  });

  it('declaring axes drops the DEFAULT weights entirely, key for key', () => {
    // An earlier version of this test supplied `enforceFrom: 4` and asserted it
    // came back as 4 — which recursive merge and wholesale replacement both
    // produce, because the shipped default has no `enforceFrom` to inherit. It
    // could not fail. The property that distinguishes the two behaviours is
    // the WEIGHTS: under a merge, `TL`, `AR` and `RM` survive from the default.
    const resolved = resolve({
      valueScoring: { axes: ['A', 'B'], weights: { A: 0.5, B: 0.5 } },
    });
    expect(Object.keys(resolved.valueScoring.weights).sort()).toEqual(['A', 'B']);
    for (const inherited of ['MF', 'UI', 'TL', 'AR', 'RM']) {
      expect(resolved.valueScoring.weights, inherited).not.toHaveProperty(inherited);
    }
  });

  it('weights WITHOUT axes is a legal partial retune of the default axes', () => {
    // Deliberately an ordinary recursive merge: an adopter nudging two weights
    // should not have to restate all five. The sum rule is what keeps it
    // honest — see the next case.
    const resolved = resolve({ valueScoring: { weights: { MF: 0.3, UI: 0.2 } } });
    expect(resolved.valueScoring.axes).toEqual(DEFAULT_CONFIG.valueScoring.axes);
    expect(resolved.valueScoring.weights).toEqual({
      MF: 0.3,
      UI: 0.2,
      TL: 0.2,
      AR: 0.15,
      RM: 0.15,
    });
  });

  it('an incoherent partial retune fails on the SUM, naming the sum', () => {
    // Raising MF without lowering anything resolves to 1.05. The failure must
    // name the sum, not the axis set: the axes are fine, the arithmetic is not.
    const issues = issuesOf({ valueScoring: { weights: { MF: 0.3 } } });
    expect(issues).toEqual(['valueScoring.weights: must sum to exactly 1 (got 1.05)']);
  });

  it('a legal set whose FLOAT sum is not 1 still resolves — the rule is in hundredths', () => {
    // The reason the sum is compared in integer hundredths rather than with
    // `=== 1`. This set is exactly right on paper and sums to
    // 0.9999999999999999 as doubles, so a float-equality rule would reject it.
    //
    // Finding it took a search. The shipped five weights sum to exactly 1 as
    // doubles, and so does the textbook 0.1 + 0.2 + 0.7 — two earlier versions
    // of this test asserted otherwise and failed on their own false premise.
    // A property that needs a witness has to be given a real one.
    expect(0.06 + 0.57 + 0.37).not.toBe(1);
    const resolved = resolve({
      valueScoring: { axes: ['A', 'B', 'C'], weights: { A: 0.06, B: 0.57, C: 0.37 } },
    });
    expect(resolved.valueScoring.weights).toEqual({ A: 0.06, B: 0.57, C: 0.37 });
  });

  it('an absent valueScoring key leaves the defaults untouched', () => {
    expect(resolve({}).valueScoring).toEqual(DEFAULT_CONFIG.valueScoring);
  });
});

describe('valueScoring validation (FR-1)', () => {
  const withAxes = (axes: string[], weights: Record<string, number>) =>
    issuesOf({ valueScoring: { axes, weights } });

  it('the weight key set must equal the axis set in BOTH directions', () => {
    expect(withAxes(['A', 'B'], { A: 0.5, B: 0.3, C: 0.2 })).toContain(
      'valueScoring.weights.C: names an axis that valueScoring.axes does not declare',
    );
    expect(withAxes(['A', 'B', 'C'], { A: 0.5, B: 0.5 })).toContain(
      'valueScoring.weights.C: missing — every declared axis needs a weight',
    );
  });

  it('rejects a charset violation, naming the identifier', () => {
    for (const bad of ['A/B', '.*', 'has space', '']) {
      const issues = withAxes(['MF', bad], { MF: 0.5, [bad]: 0.5 });
      expect(issues.join(' '), bad).toMatch(/valueScoring\.axes\[1\]|must be an array/);
    }
  });

  it('rejects duplicates case-insensitively, with a message distinct from the charset one', () => {
    // Two different defects must read differently. `["MF","mf"]` passes the
    // charset and is still ambiguous, because the generated pattern is
    // case-insensitive (the snapshot's `/i`, ported deliberately).
    const exact = withAxes(['MF', 'MF'], { MF: 1 });
    const folded = withAxes(['MF', 'mf'], { MF: 0.5, mf: 0.5 });
    for (const issues of [exact, folded]) {
      expect(issues.join(' ')).toMatch(/duplicates "MF" — axis identifiers are unique ignoring case/);
      expect(issues.join(' ')).not.toMatch(/must match \^\[A-Za-z\]/);
    }
  });

  it('bounds the axis count at 2 and 10', () => {
    expect(withAxes(['A'], { A: 1 }).join(' ')).toMatch(/between 2 and 10 axes/);
    const eleven = Array.from({ length: 11 }, (_, i) => `A${i}`);
    const weights = Object.fromEntries(eleven.map((a) => [a, 0.1]));
    expect(withAxes(eleven, weights).join(' ')).toMatch(/between 2 and 10 axes/);
  });

  it('accepts two-decimal weights and rejects finer ones — lexically, not arithmetically', () => {
    // 0.29 and 0.58 are the cases an arithmetic test gets wrong:
    // `Number.isInteger(0.29 * 100)` is false because 0.29 * 100 is
    // 28.999999999999996, so an arithmetic rule rejects a legal weight.
    expect(withAxes(['A', 'B', 'C'], { A: 0.29, B: 0.58, C: 0.13 })).toEqual([]);
    expect(withAxes(['A', 'B'], { A: 0.155, B: 0.845 }).join(' ')).toMatch(
      /0\.155 must be written with at most two decimal places/,
    );
    expect(withAxes(['A', 'B'], { A: 1e-7, B: 0.9999999 }).join(' ')).toMatch(
      /must be written with at most two decimal places/,
    );
  });

  it('rejects a zero or negative weight before it can be scaled', () => {
    expect(withAxes(['A', 'B'], { A: 0, B: 1 }).join(' ')).toMatch(/must be greater than 0/);
    expect(withAxes(['A', 'B'], { A: -0.5, B: 1.5 }).join(' ')).toMatch(/must be greater than 0/);
  });

  it('a bad decimal form does not also report a confusing sum error', () => {
    // One defect, one message. The weight could not be scaled, so the sum is
    // unknowable and reporting it would send the reader after the wrong thing.
    const issues = withAxes(['A', 'B'], { A: 0.155, B: 0.845 });
    expect(issues.filter((i) => i.includes('must sum to exactly 1'))).toEqual([]);
  });

  it('enforceFrom accepts 0 and rejects a fraction or a negative', () => {
    // 0 is legal and means the same as 1 — every id is ≥ both — but it is an
    // explicit opt-in rather than the shipped default.
    expect(issuesOf({ valueScoring: { enforceFrom: 0 } })).toEqual([]);
    expect(issuesOf({ valueScoring: { enforceFrom: 1.5 } }).join(' ')).toMatch(
      /valueScoring\.enforceFrom: must be a non-negative work-item id/,
    );
    expect(issuesOf({ valueScoring: { enforceFrom: -1 } }).join(' ')).toMatch(
      /valueScoring\.enforceFrom: must be a non-negative work-item id/,
    );
  });

  it('an unknown key inside valueScoring fails rather than being ignored', () => {
    expect(issuesOf({ valueScoring: { axisWeights: {} } })).toContain(
      'valueScoring.axisWeights: unknown key',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FR-5 — the control-artifact edit
// ─────────────────────────────────────────────────────────────────────────────

describe('editing workflow.config.json advances the base for held leases (FR-5)', () => {
  const git = (cwd: string, args: string[]): string =>
    execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

  /** A repo whose control artifacts are committed, with a claimed worktree. */
  function claimedRepo() {
    const root = mkdtempSync(join(tmpdir(), 'provegate-fr5-'));
    roots.push(root);
    git(root, ['init', '-b', 'main']);
    git(root, ['config', 'user.email', 'test@example.invalid']);
    git(root, ['config', 'user.name', 'Test']);
    git(root, ['config', 'commit.gpgsign', 'false']);
    writeFileSync(join(root, 'seed.txt'), 'seed\n');
    initWorkspace(DEFAULT_CONFIG, root);
    // The file this PRD edits — present and committed BEFORE the claim, which
    // is what makes this the edit case rather than the introduction case.
    writeFileSync(join(root, 'workflow.config.json'), `${JSON.stringify({ owners: ['a'] }, null, 2)}\n`);

    const { id, path } = createPrd(DEFAULT_CONFIG, root, { slug: 'cutoff' });
    writeFileSync(
      path,
      readFileSync(path, 'utf8').replace(
        /## Conflict Surface\n[\s\S]*?(?=\n## |$)/,
        '## Conflict Surface\n\n- `src/cutoff/**`\n\n',
      ),
    );
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'workflow artifacts']);

    const claim = claimPrd(DEFAULT_CONFIG, root, id, { worktree: true });
    expect(claim.ok, claim.issues.join('; ')).toBe(true);
    return { root, id };
  }

  it('a lease taken before the edit is refused on reuse, and accepted after the merge', () => {
    // The migration cost this PRD owes an operator, proved rather than
    // asserted: adding `valueScoring.enforceFrom` to the root config moves the
    // control-artifact base, so every worktree claimed before it must merge.
    const { root, id } = claimedRepo();

    writeFileSync(
      join(root, 'workflow.config.json'),
      `${JSON.stringify({ owners: ['a'], valueScoring: { enforceFrom: 17 } }, null, 2)}\n`,
    );
    git(root, ['add', '-A']);
    git(root, ['commit', '-m', 'chore: set the value-score cutoff']);

    const stale = claimPrd(DEFAULT_CONFIG, root, id, { worktree: true });
    expect(stale.ok).toBe(false);
    expect(stale.issues.join('; ')).toContain('workflow.config.json');
    expect(stale.issues.join('; ')).toMatch(/merge or rebase main into/);

    // The remedy the refusal names, performed. An instruction that does not
    // work is worse than no instruction.
    const wt = join(root, `.worktrees/${id.toLowerCase()}-cutoff`);
    git(wt, ['merge', '--no-edit', 'main']);
    const after = claimPrd(DEFAULT_CONFIG, root, id, { worktree: true });
    expect(after.ok, after.issues.join('; ')).toBe(true);
  });
});
