import { RootProvider } from 'fumadocs-ui/provider/next';
// Self-hosted IBM Plex + the --pg-* tokens. Imported here (not a font CDN) so
// the docs share one superfamily with the landing and the CLI; replaces the
// stock next/font/google Inter, which fetched from Google at build.
import '@provegate/design/styles.css';
import './global.css';

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        {/* Dark is canonical; light stays a real toggle. next-themes writes the
            theme to BOTH Fumadocs' `.dark` class and our `[data-theme]` (which
            the --pg-* tokens switch on), so one binding block themes both. */}
        <RootProvider
          theme={{
            attribute: ['class', 'data-theme'],
            defaultTheme: 'dark',
            enableSystem: false,
          }}
        >
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
