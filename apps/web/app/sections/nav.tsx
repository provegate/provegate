'use client';

import * as React from 'react';
import { Button, Icon } from '@provegate/design/react';
import { Mark, Wordmark, shell } from './ui';
import * as C from './content';

const SunIcon = ({ size = 16 }: { size?: number }): React.JSX.Element => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.6v2.4M12 19v2.4M21.4 12H19M5 12H2.6M18.6 5.4l-1.7 1.7M7.1 16.9l-1.7 1.7M18.6 18.6l-1.7-1.7M7.1 7.1L5.4 5.4" />
  </svg>
);

const MoonIcon = ({ size = 16 }: { size?: number }): React.JSX.Element => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.5 14.6A8.6 8.6 0 0 1 9.4 3.5a8.6 8.6 0 1 0 11.1 11.1z" />
  </svg>
);

const linkStyle: React.CSSProperties = {
  color: 'var(--pg-text-muted)',
  fontSize: 'var(--pg-text-sm)',
  fontWeight: 500,
};

const iconButton: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--pg-border-strong)',
  borderRadius: 'var(--pg-radius-md)',
  width: 36,
  height: 36,
  cursor: 'pointer',
  color: 'var(--pg-text-muted)',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * Sticky nav. The dark/light toggle is real product behaviour: `layout.tsx`
 * seeds `data-theme` from `prefers-color-scheme` before paint, and this button
 * flips the same attribute — dark is canonical, light is first-class.
 *
 * Below 900px the links and CTAs collapse into a hamburger-toggled drawer
 * (`aria-expanded` / `aria-controls`); the CSS lives in `globals.css`.
 */
export function Nav(): React.JSX.Element {
  const [theme, setTheme] = React.useState<'dark' | 'light'>('dark');
  const [open, setOpen] = React.useState(false);

  // Adopt whatever the pre-paint script already resolved, so the icon matches
  // the rendered theme instead of assuming dark.
  React.useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (current === 'light' || current === 'dark') setTheme(current);
  }, []);

  const toggle = (): void => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      return next;
    });
  };

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'color-mix(in srgb, var(--pg-bg) 82%, transparent)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--pg-border)',
      }}
    >
      <div style={{ ...shell, padding: '13px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <a href="#top" style={{ display: 'flex', alignItems: 'center', gap: 9 }} aria-label="ProveGate home">
          <Mark size={25} />
          <Wordmark />
        </a>
        <nav style={{ display: 'flex', gap: 22, marginLeft: 30 }} className="pg-navlinks" aria-label="Primary">
          {C.NAV_LINKS.map(([label, href]) => (
            <a key={href} href={href} style={linkStyle}>
              {label}
            </a>
          ))}
        </nav>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={toggle}
            title={themeLabel}
            aria-label={themeLabel}
            style={{ ...iconButton, display: 'inline-flex' }}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <span className="pg-nav-cta" style={{ display: 'inline-flex', gap: 10 }}>
            <Button
              as="a"
              href={C.LINKS.github}
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="github" size={15} />}
            >
              GitHub
            </Button>
            <Button as="a" href="#install" variant="primary" size="sm">
              Get started
            </Button>
          </span>
          <button
            type="button"
            className="pg-navtoggle"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="pg-mobile-nav"
            style={iconButton}
          >
            <Icon name={open ? 'cross' : 'terminal'} size={16} />
          </button>
        </div>
      </div>
      {open ? (
        <div
          id="pg-mobile-nav"
          style={{
            borderTop: '1px solid var(--pg-border)',
            background: 'var(--pg-bg)',
            padding: '12px 28px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {C.NAV_LINKS.map(([label, href]) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={{ ...linkStyle, padding: '10px 0', borderBottom: '1px solid var(--pg-border)' }}
            >
              {label}
            </a>
          ))}
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <Button
              as="a"
              href={C.LINKS.github}
              variant="secondary"
              size="sm"
              leftIcon={<Icon name="github" size={15} />}
            >
              GitHub
            </Button>
            <Button as="a" href="#install" variant="primary" size="sm" onClick={() => setOpen(false)}>
              Get started
            </Button>
          </div>
        </div>
      ) : null}
    </header>
  );
}
