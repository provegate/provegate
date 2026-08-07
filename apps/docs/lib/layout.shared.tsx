import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName, appNameParts, gitConfig } from './shared';

/* The gate mark + two-tone wordmark, mirroring the landing nav
   (apps/web/app/sections/ui.tsx Mark/Wordmark). Kept as local JSX because the
   design package exports no brand components; the SVG paths are the canonical
   mark from packages/design/assets/logo.svg. */
export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }} aria-label={appName}>
          <span style={{ color: 'var(--pg-accent)', display: 'inline-flex' }} aria-hidden="true">
            <svg width={21} height={21} viewBox="0 0 32 32" fill="none">
              <path d="M7 5 L7 27" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
              <path
                d="M25 5 L25 27"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
              />
              <path
                d="M11 15.5 L14.5 19.5 L21.5 11"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span style={{ fontWeight: 700, color: 'var(--pg-text)' }}>
            {appNameParts[0]}
            <span style={{ color: 'var(--pg-accent)' }}>{appNameParts[1]}</span>
          </span>
        </span>
      ),
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
