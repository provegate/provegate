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

  const dirty = git(root, ['status', '--porcelain']);
  if (!dirty) return { moved, committed: false };
  git(root, [
    'add',
    '--all',
    '--',
    ...new Set([
      ...moved,
      ...moved.map((d) => d.replace(`/${completed}/`, `/${wip}/`)),
      config.dirs.stateFile,
    ]),
  ]);
  git(root, ['commit', '-m', archiveCommitMessage(record.prd)]);
  return { moved, committed: true };
}
