import type { WorkflowConfig } from './types.js';

/**
 * Defaults mirror the parent workflow's values with project-specific content
 * removed: no personal names, no non-English labels, no historic thresholds.
 */
export const DEFAULT_CONFIG: WorkflowConfig = {
  dirs: {
    artifacts: {
      prd: { dir: '_prds', prefix: 'prd' },
      readiness: { dir: '_readiness', prefix: 'readiness' },
      tasks: { dir: '_tasks', prefix: 'tasks' },
      summary: { dir: '_docs', prefix: 'summary' },
    },
    states: ['wip', 'completed', 'deferred'],
    stateRoles: {
      wip: 'wip',
      completed: 'completed',
      deferred: 'deferred',
    },
    stateFile: '_state/prds.json',
    locksDir: '_state/locks',
    reviewsDir: '_docs/reviews',
    metricsFile: '_state/prd-metrics.jsonl',
  },
  idPattern: {
    prefix: 'PRD',
    width: 3,
  },
  statusVocab: {
    canonical: [
      'Draft',
      'In Review',
      'Approved',
      'In Progress',
      'Code Complete',
      'Operator Verification',
      'Ship Verified',
      'Superseded',
      'Archived',
      'Blocked',
      'Deferred',
      'Not Started',
    ],
    aliases: {
      proposed: 'Draft',
      complete: 'Ship Verified',
      completed: 'Ship Verified',
      done: 'Ship Verified',
    },
    active: ['Draft', 'In Review', 'Approved', 'In Progress', 'Blocked'],
    implemented: ['Code Complete', 'Operator Verification', 'Ship Verified', 'Archived'],
    ready: ['Approved'],
    blocked: ['Blocked'],
    reviewing: ['Code Complete', 'Operator Verification'],
  },
  branches: {
    base: 'main',
    protected: ['main', 'master', 'staging'],
    featurePattern: 'feat/{id}-{slug}',
    allowedDirectPrefixes: ['_prds/', '_tasks/', '_readiness/', '_docs/', '_state/', 'docs/'],
    allowedDirectFiles: ['README.md', 'AGENTS.md', 'CLAUDE.md'],
  },
  commands: {
    checkTypes: 'pnpm check-types',
    lint: 'pnpm lint',
    test: 'pnpm test',
    build: 'pnpm build',
    allowedPrefixes: [
      'pnpm ',
      'npm ',
      'npx ',
      'yarn ',
      'bun ',
      'node ',
      'tsx ',
      'vitest ',
      'playwright ',
      'psql ',
      'curl ',
      'test ',
      'grep ',
    ],
  },
  owners: ['owner', 'operator'],
  worktree: {
    dir: '.worktrees',
  },
  executionPhases: ['Phase 2b', 'Phase 3', 'Phase 4', 'Maintenance'],
  classes: ['feature', 'test-hardening', 'hotfix', 'infra'],
  verifyScriptPattern: '^verify:',
  templates: {
    prd: '',
  },
  sharedAppendOnly: ['package.json', 'pnpm-lock.yaml', 'README.md', 'CLAUDE.md', 'AGENTS.md'],
  // Memory ships DISABLED. The paths below are the conventional layout an
  // opt-in repository gets, not an implicit activation: nothing reads them
  // while `enabled` is false, and no code path infers enablement from a
  // `_brain` directory existing. `entrypoints` starts empty because the set is
  // per-repository — a fresh practices install fills it, an existing repo
  // declares its own.
  memory: {
    enabled: false,
    root: '_brain',
    index: '_brain/INDEX.md',
    entrypoints: [],
    verifyCommand: '',
    retroAfterCompleted: 0,
  },
};
