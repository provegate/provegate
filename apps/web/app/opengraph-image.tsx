import { ImageResponse } from 'next/og';
import { terminal } from '@provegate/design/tokens';
import { PRINCIPLES, PRODUCT_NAME, SITE_TITLE, HERO } from './sections/content';

// The file-convention OG card (PRD-027 FR-1), ported from the docs route
// (apps/docs/app/og/docs/[...slug]/route.tsx) minus its [...slug] input
// bounding — a static card has no input to bound. This module must stay
// directly under app/ and out of any route group: get-metadata-route.js:45-46
// leaves the path un-suffixed only outside a group.
export const revalidate = false;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = SITE_TITLE;

// Brand colours come from the shared token source. Satori (next/og) cannot
// read CSS custom properties, so we use @provegate/design's exported JS values
// — not a second copy of the hexes. Satori renders its built-in typeface (it
// cannot consume the packaged woff2), so identity carries through colour, the
// green mark and layout rather than the typeface.
const BRAND = {
  bg: terminal.bg.hex,
  fg: terminal.fg.hex,
  green: terminal.green.hex,
  subtle: terminal.dim.hex,
};

export default function OpengraphImage(): ImageResponse {
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
            {PRODUCT_NAME}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: '58px', fontWeight: 700, lineHeight: 1.15, maxWidth: '1000px' }}>
          {HERO.thesis}
        </div>
        <div style={{ display: 'flex', fontSize: '26px', color: BRAND.subtle }}>
          {PRINCIPLES}
        </div>
      </div>
    ),
    size,
  );
}
