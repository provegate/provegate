/** STOP / handoff card renderers — pure string builders, CLI prints them. */

export type GateResultRow = [label: string, result: 'passed' | 'FAILED'];

const BAR = '────────────────────────────────────────────────────────';

export function stopCard(options: {
  id: string;
  phase: string;
  why: string;
  results: GateResultRow[];
}): string {
  const lines = [
    `┌─ STOPPED at Phase ${options.phase} ${BAR.slice(options.phase.length + 20)}`,
    `│ ${options.id}: ${options.why}`,
    ...options.results.map(([label, res]) => `│   ${res === 'passed' ? '✓' : '✗'} ${label}`),
    '│ worktree left intact — fix and re-run with --from-phase=N, or hand back to a human',
    `└${BAR}`,
  ];
  return lines.join('\n');
}

export function handoffCard(options: {
  id: string;
  slug: string;
  branch: string;
  base: string;
  diffstat: string;
  results: GateResultRow[];
  operatorRows: number;
  autonomousClose: string | null;
  metricsHint: string;
}): string {
  const lines = [
    `┌─ HANDOFF CARD ${BAR.slice(15)}`,
    `│ ${options.id} (${options.slug})`,
    `│ merged: ${options.branch} → LOCAL ${options.base} (no-ff)`,
    `│ diff:   ${options.diffstat}`,
    '│ gates:',
    ...options.results.map(([label, res]) => `│   ${res === 'passed' ? '✓' : '✗'} ${label}`),
    `│ operator rows: ${options.operatorRows} | Autonomous Close: ${options.autonomousClose ?? '(unset)'}`,
    `│ metrics: ${options.metricsHint}`,
    '│ → READY TO PUSH — run `git push` yourself (the runner never pushes)',
    `└${BAR}`,
  ];
  return lines.join('\n');
}
