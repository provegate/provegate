import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '../app/robots';
import { contentSourceDir, siteUrl, sourceUrl } from '../lib/shared';

const APP_ROOT = resolve(__dirname, '..');
const REPO_ROOT = resolve(APP_ROOT, '../..');
const CONTENT_DIR = join(APP_ROOT, 'content/docs');

const mdxFiles = readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.mdx'));

describe('content frontmatter', () => {
  it.each(mdxFiles)('%s declares a title and a description', (file) => {
    const head = readFileSync(join(CONTENT_DIR, file), 'utf8').split('\n---\n')[0];
    expect(head).toMatch(/^title:\s*\S/m);
    expect(head).toMatch(/^description:\s*\S/m);
  });

  it('meta.json lists exactly the pages that exist', () => {
    const meta = JSON.parse(readFileSync(join(CONTENT_DIR, 'meta.json'), 'utf8')) as {
      pages: string[];
    };
    const slugs = mdxFiles.map((f) => f.replace(/\.mdx$/, '')).sort();
    expect([...meta.pages].sort()).toEqual(slugs);
  });
});

describe('GitHub source links', () => {
  // The regression this guards: the blob URL once omitted the `apps/docs`
  // prefix, so every "open in GitHub" link 404'd. The URL's repo-relative
  // path must point at a file that actually exists in this repo.
  it.each(mdxFiles)('sourceUrl(%s) targets a real repo path', (file) => {
    const url = sourceUrl(file);
    const repoRelative = url.split('/blob/main/')[1];
    expect(repoRelative).toBe(`${contentSourceDir}/${file}`);
    expect(existsSync(join(REPO_ROOT, repoRelative))).toBe(true);
  });
});

describe('robots', () => {
  it('allows everything and names the sitemap on our origin', () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: '*', allow: '/' });
    expect(r.sitemap).toBe(`${siteUrl}/sitemap.xml`);
  });
});
