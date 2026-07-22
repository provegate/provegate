import type { StatusVocabConfig } from '../config/index.js';
import { stripMarkdown } from './markdown.js';

function lookupTable(vocab: StatusVocabConfig): Map<string, string> {
  const table = new Map<string, string>();
  for (const canonical of vocab.canonical) {
    table.set(canonical.toLowerCase(), canonical);
  }
  for (const [alias, canonical] of Object.entries(vocab.aliases)) {
    table.set(alias.toLowerCase(), canonical);
  }
  return table;
}

/**
 * Normalize a raw status string to its canonical vocabulary value. Annotated
 * statuses ("Ship Verified — operator checks accepted") match by their head
 * before the annotation instead of silently degrading to the fallback.
 */
export function normalizeStatus(
  vocab: StatusVocabConfig,
  value: string | null | undefined,
  fallback = 'Unknown',
): string {
  if (!value) return fallback;
  const table = lookupTable(vocab);
  const cleaned = stripMarkdown(value).split('|')[0]!.trim().toLowerCase();
  const direct = table.get(cleaned);
  if (direct) return direct;
  const head = cleaned.split(/\s*(?:—|–|;|\(|\s-\s)\s*/)[0]!.trim();
  return table.get(head) ?? fallback;
}

export type AutonomousClose = 'eligible' | 'operator-gated';

/**
 * Normalize the Autonomous Close header. A template's pipe-joined placeholder
 * ("eligible | operator-gated") degrades to null, never to a bogus value; when
 * both tokens appear, the SAFER value wins — never silently land on the
 * less-restrictive `eligible`.
 */
export function normalizeAutonomousClose(value: string | null | undefined): AutonomousClose | null {
  if (!value) return null;
  const cleaned = stripMarkdown(value).trim().toLowerCase();
  if (cleaned.includes('|')) return null;
  if (cleaned.includes('operator-gated')) return 'operator-gated';
  if (cleaned.includes('eligible')) return 'eligible';
  return null;
}
