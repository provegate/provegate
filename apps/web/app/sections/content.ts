/**
 * The single source of landing copy + data. Every fact here traces to the
 * design brief §2/§4 or the whitepaper — NO fabricated version, badge, download
 * count, testimonial, or fictional CLI surface. The CLI output strings are the
 * REAL tool's output (no `gate.toml`, no `gate ledger`, no four-command
 * fiction). Terminal blocks render this verbatim as selectable text.
 */
import type { Phase } from '@provegate/design/react';

export const TAGLINE = 'ProveGate (prove + gate): prove it, then let it propagate.';

export const HERO = {
  thesis: "Your coding agent's “done” is not evidence. Gate it on exit codes.",
  sub: 'Seven phases where every autonomous boundary is a machine-checkable gate — a verification command’s exit code, or an independent cross-model reviewer’s structured verdict. Nothing pushes to a remote without a human. Hardened over ~390 production work items. MIT, agent-agnostic, bring your own gates.',
  install: 'npm install -D provegate\nnpx gate init',
};

/** The three approved proof stats — verbatim, no rounding, no fabrication. */
export const PROOF_STATS = [
  {
    stat: '22.58%',
    body: 'of validated failure episodes are inaccurate self-reporting — the agent claiming a test or deploy passed when it did not. Its share grows as models improve.',
    source: '20,574-session field study',
  },
  {
    stat: '80+ agents',
    body: 'unanimously endorsed an OpenSSL padding-oracle vulnerability that does not exist — ten of them dedicated reviewers. One executed test killed it.',
    source: 'security review campaign',
  },
  {
    stat: '19% slower',
    body: 'Experienced devs forecast a 24% speedup and felt a 20% speedup — and were measurably slower. Felt progress is not evidence either.',
    source: 'METR RCT · 16 devs · 246 tasks',
  },
] as const;

export const CORE_RULE =
  'A phase boundary is a gate only when a machine can check it: a command’s exit code, or an independent reviewer’s structured verdict. The implementing agent’s own assessment is never a gate.';

/** Canonical seven phases (1–3 human, 4–7 machine; push always human). */
export const PHASES: Phase[] = [
  { n: 1, label: 'PRD', authority: 'human' },
  { n: 2, label: 'Readiness', authority: 'human' },
  { n: 3, label: 'Tasks', authority: 'human' },
  { n: 4, label: 'Implement', authority: 'machine' },
  { n: 5, label: 'Test', authority: 'machine' },
  { n: 6, label: 'Audit', authority: 'machine' },
  { n: 7, label: 'Learn', authority: 'machine' },
];

export const PHASE_CUT =
  'Humans own intent and release. The machine owns the verified middle.';

/** The REAL command surface — ten commands, no fiction. */
export const COMMANDS = [
  ['init', 'scaffold the workflow tree + starter configs'],
  ['new', 'create the next PRD from the shipped template'],
  ['open', 'claim a PRD: lease its conflict surface or refuse on overlap'],
  ['renew', 'extend your lease (idempotent refresh)'],
  ['release', 'drop a PRD lease under the claim mutex'],
  ['status', 'rebuild workflow state from artifacts and show it'],
  ['queue', 'show the PRD queue (--json for machines)'],
  ['check', 'lint a PRD for readiness'],
  ['run', 'run gated phases 4–7 + local merge'],
  ['land', 'the merge step only'],
] as const;

/** Real `gate run` status lines (selectable text, not a live simulation). */
export const RUN_LINES: { status: 'passed' | 'operator'; name: string; command?: string; code?: number }[] = [
  { status: 'passed', name: 'phase 4 · implementation', command: 'tsc + lint + build', code: 0 },
  { status: 'passed', name: 'phase 5 · §11 verification commands', command: 'pnpm test', code: 0 },
  { status: 'passed', name: 'phase 6 · review artifact (Critical 0)' },
  { status: 'passed', name: 'phase 7 · durable artifacts in diff' },
  { status: 'operator', name: 'merge · LOCAL main (no-ff)' },
];

/** The real handoff card lines (structured for the HandoffCard component). */
export const HANDOFF_LINES = [
  'PRD-001 (fix-login-timeout)',
  'merged: feat/prd-001-fix-login-timeout → LOCAL main (no-ff)',
  { blank: true } as const,
  { gate: 'passed' as const, text: 'phase 4: typecheck + lint + build' },
  { gate: 'passed' as const, text: 'phase 5: §11 verification commands' },
  { gate: 'passed' as const, text: 'phase 6: review artifact (verdict pass, Critical 0)' },
  { gate: 'passed' as const, text: 'post-merge: build green' },
  { blank: true } as const,
  { arrow: true as const, text: 'READY TO PUSH — run `git push` yourself (the runner never pushes)' },
];

/** Real evidence ledger rows. */
export const LEDGER_ROWS = [
  { check: 'types', command: 'pnpm check-types', verdict: 'passed' as const, code: 0, evidence: '0 errors' },
  { check: 'test', command: 'pnpm test', verdict: 'passed' as const, code: 0, evidence: '481 passed' },
  { check: 'staging smoke', command: 'manual', verdict: 'operator' as const, evidence: 'owner-signed' },
  { check: 'perf budget', command: 'pnpm bench', verdict: 'blocked' as const, evidence: 'dependency broken' },
] as const;

export const PROOF = {
  scored: '0',
  body: 'critical post-ship findings in the scored era. Unscored era: 2. A 143-findings × 83-scores calibration study forced the redesign (binary verdict + hard caps; the decimal score had r = −0.03 with post-ship defects).',
  self: 'This repo runs its own method: gate run landed the commits that built gate run.',
};

export const LIMITS = [
  'The evidence is observational and single-project. No RCT, no speedup claim.',
  'Gates cost effort to author; below trivial size, the honest answer is: don’t use the workflow.',
  'Verification is only as good as the commands written. And the landscape moves.',
];

export const POSITIONING =
  'Spec-driven development gates what you intend to build. ProveGate gates what you actually shipped — complementary, downstream of the spec.';

export const PRINCIPLES = 'MIT · zero deps · local-only · no telemetry · Node ≥ 22';

export const REFUSAL = {
  command: 'gate push',
  output: 'No. Push is yours.',
  note: 'The runner contains no code path that pushes to a remote. That decision stays with a human.',
};

export const LINKS = {
  github: 'https://github.com/provegate/provegate',
  docs: '/docs',
};
