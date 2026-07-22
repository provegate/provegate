#!/usr/bin/env node
// Agent lock files live on the MAIN checkout (_state/locks/) so worktree cleanup
// does not orphan active claims or hide them from verify:agent-locks on development.
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO_ROOT, mainRepoRoot } from "./prd-state-utils.mjs";

export function locksDir() {
  return resolve(mainRepoRoot(), "_state/locks");
}

export function localLocksDir() {
  return resolve(REPO_ROOT, "_state/locks");
}

export function ensureLocksDir(dir = locksDir()) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Move worktree-local lock JSON files into the main checkout (by filename). */
export function migrateWorktreeLocks() {
  const central = locksDir();
  const local = localLocksDir();
  if (local === central || !existsSync(local)) return 0;
  ensureLocksDir(central);
  let moved = 0;
  for (const name of readdirSync(local).filter((n) => n.endsWith(".json"))) {
    const src = resolve(local, name);
    const dst = resolve(central, name);
    if (existsSync(dst)) {
      try {
        unlinkSync(src);
      } catch {
        /* ignore */
      }
      continue;
    }
    try {
      renameSync(src, dst);
      moved += 1;
    } catch {
      const body = readFileSync(src, "utf8");
      writeFileSync(dst, body);
      try {
        unlinkSync(src);
      } catch {
        /* ignore */
      }
      moved += 1;
    }
  }
  return moved;
}

export function lockPathFor(prdId, slug) {
  return resolve(locksDir(), `${prdId.toLowerCase()}-${slug}.json`);
}

export function listLockFiles() {
  migrateWorktreeLocks();
  const dir = locksDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => {
      const path = resolve(dir, name);
      try {
        return { path, name, data: JSON.parse(readFileSync(path, "utf8")) };
      } catch (error) {
        return { path, name, error: error.message };
      }
    });
}

const isCli = process.argv[1]?.endsWith("prd-locks.mjs");
if (isCli) {
  const cmd = process.argv[2];
  if (cmd === "sync") {
    const moved = migrateWorktreeLocks();
    process.stdout.write(`[prd:locks] synced ${moved} lock file(s) → ${locksDir()}\n`);
    process.exit(0);
  }
  if (cmd === "list") {
    const locks = listLockFiles();
    if (locks.length === 0) {
      process.stdout.write("[prd:locks] (no locks)\n");
      process.exit(0);
    }
    for (const lock of locks) {
      const prd = lock.data?.prd ?? "?";
      const agent = lock.data?.agent ?? "?";
      process.stdout.write(`[prd:locks] ${prd} agent=${agent} path=${lock.path}\n`);
    }
    process.exit(0);
  }
  process.stderr.write("[prd:locks] usage: pnpm prd:locks sync | list\n");
  process.exit(1);
}
