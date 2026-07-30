import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Mirrors tsconfig's `@/*` path so app modules import in tests as they do
// in Next. (`collections/*` is deliberately absent: the generated .source
// tree needs the fumadocs-mdx plugin, so tests stay off `lib/source`.)
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});
