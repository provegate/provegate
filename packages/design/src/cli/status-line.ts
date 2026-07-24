/**
 * Per-gate status-line builder — the `gate run` grammar, pure text (no colour;
 * the caller paints it via `theme.ts`). One line per gate as it resolves:
 *
 *   <glyph> phase N · <name> · <detail> · <verdict>
 *
 * The glyph is the source of truth (survives NO_COLOR); `detail` is optional
 * (a command, an exit code, a count). Verdict words are the closed ledger set.
 */
import { glyph, type Verdict } from './theme.js';

const SEP = '·';

export function statusLine(options: {
  phase: string;
  name: string;
  verdict: Verdict;
  /** Optional middle segments — command, `exit 0`, `1 of 3`, a note. */
  detail?: string;
}): string {
  const parts = [
    `${glyph[options.verdict]} phase ${options.phase}`,
    options.name,
    ...(options.detail ? [options.detail] : []),
    options.verdict,
  ];
  return parts.join(` ${SEP} `);
}
