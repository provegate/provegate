/**
 * The workflow configuration surface — the parameter set of the parent
 * project's two config chokepoints (prd-state-utils + base-branch-policy),
 * lifted so nothing downstream hardcodes a layout, vocabulary, or branch name.
 */

/** One artifact kind: where it lives and how its files are prefixed. */
export interface ArtifactKindConfig {
  /** Directory relative to the repo root, e.g. `_prds`. */
  dir: string;
  /** Filename prefix, e.g. `prd` for `prd-001-slug.md`. */
  prefix: string;
}

export interface DirsConfig {
  /** The four linked artifact kinds of a work item. */
  artifacts: {
    prd: ArtifactKindConfig;
    readiness: ArtifactKindConfig;
    tasks: ArtifactKindConfig;
    summary: ArtifactKindConfig;
  };
  /** Lifecycle subdirectories scanned under each artifact dir, e.g. `wip`. */
  states: string[];
  /** Which configured state plays which lifecycle role. Every value must be a
   * member of `states` — query semantics key off roles, never off position. */
  stateRoles: {
    wip: string;
    completed: string;
    deferred: string;
  };
  /** Snapshot file the state build writes, relative to the repo root. */
  stateFile: string;
  /** Lock lease directory, relative to the MAIN checkout root. */
  locksDir: string;
  /** Independent-review artifacts directory, relative to the repo root. */
  reviewsDir: string;
  /** Local gate-metrics JSONL file, relative to the repo root (gitignored). */
  metricsFile: string;
}

export interface IdPatternConfig {
  /** Uppercase id prefix, e.g. `PRD` in `PRD-001`. */
  prefix: string;
  /** Zero-padded digit width. Width exhaustion makes higher ids invisible — bump here. */
  width: number;
}

export interface StatusVocabConfig {
  /** Canonical status values, exactly as they appear in artifact headers. */
  canonical: string[];
  /** Lower-cased alias → canonical value (e.g. `done` → `Ship Verified`). */
  aliases: Record<string, string>;
  /** Statuses of in-flight (not-yet-done) work. */
  active: string[];
  /** Statuses that count as implemented/done. */
  implemented: string[];
  /** Statuses that qualify a work item as ready to assign. */
  ready: string[];
  /** Statuses that mark a work item blocked. */
  blocked: string[];
  /** Statuses of work sitting in post-implementation review. */
  reviewing: string[];
}

export interface BranchesConfig {
  /** Merge target for feature work. */
  base: string;
  /** Bases that are merge-only for source at commit time. */
  protected: string[];
  /** Feature branch template; `{id}` (lower-cased) and `{slug}` interpolate. */
  featurePattern: string;
  /** Path prefixes committable directly on a base branch (coordination artifacts). */
  allowedDirectPrefixes: string[];
  /** Exact files committable directly on a base branch. */
  allowedDirectFiles: string[];
}

/** Tool-agnostic command lines for the four floor gates. */
export interface CommandsConfig {
  checkTypes: string;
  lint: string;
  test: string;
  build: string;
  /** Command prefixes user-gate commands may start with (the safety allowlist). */
  allowedPrefixes: string[];
}

export interface WorktreeConfig {
  /** Directory (relative to the main checkout) that linked worktrees live under. */
  dir: string;
}

export interface WorkflowConfig {
  dirs: DirsConfig;
  idPattern: IdPatternConfig;
  statusVocab: StatusVocabConfig;
  branches: BranchesConfig;
  commands: CommandsConfig;
  /** Identities allowed to sign operator acceptances. Roles, never person names. */
  owners: string[];
  worktree: WorktreeConfig;
  /** Phases that write code — a lock in one of these claims its conflict surface. */
  executionPhases: string[];
  /** Work-item classes; the first entry is the default class. */
  classes: string[];
  /** Regex source matching package.json script names that count as gates. */
  verifyScriptPattern: string;
  /** Artifact template overrides; empty string = use the shipped template. */
  templates: TemplatesConfig;
  /** Append-only manifests excluded from exclusive path-ownership overlap. */
  sharedAppendOnly: string[];
  /** Durable-memory store; disabled by default. */
  memory: MemoryConfig;
  /** Rendered protocol store; disabled by default. */
  prompts: PromptsConfig;
  /** Value-triage scoring: the axes, their weights, and the optional cutoff. */
  valueScoring: ValueScoringConfig;
  /** Wiring-audit read paths; every one repo-relative and containment-checked. */
  wiring: WiringConfig;
}

/**
 * Read paths for the wiring audit (PRD-025). Three keys, but not one per
 * surface: script bodies need no key (they come from `package.json`, which the
 * audit already reads), and `scriptsDir` serves the on-disk→registered
 * direction rather than any surface. Absence of a configured path on disk is
 * "not a surface", never an error.
 */
export interface WiringConfig {
  /** Directory walked by the on-disk→registered direction. */
  scriptsDir: string;
  /** Git-hooks directory read as a command surface. */
  hooksDir: string;
  /** Bundle whose declared membership counts as a surface. */
  bundlePath: string;
}

