/**
 * The STOP / handoff card builders now live in `@provegate/design/cli` — the
 * single implementation the web `HandoffCard` also renders, so the two surfaces
 * cannot drift (PRD-010 FR-11 / PRD-011 FR-4). This module re-exports them so
 * existing importers keep compiling. The builders are pure TEXT (no colour); the
 * CLI applies colour at print time via `core/ui/theme`.
 */
export { stopCard, handoffCard, type GateResultRow } from '@provegate/design/cli';
