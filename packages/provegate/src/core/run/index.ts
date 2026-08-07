// core/run — the autorun engine: gate chain, cards, archive, local no-ff
// merge with auto-revert, operator-acceptance guard, durable-artifacts gate,
// local metrics. Architectural invariant: NO code path in this module may
// push to a git remote.
export {
  ACCEPTANCES_FILENAME,
  loadAcceptance,
  operatorGateOk,
  validAcceptance,
  type AcceptanceEntry,
  type OperatorGateResult,
} from './acceptance.js';
export {
  declaredArtifacts,
  durableArtifactsOk,
  durableDeclarationIssue,
  type DurableGateResult,
} from './durable.js';
export { appendMetric, type MetricEntry } from './metrics.js';
export { handoffCard, stopCard, type GateResultRow } from './cards.js';
export {
  RUN_ACTIVE_ENV,
  buildGateChain,
  parseFromPhase,
  planChain,
  runChain,
  shouldSkipGate,
  type ChainGate,
  type ChainOutcome,
  type FnGateResult,
  type FromPhase,
} from './chain.js';
export { archiveCommitMessage, archivePrdArtifacts, type ArchiveResult } from './archive.js';
export {
  initWorkspace,
  planInit,
  planPractices,
  planPrompts,
  practicesPackDir,
  promptsConfigBlock,
  type InitAction,
  type InitReport,
} from './init.js';
export {
  DISPOSITIONS,
  PROMPTS_DISABLED_NOTE,
  PROMPT_STALE_REMEDY,
  PromptsError,
  artifactGlobs,
  assertFragmentTerminal,
  assertNoCollision,
  bannerFor,
  corpusTokens,
  evaluatePromptReconciliation,
  generatedPaths,
  packageVersion,
  parseRegistry,
  planStore,
  promptsCheckPreflight,
  promptsPackageDir,
  readConfigPath,
  reconcilePrompts,
  renderAdapters,
  renderPrompts,
  requiredValues,
  scanTokens,
  substituteOnce,
  type Diagnostic,
  type PromptExceptionLike,
  type PromptFinding,
  type PromptFindingKind,
  type PromptReconciliationReport,
  type RegistryRow,
  type RenderConfig,
  type RenderResult,
} from './prompts.js';
export {
  baseWorktreeReady,
  ensureCheckoutClean,
  findBaseWorktree,
  mergeMessage,
  foreignActiveLeases,
  mergePreconditions,
  mergeToLocalBase,
  type MergeOutcome,
} from './merge.js';
export {
  configuredTokens,
  createCompanion,
  createPrd,
  findWipPrd,
  highestPrdNumber,
  instantiateTemplate,
  unresolvedTokens,
  type CompanionKind,
  type CompanionResult,
  type CreatePrdOptions,
  type CreatePrdResult,
} from './new.js';
export {
  claimMutexPath,
  claimPrd,
  DEFAULT_LEASE_HOURS,
  type BlockerLease,
  type ClaimOptions,
  type ClaimResult,
  type StolenLease,
} from './open.js';
export { withWorkspaceMutex } from './mutex.js';
export {
  leaseHolder,
  releaseLease,
  type ReleaseOptions,
  type ReleaseResult,
  type ReleasedLease,
} from './release.js';
export {
  createWorktree,
  normalizedWorktreeDir,
  blobShaOfBuffer,
  blobShaOfFile,
  blobShaOnRef,
  existsOnRef,
  removeWorktree,
  resolveRef,
  revalidateControlArtifacts,
  type RevalidateInput,
  type RevalidateResult,
  snapshotsNotMatchingRef,
  type ArtifactSnapshot,
  worktreeForBranch,
  worktreeNamesFor,
  type WorktreeProvision,
  type WorktreeRemoval,
} from './worktree.js';
