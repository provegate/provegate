#!/usr/bin/env node
// PRD-248 Phase 7 (Learning) gate. Parses a PRD's `## Durable Artifacts`
// section and fails if any declared (non-`none`) path is absent from the change
// set vs base. This is the mechanical enforcement that wiki/ADR/pattern updates
// actually land in the same change as the code, instead of drifting away as the
// historically most-skipped Phase-4 sub-step.
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, fail, getChangedFiles, ok, readText, toRepoPath } from "./prd-state-utils.mjs";

// Committed changes on the current branch vs its base. getChangedFiles only sees
// working-tree + staged (+ GITHUB_BASE_REF in CI); locally on a feat branch the
// durable-artifact edits are usually already committed, so without this the gate
// would vacuously pass/fail. Base is overridable for non-development flows.
function baseDiffFiles() {
  const base = process.env.PRD_AUTORUN_BASE || "development";
  try {
    const mergeBase = execSync(`git merge-base ${base} HEAD`, { cwd: REPO_ROOT, encoding: "utf8" }).trim();
    return execSync(`git diff --name-only ${mergeBase} HEAD`, { cwd: REPO_ROOT, encoding: "utf8" })
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function changedFilesWithBase() {
  return new Set([...getChangedFiles(), ...baseDiffFiles()]);
}

function section(content, heading) {
  const match = new RegExp(`^##\\s+${heading}\\s*$`, "im").exec(content);
  if (!match) return "";
  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function collectPrdFiles(args) {
  if (args.includes("--changed")) {
    return [...changedFilesWithBase()].filter((file) => /^_prds\/(wip|completed)\/prd-\d{3}-.+\.md$/.test(file));
  }
  return args.filter((arg) => arg.endsWith(".md"));
}

// A declared artifact is a backticked path with a slash on a bullet line that is
// not marked `none`. Template placeholders (containing `{` `}` or `*`) are
// ignored so linting the bare _TEMPLATE.md never trips the gate.
function declaredArtifacts(content) {
  const durable = section(content, "Durable Artifacts");
  const paths = [];
  for (const line of durable.split("\n")) {
    if (!/^\s*-\s+\S/.test(line)) continue;
    if (/\bnone\b/i.test(line) && !line.includes("`")) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const value = match[1].trim();
      if (!value.includes("/")) continue;
      if (/[{}*]/.test(value)) continue;
      if (/\bnone\b/i.test(value)) continue;
      paths.push(value);
    }
  }
  return [...new Set(paths)];
}

const files = collectPrdFiles(process.argv.slice(2));
if (files.length === 0) {
  ok("[verify:durable-artifacts] ok - no PRD files selected");
  process.exit(0);
}

const changed = changedFilesWithBase();
const issues = [];
for (const file of files) {
  const full = resolve(REPO_ROOT, file);
  if (!existsSync(full)) {
    issues.push(`${file}: file not found`);
    continue;
  }
  const content = readText(full);
  const artifacts = declaredArtifacts(content);
  for (const artifact of artifacts) {
    // Declared artifacts are full repo-relative paths (template convention), so an
    // exact match is correct. Allow a changed file to end with `/<declared>` for the
    // rare partial declaration, but drop the reverse direction that let an unrelated
    // file (`other/wiki/scripts.md`) satisfy a declared `wiki/scripts.md` (review finding).
    const touched = changed.has(artifact) || [...changed].some((c) => c.endsWith(`/${artifact}`));
    if (!touched) {
      issues.push(
        `${toRepoPath(full)}: declared Durable Artifact \`${artifact}\` is not in the change set — update it in this PRD's merge, or change the line to \`none\``,
      );
    }
  }
}

if (issues.length > 0) {
  fail("[verify:durable-artifacts] declared durable artifacts not touched", issues);
}

ok(`[verify:durable-artifacts] ok - ${files.length} PRD file(s) checked`);
