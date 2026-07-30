import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { preload } from 'react-dom';
// Self-hosted IBM Plex + the --pg-* tokens. Imported here (not a font CDN) so
// the docs share one superfamily with the landing and the CLI; replaces the
// stock next/font/google Inter, which fetched from Google at build.
import '@provegate/design/styles.css';
import './global.css';
import sans400 from '@provegate/design/assets/fonts/ibm-plex-sans-latin-400-normal.woff2';
import sans700 from '@provegate/design/assets/fonts/ibm-plex-sans-latin-700-normal.woff2';
import mono400 from '@provegate/design/assets/fonts/ibm-plex-mono-latin-400-normal.woff2';
import { Analytics } from './analytics';
import { VercelAnalytics } from './vercel-analytics';
import { appName, siteUrl } from '@/lib/shared';

// Without a metadataBase, Next leaves og/twitter image URLs relative and
// social cards break; the docs live on their own subdomain, not the apex.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: `%s — ${appName} Docs`, default: `${appName} Docs` },
  description:
    'Documentation for ProveGate — the seven-phase method and the gate CLI: quickstart, method, CLI reference, case study, whitepaper.',
  openGraph: { siteName: `${appName} Docs`, type: 'website' },
  twitter: { card: 'summary_large_image' },
};

// The three above-the-fold faces: prose (sans 400), headings (sans 700), code
// (mono 400). The remaining weights load on demand via @font-face.
const PRELOAD_FONTS = [sans400, sans700, mono400];

export default function Layout({ children }: LayoutProps<'/'>) {
  for (const href of PRELOAD_FONTS) {
    preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        {/* Dark is canonical; light stays a real toggle. next-themes writes the
            theme to BOTH Fumadocs' `.dark` class and our `[data-theme]` (which
            the --pg-* tokens switch on), so one binding block themes both. A
            fresh `storageKey` ignores any legacy `theme=system` value the stock
            Fumadocs build persisted, so the first render is genuinely dark. */}
        <RootProvider
          theme={{
            attribute: ['class', 'data-theme'],
            defaultTheme: 'dark',
            enableSystem: false,
            storageKey: 'pg-docs-theme',
          }}
        >
          {children}
        </RootProvider>
        <Analytics />
        <VercelAnalytics />
      </body>
    </html>
  );
}
