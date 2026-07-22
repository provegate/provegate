#!/usr/bin/env node
/**
 * PRD-200 FR-5 / AC-4 — wire-or-delete as a permanent rule.
 *
 * Repo audit Theme 2: a `verify:*` gate that exists in package.json but
 * runs nowhere is a declared guarantee that isn't one — it rots silently
 * (4 of the 15 unwired gates had already gone red or lost their script
 * when PRD-200 finally ran them). This meta-check makes the invariant
 * permanent: every root `verify:*` script must be reachable from CI
 * (.github/workflows/*.yml), the pre-ship chain (scripts/ship-pre.mjs),
 * or the local workflow bundle (scripts/verify-workflow.mjs) — or carry a
 * justified entry in scripts/.gates-wired-exceptions.json.
 *
 * The exceptions file is shrink-only by convention: every entry names the
 * PRD/owner that will wire or delete the gate; stale entries (gate wired
 * meanwhile, or deleted) fail the check so the file cannot accumulate.
 *
 * PRD-392 FR-4 — also runs the INVERSE direction: every scripts/verify-*.mjs
 * file on disk must be the script behind a registered `verify:*` gate, invoked
 * directly in wiring text (a CI job may call `node scripts/verify-x.mjs` with no
 * alias), or carry an exception — otherwise it is a disk-orphan (wire-or-delete).
 * Exceptions accept two key forms: a gate alias (`verify:x`) OR a file path
 * (`scripts/verify-x.mjs`) for alias-less disk orphans; a file-path exception
 * goes stale (FAIL) once its file is deleted or becomes registered/wired.
 * `.spec.mjs` files are test fixtures, not gates, and are excluded from the
 * inventory.
 *
 * Usage: pnpm verify:gates-wired [--self-test]
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { REPO_ROOT, fail, ok } from "./prd-state-utils.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXCEPTIONS_PATH = resolve(__dirname, ".gates-wired-exceptions.json");

// Only text that actually EXECUTES counts as wiring (review-200 P2):
//   - YAML: `run:` step lines and `run: |` block bodies, from jobs that are
//     not disabled with `if: false`. A gate mentioned in a comment, a step
//     `name:`, or a dead job must not count.
//   - .mjs sources: everything except comment lines.
function yamlRunText(content) {
  const lines = content.split("\n");

  // Split into top-level job blocks (children of `jobs:`) so a job-level
  // `if: false` disables its whole block.
  const blocks = [];
  let current = [];
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^ {2}[\w-]+:\s*$/.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const out = [];
  for (const block of blocks) {
    if (block.some((line) => /^\s*if:\s*(\$\{\{\s*)?false\s*(\}\})?\s*$/.test(line))) continue;
    let runIndent = null;
    for (const line of block) {
      const runMatch = /^(\s*)(?:-\s*)?run:\s*(.*)$/.exec(line);
      if (runMatch) {
        const body = runMatch[2].trim();
        if (body && !/^[|>][+-]?$/.test(body)) out.push(body);
        runIndent = runMatch[1].length;
        continue;
      }
      if (runIndent !== null) {
        const indent = line.length - line.trimStart().length;
        if (line.trim() && indent > runIndent) {
          const trimmed = line.trimStart();
          if (!trimmed.startsWith("#")) out.push(trimmed);
        } else if (line.trim()) {
          runIndent = null;
        }
      }
    }
  }
  return out.join("\n");
}

function executableText(pathname) {
  const content = readFileSync(pathname, "utf8");
  if (pathname.endsWith(".yml") || pathname.endsWith(".yaml")) {
    return yamlRunText(content);
  }
  return content
    .split("\n")
    .filter((line) => {
      const trimmed = line.trimStart();
      return !trimmed.startsWith("#") && !trimmed.startsWith("//") && !trimmed.startsWith("*");
    })
    .join("\n");
}

// A gate counts as wired when its alias (`verify:x`) appears in executable
// wiring text, or when the underlying `scripts/*.mjs` file is invoked
// directly (CI jobs bypass dotenv-wrapping aliases — e.g.
// app-credentials-integrity in test-integration).
/**
 * @param {string} gate
 * @param {string} wiringText
 * @param {Record<string, string>} pkgScripts
 * @returns {boolean}
 */
