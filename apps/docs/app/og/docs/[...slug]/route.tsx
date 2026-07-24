import { source } from '@/lib/source';
import { ImageResponse } from 'next/og';
import { appName } from '@/lib/shared';
import { terminal } from '@provegate/design/tokens';

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

// Brand colours come from the shared token source. Satori (next/og) cannot read
// CSS custom properties, so we use @provegate/design's exported JS values — not a
// second copy of the hexes — so nothing drifts when the palette changes. The
// pixel geometry further down is OG-canvas layout (1200x630), not brand tokens.
// Font note: Satori renders with its built-in Noto Sans (it cannot consume the
// packaged woff2), so the OG card is not IBM Plex; brand identity carries through
// colour + wordmark + layout rather than the typeface here.
const BRAND = {
  bg: terminal.bg.hex,
  fg: terminal.fg.hex,
  green: terminal.green.hex,
  subtle: terminal.dim.hex,
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
