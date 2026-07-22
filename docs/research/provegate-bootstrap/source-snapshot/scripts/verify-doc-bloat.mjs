#!/usr/bin/env node
/**
 * Prevents agent-facing markdown from growing unbounded (token + review cost).
 * Limits are intentionally pragmatic: strict on coordination files, looser on wiki/registry.
 */
import { existsSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { REPO_ROOT, fail, ok, readText } from "./prd-state-utils.mjs";

/** @param {string} content */
function maxLineStats(content) {
  let max = 0;
  let maxNo = 0;
  let n = 0;
  for (const line of content.split(/\r?\n/)) {
    n += 1;
    if (line.length > max) {
      max = line.length;
      maxNo = n;
    }
  }
  return { max, maxNo };
}

/**
 * @param {string} relPath
 * @param {{ maxKB: number; maxLineChars: number }} limits
 */
function checkFile(relPath, limits) {
  const abs = resolve(REPO_ROOT, relPath);
  if (!existsSync(abs)) {
    return [`${relPath}: file missing`];
  }
  const content = readText(abs);
  const kb = Buffer.byteLength(content, "utf8") / 1024;
  const issues = [];
  if (kb > limits.maxKB) {
    issues.push(`${relPath}: ${kb.toFixed(1)}KB exceeds ${limits.maxKB}KB`);
  }
  const { max, maxNo } = maxLineStats(content);
  if (max > limits.maxLineChars) {
    issues.push(`${relPath}: line ${maxNo} has ${max} chars (max ${limits.maxLineChars})`);
  }
  return issues;
}

/**
 * @param {string} dirAbs
 * @param {(name: string) => boolean} fileFilter
 * @param {string[]} out
 */
function walkFiles(dirAbs, fileFilter, out = []) {
  if (!existsSync(dirAbs)) return out;
  for (const ent of readdirSync(dirAbs, { withFileTypes: true })) {
    const p = join(dirAbs, ent.name);
    if (ent.isDirectory()) {
      walkFiles(p, fileFilter, out);
    } else if (fileFilter(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

const strictFiles = [
  ["_STATUS.md", { maxKB: 12, maxLineChars: 200 }],
  ["docs/ai-context/wiki/current-state.md", { maxKB: 12, maxLineChars: 200 }],
  ["docs/ai-context/MEMORY.md", { maxKB: 10, maxLineChars: 220 }],
  ["CLAUDE.md", { maxKB: 4, maxLineChars: 200 }],
  ["AGENTS.md", { maxKB: 4, maxLineChars: 200 }],
  ["COMPONENT_REGISTRY.md", { maxKB: 2, maxLineChars: 200 }],
];

/** Loose caps for large reference wikis (e.g. component-registry). */
const wikiOtherMax = { maxKB: 120, maxLineChars: 1200 };

const serenaLimits = { maxKB: 12, maxLineChars: 500 };
const mdcLimits = { maxKB: 40, maxLineChars: 900 };

const issues = [];

for (const [rel, limits] of strictFiles) {
  issues.push(...checkFile(rel, limits));
}

const wikiRoot = resolve(REPO_ROOT, "docs/ai-context/wiki");
for (const abs of walkFiles(wikiRoot, (n) => n.endsWith(".md"))) {
  const rel = relative(REPO_ROOT, abs).replaceAll("\\", "/");
  if (rel === "docs/ai-context/wiki/current-state.md") continue;
  issues.push(...checkFile(rel, wikiOtherMax));
}

const serenaRoot = resolve(REPO_ROOT, ".serena/memories");
for (const abs of walkFiles(serenaRoot, (n) => n.endsWith(".md"))) {
  const rel = relative(REPO_ROOT, abs).replaceAll("\\", "/");
  issues.push(...checkFile(rel, serenaLimits));
}

const rulesRoot = resolve(REPO_ROOT, ".cursor/rules");
for (const abs of walkFiles(rulesRoot, (n) => n.endsWith(".mdc"))) {
  const rel = relative(REPO_ROOT, abs).replaceAll("\\", "/");
  issues.push(...checkFile(rel, mdcLimits));
}

if (issues.length > 0) {
  fail("[verify:doc-bloat] documentation size / line-length violations", issues);
}

ok("[verify:doc-bloat] ok — agent-facing docs within limits");
