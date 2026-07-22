// core/locks — lease model, zero-dependency glob engine, path-conflict gate.
export { globToRegExp } from './glob.js';
export {
  ensureLocksDir,
  findLeaseConflicts,
  listLockFiles,
  localLocksDir,
  lockPathFor,
  locksDir,
  migrateWorktreeLocks,
  validateLock,
  validateOwnedPaths,
  type LeaseConflict,
  type LockFileEntry,
} from './lease.js';
export {
  candidateConflicts,
  candidateFromPrd,
  findConflicts,
  structuralOverlap,
  trackedFiles,
  type PathConflict,
  type SurfacedLock,
} from './conflicts.js';
