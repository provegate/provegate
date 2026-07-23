import { execFile } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/core/config/index.js';
import { validateLock } from '../src/core/locks/index.js';
import { claimPrd, createPrd, initWorkspace } from '../src/core/run/index.js';

const run = promisify(execFile);
const cliPath = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
const cfg = DEFAULT_CONFIG;
const roots: string[] = [];
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop()!, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'provegate-open-'));
  roots.push(root);
  initWorkspace(cfg, root);
  return root;
}

/** A PRD with a declared Conflict Surface. Built via createPrd, then the
 * template's EXAMPLE surface section is replaced with the real globs (the
 * parser reads the first `## Conflict Surface` section). */
function prdWithSurface(root: string, slug: string, globs: string[]): string {
  const { id, path } = createPrd(cfg, root, { slug });
  const content = readFileSync(path, 'utf8');
  const replaced = content.replace(
    /## Conflict Surface\n[\s\S]*?(?=\n## |$)/,
    `## Conflict Surface\n\n${globs.map((g) => `- \`${g}\``).join('\n')}\n\n`,
  );
  if (replaced === content) throw new Error('template Conflict Surface section not found');
  writeFileSync(path, replaced);
  return id;
}

/** A PRD whose surface section is stripped entirely. */
function prdWithoutSurface(root: string, slug: string): string {
  const { id, path } = createPrd(cfg, root, { slug });
  const content = readFileSync(path, 'utf8');
  const replaced = content.replace(/## Conflict Surface\n[\s\S]*?(?=\n## |$)/, '');
  writeFileSync(path, replaced);
  return id;
}

function foreignLease(
  root: string,
  file: string,
  prd: string,
  globs: string[],
  { expired = false }: { expired?: boolean } = {},
): void {
  const now = Date.now();
  writeFileSync(
    join(root, '_state/locks', file),
    `${JSON.stringify({
      schemaVersion: 2,
      lockId: file.replace(/\.json$/, ''),
      agent: 'rival-agent',
      prd,
      phase: 'Phase 4',
      startedAt: new Date(now - 7_200_000).toISOString(),
      expiresAt: new Date(expired ? now - 3_600_000 : now + 3_600_000).toISOString(),
      touchedFiles: globs,
      ownedPaths: globs,
    })}\n`,
  );
}

describe('claimPrd (FR-2, W3)', () => {
  it('clear surface: writes a schema-valid lease; queue-visible', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'solo-item', ['src/solo/**']);
    const result = claimPrd(cfg, root, id);
    expect(result.ok).toBe(true);
    expect(result.refreshed).toBe(false);
    const lease = JSON.parse(readFileSync(result.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(validateLock(cfg, lease)).toEqual([]);
    expect(lease['ownedPaths']).toEqual(['src/solo/**']);
  });

  it('no Conflict Surface → refusal with guidance, no lease written', () => {
    const root = tempRoot();
    const id = prdWithoutSurface(root, 'surfaceless');
    const result = claimPrd(cfg, root, id);
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('declares no Conflict Surface');
    expect(result.leasePath).toBeUndefined();
  });

  it('foreign VALID overlap → refuse, name holder + overlap; --steal does NOT override', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'challenger', ['src/auth/**', 'docs/**']);
    foreignLease(root, 'prd-099-holder.json', 'PRD-099', ['src/auth/login.ts']);
    for (const steal of [false, true]) {
      const result = claimPrd(cfg, root, id, { steal });
      expect(result.ok, `steal=${steal}`).toBe(false);
      expect(result.issues.join(' ')).toContain('PRD-099');
      expect(existsSync(join(root, '_state/locks/prd-099-holder.json'))).toBe(true);
    }
  });

  it('foreign STALE overlap → refuse + advertise --steal; --steal replaces and names victim (W3)', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'reaper', ['src/auth/**']);
    foreignLease(root, 'prd-098-ghost.json', 'PRD-098', ['src/auth/**'], { expired: true });

    const refused = claimPrd(cfg, root, id);
    expect(refused.ok).toBe(false);
    expect(refused.issues.join(' ')).toContain('--steal');
    expect(refused.staleBlockers).toHaveLength(1);
    expect(existsSync(join(root, '_state/locks/prd-098-ghost.json'))).toBe(true);

    const stolen = claimPrd(cfg, root, id, { steal: true });
    expect(stolen.ok).toBe(true);
    expect(stolen.stolen).toHaveLength(1);
    expect(stolen.stolen[0]).toMatchObject({ prd: 'PRD-098', agent: 'rival-agent' });
    expect(existsSync(join(root, '_state/locks/prd-098-ghost.json'))).toBe(false);
    expect(existsSync(stolen.leasePath!)).toBe(true);
  });

  it('self re-claim is idempotent: refreshed lease, "already held" semantics (W3)', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'mine-twice', ['src/mine/**']);
    const first = claimPrd(cfg, root, id, { now: new Date('2026-07-23T10:00:00Z') });
    const second = claimPrd(cfg, root, id, { now: new Date('2026-07-23T11:00:00Z') });
    expect(second.ok).toBe(true);
    expect(second.refreshed).toBe(true);
    const lease = JSON.parse(readFileSync(second.leasePath!, 'utf8')) as Record<string, string>;
    expect(Date.parse(lease['expiresAt']!)).toBeGreaterThan(
      Date.parse(
        (JSON.parse(readFileSync(first.leasePath!, 'utf8')) as Record<string, string>)[
          'startedAt'
        ]!,
      ),
    );
  });

  it('self STALE lease refreshes without --steal (W3)', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'self-stale', ['src/stale/**']);
    foreignLease(root, `${id.toLowerCase()}-self-stale.json`, id, ['src/stale/**'], {
      expired: true,
    });
    const result = claimPrd(cfg, root, id);
    expect(result.ok).toBe(true);
    expect(result.refreshed).toBe(true);
  });

  it('malformed leases fail CLOSED: corrupt JSON or bad shape blocks every claim', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'careful', ['src/careful/**']);
    writeFileSync(join(root, '_state/locks/broken.json'), '{ not json');
    const corrupt = claimPrd(cfg, root, id);
    expect(corrupt.ok).toBe(false);
    expect(corrupt.issues.join(' ')).toContain('fail closed');
    rmSync(join(root, '_state/locks/broken.json'));

    // Well-formed JSON, unparseable expiresAt: ownership unknowable — NOT
    // stealable stale state.
    writeFileSync(
      join(root, '_state/locks/prd-095-mystery.json'),
      JSON.stringify({
        schemaVersion: 2,
        lockId: 'prd-095-mystery',
        agent: 'x',
        prd: 'PRD-095',
        phase: 'Phase 4',
        startedAt: 'whenever',
        expiresAt: 'not-a-date',
        touchedFiles: ['src/careful/**'],
        ownedPaths: ['src/careful/**'],
      }),
    );
    for (const steal of [false, true]) {
      const result = claimPrd(cfg, root, id, { steal });
      expect(result.ok, `steal=${steal}`).toBe(false);
      expect(existsSync(join(root, '_state/locks/prd-095-mystery.json'))).toBe(true);
    }
  });

  it('lease agent defaults to the first configured owner role', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'owned', ['src/owned/**']);
    const result = claimPrd(cfg, root, id);
    const lease = JSON.parse(readFileSync(result.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(lease['agent']).toBe('owner');
    const explicit = claimPrd(cfg, root, id, { agent: 'operator' });
    const lease2 = JSON.parse(readFileSync(explicit.leasePath!, 'utf8')) as Record<string, unknown>;
    expect(lease2['agent']).toBe('operator');
  });

  it('steal aborts + rolls back when the victim is refreshed INSIDE the race window', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'patient', ['src/patient/**']);
    foreignLease(root, 'prd-094-sleeper.json', 'PRD-094', ['src/patient/**'], { expired: true });
    // The hook fires after claimPrd's parse (which saw the lease stale) and
    // before any mutation: the victim is refreshed in exactly the window the
    // quarantine validation must catch.
    const result = claimPrd(cfg, root, id, {
      steal: true,
      raceWindow: () =>
        foreignLease(root, 'prd-094-sleeper.json', 'PRD-094', ['src/patient/**']),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('all victims restored');
    // Rolled back: the REFRESHED lease survives at its original path.
    const survivor = JSON.parse(
      readFileSync(join(root, '_state/locks/prd-094-sleeper.json'), 'utf8'),
    ) as Record<string, string>;
    expect(Date.parse(survivor['expiresAt']!)).toBeGreaterThan(Date.now());
  });

  it('a rival landing at the canonical destination inside the race window aborts (wx), victims restored', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'squatter-target', ['src/sq/**']);
    foreignLease(root, 'prd-093-old.json', 'PRD-093', ['src/sq/**'], { expired: true });
    const canonical = join(root, '_state/locks', `${id.toLowerCase()}-squatter-target.json`);
    const result = claimPrd(cfg, root, id, {
      steal: true,
      raceWindow: () => writeFileSync(canonical, '{"planted":"rival"}\n'),
    });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toContain('all victims restored');
    // The planted file is untouched and the quarantined victim is back.
    expect(readFileSync(canonical, 'utf8')).toContain('planted');
    expect(existsSync(join(root, '_state/locks/prd-093-old.json'))).toBe(true);
  });

  it('a stale mutex from a dead pid fails CLOSED with manual-recovery instructions', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'mutexed', ['src/mx/**']);
    const mutexPath = join(root, '_state/locks/.gate-open.mutex');
    writeFileSync(mutexPath, '999999999:1:2020-01-01T00:00:00Z\n');
    utimesSync(mutexPath, new Date(Date.now() - 120_000), new Date(Date.now() - 120_000));
    expect(() => claimPrd(cfg, root, id)).toThrow(/stale workspace mutex/);
    expect(() => claimPrd(cfg, root, id)).toThrow(/delete that file manually/);
    rmSync(mutexPath);
    expect(claimPrd(cfg, root, id).ok).toBe(true);
  });

  it('non-overlapping foreign leases do not block', () => {
    const root = tempRoot();
    const id = prdWithSurface(root, 'parallel-ok', ['apps/web/**']);
    foreignLease(root, 'prd-097-other.json', 'PRD-097', ['packages/engine/**']);
    expect(claimPrd(cfg, root, id).ok).toBe(true);
  });
});

describe('gate open (live CLI)', () => {
  it('claims through the CLI, refuses overlap with exit 1', async () => {
    const root = mkdtempSync(join(tmpdir(), 'provegate-open-cli-'));
    roots.push(root);
    await run(process.execPath, [cliPath, 'init'], { cwd: root });
    await run(process.execPath, [cliPath, 'new', 'cli-open'], { cwd: root });
    const prdPath = join(root, '_prds/wip/prd-001-cli-open.md');
    writeFileSync(
      prdPath,
      `${readFileSync(prdPath, 'utf8')}\n## Conflict Surface\n\n- \`src/cli/**\`\n`,
    );
    const claimed = await run(process.execPath, [cliPath, 'open', 'PRD-001'], { cwd: root });
    expect(claimed.stdout).toContain('claimed PRD-001');

    foreignLease(root, 'prd-099-rival.json', 'PRD-099', ['src/cli/inner/**']);
    await run(process.execPath, [cliPath, 'new', 'cli-clash'], { cwd: root });
    const clashPath = join(root, '_prds/wip/prd-002-cli-clash.md');
    writeFileSync(
      clashPath,
      `${readFileSync(clashPath, 'utf8')}\n## Conflict Surface\n\n- \`src/cli/**\`\n`,
    );
    await expect(
      run(process.execPath, [cliPath, 'open', 'PRD-002'], { cwd: root }),
    ).rejects.toMatchObject({ code: 1 });
  });
});
