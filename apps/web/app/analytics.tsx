/**
 * Vercel Web Analytics — cookieless, first-party (same-origin `/_vercel` path,
 * so the egress gate sees no third-party fetch), no consent requirement.
 * Rendered only when the build runs on Vercel (VERCEL=1): local and CI builds
 * ship no analytics script. Needs the Analytics toggle enabled on the Vercel
 * project; without it the script 404s harmlessly.
 *
 * Google Analytics lives in `consent.tsx` — it needs prior consent, so it is
 * a client component gated on the visitor's stored choice.
 */
export function VercelAnalytics(): React.JSX.Element | null {
  if (!process.env.VERCEL) return null;
  return <script defer src="/_vercel/insights/script.js" />;
}
