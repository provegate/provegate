// core/state — workflow state SSOT: build from artifacts, persist, query.
export {
  stripMarkdown,
  getMetaValue,
  getTableValue,
  sectionAfter,
  countTaskChecks,
  countOperatorHandoff,
  findMarkdownTable,
  writeTableValue,
  declaredGlobs,
  isRootRelativeFilename,
  parseConflictSurface,
  type RejectedClaim,
  type MarkdownTableBounds,
} from './markdown.js';
export {
  toRepoPath,
  listMarkdownFiles,
  parseArtifactName,
  formatId,
  artifactState,
  collectArtifactFiles,
  type ArtifactFile,
  type ArtifactKey,
  type ParsedArtifactName,
} from './artifacts.js';
export {
  normalizeStatus,
  normalizeAutonomousClose,
  UNKNOWN_STATUS,
  type AutonomousClose,
} from './status.js';
export { buildState, type ModelTier, type StateRecord, type WorkflowState } from './build.js';
export { mainRepoRoot, readState, statePath, writeState } from './io.js';
export {
  isImplemented,
  latestImplemented,
  latestByStatus,
  statusPanelMetrics,
  getActiveRecords,
  getReadyRecords,
  isResumable,
  formatCompactRecord,
  readyOverlaps,
  buildQueue,
  formatLeaseRemaining,
  type CompactRecord,
  type Queue,
  type QueueLockInfo,
  type QueueOverlapWarning,
} from './query.js';
