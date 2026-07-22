#!/usr/bin/env node
/**
 * verify:acceptances — structural gate for the operator-acceptance store (PRD-418).
 *
 * Checks _state/acceptances.json against the contract documented in
 * _state/schema/acceptances.schema.json (hand-rolled structural validation in
 * the verify-agent-locks pattern — no ajv, no new dependencies) and requires
 * every entry's owner to be present in the scripts/allowlists/acceptance-owners.json
 * allowlist (loaded fail-closed via scripts/lib/acceptance-owners.mjs).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, fail, ok, readText } from "./prd-state-utils.mjs";
import { ACCEPTANCE_OWNERS_PATH, loadAcceptanceOwners } from "./lib/acceptance-owners.mjs";

const ACCEPT_PATH = resolve(REPO_ROOT, "_state/acceptances.json");
const SCHEMA_PATH = resolve(REPO_ROOT, "_state/schema/acceptances.schema.json");
const ENTRY_FIELDS = ["prd", "owner", "items", "reason", "date", "method"];

if (!existsSync(SCHEMA_PATH)) {
  fail("[verify:acceptances] schema file is missing", [SCHEMA_PATH]);
}
if (!existsSync(ACCEPT_PATH)) {
  fail("[verify:acceptances] store file is missing", [
    `${ACCEPT_PATH} is committed state — restore it from git`,
  ]);
}

let store;
try {
  store = JSON.parse(readText(ACCEPT_PATH));
} catch (error) {
  fail(`[verify:acceptances] could not parse ${ACCEPT_PATH}`, [error.message]);
}

const owners = loadAcceptanceOwners();
const issues = [];

if (store.schemaVersion !== 1) {
  issues.push(`schemaVersion must be 1 (got ${JSON.stringify(store.schemaVersion)})`);
}
if (!Array.isArray(store.acceptances)) {
  issues.push("acceptances must be an array");
}
for (const key of Object.keys(store)) {
  if (key !== "schemaVersion" && key !== "acceptances") {
    issues.push(`unexpected top-level field "${key}"`);
  }
}

for (const [index, entry] of (Array.isArray(store.acceptances) ? store.acceptances : []).entries()) {
  const label = `acceptances[${index}]${entry?.prd ? ` (${entry.prd})` : ""}`;
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    issues.push(`${label}: entry must be an object`);
    continue;
  }
  for (const field of ENTRY_FIELDS) {
    if (entry[field] === undefined) issues.push(`${label}: missing ${field}`);
  }
  for (const key of Object.keys(entry)) {
    if (!ENTRY_FIELDS.includes(key)) issues.push(`${label}: unexpected field "${key}"`);
  }
  if (entry.prd !== undefined && (typeof entry.prd !== "string" || !/^PRD-[0-9]{3}$/.test(entry.prd))) {
    issues.push(`${label}: prd must be a string matching PRD-NNN (got ${JSON.stringify(entry.prd)})`);
  }
  if (entry.owner !== undefined) {
    if (typeof entry.owner !== "string" || entry.owner.trim().length === 0) {
      issues.push(`${label}: owner must be a non-empty string`);
    } else if (!owners.has(entry.owner.trim().toLowerCase())) {
      issues.push(
        `${label}: owner "${entry.owner}" is not in the allowlist (${ACCEPTANCE_OWNERS_PATH})`,
      );
    }
  }
  if (entry.items !== undefined) {
    const itemsOk =
      Array.isArray(entry.items) &&
      entry.items.length > 0 &&
      entry.items.every((item) => typeof item === "string" && item.trim().length > 0);
    if (!itemsOk) issues.push(`${label}: items must be a non-empty array of non-empty strings`);
  }
  if (entry.reason !== undefined && (typeof entry.reason !== "string" || entry.reason.trim().length === 0)) {
    issues.push(`${label}: reason must be a non-empty string`);
  }
  if (entry.date !== undefined && (typeof entry.date !== "string" || !/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(entry.date))) {
    issues.push(`${label}: date must be a YYYY-MM-DD string (got ${JSON.stringify(entry.date)})`);
  }
  if (entry.method !== undefined && (typeof entry.method !== "string" || entry.method.trim().length === 0)) {
    issues.push(`${label}: method must be a non-empty string`);
  }
}

if (issues.length > 0) {
  fail("[verify:acceptances] acceptance store issues detected", issues);
}

ok(`[verify:acceptances] ok - ${store.acceptances.length} acceptance entr(y/ies) checked`);
