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
export { declaredArtifacts, durableArtifactsOk, type DurableGateResult } from './durable.js';
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
export { initWorkspace, planInit, type InitAction, type InitReport } from './init.js';
export {
  ensureCheckoutClean,
  findBaseWorktree,
  mergeMessage,
  mergePreconditions,
  mergeToLocalBase,
  type MergeOutcome,
} from './merge.js';
