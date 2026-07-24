import { defineConfig } from 'tsup';

// Two render targets from one package. Keep `cli` free of any web import so a
// zero-runtime-dependency consumer (the provegate CLI) can bundle it without
// pulling CSS or React — the import-graph test enforces this.
export default defineConfig({
  entry: {
    tokens: 'src/tokens.ts',
    'cli/index': 'src/cli/index.ts',
    'react/index': 'src/react/index.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  dts: true,
  clean: true,
  splitting: false,
});
