/* Two-tone wordmark split, mirroring apps/web's PRODUCT_NAME_PARTS. */
export const appNameParts = ['Prove', 'Gate'] as const;
export const appName = appNameParts.join('');
export const docsRoute = '/docs';
export const docsImageRoute = '/og/docs';
export const docsContentRoute = '/llms.mdx/docs';

export const gitConfig = {
  user: 'provegate',
  repo: 'provegate',
  branch: 'main',
};

/** Own origin — the docs live on a subdomain, not the apex. */
export const siteUrl = 'https://docs.provegate.dev';

/** Repo-root-relative home of the content tree. The GitHub blob URL must
 * carry the `apps/docs` prefix — the monorepo's content dir is not at the
 * repo root, and a bare `content/docs/…` link 404s. */
export const contentSourceDir = 'apps/docs/content/docs';

/** GitHub source link for a page (`pagePath` is relative to the content dir,
 * e.g. `quickstart.mdx`). */
export function sourceUrl(pagePath: string): string {
  return `https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/${contentSourceDir}/${pagePath}`;
}
