/**
 * Vercel Web Analytics — cookieless, first-party (same-origin `/_vercel` path,
 * so the egress gate sees no third-party fetch), no consent requirement.
 * Rendered only when the build runs on Vercel (VERCEL=1): local and CI builds
 * ship no analytics script. Needs the Analytics toggle enabled on the Vercel
 * project; without it the script 404s harmlessly. Server component on purpose —
 * VERCEL is not NEXT_PUBLIC, so only a build-time render can read it.
 */
export function VercelAnalytics(): React.JSX.Element | null {
  if (!process.env.VERCEL) return null;
  return <script defer src="/_vercel/insights/script.js" />;
}
