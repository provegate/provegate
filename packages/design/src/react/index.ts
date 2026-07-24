/**
 * `@provegate/design/react` — the nine shared components the web apps render
 * (landing PRD-013, docs PRD-014). One implementation, styled through `--pg-*`
 * tokens, obeying the colour law (green is earned) and the closed verdict
 * vocabulary. React is a PEER dependency — consumers bring it; the `./cli`
 * entry stays React-free (import-graph gate, PRD-010).
 */
export { Icon, type IconName, type IconProps } from './Icon.js';
export { Button, type ButtonProps, type ButtonVariant, type ButtonSize } from './Button.js';
export { VerdictBadge, type VerdictBadgeProps, type Verdict } from './VerdictBadge.js';
export { Admonition, type AdmonitionProps, type AdmonitionType } from './Admonition.js';
export { CodeBlock, type CodeBlockProps } from './CodeBlock.js';
export { GateLine, type GateLineProps, type GateStatus } from './GateLine.js';
export { HandoffCard, type HandoffCardProps, type HandoffLine } from './HandoffCard.js';
export { EvidenceTable, type EvidenceTableProps, type EvidenceRow } from './EvidenceTable.js';
export { PhasePipeline, type PhasePipelineProps, type Phase } from './PhasePipeline.js';
