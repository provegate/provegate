/** @type {import('@commitlint/types').UserConfig} */

/** Apps, packages, and repo-wide scopes — keep in sync with .cursor/rules/commit-messages.mdc */
const SCOPES = [
  // apps
  "account",
  "admin",
  "backend",
  "consumer",
  "docs",
  "landing",
  "marketing",
  "native",
  // packages
  "api-client",
  "auth",
  "bulk",
  "cli",
  "config",
  "content",
  "convex",
  "db",
  "e2e",
  "email",
  "env",
  "i18n",
  "icons",
  "ids",
  "ramarkable",
  "rds",
  "sdk",
  "seeds",
  "storybook",
  "tokens",
  "types",
  // meta / tooling
  "a11y",
  "adr",
  "ai-context",
  "chromatic",
  "ci",
  "claude",
  "cursor",
  "dependabot",
  "deploy",
  "deps",
  "design",
  "dev",
  "gstack",
  "infra",
  "plans",
  "prd",
  "railway",
  "repo",
  "scripts",
  "search",
  "security",
  "serena",
  "todos",
  "vercel",
  "wiki",
  "workflow",
];

export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 200],
    // Disabled: body lines may exceed the conventional 100-char default
    // (inherited from @commitlint/config-conventional) — long bodies/URLs
    // and HEREDOC-pasted explanations should not be wrapped or blocked.
    "body-max-line-length": [0, "always", Infinity],
    // Warn (1), not error (2): an unknown scope is almost always a typo or a
    // not-yet-listed scope — surface it without blocking the commit. The list
    // below stays the canonical set; add genuinely new scopes here.
    "scope-enum": [1, "always", SCOPES],
  },
};
