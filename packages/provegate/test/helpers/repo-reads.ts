// The ONE door for out-of-package reads (PRD-036). Every path a package test
// reads from outside packages/provegate resolves through `repoPath`, and every
// group it may name is declared in `REPO_READ_GLOBS` — the ledger the
// verify:test-inputs gate checks in both directions (usage → ledger,
// ledger → turbo `test` inputs). This file is one of the two boundary-scan
// exemptions; its shape is itself validated (exactly these three exports, only
// node:path and node:url imports, no read or spawn calls).
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The in-package anchor — one definition instead of per-file copies. */
export const pkgRoot = fileURLToPath(new URL('../..', import.meta.url));

const repoRoot = fileURLToPath(new URL('../../../..', import.meta.url));

/** Resolve a repo-relative path. `repoPath('.')` is the sanctioned base
 * accessor for consumers whose subpaths are config-derived (their input
 * groups are census-declared at the glob level). */
export const repoPath = (rel: string): string => join(repoRoot, rel);

/** The census ledger: twelve PRD-036 groups plus the four previously declared
 * root inputs. Mirrors the `test` task's `$TURBO_ROOT$/…` inputs in
 * turbo.json — verify:test-inputs refuses a divergence in either direction. */
export const REPO_READ_GLOBS = [
  '**/*.md',
  'docs/research/provegate-bootstrap/**',
  'scripts/verify/**',
  '_docs/reviews/**',
  'apps/docs/content/docs/**',
  '.changeset/**',
  'package.json',
  'turbo.json',
  'LICENSE',
  'apps/web/app/page.tsx',
  '.github/workflows/**',
  '.githooks/**',
  '_prds/**',
  '_brain/**',
  'workflow.config.json',
  'gates.manifest.json',
];
