#!/usr/bin/env node
/**
 * pnpm prd:accept PRD-XXX --owner <name> --items OH-1,OH-2|all --reason "<why>" [--yes]
 *
 * Owner-gated acceptance of operator-owned handoff items. Records a committed,
 * auditable entry in _state/acceptances.json. verify:prd-state requires this
 * store entry (NOT a self-written PRD `Operator Acceptance` meta line) to waive
 * the operator-handoff / unchecked-task gates for PRD >= 248, and this command
 * refuses to run non-interactively unless --yes is passed (recorded as method
 * "--yes"), so an autonomous agent cannot silently self-accept on the
 * operator's behalf.
 *
 * Closes the self-attestation hole flagged in the 2026-06-11 workflow audit
 * (agents authoring their own Operator Acceptance meta). See
 * _plans/workflow-hardening-audit-2026-06-17.md §2 P3.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";
import { loadAcceptanceOwners } from "./lib/acceptance-owners.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");
const ACCEPT_PATH = resolve(REPO_ROOT, "_state/acceptances.json");
const STATE_PATH = resolve(REPO_ROOT, "_state/prds.json");

// SSOT: scripts/allowlists/acceptance-owners.json (shared with verify-prd-state.mjs).
const ACCEPTANCE_OWNERS = loadAcceptanceOwners();

function die(message, details = []) {
  process.stderr.write(`[prd-accept] ${message}\n`);
  for (const d of details) process.stderr.write(`  - ${d}\n`);
  process.exit(1);
}

function ok(message) {
  process.stdout.write(`[prd-accept] ${message}\n`);
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const tok = argv[i];
    if (tok.startsWith("--")) {
      const key = tok.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        flags[key] = true;
      } else {
        flags[key] = next;
        i += 1;
      }
    } else {
      positional.push(tok);
    }
  }
  return { positional, flags };
}

function normalizePrd(value) {
  if (!value) die("PRD id required (e.g. PRD-248)");
  const upper = String(value).toUpperCase();
  if (upper.startsWith("PRD-")) {
    if (!/^PRD-\d{3}$/.test(upper)) die(`PRD id malformed: ${value}`);
    return upper;
  }
  const num = Number.parseInt(value, 10);
  if (!Number.isFinite(num)) die(`PRD id malformed: ${value}`);
  return `PRD-${String(num).padStart(3, "0")}`;
}

function readAcceptances() {
  if (!existsSync(ACCEPT_PATH)) return { schemaVersion: 1, acceptances: [] };
  try {
    const data = JSON.parse(readFileSync(ACCEPT_PATH, "utf8"));
    if (!Array.isArray(data.acceptances)) return { schemaVersion: 1, acceptances: [] };
    return data;
  } catch (error) {
    return die(`could not parse ${ACCEPT_PATH}: ${error.message}`);
  }
}

function prdExists(prdId) {
  if (!existsSync(STATE_PATH)) return true; // can't verify without state — don't block
  try {
    const state = JSON.parse(readFileSync(STATE_PATH, "utf8"));
    return state.records.some((r) => r.prd === prdId);
  } catch {
    return true;
  }
}

const { positional, flags } = parseArgs(process.argv.slice(2));
const prdId = normalizePrd(positional[0]);
const owner = (flags.owner ?? "").toString().trim();
const reason = (flags.reason ?? "").toString().trim();
const itemsRaw = (flags.items ?? "").toString().trim();

if (!owner) die("--owner <name> required", [`allowlisted owners: ${[...ACCEPTANCE_OWNERS].join(", ")}`]);
if (!ACCEPTANCE_OWNERS.has(owner.toLowerCase())) {
  die(`owner "${owner}" is not in the allowlist`, [`allowed: ${[...ACCEPTANCE_OWNERS].join(", ")}`]);
}
if (!itemsRaw) die("--items required (e.g. --items OH-1,OH-2 or --items all)");
if (reason.length < 5) die("--reason required (a short sentence; >= 5 chars)");
if (!prdExists(prdId)) die(`${prdId} not found in _state/prds.json`, ["Run `pnpm state:sync` first."]);

const items =
  itemsRaw.toLowerCase() === "all"
    ? ["all"]
    : itemsRaw.split(",").map((s) => s.trim()).filter(Boolean);
if (items.length === 0) die("no items parsed from --items");

// --- confirmation: refuse a silent non-interactive acceptance --------------
let method = "interactive";
if (flags.yes === true) {
  method = "--yes";
  process.stderr.write(
    `[prd-accept] --yes: recording a NON-INTERACTIVE acceptance for ${prdId} (logged as method "--yes").\n`,
  );
} else if (!process.stdin.isTTY) {
  die("refusing to record acceptance non-interactively", [
    "Operator acceptance must be a deliberate human action — an autonomous agent must not self-accept.",
    'Run this in a terminal and confirm, or pass --yes to record a non-interactive acceptance (logged as method "--yes").',
  ]);
} else {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) =>
    rl.question(
      `\nAccept operator items [${items.join(", ")}] for ${prdId} as "${owner}"?\n` +
        `Reason: ${reason}\n` +
        `Type the PRD id to confirm: `,
      res,
    ),
  );
  rl.close();
  if (answer.trim().toUpperCase() !== prdId) {
    die("confirmation did not match the PRD id; aborted — nothing written");
  }
}

// --- upsert ----------------------------------------------------------------
const store = readAcceptances();
const entry = {
  prd: prdId,
  owner: owner.toLowerCase(),
  items,
  reason,
  date: new Date().toISOString().slice(0, 10),
  method,
};
store.schemaVersion = 1;
store.acceptances = store.acceptances.filter((a) => a.prd !== prdId);
store.acceptances.push(entry);
store.acceptances.sort((a, b) => a.prd.localeCompare(b.prd));

if (!existsSync(dirname(ACCEPT_PATH))) mkdirSync(dirname(ACCEPT_PATH), { recursive: true });
writeFileSync(ACCEPT_PATH, `${JSON.stringify(store, null, 2)}\n`);

ok(`recorded acceptance for ${prdId} (owner=${entry.owner}, items=${items.join(",")}, method=${method})`);
ok("  → _state/acceptances.json (commit it; verify:prd-state reads it as the waiver source)");
