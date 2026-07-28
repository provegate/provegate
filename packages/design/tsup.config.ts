import { defineConfig } from 'tsup';

// Three build groups from one package. Keep `cli` free of any web import so a
// zero-runtime-dependency consumer (the provegate CLI) can bundle it without
// pulling CSS or React — the import-graph test enforces this.
//
// The `react/client` entry is separate because its BUILT output must open with
// the `"use client"` directive: a source-level directive is dropped by the
// bundle, so the banner is applied here at build time. tsup runs an options
// array CONCURRENTLY over the shared dist, so `clean: true` in either config
// would race the other's writes — both set `clean: false` and the package
// `build` script performs one explicit pre-clean (PRD-027 FR-9).
export default defineConfig([
  {
    entry: {
      tokens: 'src/tokens.ts',
      'cli/index': 'src/cli/index.ts',
      'react/index': 'src/react/index.ts',
    },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    dts: true,
    clean: false,
    splitting: false,
  },
  {
    entry: { 'react/client': 'src/react/client.tsx' },
    format: ['esm'],
    platform: 'node',
    target: 'node22',
    dts: true,
    clean: false,
    splitting: false,
    banner: { js: '"use client";' },
  },
]);
