import { readFileSync } from 'node:fs';
import type { WorkflowConfig } from '../config/index.js';
import {
  artifactState,
  collectArtifactFiles,
  formatId,
  toRepoPath,
  type ArtifactKey,
} from './artifacts.js';
import {
  getMetaValue,
  getTableValue,
  sectionAfter,
  countTaskChecks,
  countOperatorHandoff,
} from './markdown.js';
import {
  normalizeAutonomousClose,
  normalizeStatus,
  UNKNOWN_STATUS,
  type AutonomousClose,
} from './status.js';

export type ModelTier = 'high' | 'medium' | 'fast';

export interface StateRecord {
  prd: string;
  number: number;
  slug: string;
  status: string;
  cyclePhase: string | null;
  operatorAcceptance: string | null;
  autonomousClose: AutonomousClose | null;
  artifacts: Record<ArtifactKey, string>;
  artifactStates: Record<ArtifactKey, string>;
  readiness: {
    score: number | null;
    verdict: string | null;
    modelTierExecution: ModelTier | null;
    modelTierAudit: ModelTier | null;
  };
  task: {
    status: string;
    checkedCount: number;
    uncheckedCount: number;
    operatorHandoffCount: number;
  };
  summary: {
    shipReadiness: string;
  };
  lastUpdated: string | null;
}

export interface WorkflowState {
  schemaVersion: number;
  generatedAt: string;
  records: StateRecord[];
}

function parseScore(content: string): number | null {
  const raw = getTableValue(content, 'Score');
  if (!raw) return null;
  const match = raw.match(/([0-9]+(?:\.[0-9]+)?)/);
  return match?.[1] !== undefined ? Number.parseFloat(match[1]) : null;
}

function parseTier(raw: string | null): ModelTier | null {
  if (!raw) return null;
  const lowered = raw.toLowerCase();
  if (lowered.includes('high')) return 'high';
  if (lowered.includes('medium')) return 'medium';
  if (lowered.includes('fast')) return 'fast';
  return null;
}

/**
 * Ship-readiness inside the summary's `## Ship Readiness` section: the
 * earliest occurrence of any canonical status (longest names tried first so
 * substrings cannot shadow), normalized through the vocabulary.
 */
function parseSummaryReadiness(config: WorkflowConfig, content: string): string {
  const section = sectionAfter(content, 'Ship Readiness');
  if (!section) return UNKNOWN_STATUS;
  const byLength = [...config.statusVocab.canonical].sort((a, b) => b.length - a.length);
  let earliest: { index: number; status: string } | null = null;
  const lowered = section.toLowerCase();
  for (const status of byLength) {
    const index = lowered.indexOf(status.toLowerCase());
    if (index === -1) continue;
    if (earliest === null || index < earliest.index) earliest = { index, status };
  }
  return earliest ? normalizeStatus(config.statusVocab, earliest.status) : UNKNOWN_STATUS;
}

function emptyRecord(config: WorkflowConfig, number: number, slug: string): StateRecord {
  return {
    prd: formatId(config.idPattern, number),
    number,
    slug,
    status: UNKNOWN_STATUS,
    cyclePhase: null,
    operatorAcceptance: null,
    autonomousClose: null,
    artifacts: { prd: '', readiness: '', tasks: '', summary: '' },
    artifactStates: { prd: 'missing', readiness: 'missing', tasks: 'missing', summary: 'missing' },
    readiness: { score: null, verdict: null, modelTierExecution: null, modelTierAudit: null },
    task: { status: UNKNOWN_STATUS, checkedCount: 0, uncheckedCount: 0, operatorHandoffCount: 0 },
    summary: { shipReadiness: UNKNOWN_STATUS },
    lastUpdated: null,
  };
}

/** Build the full state snapshot from the artifact tree (the SSOT). */
export function buildState(
  config: WorkflowConfig,
  root: string,
  { generatedAt = new Date().toISOString() }: { generatedAt?: string } = {},
): WorkflowState {
  const records = new Map<string, StateRecord>();
  for (const item of collectArtifactFiles(config, root)) {
    const key = `${item.number}:${item.slug}`;
    if (!records.has(key)) records.set(key, emptyRecord(config, item.number, item.slug));
    const record = records.get(key)!;
    record.artifacts[item.key] = toRepoPath(root, item.file);
    record.artifactStates[item.key] = artifactState(config, record.artifacts[item.key]);

    const content = readFileSync(item.file, 'utf8');
    const updated = getMetaValue(content, 'Updated');
    if (updated && (!record.lastUpdated || updated > record.lastUpdated)) {
      record.lastUpdated = updated;
    }

    if (item.key === 'prd') {
      record.status = normalizeStatus(
        config.statusVocab,
        getMetaValue(content, 'Status'),
        record.status,
      );
      record.cyclePhase = getMetaValue(content, 'Cycle Phase');
      record.operatorAcceptance = getMetaValue(content, 'Operator Acceptance');
      record.autonomousClose = normalizeAutonomousClose(getMetaValue(content, 'Autonomous Close'));
    }

    if (item.key === 'readiness') {
      record.readiness.score = parseScore(content);
      const verdict = getTableValue(content, 'Verdict');
      record.readiness.verdict = verdict?.match(/PASS|ITERATE|REJECT/i)?.[0].toUpperCase() ?? null;
      record.readiness.modelTierExecution = parseTier(
        getTableValue(content, 'Model Tier (Execution)'),
      );
      record.readiness.modelTierAudit = parseTier(getTableValue(content, 'Model Tier (Audit)'));
    }

    if (item.key === 'tasks') {
      record.task.status = normalizeStatus(
        config.statusVocab,
        getMetaValue(content, 'Status'),
        record.task.status,
      );
      Object.assign(record.task, countTaskChecks(content));
      record.task.operatorHandoffCount = countOperatorHandoff(content);
    }

    if (item.key === 'summary') {
      record.summary.shipReadiness = parseSummaryReadiness(config, content);
    }
  }

  const sortedRecords = [...records.values()].sort(
    (a, b) => a.number - b.number || a.slug.localeCompare(b.slug),
  );
  return { schemaVersion: 1, generatedAt, records: sortedRecords };
}
