import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// PRD-027 FR-1 + FR-8 — the social card and the concept page, asserted at two
// levels: what the source DECLARES (the coherence triple) and what the build
// EMITS (the meta tags an unfurl client actually reads). Either alone is a
// proxy: a framework change to the resolve-metadata.js:137 gate could suppress
// the card with all three source parts still true.
//
// `false-green-on-missing-file`: an ABSENT build file fails these rows rather
// than skipping — and the §11 chain runs a fresh `pnpm --filter web build`
// before this file, so a stale tree cannot certify a card nobody produced.

const APP = resolve(__dirname, '../app');
const BUILT = resolve(__dirname, '../.next/server/app');

function built(name: string): string {
  const p = resolve(BUILT, name);
  // The explicit existence check IS the rule: absence fails, never skips.
  expect(existsSync(p), `${name} missing — run pnpm --filter web build first`).toBe(true);
  return readFileSync(p, 'utf8');
}

describe('FR-1 source level — the coherence triple', () => {
  it('(i) the file-convention card exists with default export, ImageResponse, and size', () => {
    const src = readFileSync(resolve(APP, 'opengraph-image.tsx'), 'utf8');
    expect(src).toMatch(/export default function/);
    expect(src).toContain('ImageResponse');
    expect(src).toContain('export const size');
    expect(src).toContain('width: 1200');
    expect(src).toContain('height: 630');
  });

  it('(ii) layout metadata declares NO images key under openGraph or twitter', async () => {
    const { metadata } = await import('../app/layout');
    expect(metadata.openGraph).toBeDefined();
    expect('images' in (metadata.openGraph as object)).toBe(false);
    expect(metadata.twitter).toBeDefined();
    expect('images' in (metadata.twitter as object)).toBe(false);
    // and the omission carries its reason in source, so a later reader sees a
    // decision rather than an oversight
    const src = readFileSync(resolve(APP, 'layout.tsx'), 'utf8');
    expect(src).toContain('resolve-metadata.js:137-157');
  });

  it('(iii) the declared card type is summary_large_image — now backed by a real asset', async () => {
    const { metadata } = await import('../app/layout');
    expect((metadata.twitter as { card?: string }).card).toBe('summary_large_image');
  });
});

describe('FR-1 emitted level — the built product page', () => {
  it('index.html emits an absolute og:image with 1200x630 and a twitter:image', () => {
    const html = built('index.html');
    const og = /property="og:image"[^>]*content="([^"]+)"/.exec(html) ?? /content="([^"]+)"[^>]*property="og:image"/.exec(html);
    expect(og, 'og:image missing from built index.html').not.toBeNull();
    expect(og![1]).toMatch(/^https:\/\/provegate\.dev\//);
    expect(html).toMatch(/og:image:width"[^>]*content="1200"|content="1200"[^>]*og:image:width/);
    expect(html).toMatch(/og:image:height"[^>]*content="630"|content="630"[^>]*og:image:height/);
    expect(html).toMatch(/twitter:image/);
  });
});

describe('FR-8 — /alt stops competing, in search and in unfurls', () => {
  it('alt.html emits the pinned concept title and its own description', () => {
    const html = built('alt.html');
    expect(html).toContain('ProveGate — alternative landing concept');
  });

  it('alt.html emits NO og:image, NO twitter:image, and a summary card', () => {
    const html = built('alt.html');
    expect(html).not.toMatch(/property="og:image"/);
    expect(html).not.toMatch(/name="twitter:image"/);
    expect(html).toMatch(/twitter:card"[^>]*content="summary"|content="summary"[^>]*twitter:card/);
    expect(html).not.toMatch(/summary_large_image/);
  });

  it('alt.html carries robots noindex,nofollow — the before-state had no robots meta at all', () => {
    const html = built('alt.html');
    expect(html).toMatch(/name="robots"/);
    expect(html).toMatch(/noindex/);
    expect(html).toMatch(/nofollow/);
  });

  it('the two routes no longer emit identical metadata', () => {
    const grab = (f: string): string =>
      (built(f).match(/<meta[^>]*>/g) ?? []).sort().join();
    expect(grab('index.html')).not.toBe(grab('alt.html'));
  });
});
