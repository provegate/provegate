import { defineConfig } from 'tsup';

// tsup owns emit; tsc owns types (noEmit, incremental OFF — see bootstrap "Known traps").
export default defineConfig({
  entry: {
    cli: 'src/cli.ts',
    index: 'src/index.ts',
  },
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  dts: true,
  clean: true,
  // No shared chunks: the pack manifest (test/pack-manifest.json) is an exact
  // file list, and hashed chunk names would churn it every build.
  splitting: false,
});
