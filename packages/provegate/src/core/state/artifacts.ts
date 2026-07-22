import { existsSync, readdirSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import type { DirsConfig, IdPatternConfig, WorkflowConfig } from '../config/index.js';
import { escapeRegExp } from './markdown.js';

/** Repo-relative, posix-normalized path — the storage/matching form everywhere. */
export function toRepoPath(root: string, pathname: string): string {
  return relative(root, pathname).split(sep).join('/');
}

/** Recursively list `.md` files, skipping build/VCS directories. Sorted by repo path. */
export function listMarkdownFiles(root: string, dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git' || entry === '.next') continue;
      out.push(...listMarkdownFiles(root, full));
    } else if (entry.endsWith('.md')) {
      out.push(full);
    }
  }
  return out.sort((a, b) => toRepoPath(root, a).localeCompare(toRepoPath(root, b)));
}

export interface ParsedArtifactName {
  number: number;
  slug: string;
}

/** Parse `<prefix>-<NNN>-<slug>.md` with the configured digit width. */
export function parseArtifactName(
  idPattern: IdPatternConfig,
  prefix: string,
  filePath: string,
): ParsedArtifactName | null {
  const name = filePath.split(sep).at(-1) ?? '';
  const match = name.match(
    new RegExp(`^${escapeRegExp(prefix)}-(\\d{${idPattern.width}})-(.+)\\.md$`),
  );
  if (!match) return null;
  return {
    number: Number.parseInt(match[1]!, 10),
    slug: match[2]!,
  };
}

/** `PRD-001`-style display id from a number. */
export function formatId(idPattern: IdPatternConfig, number: number): string {
  return `${idPattern.prefix}-${String(number).padStart(idPattern.width, '0')}`;
}

export type ArtifactKey = keyof DirsConfig['artifacts'];

export interface ArtifactFile extends ParsedArtifactName {
  key: ArtifactKey;
  dir: string;
  prefix: string;
  file: string;
  state: string;
}

/** Which lifecycle state a stored artifact path denotes. */
export function artifactState(config: WorkflowConfig, pathname: string): string {
  if (!pathname) return 'missing';
  for (const state of config.dirs.states) {
    if (pathname.includes(`/${state}/`)) return state;
  }
  return 'missing';
}

/** Collect every parseable artifact file across kinds × lifecycle states. */
export function collectArtifactFiles(config: WorkflowConfig, root: string): ArtifactFile[] {
  const result: ArtifactFile[] = [];
  for (const [key, artifact] of Object.entries(config.dirs.artifacts) as [
    ArtifactKey,
    DirsConfig['artifacts'][ArtifactKey],
  ][]) {
    for (const state of config.dirs.states) {
      const dir = resolve(root, artifact.dir, state);
      for (const file of listMarkdownFiles(root, dir)) {
        const parsed = parseArtifactName(config.idPattern, artifact.prefix, file);
        if (!parsed) continue;
        result.push({ key, dir: artifact.dir, prefix: artifact.prefix, ...parsed, file, state });
      }
    }
  }
  return result;
}
