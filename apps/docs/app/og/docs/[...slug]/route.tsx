import { source } from '@/lib/source';
import { ImageResponse } from 'next/og';
import { appName } from '@/lib/shared';

export const revalidate = false;

// Bound the [...slug] BEFORE it reaches the rendered image: cap the joined
// length and restrict the charset, so arbitrary/oversized text can never be
// drawn. On any violation — or an unknown page — fall back to the site title.
const MAX_SLUG_LEN = 120;
const SLUG_CHARSET = /^[A-Za-z0-9/_-]*$/;

function resolveTitle(slug: string[]): string {
  const pageSlug = slug.slice(0, -1); // drop the trailing "image.png" segment
  const joined = pageSlug.join('/');
  if (joined.length > MAX_SLUG_LEN || !SLUG_CHARSET.test(joined)) return appName;
  return source.getPage(pageSlug)?.data.title ?? appName;
}

// Literal brand values — satori (next/og) cannot read CSS custom properties,
// so the --pg-* tokens are inlined here. Kept in sync with packages/design.
const BRAND = {
  bg: '#14130d',
  fg: '#e7e4db',
  green: '#4fd08a',
  subtle: '#8f8a7b',
};

export async function GET(_req: Request, { params }: RouteContext<'/og/docs/[...slug]'>) {
  const { slug } = await params;
  const title = resolveTitle(slug);

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: '100%',
          height: '100%',
          background: BRAND.bg,
          color: BRAND.fg,
          padding: '80px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: BRAND.green,
              marginRight: '20px',
            }}
          />
          <div style={{ fontSize: '34px', fontWeight: 700, letterSpacing: '0.01em' }}>
            {appName}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: '66px', fontWeight: 700, lineHeight: 1.1, maxWidth: '960px' }}>
          {title}
        </div>
        <div style={{ display: 'flex', fontSize: '28px', color: BRAND.subtle }}>
          prove it, then let it propagate.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

export function generateStaticParams() {
  return source.getPages().map((page) => ({
    lang: page.locale,
    slug: [...page.slugs, 'image.png'],
  }));
}
