/**
 * The single source of landing copy + data. Every fact here traces to the
 * design brief §2/§4 or the whitepaper — NO fabricated version, badge, download
 * count, testimonial, or fictional CLI surface. Command names, config filenames
 * and flags are the SHIPPED ones; the landing prototype's invented four-command
 * surface and its TOML config were rejected by owner decision (PRD-013 §1), and
 * `landing.test.tsx` asserts they never render. Terminal blocks show real tool
 * output as selectable text.
 */
import type { Phase } from '@provegate/design/react';

export const TAGLINE = 'ProveGate (prove + gate): prove it, then let it propagate.';

export const HERO = {
  eyebrow: 'open-source · CLI + method',
  thesis: "Your coding agent's “done” is not evidence. Gate it on exit codes.",
  sub: 'Seven phases where every autonomous boundary is a machine-checkable gate — a verification command’s exit code, or an independent cross-model reviewer’s structured verdict. Nothing pushes to a remote without a human. Hardened over ~390 production work items. MIT, agent-agnostic, bring your own gates.',
  install: 'npm install -D provegate\nnpx gate init',
};

/**
 * The hero terminal types these three commands, then settles on the finished
 * state. Every echoed line is real tool output: `gate init` prints the
 * `next:` line verbatim, and no invented file count is shown.
 */
export const HERO_TERMINAL: {
  title: string;
  steps: string[];
  echoes: (string | null)[];
  gates: { name: string; command: string; code?: number }[];
  earned: string;
  human: string;
} = {
  title: 'zsh — ~/app',
  steps: ['npm install -D provegate', 'npx gate init', 'npx gate run PRD-001'],
  echoes: ['added 1 package', '[init] next: see QUICKSTART.md', null],
  gates: [
    { name: 'phase 4', command: 'pnpm check-types', code: 0 },
    { name: 'phase 5', command: 'pnpm test', code: 0 },
    { name: 'phase 6', command: 'review artifact (Critical 0)' },
  ],
  earned: '✓ phases 4–7 passed. merged into LOCAL main.',
  human: '→ handoff card ready — you run `git push`.',
};

/** Nav + footer anchors. Every href is a real route or a real section id. */
export const NAV_LINKS = [
  ['How it works', '#how'],
  ['Method', '#method'],
  ['Ledger', '#ledger'],
  ['Proof', '#proof'],
  ['Install', '#install'],
] as const;

/** The trust strip under the hero — three invariants, each stated elsewhere. */
export const TRUST_STRIP = [
  'listed but not run is never passed',
  'one test killed what 80+ agents could not',
  'push is always yours',
] as const;

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

export const CORE_RULE_TAIL =
  'And neither is a panel of agents’ consensus, nor a human’s felt sense of progress.';

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

/**
 * Per-phase detail for the interactive selector. `push` is the eighth chip and
 * is always human — the runner has no push code path at all.
 */
export const PHASE_DETAIL = [
  {
    n: 1,
    label: 'PRD',
    authority: 'human' as const,
    who: 'you',
    body: 'The PRD is an executable contract — per-FR target paths, verification commands, a DO-NOT list and a conflict surface. Not prose.',
  },
  {
    n: 2,
    label: 'Readiness',
    authority: 'human' as const,
    who: 'you',
    body: 'A binary PASS / ITERATE verdict with hard caps decides whether the plan is ready. The decimal score is advisory — it had no predictive power inside the passing band.',
  },
  {
    n: 3,
    label: 'Tasks',
    authority: 'human' as const,
    who: 'you',
    body: 'The work is cut into tasks with declared ownership. Claiming an item writes a lease; overlapping leases are refused at claim time, not merge time.',
  },
  {
    n: 4,
    label: 'Implement',
    authority: 'machine' as const,
    who: 'agent',
    body: 'The agent writes the code for the task, then the manifest’s phase-4 commands run. It works autonomously, but its claim of done earns nothing yet.',
  },
  {
    n: 5,
    label: 'Test',
    authority: 'machine' as const,
    who: 'agent',
    body: 'The PRD’s declared verification commands run. A command that was listed but not executed is never passed.',
  },
  {
    n: 6,
    label: 'Audit',
    authority: 'machine' as const,
    who: 'agent',
    body: 'An independent reviewer — by default a different model family — must return Critical: 0, and the review artifact must exist. An absent reviewer never counts as a pass.',
  },
  {
    n: 7,
    label: 'Learn',
    authority: 'machine' as const,
    who: 'agent',
    body: 'The durable artifacts the PRD declared up front must appear in the merge diff. A promise made at Phase 1 that no file keeps is not a close.',
  },
  {
    n: 'push',
    label: 'Push',
    authority: 'human' as const,
    who: 'you',
    body: 'You read the handoff card and push. The runner contains no code path that pushes to a remote — that decision stays with a human.',
  },
] as const;

