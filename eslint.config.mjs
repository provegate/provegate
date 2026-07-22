import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.source/**',
      '**/next-env.d.ts',
      'docs/research/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
