// Generic commitlint config for provegate — practice 03.
// Runs from a commit-msg hook: `npx commitlint --edit "$1"`.
// Install: npm i -D @commitlint/cli @commitlint/config-conventional
// ESM (matches a repo with "type": "module" in package.json). For a CJS repo, rename
// this file to commitlint.config.cjs and change `export default` to `module.exports =`.

/**
 * SCOPES — replace with provegate's own app / package / tooling names.
 * Kept as a WARNING (level 1) below, so an unknown scope surfaces but never blocks a
 * commit. When you add a new area, add its scope here.
 */
const SCOPES = [
  // apps / surfaces
  'cli',
  'core',
  'docs',
  // packages
  'config',
  'utils',
  // meta / tooling
  'adr',
  'brain',
  'ci',
  'deps',
  'scripts',
  'workflow',
];

/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Inherited from config-conventional (kept as error, not overridden here):
    //   type-enum      → feat/fix/docs/chore/refactor/test/... required
    //   subject-case   → forbids sentence-case / Start-Case / PascalCase / UPPER-CASE
    //                     (i.e. subject must be lowercase-ish)

    // Generous header cap so long-but-useful subjects aren't rejected.
    'header-max-length': [2, 'always', 200],

    // Disabled: don't reject bodies with pasted URLs / logs / heredocs for line length.
    'body-max-line-length': [0, 'always', Infinity],

    // Scope validated against SCOPES but only as a WARNING (level 1).
    // An unknown scope is almost always a not-yet-listed scope or a typo — surface it,
    // don't block the commit. Delete this rule to skip scope validation entirely.
    'scope-enum': [1, 'always', SCOPES],
  },
};
