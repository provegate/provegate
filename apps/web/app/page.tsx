import * as React from 'react';
import {
  Anatomy,
  CIIntegration,
  CommandRef,
  Comparison,
  CoreRule,
  EvidenceLedger,
  FaqAndQuickstart,
  Features,
  Footer,
  Hero,
  Install,
  InstallTabs,
  Method,
  Nav,
  OperatorFlow,
  PhaseDetail,
  Playground,
  Positioning,
  Problem,
  Proof,
  Refusal,
  RunWalkthrough,
  TrustStrip,
} from './sections';

// The landing narrative in the handoff's order. Proof and its honest limits
// live in one section so the limits sit adjacent to the evidence — the design
// idea. Every terminal block is real CLI output or a real `--dry-run` plan;
// nothing simulates a verdict the tool did not produce.
export default function Page(): React.JSX.Element {
  return (
    <main>
      <Nav />
      <Hero />
      <TrustStrip />
      <Problem />
      <CoreRule />
      <RunWalkthrough />
      <Playground />
      <Method />
      <PhaseDetail />
      <OperatorFlow />
      <Refusal />
      <EvidenceLedger />
      <Proof />
      <Anatomy />
      <Comparison />
      <Positioning />
      <Features />
      <InstallTabs />
      <CommandRef />
      <CIIntegration />
      <FaqAndQuickstart />
      <Install />
      <Footer />
    </main>
  );
}
