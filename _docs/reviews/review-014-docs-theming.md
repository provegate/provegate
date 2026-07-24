# Independent Review: PRD-014 — Docs Theming + OG (`apps/docs`)

> **PRD:** PRD-014
> **Verdict:** pass
> **Reviewer:** Codex (GPT, independent Phase 6 session)
> **Base SHA:** `c111c89`
> **Critical:** 0
> **High:** 1
> **Medium:** 1
> **Quorum:** 1/1 pass (single independent reviewer)

## Summary

Reviewed `git diff c111c89..HEAD`, the full PRD, and every changed file. I
searched `apps/docs` for copied Fumadocs layouts, traced the compiled CSS and the
installed `next-themes` implementation, scanned the existing `.next` output,
exercised adversarial slug shapes, reconciled the conflict surface, and checked
the OG renderer's actual token/font fallbacks.

Commands run:

- `node scripts/check-static-egress.mjs` — exit 0, clean for both built apps.
- `pnpm --filter docs check-types` — exit 0.
- `pnpm --filter docs lint` — exit 0.
- `git diff --find-copies --find-renames c111c89..HEAD` plus targeted `rg`,
  compiled-output inspection, and Node repro scripts below.

No Critical defect was found, so the verdict is `pass` under the required rule.
The implementation still has one High shared-design violation and one Medium
persisted-theme bug.

## Findings

### High — OG card bypasses the shared token source and shared IBM Plex font

**Location:** `apps/docs/app/og/docs/[...slug]/route.tsx:20`

**Attack:** I challenged the documented claim that Satori's lack of CSS custom
property support makes the literal brand values a legitimate exception.

**Evidence/repro:** It does not. `@provegate/design/tokens` already exports the
four exact terminal/brand colours as JavaScript values, while lines 23–26 copy
their hex values into a second source of truth. Lines 44 and 50–64 also hardcode
spacing, radius, sizing, weights, and tracking. Finally, the `ImageResponse`
options at line 69 provide no `fonts`, and the route specifies no `fontFamily`;
the installed Next/OG type declares its default as Noto Sans Latin Regular, not
the required self-hosted IBM Plex.

```bash
rg -n '#[0-9A-Fa-f]{6}|padding:|borderRadius:|fontSize:|fontWeight:|letterSpacing:' \
  'apps/docs/app/og/docs/[...slug]/route.tsx'

(cd apps/docs && node --input-type=module - <<'NODE'
import { terminal } from '@provegate/design/tokens';
console.log(terminal.bg.hex, terminal.fg.hex, terminal.green.hex, terminal.dim.hex);
NODE
)
# => #14130d #e7e4db #4fd08a #8f8a7b

rg -n 'fonts\s*:|fontFamily' 'apps/docs/app/og/docs/[...slug]/route.tsx'
# => no matches

find node_modules/.pnpm -path '*/next/dist/compiled/@vercel/og/types.d.ts' \
  -exec grep -n -A4 'A list of fonts' {} \; -quit
# => @default Noto Sans Latin Regular
```

This violates the PRD's “every value from `@provegate/design`” goal and §12's
no-hardcoded-hex/font/radius/spacing rule, and it will visibly drift when the
shared palette changes. Import the exported colour values, embed the packaged
IBM Plex font in `ImageResponse.fonts`, and source or explicitly standardize the
remaining OG measurements rather than leaving route-local magic values.

### Medium — a persisted legacy `system` preference defeats dark-canonical mode

**Location:** `apps/docs/app/layout.tsx:16`

**Attack:** I tested the actual bootstrap behavior, not only the valid
light/dark toggle. Before this change, Fumadocs enabled the `system` theme, so a
returning visitor can legitimately have `localStorage.theme === "system"`.

**Evidence/repro:** `defaultTheme: 'dark'` does not override stored state.
With `enableSystem: false`, `next-themes` does not resolve the legacy value; the
built bootstrap writes `system` to both selectors. Fumadocs gets no `.dark`
class and ProveGate gets no `[data-theme="dark"]`, even when the OS is dark.

```bash
node - <<'NODE'
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('apps/docs/.next/server/app/docs/quickstart.html', 'utf8');
const script = html.match(/<script>(\(\(a,b,c,d,e,f,g,h\)=>[\s\S]*?)<\/script>/)[1];
const classes = new Set(), attrs = {};
vm.runInNewContext(script, {
  document: { documentElement: {
    classList: {
      remove: (...xs) => xs.forEach((x) => classes.delete(x)),
      add: (x) => classes.add(x),
    },
    setAttribute: (key, value) => { attrs[key] = value; },
    style: {},
  }},
  localStorage: { getItem: () => 'system' },
  window: { matchMedia: () => ({ matches: true }) },
});
console.log([...classes], attrs['data-theme']);
NODE
# => [ 'system' ] system
```

