// PRD-class default gate commands merged into prd-autorun (PRD-249).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT } from "./prd-state-utils.mjs";

const PRD_CLASSES = new Set(["feature", "test-hardening", "hotfix", "infra"]);

const UI_APP_PREFIXES = ["apps/consumer/", "apps/admin/", "apps/account/", "apps/native/"];

export function parsePrdClass(content) {
  const match = /^>\s*\*\*PRD Class\*\*\s*:\s*([^\s|`(]+)/im.exec(content);
  if (!match) return "feature";
  const raw = match[1].toLowerCase().trim();
  return PRD_CLASSES.has(raw) ? raw : "feature";
}

function packageNameForApp(slug) {
  const pkgPath = resolve(REPO_ROOT, "apps", slug, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const data = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (typeof data.name === "string" && data.name.trim().length > 0) {
        return data.name;
      }
    } catch {
      // fall through
    }
  }
  return `@emofy/${slug}`;
}

function packageNameForPackage(slug) {
  const pkgPath = resolve(REPO_ROOT, "packages", slug, "package.json");
  if (existsSync(pkgPath)) {
    try {
      const data = JSON.parse(readFileSync(pkgPath, "utf8"));
      if (typeof data.name === "string" && data.name.trim().length > 0) {
        return data.name;
      }
    } catch {
      // fall through
    }
  }
  return `@emofy/${slug}`;
}

function pathToPackage(file) {
  const app = file.match(/^apps\/([^/]+)\//);
  if (app) return packageNameForApp(app[1]);
  const pkg = file.match(/^packages\/([^/]+)\//);
  if (pkg) return packageNameForPackage(pkg[1]);
  const ema = file.match(/^emas\/([^/]+)\//);
  if (ema) return `@ema/${ema[1]}`;
  return null;
}

function packageJsonForName(pkgName) {
  if (pkgName.startsWith("@emofy/")) {
    const slug = pkgName.slice("@emofy/".length);
    const appPath = resolve(REPO_ROOT, "apps", slug, "package.json");
    if (existsSync(appPath)) return appPath;
    return resolve(REPO_ROOT, "packages", slug, "package.json");
  }
  if (pkgName.startsWith("@ema/")) {
    return resolve(REPO_ROOT, "emas", pkgName.slice("@ema/".length), "package.json");
  }
  const appPath = resolve(REPO_ROOT, "apps", pkgName, "package.json");
  if (existsSync(appPath)) return appPath;
  return resolve(REPO_ROOT, "packages", pkgName, "package.json");
}

export function packageHasTestScript(pkgName) {
  const pkgPath = packageJsonForName(pkgName);
  if (!pkgPath || !existsSync(pkgPath)) return false;
  try {
    const data = JSON.parse(readFileSync(pkgPath, "utf8"));
    return typeof data.scripts?.test === "string" && data.scripts.test.trim().length > 0;
  } catch {
    return false;
  }
}

export function collectDiffFiles(baseRef = "development") {
  const refs = [`origin/${baseRef}`, baseRef];
  for (const ref of refs) {
    try {
      const mergeBase = execFileSync("git", ["merge-base", "HEAD", ref], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      }).trim();
      const output = execFileSync("git", ["diff", "--name-only", `${mergeBase}...HEAD`], {
        cwd: REPO_ROOT,
        encoding: "utf8",
      });
      return output
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    } catch {
      // try next ref
    }
  }
  try {
    const output = execFileSync("git", ["diff", "--name-only", "HEAD"], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    return output
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

const INFRA_AFFECTED_PREFIXES = ["scripts/", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml"];

/**
 * For infra PRDs, only script/root tooling paths drive affected-package tests.
 * Collateral app fixes (e.g. gate unblock) must not pull in unrelated test suites.
 */
export function filesForAffectedTests(prdClass, changedFiles) {
  if (prdClass !== "infra") return changedFiles;
  return changedFiles.filter((file) =>
    INFRA_AFFECTED_PREFIXES.some((prefix) => file === prefix || file.startsWith(prefix)),
  );
}

export function affectedPackagesFromFiles(files) {
  const pkgs = new Set();
  for (const file of files) {
    const pkg = pathToPackage(file);
    if (pkg) pkgs.add(pkg);
  }
  return [...pkgs].sort();
}

function touchesUiApps(files) {
  return files.some((f) => UI_APP_PREFIXES.some((p) => f.startsWith(p)));
}

function touchesWorkflowScripts(files) {
  return files.some(
    (f) =>
      f.startsWith("scripts/") ||
      f.startsWith("docs/ai-context/WORKFLOW.md") ||
      f.startsWith("docs/ai-context/prompts/"),
  );
}

/**
 * Class-conditional default gates (deduped). Always includes verify:affected-tests
 * when invoked from autorun separately; this returns *extra* class gates only.
 */
export function getClassDefaultGates(prdClass, changedFiles) {
  const gates = [];
  if (prdClass === "infra" || touchesWorkflowScripts(changedFiles)) {
    gates.push("pnpm verify:gates-wired");
  }
  // PRD-369 — boundary invariants run at Phase 4 for every code-shaped class (closes the
  // "domain-boundaries yalnız Phase-7'de patlar" gotcha; all three are seconds-class scans).
  if (prdClass === "infra" || prdClass === "feature" || prdClass === "hotfix") {
    gates.push("pnpm verify:domain-boundaries");
    gates.push("pnpm verify:package-cycles");
    gates.push("pnpm verify:boundaries-tags");
  }
  if ((prdClass === "feature" || prdClass === "hotfix") && touchesUiApps(changedFiles)) {
    gates.push("pnpm verify:rds-imports");
  }
  if (prdClass === "feature" && changedFiles.some((f) => f.startsWith("apps/backend/"))) {
    gates.push("pnpm verify:permission-guard-coverage");
  }
  return [...new Set(gates)];
}

export function mergeGateCommands(base, extra) {
  const seen = new Set();
  const out = [];
  for (const cmd of [...base, ...extra]) {
    if (seen.has(cmd)) continue;
    seen.add(cmd);
    out.push(cmd);
  }
  return out;
}