/** The three-step "how it works" rail beside the animated run. */
export const HOW_STEPS = [
  {
    icon: 'terminal' as const,
    title: 'Declare the gates',
    body: 'Each check is a command with an expected exit code, declared in gates.manifest.json. No prose, no vibes — a gate is a thing a machine can run.',
  },
  {
    icon: 'machine' as const,
    title: 'Agent works the phases',
    body: 'The agent implements, tests, audits and learns autonomously. Every claim it makes is re-run, not trusted.',
  },
  {
    icon: 'gate' as const,
    title: 'Evidence decides',
    body: 'Green is earned by exit 0 or an operator verdict. Listed but not run is never passed — the handoff card records what actually ran.',
  },
] as const;

/** The REAL command surface — thirteen commands, no fiction. */
export const COMMANDS = [
  ['init', 'scaffold the workflow tree + starter configs'],
  ['new', 'create the next PRD from the shipped template'],
  ['open', 'claim a PRD: lease its conflict surface or refuse on overlap'],
  ['renew', 'extend your lease (idempotent refresh)'],
  ['release', 'drop a PRD lease under the claim mutex'],
  ['status', 'rebuild workflow state from artifacts and show it'],
  ['queue', 'show the PRD queue (--json for machines)'],
  ['check', 'lint a PRD for readiness'],
  ['doctor', 'diagnose an install, read-only'],
  ['memory', 'deterministic local recall over the knowledge base'],
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

/**
 * The closing lines under the animated run. Green states only what was earned;
 * the push line is human-toned because that authority is a person's.
 */
export const RUN_SUMMARY = {
  earned: '✓ phases 4–7 passed · merged into LOCAL main (no-ff)',
  human: '→ handoff card → you run `git push`. The runner never pushes.',
} as const;

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

/**
 * Anatomy of one status line. The grammar is the shipped one from
 * `@provegate/design/cli` — `<glyph> phase N · <name> · <detail> · <verdict>`.
 */
export const ANATOMY_PARTS = [
  { seg: 'glyph', text: '✓', tone: 'pass' as const, desc: 'the status — and the source of truth when NO_COLOR strips the colour' },
  { seg: 'phase', text: 'phase 4', tone: 'fg' as const, desc: 'which of the seven phases produced this line' },
  { seg: 'name', text: 'pnpm test', tone: 'fg' as const, desc: 'the gate’s declared name: a command, or a built-in check' },
  { seg: 'detail', text: 'exit 0', tone: 'dim' as const, desc: 'optional evidence — an exit code, a count, a note' },
  { seg: 'verdict', text: 'passed', tone: 'pass' as const, desc: 'one word from the closed ledger set, never a synonym' },
] as const;

/** Self-attestation vs. evidence. */
export const COMPARISON = {
  attestation: {
    title: 'Self-attestation',
    rows: [
      '“I ran the tests and they pass.” — unverified',
      'Green is claimed, never re-run',
      'Failures surface after merge, in production',
      'No record of what actually executed',
    ],
    foot: 'trust me',
  },
  evidence: {
    title: 'ProveGate evidence',
    rows: [
      'The command is re-run independently, every time',
      'Green is earned by exit 0 or an operator verdict',
      'Failures block the handoff before they propagate',
      'Every check and verdict lands in the handoff card and the review artifact',
    ],
    foot: 'exit 0',
  },
} as const;

/** The operator-gate flow: machine → human → recorded, validated at merge. */
export const OPERATOR_FLOW = {
  nodes: [
    { icon: 'machine' as const, label: 'machine gates pass, exit 0', human: false },
    { icon: 'human' as const, label: 'owner records the acceptance', human: true },
    { icon: 'gate' as const, label: 'the merge gate validates it', human: false },
  ],
  note: 'An agent never writes an acceptance for itself: recording one is a deliberate action by an allowlisted owner, and the merge gate refuses a row that has none.',
} as const;

export const PROOF = {
  scored: '0',
  body: 'critical post-ship findings in the scored era. Unscored era: 2. A 143-findings × 83-scores calibration study forced the redesign (binary verdict + hard caps; the decimal score had r = −0.03 with post-ship defects).',
  self: 'This repo runs its own method: gate run landed the commits that built gate run.',
};

/** Evidence bullets beside the limits — same section, by design. */
export const PROOF_EVIDENCE = [
  '~390 production PRDs shipped through the workflow on a multi-tenant SaaS TypeScript monorepo, including multi-wave parallel execution.',
  'Scored era: 0 critical post-ship findings. Unscored era: 2. A 143-findings × 83-scores study forced the redesign.',
  'This repo runs its own method. gate run landed the commits that built gate run.',
] as const;

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

/** Why-ProveGate feature grid. */
export const FEATURES = [
  {
    icon: 'exit0' as const,
    title: 'Exit-0 semantics',
    body: 'A gate passes on exit 0 and fails on anything else. The contract is the one your shell already understands.',
  },
  {
    icon: 'human' as const,
    title: 'Operator gates',
    body: 'Some things a command can’t settle — a release sign-off, a judgement call. Route those to a named owner; the acceptance is recorded and the merge gate validates it.',
  },
  {
    icon: 'machine' as const,
    title: 'Independent audit',
    body: 'Phase 6 is blocking and independent — by default a different model family. A pass mechanically requires Critical: 0; an absent reviewer never counts.',
  },
  {
    icon: 'merge' as const,
    title: 'Handoff cards',
    body: 'Each phase hands off with a card: what ran, what passed, and whether the boundary is clear to cross.',
  },
  {
    icon: 'terminal' as const,
    title: 'CLI-native',
    body: 'Runs where you already work. Plain output, real exit codes, scriptable — no daemon, no dashboard, no account.',
  },
  {
    icon: 'gate' as const,
    title: 'A greppable evidence trail',
    body: 'Workflow state, review artifacts and handoff cards are files in your repo. Reproducible, greppable, and honest about what was not run.',
  },
] as const;

/** Install tabs — the two package managers the tool actually ships through. */
export const INSTALLERS = [
  { id: 'npm', label: 'npm', file: 'terminal', code: 'npm install -D provegate\nnpx gate init' },
  { id: 'pnpm', label: 'pnpm', file: 'terminal', code: 'pnpm add -D provegate\npnpm exec gate init' },
] as const;

/** Four steps to a first green run. */
export const QUICKSTART = [
  { t: 'Install the CLI', d: 'One package, no runtime dependencies. Node ≥ 22.' },
  { t: 'gate init', d: 'Scaffolds the workflow tree and starter configs. Nothing is ever overwritten.' },
  { t: 'Declare your gates', d: 'Per-phase commands in gates.manifest.json; per-PRD verification commands in the PRD itself.' },
  { t: 'gate run', d: 'Runs phases 4–7, merges into your LOCAL base branch, prints the handoff card. You push.' },
] as const;

export const FAQS = [
  {
    q: 'Does ProveGate run my code?',
    a: 'It runs the commands you declare — the per-phase commands in gates.manifest.json and the verification commands in the PRD — and nothing else. Commands it cannot classify as safe are refused rather than guessed at.',
  },
  {
    q: 'Will it push or merge for me?',
    a: 'It merges locally, no-ff, into your base branch after the gates are green. It never pushes: the runner contains no code path that pushes to a remote, and gate push refuses by design.',
  },
  {
    q: 'What if I stop using it?',
    a: 'Your gates are plain commands in a JSON manifest. Delete ProveGate and they still run in CI exactly as before. There is no lock-in and no proprietary format to migrate off.',
  },
  {
    q: 'What is an operator gate?',
    a: 'A check a machine can’t settle — a sign-off, a judgement call. It is routed to a named owner whose acceptance is recorded as a file in the repo, and the merge gate refuses to close while the row is unaccepted. An agent never writes its own acceptance.',
  },
  {
    q: 'Is it really free?',
    a: 'The CLI and the method are open source under MIT: zero runtime dependencies, local-only, no telemetry, no account.',
  },
] as const;

/**
 * Playground seed — the REAL `gates.manifest.json` shape. Phase 4 and phase 7
 * command lists come from this file; phases 5, 6 and 7 also carry built-in
 * gates the manifest cannot remove.
 */
export const MANIFEST_SEED = `{
  "phases": {
    "4": [
      "pnpm check-types",
      "pnpm lint",
      "pnpm build",
      "pnpm test"
    ],
    "7": ["pnpm verify:brain"]
  }
}`;

/** Built-in chain gates `buildGateChain` always adds, whatever the manifest says. */
export const BUILTIN_GATES = {
  '5': '§11 verification commands (from the PRD)',
  '6': 'independent-review ledger + schema',
  '7': 'durable artifacts touched in merge diff',
} as const;

/** The tail of a `gate run --dry-run` plan, printed after the chain. */
export const PLAN_TAIL = [
  '── archive wip→completed (pre-merge)',
  '── merge feature → LOCAL main (no-ff) + post-merge gates',
  '── handoff card → HUMAN runs `git push` (the runner never pushes)',
] as const;

export const PLAN_FOOTER = 'nothing runs · nothing merges · this is a plan';

/**
 * CI snippets. The CLI has no CI-mode flag, so CI runs the same gate commands
 * the manifest declares — which is the point: they are ordinary commands.
 */
export const CI_SNIPPETS = [
  {
    id: 'actions',
    label: 'GitHub Actions',
    file: '.github/workflows/ci.yml',
    code: `name: CI
on: [push, pull_request]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci
      - run: npm run check-types
      - run: npm run lint
      - run: npm test
      - run: npm run build`,
  },
  {
    id: 'prepush',
    label: 'pre-push hook',
    file: '.githooks/pre-push',
    code: `#!/bin/sh
# The runner never pushes. This hook is YOURS: it re-checks the
# same gates before the push you chose to make.
npm run check-types && npm run lint && npm test`,
  },
  {
    id: 'plan',
    label: 'plan only',
    file: 'terminal',
    code: `gate run --dry-run PRD-001
# prints the whole chain and exits 0
# nothing executed, nothing merged, nothing pushed`,
  },
] as const;

export const LINKS = {
  github: 'https://github.com/provegate/provegate',
  docs: '/docs',
  spec: '/docs/method',
  quickstart: '/docs/quickstart',
  manifest: '/docs/gates-manifest',
  operator: '/docs/operator-gates',
  ci: '/docs/ci',
  changelog: '/docs/changelog',
  license: 'https://github.com/provegate/provegate/blob/main/LICENSE',
  contributing: 'https://github.com/provegate/provegate/blob/main/CONTRIBUTING.md',
};

export const CTA = {
  title: 'Prove it, then propagate.',
  body: 'Open source. CLI-first. Free forever for the checks that keep your agents honest.',
  primary: 'Star on GitHub',
  secondary: 'Read the docs',
};

/** Footer link columns — every entry resolves to a real route. */
export const FOOTER_COLUMNS = [
  {
    title: 'Product',
    links: [
      ['How it works', '#how'],
      ['The method', '#method'],
      ['Evidence ledger', '#ledger'],
      ['Proof', '#proof'],
    ],
  },
  {
    title: 'Docs',
    links: [
      ['Quickstart', LINKS.quickstart],
      ['gates.manifest.json', LINKS.manifest],
      ['Operator gates', LINKS.operator],
      ['CI integration', LINKS.ci],
    ],
  },
  {
    title: 'Project',
    links: [
      ['GitHub', LINKS.github],
      ['Spec', LINKS.spec],
      ['License', LINKS.license],
      ['Contributing', LINKS.contributing],
    ],
  },
] as const;
