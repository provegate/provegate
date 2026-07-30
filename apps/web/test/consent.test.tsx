// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { ConsentedAnalytics, CookiePrefsButton } from '../app/consent';

// next/script injects via effects jsdom never runs — a plain marker element
// makes "the GA script rendered" observable and deterministic.
vi.mock('next/script', () => ({
  default: (props: { src?: string; id?: string }) => (
    <script data-testid="ga-script" data-src={props.src} data-script-id={props.id} />
  ),
}));

const BANNER_LABEL = 'Cookie consent';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_GA_ID', 'G-TEST123');
  window.localStorage.clear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  document.body.innerHTML = '';
});

describe('ConsentedAnalytics', () => {
  it('renders nothing at all when NEXT_PUBLIC_GA_ID is unset', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '');
    const { container } = render(<ConsentedAnalytics />);
    expect(container.childElementCount).toBe(0);
  });

  it('shows the banner and loads NO GA script before a choice is made', () => {
    render(<ConsentedAnalytics />);
    expect(screen.getByLabelText(BANNER_LABEL)).toBeTruthy();
    expect(screen.queryAllByTestId('ga-script')).toHaveLength(0);
  });

  it('Allow stores the grant, dismisses the banner, and mounts both GA scripts', () => {
    render(<ConsentedAnalytics />);
    fireEvent.click(screen.getByRole('button', { name: 'Allow' }));
    expect(window.localStorage.getItem('pg-consent')).toBe('granted');
    expect(screen.queryByLabelText(BANNER_LABEL)).toBeNull();
    const scripts = screen.getAllByTestId('ga-script');
    expect(scripts).toHaveLength(2);
    expect(scripts[0].getAttribute('data-src')).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-TEST123',
    );
  });

  it('Decline stores the denial, dismisses the banner, and mounts nothing', () => {
    render(<ConsentedAnalytics />);
    fireEvent.click(screen.getByRole('button', { name: 'Decline' }));
    expect(window.localStorage.getItem('pg-consent')).toBe('denied');
    expect(screen.queryByLabelText(BANNER_LABEL)).toBeNull();
    expect(screen.queryAllByTestId('ga-script')).toHaveLength(0);
  });

  it('a stored choice suppresses the banner on the next visit', () => {
    window.localStorage.setItem('pg-consent', 'denied');
    render(<ConsentedAnalytics />);
    expect(screen.queryByLabelText(BANNER_LABEL)).toBeNull();
  });
});

describe('CookiePrefsButton', () => {
  it('withdrawal clears the stored choice and reopens the banner', () => {
    window.localStorage.setItem('pg-consent', 'granted');
    render(
      <>
        <ConsentedAnalytics />
        <CookiePrefsButton />
      </>,
    );
    expect(screen.queryByLabelText(BANNER_LABEL)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'cookies' }));
    expect(window.localStorage.getItem('pg-consent')).toBeNull();
    expect(screen.getByLabelText(BANNER_LABEL)).toBeTruthy();
    expect(screen.queryAllByTestId('ga-script')).toHaveLength(0);
  });

  it('renders nothing when analytics is off', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_ID', '');
    const { container } = render(<CookiePrefsButton />);
    expect(container.childElementCount).toBe(0);
  });
});
