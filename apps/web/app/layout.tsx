import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { preload } from 'react-dom';
import '@provegate/design/styles.css';
import './globals.css';
import sans400 from '@provegate/design/assets/fonts/ibm-plex-sans-latin-400-normal.woff2';
import sans700 from '@provegate/design/assets/fonts/ibm-plex-sans-latin-700-normal.woff2';
import mono400 from '@provegate/design/assets/fonts/ibm-plex-mono-latin-400-normal.woff2';
import { VercelAnalytics } from './analytics';
import { ConsentedAnalytics } from './consent';
import { PRODUCT_NAME, SITE_DESCRIPTION as description, SITE_TITLE, SITE_URL } from './sections/content';

// The three above-the-fold faces: body prose (sans 400), the hero display
// (sans 700), the hero terminal (mono 400). The remaining weights load on
// demand via @font-face. `crossOrigin` is required on font preloads even
// same-origin — font fetches are CORS-mode, and a mismatch double-downloads.
const PRELOAD_FONTS = [sans400, sans700, mono400];

// Neither `openGraph.images` nor `twitter.images` is declared, ON PURPOSE
// (PRD-027 FR-1): next@16.2.11 resolve-metadata.js:137-157 applies the
// file-convention app/opengraph-image.tsx ONLY when this level declares no
// `images` key, and :619-653 then fills twitter.images from the resolved
// openGraph.images — so the one file feeds both, and declaring either key here
// would switch the convention off. A decision, not an oversight.
export const metadata: Metadata = {
  title: SITE_TITLE,
  description,
  applicationName: PRODUCT_NAME,
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: SITE_TITLE,
    description,
    url: SITE_URL,
    siteName: PRODUCT_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description,
  },
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  for (const href of PRELOAD_FONTS) {
    preload(href, { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' });
  }
  // Dark is canonical (design brief §12.1): every visitor lands dark, matching
  // the docs site's forced-dark default. A tiny inline script restores a
  // persisted toggle choice before paint (same semantics as the docs'
  // next-themes storageKey) — no OS-preference mirror, no third-party request,
  // no flash of the wrong theme.
  const themeScript = `try{var t=localStorage.getItem('pg-theme');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ConsentedAnalytics />
        <VercelAnalytics />
      </body>
    </html>
  );
}
