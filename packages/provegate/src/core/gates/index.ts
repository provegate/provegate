// core/gates — gates manifest, command safety, class rules, review gate,
// readiness lint, wiring audit.
export {
  MANIFEST_FILENAME,
  ManifestError,
  defaultManifest,
  loadManifest,
  manifestSourceFor,
  manifestCommands,
  validateManifest,
  type ClassRule,
  type GatesManifest,
  type HardCap,
  type ManifestIssue,
} from './manifest.js';
export { isSafeCommand, parseVerificationCommands, type SafetyCheckedCommand } from './safety.js';
export {
  collectDiffFiles,
  mergeGateCommands,
  parsePrdClass,
  resolveClassGates,
} from './classes.js';
export {
  extractReviewArtifactPath,
  validateReviewArtifact,
  validateReviewArtifactFile,
  validateTasksReviewRow,
  type ReviewCheck,
  type ReviewMeta,
} from './review.js';
export { lintPrd, type PrdReadyReport } from './prd-ready.js';
export { auditWiring, yamlRunText, type WiringReport } from './wiring.js';
