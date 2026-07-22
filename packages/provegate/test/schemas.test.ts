import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const schemasDir = fileURLToPath(new URL('../schemas', import.meta.url));
const schemaFiles = readdirSync(schemasDir).filter((name) => name.endsWith('.schema.json'));

describe('generalized schemas', () => {
  it('ships the four schemas (three ported + review-metadata)', () => {
    expect(schemaFiles.sort()).toEqual([
      'acceptances.schema.json',
      'agent-lock.schema.json',
      'prd-state.schema.json',
      'review-metadata.schema.json',
    ]);
  });

  it('every schema parses and carries a neutral provegate.dev $id', () => {
    for (const name of schemaFiles) {
      const schema = JSON.parse(readFileSync(resolve(schemasDir, name), 'utf8')) as {
        $id?: string;
      };
      expect(schema.$id, name).toMatch(/^https:\/\/provegate\.dev\/schemas\//);
    }
  });

  it('no parent-project residue anywhere under schemas/', () => {
    for (const name of readdirSync(schemasDir)) {
      const content = readFileSync(resolve(schemasDir, name), 'utf8').toLowerCase();
      expect(content, name).not.toContain('emofy');
      expect(content, name).not.toContain('rayvaz');
    }
  });

  it('agent-lock required fields match the runtime validateLock gate', async () => {
    const schema = JSON.parse(
      readFileSync(resolve(schemasDir, 'agent-lock.schema.json'), 'utf8'),
    ) as { required: string[] };
    const { validateLock } = await import('../src/core/locks/lease.js');
    const { DEFAULT_CONFIG } = await import('../src/core/config/index.js');
    const issues = validateLock(DEFAULT_CONFIG, {}, { now: 0 });
    for (const field of schema.required) {
      expect(issues).toContain(`missing ${field}`);
    }
  });
});
