// SSOT loader for the operator-acceptance owner allowlist (PRD-418).
// Consumed by prd-accept.mjs (write path) and verify-prd-state.mjs (read path);
// replaces the previously duplicated inline ACCEPTANCE_OWNERS sets.
//
// Fail-closed by design: a missing/corrupt/empty config must hard-stop the
// caller. Falling back to an empty set would make prd-accept reject every
// owner while verify-prd-state silently drops recorded waivers.
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const ACCEPTANCE_OWNERS_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../allowlists/acceptance-owners.json",
);

function dieConfig(message) {
  process.stderr.write(`[acceptance-owners] ${message}\n`);
  process.stderr.write(`  - config: ${ACCEPTANCE_OWNERS_PATH}\n`);
  process.exit(1);
}

export function loadAcceptanceOwners() {
  if (!existsSync(ACCEPTANCE_OWNERS_PATH)) {
    dieConfig("allowlist config is missing — restore it from git; refusing to fall back to an empty set");
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(ACCEPTANCE_OWNERS_PATH, "utf8"));
  } catch (error) {
    dieConfig(`allowlist config could not be parsed: ${error.message}`);
  }
  const valid =
    Array.isArray(parsed) &&
    parsed.length > 0 &&
    parsed.every((value) => typeof value === "string" && value.trim().length > 0);
  if (!valid) {
    dieConfig("allowlist config must be a non-empty JSON array of owner name strings");
  }
  return new Set(parsed.map((value) => value.trim().toLowerCase()));
}
