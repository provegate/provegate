/**
 * SCOPES — this repo's app / package / tooling names, derived from commit history.
 * Validated as a WARNING only (level 1): an unknown scope is almost always a
 * not-yet-listed scope or a typo — surface it, don't block. Add new areas here.
 */
const SCOPES = [
  // apps / packages
  'cli',
  'core',
  'design',
  'docs',
  'method',
  'web',
  // workflow artifacts
  'brain',
  'adr',
  'prd',
  'readiness',
  'review',
  'state',
  'tasks',
  'workflow',
  'worktree',
  // meta / tooling
  'ci',
  'deps',
  'release',
  'repo',
  'run',
  'scripts',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // scope is encouraged, never blocking
    'scope-empty': [1, 'never'],
    // scope validated against SCOPES but only as a warning (level 1)
    'scope-enum': [1, 'always', SCOPES],
    // generous header cap so long-but-useful subjects aren't rejected
    'header-max-length': [2, 'always', 200],
    // disabled: don't reject bodies with pasted URLs / logs for line length
    'body-max-line-length': [0, 'always', Infinity],
  },
};