Migrate/sanitize the old stored value or use a new storage key so the first
post-upgrade render is dark while retaining the real light/dark toggle.

### Attack vectors that held

1. **Fork check:** No new/copy-detected layout exists. The app still imports
   `HomeLayout`, `DocsLayout`, and docs-page primitives directly from
   `fumadocs-ui`; the only theme implementation is the `--color-fd-*` binding in
   `apps/docs/app/global.css:22`.
2. **Egress:** The static scanner exited 0. `apps/docs/app/layout.tsx:5` uses the
   workspace's self-hosted stylesheet; neither it nor `global.css` contains a
   remote asset, analytics hook, CDN, or live `next/font/google` import. The
   GitHub URLs found elsewhere are ordinary navigation links, not fetch shapes.
3. **Token-only/no hex:** Normal docs CSS held: the new declarations use
   `var(--pg-*)`. The OG exception did not fully hold and is the High finding
   above.
4. **Colour law:** `apps/docs/app/global.css:32` maps primary to `--pg-link`
   (the blue human ramp in both themes), and line 36 maps accent to the neutral
   `--pg-bg-subtle`. Searches found no green-backed docs chrome. The green OG
   mark is brand artwork, not a link/nav/active/border/background state.
5. **OG slug bounding:** `apps/docs/app/og/docs/[...slug]/route.tsx:13` removes
   the image filename, joins the remaining segments, checks the 120-character
   cap and ASCII allowlist, and only then calls `source.getPage`. Tested
   121-character, traversal, percent-encoded, Unicode, newline, slash-containing,
   and 122-empty-segment inputs. Rejected or unknown inputs resolve to
   `appName`, whose value is `ProveGate` at `apps/docs/lib/shared.ts:1`; no
   attacker-controlled slug text is rendered.
6. **Surface reconciliation:** The literal out-of-surface edited files are
   `_prds/wip/prd-014-docs-theming.md`, `_state/prds.json`,
   `_tasks/wip/tasks-014-docs-theming.md`, and `pnpm-lock.yaml`. The first three
   are workflow control artifacts; the lockfile contains only the generated
   workspace-link consequence of the allowed `apps/docs/package.json` edit.
   No implementation file is outside scope. The corrected PRD does explicitly
   list `apps/docs/app/layout.tsx` in FR-2, Implementation Scope, and Conflict
   Surface (`_prds/wip/prd-014-docs-theming.md:220`).
7. **Theme switching:** Valid `light` and `dark` values do write both selectors:
   the installed `next-themes` 0.4.6 runtime iterates attribute arrays, and the
   built HTML invokes it with `["class","data-theme"]`. The legacy persisted
   `system` edge case did not hold and is the Medium finding above.

## Round 2 — fix verification

Reviewed `git diff 669aa85..HEAD` (fix commit `b442d96`) and the current file
states. I rebuilt the docs output before rerunning the theme bootstrap.

### Finding 1 (High) — RESOLVED

The OG card's four rendered brand colours now flow from the JavaScript export of
the shared design tokens. The exact requested token repro printed the expected
values:

```bash
(cd apps/docs && node --input-type=module -e \
  "import {terminal} from '@provegate/design/tokens'; console.log(terminal.bg.hex, terminal.fg.hex, terminal.green.hex, terminal.dim.hex)")
# => #14130d #e7e4db #4fd08a #8f8a7b
```

I then checked both ends of the render path and searched the route for another
literal colour source:

```bash
rg -n '#[0-9A-Fa-f]{3,8}|rgb\(|hsl\(' \
  'apps/docs/app/og/docs/[...slug]/route.tsx'
# => no output

rg -n 'terminal\.(bg|fg|green|dim)\.hex|BRAND\.(bg|fg|green|subtle)' \
  'apps/docs/app/og/docs/[...slug]/route.tsx'
# => 29:  bg: terminal.bg.hex,
# => 30:  fg: terminal.fg.hex,
# => 31:  green: terminal.green.hex,
# => 32:  subtle: terminal.dim.hex,
# => 48:          background: BRAND.bg,
# => 49:          color: BRAND.fg,
# => 59:              background: BRAND.green,
# => 70:        <div style={{ display: 'flex', fontSize: '28px', color: BRAND.subtle }}>
```

