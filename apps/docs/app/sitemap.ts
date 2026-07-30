import type { MetadataRoute } from 'next';
import { source } from '@/lib/source';
import { siteUrl } from '@/lib/shared';

// Derived from the content source, never hand-listed — a new page joins the
// sitemap by existing. The subdomain root 308s to the hub, so only real pages
// appear; the hub outranks its children.
export default function sitemap(): MetadataRoute.Sitemap {
  return source.getPages().map((page) => ({
    url: `${siteUrl}${page.url}`,
    changeFrequency: 'weekly' as const,
    priority: page.slugs.length === 0 ? 1 : 0.7,
  }));
}
