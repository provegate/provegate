import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { WorkflowConfig } from '../config/index.js';
import type { StateRecord } from '../state/build.js';

/**
 * Pre-merge archive: move the item's artifacts from the wip state to the
 * completed state and commit. The commit message is conventional-commit
 * shaped (lower-case subject) so a consumer's commitlint hook accepts it.
 */

export interface ArchiveResult {
  moved: string[];
  committed: boolean;
  /** The commit `git commit` actually created, read from its own output —
   * NOT a later `rev-parse HEAD`, which a post-commit hook may already have
   * rewritten (codex prd-007 r24 P1). */
  commitSha?: string;
}

function git(root: string, args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

export function archiveCommitMessage(id: string): string {
  return `chore(workflow): archive ${id} artifacts`;
}

export function archivePrdArtifacts(
  config: WorkflowConfig,
  root: string,
  record: StateRecord,
): ArchiveResult {
  const wip = config.dirs.stateRoles.wip;
  const completed = config.dirs.stateRoles.completed;
  const moved: string[] = [];

  for (const [, artifactPath] of Object.entries(record.artifacts)) {
    if (!artifactPath) continue;
    const marker = `/${wip}/`;
    if (!artifactPath.includes(marker)) continue;
    const dest = artifactPath.replace(marker, `/${completed}/`);
    if (!existsSync(resolve(root, artifactPath))) continue;
    git(root, ['mv', artifactPath, dest]);
    moved.push(dest);
  }

  if (moved.length === 0) return { moved, committed: false };

  // Pathspec-scoped commit: a plain `git commit` would sweep in whatever else
  // happens to be staged (codex P1 finding). `git mv` already staged the
  // renames; only the state snapshot needs staging, and only when present.
  const oldPaths = moved.map((d) => d.replace(`/${completed}/`, `/${wip}/`));
  const paths = [...new Set([...moved, ...oldPaths])];
  if (existsSync(resolve(root, config.dirs.stateFile))) {
    git(root, ['add', '--', config.dirs.stateFile]);
    paths.push(config.dirs.stateFile);
  }
  // `--no-verify` is NOT used: consumer hooks stay in force. The commit's own
  // identity comes from `rev-parse` on the ref written by THIS commit, read
  // before returning so the caller can detect a post-commit rewrite.
  const out = git(root, [
    'commit',
    '-m',
    archiveCommitMessage(record.prd),
    '--',
    ...paths,
  ]);
  // `git commit` prints `[<branch> <abbrev>] <subject>`. Branch names may
  // legally contain `]`, so anchor on the hash: the LAST space-delimited hex
  // token closing the bracket group (codex prd-007 r25 P2). Falls back to
  // HEAD when the porcelain text is localized or absent.
  // core.abbrev is configurable down to 4, so the hash token is not
  // 7+ characters by contract (codex prd-007 r27 P1).
  const abbrev = /^\[.*\s([0-9a-f]{4,40})\]/m.exec(out)?.[1];
  let commitSha: string | undefined;
  try {
    commitSha = git(root, ['rev-parse', abbrev ?? 'HEAD']);
  } catch {
    commitSha = undefined;
  }
  return { moved, committed: true, commitSha };
}