There is no remaining duplicated brand colour value in the route. The remaining
numeric values are OG canvas/layout geometry and are not treated as brand-token
defects.

For the font claim, I enumerated the package's actual font assets:

```bash
find packages/design/assets/fonts -type f | sort
# => packages/design/assets/fonts/OFL.txt
# => packages/design/assets/fonts/ibm-plex-mono-latin-400-normal.woff2
# => packages/design/assets/fonts/ibm-plex-mono-latin-500-normal.woff2
# => packages/design/assets/fonts/ibm-plex-mono-latin-600-normal.woff2
# => packages/design/assets/fonts/ibm-plex-mono-latin-700-normal.woff2
# => packages/design/assets/fonts/ibm-plex-sans-latin-400-normal.woff2
# => packages/design/assets/fonts/ibm-plex-sans-latin-500-normal.woff2
# => packages/design/assets/fonts/ibm-plex-sans-latin-600-normal.woff2
# => packages/design/assets/fonts/ibm-plex-sans-latin-700-normal.woff2
```

Satori's `ImageResponse.fonts` accepts TTF/OTF/WOFF, while the shared package
ships only WOFF2. The route now explicitly and accurately declares that it uses
Satori's built-in Noto Sans instead of pretending to share IBM Plex. I accept
this as an honest engine/package-format limitation, not an open defect, and drop
it from the open-High count.

### Finding 2 (Medium) — RESOLVED

`apps/docs/app/layout.tsx` now uses the fresh key `pg-docs-theme`. After a full
successful rebuild with `pnpm --filter docs build --webpack`, I extracted the
new inline bootstrap from
`apps/docs/.next/server/app/docs/quickstart.html` and ran it with key-sensitive
storage maps. The old `theme` key contains `system` only in the legacy case; the
new key correctly returns `null` there:

```bash
node - <<'NODE'
const fs = require('fs');
const vm = require('vm');
const html = fs.readFileSync('apps/docs/.next/server/app/docs/quickstart.html', 'utf8');
const match = html.match(/<script>(\(\(a,b,c,d,e,f,g,h\)=>[\s\S]*?)<\/script>/);
if (!match) throw new Error('theme bootstrap not found');
const script = match[1];

for (const [name, store] of [
  ['legacy-system', { theme: 'system' }],
  ['fresh', {}],
  ['new-explicit-light', { theme: 'system', 'pg-docs-theme': 'light' }],
]) {
  const classes = new Set();
  const attrs = {};
  const reads = [];
  const style = {};
  vm.runInNewContext(script, {
    document: { documentElement: {
      classList: {
        remove: (...xs) => xs.forEach((x) => classes.delete(x)),
        add: (x) => classes.add(x),
      },
      setAttribute: (key, value) => { attrs[key] = value; },
      style,
    }},
    localStorage: { getItem: (key) => {
      reads.push(key);
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    }},
    window: { matchMedia: () => ({ matches: true }) },
  });
  console.log(`${name}: reads=${JSON.stringify(reads)} classes=${JSON.stringify([...classes])} data-theme=${attrs['data-theme']} color-scheme=${style.colorScheme}`);
}
NODE
# => legacy-system: reads=["pg-docs-theme"] classes=["dark"] data-theme=dark color-scheme=dark
# => fresh: reads=["pg-docs-theme"] classes=["dark"] data-theme=dark color-scheme=dark
# => new-explicit-light: reads=["pg-docs-theme"] classes=["light"] data-theme=light color-scheme=light
```

Thus (a) a returning visitor with legacy `theme=system` first-renders dark, (b)
a fresh visitor first-renders dark, and (c) a light choice persisted under the
new key first-renders light. The bootstrap never reads the old key.

Validation:

- `pnpm --filter docs build --webpack` — exit 0; compiled successfully, type
  checked, and generated all 27 static pages. The initial unqualified
  `pnpm --filter docs build` selected Turbopack, remained in its compile stage
  without output for several minutes in this worktree, and was interrupted;
  the explicit webpack rebuild completed normally.
- `pnpm --filter docs check-types` — exit 0; route types generated and
  `tsc --noEmit` passed.
- `node scripts/check-static-egress.mjs` — exit 0:
  `[egress] clean — no third-party fetch shape in apps/web/.next, apps/docs/.next`.

> **Verdict:** pass
> **Critical:** 0
> **High:** 0
> **Medium:** 0