/**
 * Rendered protocol store (PRD-029).
 *
 * Shaped after `MemoryConfig` deliberately: `enabled` is the predicate and
 * presence never is. `mergeConfig` deep-merges `DEFAULT_CONFIG`, so once this
 * block has defaults `merged.prompts` exists in every repository — a presence
 * test could never be false. `defaults.ts` records the same reasoning for
 * memory, and this block follows it rather than rediscovering it.
 */
export interface PromptsConfig {
  /** Master switch. Disabled by default — opting in is a deliberate act. */
  enabled: boolean;
  /** Store root, repo-root relative (e.g. `.provegate`). */
  dir: string;
  /** Which per-tool adapters to generate, in emit order. */
  adapters: string[];
  /**
   * Placeholder values the rendered corpus consumes and no config field
   * supplies. `null` and absence both mean unset; every string is a value,
   * including `''` where the registry's `empty` column allows it. An in-band
   * sentinel would make some legitimate string unrepresentable.
   *
   * Unknown keys are NOT rejected here. The legal key set is the token set of
   * the rendered corpus — package Markdown the config loader neither reads nor
   * should — so an unconsumed key is a render diagnostic (`unused`), not a
   * config-load failure.
   */
  values: Record<string, string | null>;
}

/**
 * Value-triage scoring (PRD-021).
 *
 * The axes are CONFIGURABLE because the shipped agent-bootstrap template tells
 * adopters to define their own — a gate that only knew this repository's five
 * would be unable to score the method it ships with.
 *
 * Two rules about this block live outside validation and are easy to lose:
 *
 * 1. `axes` is ORDERED. The order is the order a value header lists its
 *    dimensions in, so it is contractual rather than cosmetic, and the header
 *    pattern is generated from it.
 * 2. When a config supplies `axes`, `resolveConfig` replaces this whole object
 *    rather than merging into it. `deepMerge` recurses into plain objects, so
 *    without that exception a three-axis override would inherit the five
 *    default weight keys and fail its own validation. Supplying `weights`
 *    ALONE is different and legal: it retunes the default axes, and the
 *    sum-to-1 rule is what keeps a partial honest.
 */
export interface ValueScoringConfig {
  /**
   * Ordered axis identifiers, 2-10 of them, each matching
   * `/^[A-Za-z][A-Za-z0-9_]{0,15}$/` and unique case-insensitively. The
   * charset is load-bearing: the header pattern is built from these, so an
   * identifier admitting `/`, whitespace, or a regex metacharacter could
   * change the pattern's meaning.
   */
  axes: string[];
  /** Weight per axis identifier. At most two decimals each; sums to exactly 1. */
  weights: Record<string, number>;
  /**
   * First work-item id the header is REQUIRED for. Absent — the shipped
   * default — selects presence-triggered mode: a PRD with no header passes,
   * one with a wrong header fails. Absent is not `0`; `0` is a legal, explicit
   * "enforce everywhere".
   */
  enforceFrom?: number;
}

export interface TemplatesConfig {
  /** Path (repo-root relative) to a forked PRD template; '' = shipped one. */
  prd: string;
}

/**
 * Durable-memory store (addendum A1). Every field is explicit configuration:
 * behavior NEVER keys off the presence of a memory directory, so a repository
 * that has not opted in behaves exactly as it did before. Detection may report
 * a partial installation; it may not enable a gate.
 */
export interface MemoryConfig {
  /** Master switch. Disabled by default — opting in is a deliberate act. */
  enabled: boolean;
  /** Record store, repo-root relative (e.g. `_brain`). */
  root: string;
  /** Always-loaded pointer index, repo-root relative; must live under `root`. */
  index: string;
  /** Agent entrypoint files that must carry the index pointer. Vendor-neutral
   * by design: the set is whatever this repository actually uses. */
  entrypoints: string[];
  /**
   * Validator run after Phase 7 capture; '' disables it. Passes the same
   * command-safety allowlist as a §11 gate command.
   *
   * Consumed by the Phase 7 runner (PRD-018), not by this package version —
   * the substrate defines and validates the field so the contract work can
   * rely on it, which means a released version may carry a validated field
   * nothing reads yet. That window is deliberate and recorded; the
   * alternative — landing the runner and its configuration together — is the
   * whole-repo change the three-PRD split exists to avoid.
   */
  verifyCommand: string;
  /**
   * Warn after this many completed contract-bearing work items without a
   * retrospective; `0` disables the cadence warning entirely.
   *
   * Same deliberate window as `verifyCommand`: consumed by PRD-019.
   */
  retroAfterCompleted: number;
}

/** A single validation problem, tagged with its config path. */
export interface ConfigIssue {
  path: string;
  message: string;
}

/** Recursive partial of the config — the shape a `workflow.config.json` may hold. */
export type PartialWorkflowConfig = {
  [K in keyof WorkflowConfig]?: DeepPartial<WorkflowConfig[K]>;
};

export type DeepPartial<T> = T extends readonly unknown[]
  ? T
  : T extends Record<string, unknown>
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
