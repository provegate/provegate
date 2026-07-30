import * as React from 'react';
import { FAQS, LINKS, PRODUCT_NAME, SITE_DESCRIPTION, SITE_URL } from './sections/content';
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

// Structured data, from the same constants the visible page renders — the
// JSON-LD can never drift from the copy. FAQPage mirrors the FAQ section;
// SoftwareApplication states only claims the page already makes (MIT, free).
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: PRODUCT_NAME,
      description: SITE_DESCRIPTION,
      url: SITE_URL,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'macOS, Linux, Windows',
      license: 'https://opensource.org/license/MIT',
      sameAs: [LINKS.github],
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ],
};

// The landing narrative in the handoff's order. Proof and its honest limits
// live in one section so the limits sit adjacent to the evidence — the design
// idea. Every terminal block is real CLI output or a real `--dry-run` plan;
// nothing simulates a verdict the tool did not produce.
export default function Page(): React.JSX.Element {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <a className="pg-skip" href="#top">
        Skip to content
      </a>
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
