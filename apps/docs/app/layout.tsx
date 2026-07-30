import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
// Self-hosted IBM Plex + the --pg-* tokens. Imported here (not a font CDN) so
// the docs share one superfamily with the landing and the CLI; replaces the
// stock next/font/google Inter, which fetched from Google at build.
import '@provegate/design/styles.css';
import './global.css';
import { Analytics } from './analytics';

// Without a metadataBase, Next leaves og/twitter image URLs relative and
// social cards break; the docs live on their own subdomain, not the apex.
export const metadata: Metadata = {
  metadataBase: new URL('https://docs.provegate.dev'),
};

export default function Layout({ children }: LayoutProps<'/'>) {
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
      </body>
    </html>
  );
}
