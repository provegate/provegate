#!/usr/bin/env node
// verify:turbo-inputs — a cached turbo task must not narrow its own cache key.
//
// `inputs` replaces the default (every tracked file in the package), so an enumeration
// that misses one real input makes the task cache-hit on a change it should have
// rebuilt for — and turbo then RESTORES the stale outputs. Downstream gates read those
// outputs and pass on bytes that no longer exist in the source tree.
//
// This is not hypothetical here; it shipped twice, both found by measurement:
//   - `build` declared `src/**, scripts/**, tsup.config.ts, package.json`, which fits the
//     packages but starves the Next apps: `web#build` hashed exactly one file
//     (package.json), leaving all of `apps/web/app/**` outside the key. `check-egress`
//     scans that build output, so the egress gate could pass on a page it never scanned.
//   - `generate-tokens` declared `src/tokens.ts, scripts/generate-tokens.ts` while the
//     generator imports `scripts/emit.ts`, so editing the emitter replayed stale tokens.
//
// The rule is therefore blanket rather than case-by-case: an enumeration is only correct
// while someone keeps it correct, and nothing tells you when it stops being so. A task
// that genuinely needs `inputs` goes in the exceptions file with a reason — a deliberate,
// reviewable act instead of a silent narrowing.
//
// Uncached tasks (`"cache": false`) are exempt by construction: with nothing to replay,
// the key cannot serve a stale artifact.
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { targetRoot, read, makeReporter } from './lib.mjs';

const root = targetRoot();
const r = makeReporter('verify:turbo-inputs');

const configPath = join(root, 'turbo.json');
const exceptionsPath = join(root, 'scripts', 'verify', 'turbo-inputs-exceptions.json');

if (!existsSync(configPath)) {
  console.log('verify:turbo-inputs: no turbo.json — nothing to check');
  r.done();
}

let config;
try {
  config = JSON.parse(read(configPath));
} catch (error) {
  r.fail(`turbo.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  r.done();
}

const exceptions = existsSync(exceptionsPath) ? JSON.parse(read(exceptionsPath)) : {};
const tasks = config.tasks ?? config.pipeline ?? null;
if (tasks === null || typeof tasks !== 'object') {
  // A turbo.json with no task map is either a different schema or a typo. Either way the
  // check cannot see what it is supposed to police, and silence would read as green.
  r.fail('turbo.json declares no tasks/pipeline map — cannot audit cache keys');
  r.done();
}

let checked = 0;
for (const [name, task] of Object.entries(tasks)) {
  if (!task || typeof task !== 'object') continue;
  checked++;
  if (task.cache === false) continue;
  if (!('inputs' in task)) continue;
  const reason = exceptions[name];
  if (typeof reason === 'string' && reason.trim().length > 0) continue;
  r.fail(
    `task '${name}' narrows its cache key with inputs [${(task.inputs ?? []).join(', ')}] — ` +
      `an incomplete list serves stale cached outputs to whatever gate reads them. ` +
      `Delete the key to hash every tracked file, or add '${name}' to ` +
      `scripts/verify/turbo-inputs-exceptions.json with a reason`,
  );
}

// A stale exception is the same failure one level up: it outlives the task it excused and
// silently blesses the next narrowing that reuses the name.
for (const name of Object.keys(exceptions)) {
  if (!(name in tasks)) r.fail(`exception names unknown task '${name}'`);
  else if (!('inputs' in (tasks[name] ?? {})))
    r.fail(`exception for '${name}' is stale — the task no longer declares inputs`);
}

console.log(`verify:turbo-inputs: ${checked} task(s) checked`);
r.done();
