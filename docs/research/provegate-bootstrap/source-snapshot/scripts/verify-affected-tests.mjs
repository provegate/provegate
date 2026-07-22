#!/usr/bin/env node
// Run turbo test for packages touched in the current branch diff (PRD-249).
import { execFileSync } from "node:child_process";
import {
  affectedPackagesFromFiles,
  collectDiffFiles,
  filesForAffectedTests,
  packageHasTestScript,
  parsePrdClass,
} from "./prd-class-gates.mjs";
import { REPO_ROOT, fail, ok, readCurrentState, readText } from "./prd-state-utils.mjs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const maxRetries = Number.parseInt(args.find((a) => a.startsWith("--retry="))?.slice("--retry=".length) ?? "2", 10);
const baseRef = args.find((a) => a.startsWith("--base="))?.slice("--base=".length) ?? "development";
const prdArg = args.find((a) => /^PRD-\d{3}$/i.test(a));
const classArg = args.find((a) => a.startsWith("--class="))?.slice("--class=".length);

let prdClass = classArg ?? "feature";
if (!classArg && prdArg) {
  try {
    execFileSync("pnpm state:sync", { cwd: REPO_ROOT, stdio: "ignore" });
  } catch {
    /* on-disk state ok */
  }
  const state = readCurrentState();
  const record = state?.records?.find((r) => r.number === Number.parseInt(prdArg.slice(4), 10));
  if (record?.artifacts?.prd) {
    prdClass = parsePrdClass(readText(resolve(REPO_ROOT, record.artifacts.prd)));
  }
}

const files = filesForAffectedTests(prdClass, collectDiffFiles(baseRef));
const packages = affectedPackagesFromFiles(files).filter(packageHasTestScript);

if (packages.length === 0) {
  ok("[verify:affected-tests] no testable packages in diff — skip");
  process.exit(0);
}

const filters = packages.flatMap((pkg) => ["--filter", pkg]);
const cmd = ["test", ...filters];
ok(`[verify:affected-tests] packages: ${packages.join(", ")} (retry=${maxRetries})`);

let attempt = 0;
while (attempt <= maxRetries) {
  try {
    execFileSync("pnpm", cmd, { cwd: REPO_ROOT, stdio: "inherit" });
    ok(`[verify:affected-tests] passed (${packages.length} package(s))`);
    process.exit(0);
  } catch {
    attempt += 1;
    if (attempt > maxRetries) {
      fail(`[verify:affected-tests] failed after ${maxRetries + 1} attempt(s)`);
    }
    process.stderr.write(`[verify:affected-tests] retry ${attempt}/${maxRetries}...\n`);
  }
}
