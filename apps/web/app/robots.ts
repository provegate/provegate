import type { MetadataRoute } from 'next';

// `/alt` is deliberately NOT disallowed here: its page-level `robots` meta
// (index: false) only works if crawlers can fetch the page and read it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://provegate.dev/sitemap.xml',
  };
}
