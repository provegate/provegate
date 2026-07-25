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
