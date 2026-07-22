#!/usr/bin/env node
/**
 * Deferral discipline gate (runs inside `pnpm verify:workflow` / `ship:pre`,
 * and in CI via the workflow-state job).
 *
 * Every row in _STATUS.md "Bekleyen follow-ups" and "Deferred" must carry an
 * owner (Sahip), an expiry date (Vade, YYYY-MM-DD), and a renewal counter
 * (Yenileme, starts at 0). Overdue rows fail the gate: renew the date with a
 * justification in Not and increment Yenileme, or convert the item to a PRD
 * and remove the row. A row may be renewed once — Yenileme > 1 fails the gate
 * (second renewal must become a PRD). The combined open-row cap forces triage
 * before new deferrals are added; at 80% of the cap a warning is printed.
 */
import { resolve } from "node:path";
import { REPO_ROOT, fail, ok, readText } from "./prd-state-utils.mjs";

export const STATUS_PATH = resolve(REPO_ROOT, "_STATUS.md");
export const SECTIONS = ["Bekleyen follow-ups", "Deferred"];
const MAX_OPEN_ROWS = 15;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function sectionBody(content, heading) {
  const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
  const match = pattern.exec(content);
  if (!match) return null;
  const rest = content.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

function parseTable(body) {
  const lines = body.split("\n").filter((line) => line.trim().startsWith("|"));
  if (lines.length < 2) return { headers: [], rows: [] };
  const cells = (line) =>
    line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
  const headers = cells(lines[0]).map((cell) => cell.toLowerCase());
  const rows = lines
    .slice(1)
    .filter((line) => !/^\|\s*:?-+/.test(line))
    .map(cells)
    .filter((row) => row.some((cell) => cell.length > 0));
  return { headers, rows };
}

/**
 * Structured view of both deferral sections — shared so prd:defer-oldest uses ONE
 * parser (PRD-312 FR-4). Each row: { section, label, prd, owner, due, renew, note }.
 * `missingColumns` lists sections whose table lacks Sahip/Vade/Yenileme.
 */
export function parseDeferrals(content) {
  const rows = [];
  const missingSections = [];
  const missingColumns = [];
  for (const heading of SECTIONS) {
    const body = sectionBody(content, heading);
    if (body === null) {
      missingSections.push(heading);
      continue;
    }
    const { headers, rows: rawRows } = parseTable(body);
    const ownerIdx = headers.indexOf("sahip");
    const dueIdx = headers.indexOf("vade");
    const renewIdx = headers.indexOf("yenileme");
    const prdIdx = headers.indexOf("prd");
    const noteIdx = headers.indexOf("not");
    if (ownerIdx === -1 || dueIdx === -1 || renewIdx === -1) {
      missingColumns.push({ heading, headers });
      continue;
    }
    for (const row of rawRows) {
      rows.push({
        section: heading,
        label: row[0] || "(unnamed row)",
        prd: prdIdx === -1 ? null : row[prdIdx] ?? null,
        owner: row[ownerIdx] ?? "",
        due: row[dueIdx] ?? "",
        renew: row[renewIdx] ?? "",
        note: noteIdx === -1 ? null : row[noteIdx] ?? null,
      });
    }
  }
  return { rows, missingSections, missingColumns };
}

/** The relief candidate: earliest Vade, tie-broken by lowest PRD number. */
export function reliefCandidate(rows) {
  const dated = rows.filter((row) => DATE_PATTERN.test(row.due));
  if (dated.length === 0) return null;
  const prdNum = (row) => Number.parseInt((row.prd ?? "").replace(/\D/g, ""), 10) || Infinity;
  return [...dated].sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : prdNum(a) - prdNum(b)))[0];
}

function main() {
  const content = readText(STATUS_PATH);
  const today = new Date().toISOString().slice(0, 10);
  const issues = [];
  const { rows, missingSections, missingColumns } = parseDeferrals(content);
  for (const heading of missingSections) issues.push(`section "## ${heading}" not found in _STATUS.md`);
  for (const { heading, headers } of missingColumns) {
    issues.push(`"${heading}" table must have Sahip, Vade and Yenileme columns (got: ${headers.join(", ") || "no table"})`);
  }

  for (const row of rows) {
    const label = row.label;
    if (!row.owner) issues.push(`"${row.section}" → ${label}: missing Sahip`);
    if (!/^\d+$/.test(row.renew)) {
      issues.push(`"${row.section}" → ${label}: Yenileme must be a non-negative integer (got "${row.renew}")`);
    } else if (Number.parseInt(row.renew, 10) > 1) {
      issues.push(`"${row.section}" → ${label}: renewed ${row.renew} times — a row may be renewed once; convert it to a PRD and delete the row`);
    }
    if (!DATE_PATTERN.test(row.due)) {
      issues.push(`"${row.section}" → ${label}: Vade must be YYYY-MM-DD (got "${row.due}")`);
      continue;
    }
    if (row.due < today) {
      issues.push(`"${row.section}" → ${label}: OVERDUE since ${row.due} — renew with justification (increment Yenileme) or convert to a PRD`);
    }
  }

  // Name the SAME relief candidate prd:defer-oldest would convert (earliest Vade,
  // tie-broken by lowest PRD number) so the two commands never disagree.
  const candidate = reliefCandidate(rows);
  const totalRows = rows.length;
  if (totalRows > MAX_OPEN_ROWS) {
    issues.push(`open deferral cap exceeded: ${totalRows} rows > ${MAX_OPEN_ROWS} — triage before adding more`);
  }

  if (issues.length > 0) {
    fail("[verify:deferred] deferral discipline violations", issues);
  }

  if (totalRows >= Math.ceil(MAX_OPEN_ROWS * 0.8)) {
    const who = candidate ? `${candidate.prd ?? "?"} (${candidate.due})` : "the oldest row";
    process.stdout.write(
      `[verify:deferred] WARNING: ${totalRows}/${MAX_OPEN_ROWS} open rows — at the cap no new deferral can be added; convert ${who} to a PRD (\`pnpm prd:defer-oldest\`) before it blocks a Phase 4\n`,
    );
  }

  ok(
    `[verify:deferred] ok - ${totalRows}/${MAX_OPEN_ROWS} open deferral(s), nearest vade ${candidate?.due ?? "n/a"}${candidate?.prd ? ` (${candidate.prd})` : ""}`,
  );
}

if (process.argv[1]?.endsWith("verify-deferred.mjs")) main();