function isWired(gate, wiringText, pkgScripts) {
  if (new RegExp(`${gate.replace(/[:]/g, "[:]")}(?![a-z-])`).test(wiringText)) return true;
  const scriptPath = pkgScripts[gate].match(/scripts\/[\w./-]+\.mjs/)?.[0];
  return scriptPath ? wiringText.includes(scriptPath) : false;
}

/** True when `scripts/<file>` is the script behind ANY registered package.json
 * script (a registered gate's `node scripts/<file>` target).
 * @param {string} file  basename, e.g. "verify-foo.mjs"
 * @param {Record<string, string>} pkgScripts
 * @returns {boolean} */
function isRegisteredScript(file, pkgScripts) {
  const needle = `scripts/${file}`;
  return Object.values(pkgScripts).some((cmd) => typeof cmd === "string" && cmd.includes(needle));
}

/** A file-path exception key (`scripts/verify-x.mjs`) vs a gate-alias key (`verify:x`). */
function isFilePathKey(key) {
  return key.startsWith("scripts/") && key.endsWith(".mjs");
}

/**
 * Pure gate-wiring auditor — returns the list of problem strings (empty = pass).
 * Both directions: forward (registered gate must be wired/excepted) and inverse
 * (disk verify-*.mjs must be registered/invoked/excepted), plus shrink-only
 * stale-exception policing for both key forms.
 * @param {{gates: string[], inventory: string[], wiringText: string, exceptions: Record<string, string>, pkgScripts: Record<string, string>}} input
 * @returns {string[]}
 */
export function computeProblems({ gates, inventory, wiringText, exceptions, pkgScripts }) {
  const problems = [];

  // Forward: every registered `verify:*` gate must be wired or excepted.
  const unwired = gates.filter((gate) => !isWired(gate, wiringText, pkgScripts));
  for (const gate of unwired) {
    if (!(gate in exceptions)) {
      problems.push(
        `${gate} runs nowhere (ci.yml / ship-pre / verify-workflow) — wire it into CI or delete the script (wire-or-delete, PRD-200 FR-5)`,
      );
    }
  }

  // Inverse (PRD-392 FR-4): every verify-*.mjs on disk must be registered,
  // invoked directly, or excepted.
  for (const file of inventory) {
    const rel = `scripts/${file}`;
    if (isRegisteredScript(file, pkgScripts)) continue; // behind a registered gate → forward rules apply
    if (wiringText.includes(rel)) continue; // invoked directly (e.g. `node scripts/verify-x.mjs` in CI)
    if (rel in exceptions) continue; // file-path exception (validated below)
    problems.push(
      `disk-orphan: ${rel} exists on disk but is behind no registered gate and wired nowhere — wire it (root script + chain/CI) or delete it (wire-or-delete, PRD-200 FR-5 / PRD-392 FR-4)`,
    );
  }

  // Shrink-only stale-exception policing for BOTH key forms.
  for (const [key, reason] of Object.entries(exceptions)) {
    if (isFilePathKey(key)) {
      const file = key.slice("scripts/".length);
      if (!inventory.includes(file)) {
        problems.push(`stale exception: ${key} no longer exists on disk — remove it from .gates-wired-exceptions.json`);
      } else if (isRegisteredScript(file, pkgScripts) || wiringText.includes(key)) {
        problems.push(`stale exception: ${key} is registered/wired now — remove it from .gates-wired-exceptions.json`);
      } else if (typeof reason !== "string" || reason.trim().length === 0) {
        problems.push(`exception ${key} has no justification — every entry needs a reason naming the owning PRD/decision`);
      }
    } else if (!gates.includes(key)) {
      problems.push(`stale exception: ${key} no longer exists in package.json — remove it from .gates-wired-exceptions.json`);
    } else if (!unwired.includes(key)) {
      problems.push(`stale exception: ${key} is wired now — remove it from .gates-wired-exceptions.json`);
    } else if (typeof reason !== "string" || reason.trim().length === 0) {
      problems.push(`exception ${key} has no justification — every entry needs a reason naming the owning PRD/decision`);
    }
  }

  return problems;
}

/** Gather the real repo inputs for computeProblems.
 * @returns {{gates: string[], inventory: string[], wiringText: string, exceptions: Record<string, string>, pkgScripts: Record<string, string>}} */
