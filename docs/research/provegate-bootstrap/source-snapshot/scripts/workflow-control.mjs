#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = resolve(dirname(__filename), "..");

const WORKFLOW_PROFILES = {
  costly: [
    "deploy.yml",
    "audit-partition-lifecycle.yml",
    "cli-release.yml",
    "chromatic-storybook.yml",
    "ghcr-prune.yml",
    "workflow-run-cleanup.yml",
  ],
  ci: ["ci.yml", "a11y.yml", "workflow-lint.yml"],
  all: [
    "ci.yml",
    "a11y.yml",
    "workflow-lint.yml",
    "deploy.yml",
    "audit-partition-lifecycle.yml",
    "cli-release.yml",
    "chromatic-storybook.yml",
    "ghcr-prune.yml",
    "workflow-run-cleanup.yml",
  ],
};

function printUsage() {
  process.stdout.write(`Usage:
  pnpm workflow:pause [-- --profile costly|ci|all] [--dry-run]
  pnpm workflow:resume [-- --profile costly|ci|all] [--dry-run]
  pnpm workflow:status

Defaults:
  profile = costly

Examples:
  pnpm workflow:pause -- --dry-run
  pnpm workflow:pause
  pnpm workflow:resume
  pnpm workflow:pause -- --profile all
`);
}

function parseArgs(argv) {
  const result = {
    command: argv[0] ?? "",
    profile: "costly",
    dryRun: false,
    help: false,
  };

  for (let i = 1; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--") {
      continue;
    }
    if (token === "--help" || token === "-h") {
      result.help = true;
      continue;
    }
    if (token === "--dry-run") {
      result.dryRun = true;
      continue;
    }
    if (token === "--profile") {
      const profile = argv[i + 1];
      if (!profile) {
        fail("Missing value for --profile.");
      }
      result.profile = profile;
      i += 1;
      continue;
    }
    fail(`Unknown argument: ${token}`);
  }

  return result;
}

function fail(message) {
  process.stderr.write(`[workflow-control] ${message}\n`);
  process.exit(1);
}

function runGh(args, { dryRun = false } = {}) {
  const printable = `gh ${args.join(" ")}`;
  if (dryRun) {
    process.stdout.write(`[dry-run] ${printable}\n`);
    return;
  }

  const result = spawnSync("gh", args, {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });

  if (result.error) {
    fail(`Could not run gh CLI: ${result.error.message}`);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function workflowsForProfile(profile) {
  const workflows = WORKFLOW_PROFILES[profile];
  if (!workflows) {
    fail(
      `Unknown profile "${profile}". Use one of: ${Object.keys(WORKFLOW_PROFILES).join(", ")}.`,
    );
  }
  return workflows;
}

function updateWorkflows(command, profile, dryRun) {
  const workflows = workflowsForProfile(profile);
  const ghCommand = command === "pause" ? "disable" : "enable";

  process.stdout.write(`[workflow-control] ${command} profile=${profile}\n`);
  for (const workflow of workflows) {
    runGh(["workflow", ghCommand, workflow], { dryRun });
  }

  if (command === "pause" && profile !== "all") {
    process.stdout.write(
      "\n[workflow-control] CI-class workflows remain enabled. Use --profile all only when branch protection can tolerate it.\n",
    );
  }
}

function showStatus() {
  runGh(["workflow", "list", "--all"]);
}

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.command) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

if (args.command === "status") {
  showStatus();
} else if (args.command === "pause" || args.command === "resume") {
  updateWorkflows(args.command, args.profile, args.dryRun);
} else {
  fail(`Unknown command: ${args.command}`);
}
