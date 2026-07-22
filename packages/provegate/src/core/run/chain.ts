import { execSync } from 'node:child_process';
import type { WorkflowConfig } from '../config/index.js';
import type { GatesManifest } from '../gates/manifest.js';
import {
  isSafeCommand,
  parseVerificationCommands,
  type SafetyCheckedCommand,
} from '../gates/safety.js';
import { resolveClassGates, mergeGateCommands } from '../gates/classes.js';
import { validateTasksReviewRow } from '../gates/review.js';
import type { StateRecord } from '../state/build.js';
import { operatorGateOk } from './acceptance.js';
import { declaredArtifacts, durableArtifactsOk } from './durable.js';
import { appendMetric } from './metrics.js';
import type { GateResultRow } from './cards.js';

/**
 * The deterministic gate chain (phases 4-7 + merge gate). Stochastic agent
 * phases run elsewhere; this verifies machine-checkable artifacts. NEVER
 * pushes. Re-entry is blocked by the PROVEGATE_RUN_ACTIVE sentinel (a §11 row
 * invoking the runner would otherwise recurse); --dry-run is exempt.
 */

export const RUN_ACTIVE_ENV = 'PROVEGATE_RUN_ACTIVE';

export interface FnGateResult {
  ok: boolean;
  why?: string;
  waived?: boolean;
}

export interface ChainGate {
  phase: string;
  label?: string;
  cmds?: SafetyCheckedCommand[];
  fn?: () => FnGateResult;
  /** A required command gate STOPs when empty (the §11 gate); an emptied
   * manifest phase is legal and simply contributes nothing. */
  required?: boolean;
}

export type FromPhase = 4 | 5 | 6 | 7 | 'merge' | null;

export function parseFromPhase(raw: string | null): FromPhase {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered === 'merge') return 'merge';
  const n = Number.parseInt(lowered, 10);
  if (Number.isFinite(n) && n >= 4 && n <= 7) return n as 4 | 5 | 6 | 7;
  throw new Error(`invalid --from-phase=${raw} (use 4, 5, 6, 7, or merge)`);
}

function gatePhaseNumber(gate: ChainGate): number {
  if (gate.phase === 'merge gate') return 8;
  const n = Number.parseInt(gate.phase, 10);
  return Number.isFinite(n) ? n : 0;
}

export function shouldSkipGate(gate: ChainGate, fromPhase: FromPhase): boolean {
  if (!fromPhase) return false;
  // The operator merge gate is NEVER skippable — `gate land` must not become
  // an acceptance bypass (codex P1 finding).
  if (gate.phase === 'merge gate') return false;
  if (fromPhase === 'merge') return true;
  return gatePhaseNumber(gate) < fromPhase;
}

export function buildGateChain(options: {
  config: WorkflowConfig;
  manifest: GatesManifest;
  root: string;
  record: StateRecord;
  prdContent: string;
  tasksContent: string;
  changedFiles: string[];
  prdClass: string;
}): ChainGate[] {
  const { config, manifest, root, record, prdContent, tasksContent, changedFiles, prdClass } =
    options;

  // Manifest/config commands get the SAME safety stamp as §11 rows — loadManifest
  // already refuses unsafe ones, this is defense in depth for hand-built manifests.
  const checked = (cmd: string): SafetyCheckedCommand => ({
    cmd,
    safe: isSafeCommand(config, cmd),
  });
  const phase4 = mergeGateCommands(
    manifest.phases['4'] ?? [],
    resolveClassGates(manifest, prdClass, changedFiles),
  );
  const phase5 = parseVerificationCommands(config, prdContent);

  const chain: ChainGate[] = [
    { phase: '4 Implementation', cmds: phase4.map(checked) },
    { phase: '5 Testing', cmds: phase5, required: true },
    {
      phase: '6 Final Auditing',
      label: 'independent-review ledger + schema',
      fn: () => {
        if (!tasksContent) {
          return { ok: false, why: 'no tasks file — independent-review ledger missing' };
        }
        const check = validateTasksReviewRow(config, root, tasksContent, record.number);
        return check.ok ? { ok: true } : { ok: false, why: check.issues.join('; ') };
      },
    },
  ];
  const phase6Cmds = manifest.phases['6'] ?? [];
  if (phase6Cmds.length > 0)
    chain.push({ phase: '6 Final Auditing', cmds: phase6Cmds.map(checked) });

  chain.push({
    phase: '7 Learning',
    label: 'durable artifacts touched in merge diff',
    fn: () => durableArtifactsOk(declaredArtifacts(prdContent), changedFiles),
  });
  const phase7Cmds = manifest.phases['7'] ?? [];
  if (phase7Cmds.length > 0) chain.push({ phase: '7 Learning', cmds: phase7Cmds.map(checked) });

  chain.push({
    phase: 'merge gate',
    label: 'operator-gated guard + acceptances',
    fn: () => operatorGateOk(config, root, record),
  });

  return chain;
}

