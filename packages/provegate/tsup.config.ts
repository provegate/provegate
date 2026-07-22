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
});