function realInputs() {
  const pkg = JSON.parse(readFileSync(resolve(REPO_ROOT, "package.json"), "utf8"));
  const pkgScripts = pkg.scripts;
  const gates = Object.keys(pkgScripts).filter((name) => name.startsWith("verify:"));

  const wiringSources = [
    ...readdirSync(resolve(REPO_ROOT, ".github/workflows"))
      .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
      .map((name) => resolve(REPO_ROOT, ".github/workflows", name)),
    resolve(REPO_ROOT, "scripts/ship-pre.mjs"),
    resolve(REPO_ROOT, "scripts/verify-workflow.mjs"),
  ];
  const wiringText = wiringSources.filter(existsSync).map(executableText).join("\n");

  const exceptions = existsSync(EXCEPTIONS_PATH) ? JSON.parse(readFileSync(EXCEPTIONS_PATH, "utf8")) : {};

  // verify-*.mjs disk inventory; `.spec.mjs` are test fixtures, not gates.
  const inventory = readdirSync(resolve(REPO_ROOT, "scripts")).filter(
    (name) => name.startsWith("verify-") && name.endsWith(".mjs") && !name.endsWith(".spec.mjs"),
  );

  return { gates, inventory, wiringText, exceptions, pkgScripts };
}

function main() {
  const input = realInputs();
  const problems = computeProblems(input);
  if (problems.length > 0) {
    fail("[verify:gates-wired] declared-but-unwired gate(s):", problems);
  }
  ok(
    `[verify:gates-wired] ok - ${input.gates.length} gate(s) wired (${Object.keys(input.exceptions).length} documented exception(s))`,
  );
}

/** In-memory negative fixtures (no disk) covering §11 FR-4: an unregistered disk
 * script FAILs; a registered/wired script and a valid file-path exception pass;
 * a stale file-path exception FAILs. Exits 1 on any failed assertion. */
function runSelfTest() {
  const base = {
    gates: ["verify:kept"],
    pkgScripts: { "verify:kept": "node scripts/verify-kept.mjs" },
    wiringText: "pnpm verify:kept\n",
    exceptions: {},
  };
  const cases = [
    [
      "(a) unregistered disk script is a disk-orphan (FAIL)",
      computeProblems({ ...base, inventory: ["verify-kept.mjs", "verify-orphan-fixture.mjs"] }).some((p) =>
        p.includes("disk-orphan: scripts/verify-orphan-fixture.mjs"),
      ),
    ],
    [
      "(b) registered + wired script is clean",
      computeProblems({ ...base, inventory: ["verify-kept.mjs"] }).length === 0,
    ],
    [
      "(c) file-path-keyed exception clears an alias-less orphan",
      computeProblems({
        ...base,
        inventory: ["verify-kept.mjs", "verify-orphan-fixture.mjs"],
        exceptions: { "scripts/verify-orphan-fixture.mjs": "PRD-392 self-test fixture — justified" },
      }).length === 0,
    ],
    [
      "(d) stale file-path exception (file gone) FAILs",
      computeProblems({
        ...base,
        inventory: ["verify-kept.mjs"],
        exceptions: { "scripts/verify-orphan-fixture.mjs": "justified but the file no longer exists" },
      }).some((p) => p.includes("stale exception: scripts/verify-orphan-fixture.mjs no longer exists on disk")),
    ],
    [
      "(e) file-path exception goes stale once its file is registered",
      computeProblems({
        ...base,
        inventory: ["verify-kept.mjs", "verify-orphan-fixture.mjs"],
        pkgScripts: {
          "verify:kept": "node scripts/verify-kept.mjs",
          "verify:orphan": "node scripts/verify-orphan-fixture.mjs",
        },
        gates: ["verify:kept", "verify:orphan"],
        wiringText: "pnpm verify:kept\npnpm verify:orphan\n",
        exceptions: { "scripts/verify-orphan-fixture.mjs": "now registered, so this must go stale" },
      }).some((p) => p.includes("stale exception: scripts/verify-orphan-fixture.mjs is registered/wired now")),
    ],
  ];

  for (const [label, pass] of cases) ok(`  ${pass ? "PASS" : "FAIL"}  ${label}`);
  const failed = cases.filter(([, pass]) => !pass);
  if (failed.length > 0) fail(`[verify:gates-wired] --self-test: ${failed.length}/${cases.length} case(s) failed`);
  ok(`[verify:gates-wired] --self-test ok - ${cases.length} case(s) passed`);
}

if (process.argv[1]?.endsWith("verify-gates-wired.mjs")) {
  if (process.argv.includes("--self-test")) runSelfTest();
  else main();
}
