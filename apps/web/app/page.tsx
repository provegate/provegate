import * as React from 'react';
import {
  CommandRef,
  CoreRule,
  EvidenceLedger,
  Footer,
  Hero,
  Method,
  Nav,
  Positioning,
  Problem,
  Proof,
  Refusal,
  RunWalkthrough,
} from './sections';

// The landing narrative, in the handoff's order. Proof and its honest limits
// live in one section (Proof) so the limits sit adjacent to the evidence — the
// design idea. Terminal blocks are real CLI output, not a live simulation.
export default function Page(): React.JSX.Element {
  return (
    <main>
      <Nav />
      <Hero />
      <Problem />
      <CoreRule />
      <Method />
      <RunWalkthrough />
      <Refusal />
      <EvidenceLedger />
      <Proof />
      <Positioning />
      <CommandRef />
      <Footer />
    </main>
  );
}
