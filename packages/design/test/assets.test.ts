import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pkg = (rel: string): string => resolve(__dirname, '..', rel);
const cssFiles = [
  'src/styles.css',
  ...readdirSync(pkg('src/tokens')).map((f) => `src/tokens/${f}`),
].filter((f) => f.endsWith('.css'));

describe('no shipped CSS makes a third-party request (FR-5)', () => {
  it('contains no http/https URL anywhere', () => {
    for (const rel of cssFiles) {
      const css = readFileSync(pkg(rel), 'utf8');
      expect(css, rel).not.toMatch(/https?:\/\//);
    }
  });

  it('the Google Fonts @import from the handoff did not survive', () => {
    for (const rel of cssFiles) {
      expect(readFileSync(pkg(rel), 'utf8'), rel).not.toContain('fonts.googleapis.com');
    }
  });
});

describe('fonts are self-hosted with provenance (FR-5, W2/W3)', () => {
  it('the OFL license ships alongside the woff2 files', () => {
    expect(existsSync(pkg('assets/fonts/OFL.txt'))).toBe(true);
  });

  it('every @font-face src resolves to a real vendored woff2 (W3)', () => {
    const fontsCss = pkg('src/tokens/fonts.css');
    const css = readFileSync(fontsCss, 'utf8');
    const urls = [...css.matchAll(/url\(["']([^"']+)["']\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThan(0);
    for (const url of urls) {
      const abs = resolve(dirname(fontsCss), url);
      expect(existsSync(abs), url).toBe(true);
      expect(url.endsWith('.woff2'), url).toBe(true);
    }
  });
});

describe('brand assets are vendored (FR-6)', () => {
  it('logo.svg and favicon.svg exist', () => {
    expect(existsSync(pkg('assets/logo.svg'))).toBe(true);
    expect(existsSync(pkg('assets/favicon.svg'))).toBe(true);
  });

  it('the logo is single-colour (currentColor), the favicon fetches nothing external', () => {
    expect(readFileSync(pkg('assets/logo.svg'), 'utf8')).toContain('currentColor');
    // The SVG xmlns is a namespace URI, not a fetch — only a real external
    // resource (href/url to http) would be a network request.
    const favicon = readFileSync(pkg('assets/favicon.svg'), 'utf8');
    expect(favicon).not.toMatch(/href\s*=\s*["']https?:/);
    expect(favicon).not.toMatch(/url\(\s*["']?https?:/);
  });
});
