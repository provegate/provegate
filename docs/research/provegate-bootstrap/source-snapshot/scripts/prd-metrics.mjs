#!/usr/bin/env node
// Append gate-run metrics for workflow tuning (PRD-249).
// Stored on the MAIN checkout (_state/prd-metrics.jsonl) so worktree cleanup does not erase telemetry.
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { REPO_ROOT, fail, mainRepoRoot, ok } from "./prd-state-utils.mjs";

const LOCAL_METRICS_PATH = resolve(REPO_ROOT, "_state/prd-metrics.jsonl");

export function metricsPath() {
  return resolve(mainRepoRoot(), "_state/prd-metrics.jsonl");
}

function ensureMetricsDir(pathname = metricsPath()) {
  const dir = dirname(pathname);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Move worktree-local metrics into the main checkout file (idempotent). */
export function migrateWorktreeMetrics() {
  const central = metricsPath();
  const local = LOCAL_METRICS_PATH;
  if (local === central || !existsSync(local)) return 0;
  const content = readFileSync(local, "utf8").trim();
  if (!content) {
    try {
      unlinkSync(local);
    } catch {
      /* ignore */
    }
    return 0;
  }
  ensureMetricsDir(central);
  const prefix = existsSync(central) && readFileSync(central, "utf8").trim().length > 0 ? "\n" : "";
  appendFileSync(central, `${prefix}${content}\n`);
  try {
    unlinkSync(local);
  } catch {
    /* ignore */
  }
  return content.split("\n").filter(Boolean).length;
}

export function recordPrdMetric({ prd, phase, gate, result, durationMs = 0, why = null }) {
  migrateWorktreeMetrics();
  const path = metricsPath();
  ensureMetricsDir(path);
  const entry = {
    ts: new Date().toISOString(),
    prd: prd.toUpperCase(),
    phase,
    gate,
    result,
    durationMs,
    why,
  };
  appendFileSync(path, `${JSON.stringify(entry)}\n`);
}

const isCli = process.argv[1]?.endsWith("prd-metrics.mjs");
if (isCli) {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "record") {
    const prd = args.find((a) => /^PRD-\d{3}$/i.test(a));
    const phase = args.find((a) => a.startsWith("--phase="))?.slice("--phase=".length);
    const gate = args.find((a) => a.startsWith("--gate="))?.slice("--gate=".length);
    const result = args.find((a) => a.startsWith("--result="))?.slice("--result=".length);
    const durationMs = Number.parseInt(
      args.find((a) => a.startsWith("--duration-ms="))?.slice("--duration-ms=".length) ?? "0",
      10,
    );
    const why = args.find((a) => a.startsWith("--why="))?.slice("--why=".length) ?? null;
    if (!prd || !phase || !gate || !result) {
      fail(
        "[prd:metrics] usage: pnpm prd:metrics record PRD-XXX --phase=4 --gate=lint --result=passed [--duration-ms=1200] [--why=...]",
      );
    }
    recordPrdMetric({ prd, phase, gate, result, durationMs, why });
    ok(`[prd:metrics] recorded ${prd.toUpperCase()} phase ${phase} ${gate} → ${result}`);
    process.exit(0);
  }

  if (cmd === "sync") {
    const moved = migrateWorktreeMetrics();
    ok(`[prd:metrics] synced ${moved} line(s) → ${metricsPath()}`);
    process.exit(0);
  }

  if (cmd === "tail") {
    migrateWorktreeMetrics();
    const n = Number.parseInt(args.find((a) => a.startsWith("--n="))?.slice("--n=".length) ?? "20", 10);
    const prdFilter = args.find((a) => /^PRD-\d{3}$/i.test(a))?.toUpperCase();
    const path = metricsPath();
    if (!existsSync(path)) {
      ok("[prd:metrics] (empty)");
      process.exit(0);
    }
    let lines = readFileSync(path, "utf8")
      .trim()
      .split("\n")
      .filter(Boolean);
    if (prdFilter) {
      lines = lines.filter((line) => {
        try {
          return JSON.parse(line).prd === prdFilter;
        } catch {
          return false;
        }
      });
    }
    for (const line of lines.slice(-n)) process.stdout.write(`${line}\n`);
    process.exit(0);
  }

  fail("[prd:metrics] usage: pnpm prd:metrics record|sync|tail ...");
}
