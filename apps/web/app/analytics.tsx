import Script from 'next/script';

/**
 * Google Analytics, rendered ONLY when NEXT_PUBLIC_GA_ID is set at build time
 * (owner decision 2026-07-30: analytics on the public site; the CLI and the
 * method keep zero telemetry — the claim on the pages stays CLI-scoped and
 * true). The permitted hosts are enumerated in scripts/check-static-egress.mjs;
 * a new analytics host must be added there or the egress gate refuses it.
 */
/**
 * Vercel Web Analytics — cookieless, first-party (same-origin `/_vercel` path,
 * so the egress gate sees no third-party fetch), no consent requirement.
 * Rendered only when the build runs on Vercel (VERCEL=1): local and CI builds
 * ship no analytics script. Needs the Analytics toggle enabled on the Vercel
 * project; without it the script 404s harmlessly.
 */
export function VercelAnalytics(): React.JSX.Element | null {
  if (!process.env.VERCEL) return null;
  return <script defer src="/_vercel/insights/script.js" />;
}

export function Analytics(): React.JSX.Element | null {
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  if (!gaId) return null;
  return (
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
  );
}
