import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
// The shared design components (PRD-012). All are presentational (no client
// hooks), so they render in Fumadocs' server MDX pipeline as-is.
import {
  CodeBlock,
  GateLine,
  HandoffCard,
  EvidenceTable,
  PhasePipeline,
  VerdictBadge,
  Admonition,
} from '@provegate/design/react';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    CodeBlock,
    GateLine,
    HandoffCard,
    EvidenceTable,
    PhasePipeline,
    VerdictBadge,
    Admonition,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
