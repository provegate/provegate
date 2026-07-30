import type { MetadataRoute } from 'next';

// Only the landing page. `/alt` is noindex by design (see app/alt/page.tsx),
// so listing it here would contradict its own robots meta.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://provegate.dev',
      changeFrequency: 'weekly',
      priority: 1,
    },
  ];
}
