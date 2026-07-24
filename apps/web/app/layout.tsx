import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@provegate/design/styles.css';
import './globals.css';

const description =
  "Your coding agent's “done” is not evidence. Seven phases where every autonomous boundary is a machine-checkable gate — a verification command's exit code or an independent cross-model reviewer's structured verdict — and nothing pushes to a remote without a human. MIT, agent-agnostic, zero dependencies.";

export const metadata: Metadata = {
  title: 'ProveGate — prove it, then let it propagate.',
  description,
  applicationName: 'ProveGate',
  metadataBase: new URL('https://provegate.dev'),
  openGraph: {
    title: 'ProveGate — prove it, then let it propagate.',
    description,
    url: 'https://provegate.dev',
    siteName: 'ProveGate',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ProveGate — prove it, then let it propagate.',
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
      <body>{children}</body>
    </html>
  );
}
