import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@provegate/design/styles.css';
import './globals.css';
import { Analytics } from './analytics';
import { PRODUCT_NAME, SITE_TITLE } from './sections/content';

const description =
  "Your coding agent's “done” is not evidence. Seven phases where every autonomous boundary is a machine-checkable gate — a verification command's exit code or an independent cross-model reviewer's structured verdict — and nothing pushes to a remote without a human. MIT, agent-agnostic, zero dependencies.";

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
  metadataBase: new URL('https://provegate.dev'),
  openGraph: {
    title: SITE_TITLE,
    description,
    url: 'https://provegate.dev',
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
  // Dark is canonical (design brief §12.1). A tiny inline script mirrors the OS
  // preference onto data-theme so light is a real, first-class theme too — no
  // third-party request, no flash of the wrong theme.
  const themeScript = `try{var m=matchMedia('(prefers-color-scheme: light)');document.documentElement.dataset.theme=m.matches?'light':'dark';}catch(e){document.documentElement.dataset.theme='dark';}`;
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
