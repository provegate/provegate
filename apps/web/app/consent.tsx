'use client';

import * as React from 'react';
import Script from 'next/script';
import { ConsentBanner, useConsent } from '@provegate/design/react/client';

/**
 * Google Analytics behind prior consent (GDPR/ePrivacy): the gtag script is
 * not fetched and no cookie is set until the visitor clicks Allow, and a
 * Decline is remembered the same way. Rendered ONLY when NEXT_PUBLIC_GA_ID is
 * set at build time (owner decision 2026-07-30: analytics on the public site;
 * the CLI and the method keep zero telemetry — the claim on the pages stays
 * CLI-scoped and true). The permitted hosts are enumerated in
 * scripts/check-static-egress.mjs; a new analytics host must be added there or
 * the egress gate refuses it.
 */
export function ConsentedAnalytics(): React.JSX.Element | null {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const consent = useConsent();
  if (!gaId) return null;
  return (
    <>
      <ConsentBanner status={consent.status} onAllow={consent.grant} onDecline={consent.deny} />
      {consent.status === 'granted' ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');`}
          </Script>
        </>
      ) : null}
    </>
  );
}

/** The withdrawal surface (footer): clears the stored choice, which reopens
 * the banner. Renders nothing when analytics is off — no dangling control. */
export function CookiePrefsButton(): React.JSX.Element | null {
  const consent = useConsent();
  if (!process.env.NEXT_PUBLIC_GA_ID) return null;
  return (
    <span>
      {' · '}
      <button
        type="button"
        onClick={consent.reset}
        style={{
          background: 'none',
          border: 0,
          padding: 0,
          font: 'inherit',
          color: 'inherit',
          cursor: 'pointer',
          textDecoration: 'underline',
          textUnderlineOffset: 3,
        }}
      >
        cookies
      </button>
    </span>
  );
}
