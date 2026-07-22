import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'ProveGate — prove it, then let it propagate.',
  description:
    'Gate autonomous AI coding on machine-checkable evidence. Autonomous phases, machine-checkable gates, human-only push.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
          background: '#0b0d10',
          color: '#e8eaed',
        }}
      >
        {children}
      </body>
    </html>
  );
}