export function planChain(chain: ChainGate[], fromPhase: FromPhase): string[] {
  const lines: string[] = [];
  for (const gate of chain) {
    if (shouldSkipGate(gate, fromPhase)) continue;
    lines.push(`── Phase ${gate.phase}`);
    if (gate.fn) lines.push(`     • gate: ${gate.label}`);
    for (const { cmd, safe } of gate.cmds ?? []) {
      lines.push(`     • ${cmd}${safe ? '' : '  ! UNSAFE — would STOP'}`);
    }
  }
  return lines;
}

export interface ChainOutcome {
  results: GateResultRow[];
  stopped: { phase: string; why: string } | null;
}

/** Execute the chain. First failure stops. Gate commands run through the
 * shell ONLY with safe=true; the child env carries the re-entry sentinel. */
export function runChain(options: {
  config: WorkflowConfig;
  root: string;
  id: string;
  chain: ChainGate[];
  fromPhase: FromPhase;
}): ChainOutcome {
  const { config, root, id, chain, fromPhase } = options;
  const results: GateResultRow[] = [];

  const stop = (phase: string, why: string): ChainOutcome => {
    appendMetric(config, root, { prd: id, phase, gate: 'handoff', result: 'stopped', why });
    return { results, stopped: { phase, why } };
  };

  for (const gate of chain) {
    if (shouldSkipGate(gate, fromPhase)) continue;

    if (gate.fn) {
      const started = Date.now();
      const r = gate.fn();
      results.push([`${gate.phase}: ${gate.label}`, r.ok ? 'passed' : 'FAILED']);
      appendMetric(config, root, {
        prd: id,
        phase: gate.phase,
        gate: gate.label ?? 'fn',
        result: r.ok ? 'passed' : 'failed',
        durationMs: Date.now() - started,
        why: r.why ?? null,
      });
      if (!r.ok) return stop(gate.phase, r.why ?? 'gate failed');
      continue;
    }

    if (!gate.cmds || gate.cmds.length === 0) {
      if (gate.required) {
        return stop(gate.phase, 'no runnable §11 FR-row commands parsed — PRD gap');
      }
      continue;
    }
    for (const { cmd, safe } of gate.cmds) {
      if (!safe) {
        return stop(
          gate.phase,
          `unsafe §11 command refused (shell metachar or non-allowlisted segment): ${cmd}`,
        );
      }
      const started = Date.now();
      try {
        execSync(cmd, {
          cwd: root,
          stdio: 'inherit',
          env: { ...process.env, [RUN_ACTIVE_ENV]: '1' },
        });
        results.push([`${gate.phase}: ${cmd}`, 'passed']);
        appendMetric(config, root, {
          prd: id,
          phase: gate.phase,
          gate: cmd,
          result: 'passed',
          durationMs: Date.now() - started,
        });
      } catch {
        results.push([`${gate.phase}: ${cmd}`, 'FAILED']);
        appendMetric(config, root, {
          prd: id,
          phase: gate.phase,
          gate: cmd,
          result: 'failed',
          durationMs: Date.now() - started,
        });
        return stop(gate.phase, `command failed: ${cmd}`);
      }
    }
  }

  return { results, stopped: null };
}
