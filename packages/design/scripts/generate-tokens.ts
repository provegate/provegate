/**
 * generate-tokens — emit the web CSS and the terminal ANSI theme from the
 * single token source (`src/tokens.ts`). Run: `pnpm --filter @provegate/design
 * generate-tokens`. The output files are GENERATED and committed; a byte-identity
 * test regenerates and diffs them, so never hand-edit the output — edit
 * `src/tokens.ts` and re-run this. Emit logic lives in `emit.ts` (side-effect
 * free, so the test can import it).
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { emitColorsCss, emitTheme } from './emit.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

writeFileSync(resolve(root, 'src/tokens/colors.css'), emitColorsCss());
writeFileSync(resolve(root, 'src/cli/theme.ts'), emitTheme());
console.log('[generate-tokens] wrote src/tokens/colors.css + src/cli/theme.ts');
