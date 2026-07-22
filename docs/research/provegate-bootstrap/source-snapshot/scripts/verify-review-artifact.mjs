#!/usr/bin/env node
import { fail, ok } from "./prd-state-utils.mjs";
import { validateReviewArtifactFile } from "./review-artifact-utils.mjs";

const args = process.argv.slice(2);
const pathArg = args.find((a) => !a.startsWith("--"));
const prdArg = args.find((a) => /^PRD-\d{3}$/i.test(a));
const prdNumber = prdArg ? Number.parseInt(prdArg.slice(4), 10) : null;
const requireSchema = !args.includes("--legacy");

if (!pathArg) {
  fail("[verify:review-artifact] usage: pnpm verify:review-artifact -- _docs/reviews/review-XXX.md [PRD-XXX]");
}

const result = validateReviewArtifactFile(pathArg, {
  prdNumber: prdNumber ?? undefined,
  requireSchema,
});

if (!result.ok) {
  fail("[verify:review-artifact] schema validation failed", result.issues);
}

ok(`[verify:review-artifact] ok — ${pathArg}`);
if (result.meta?.verdict) {
  ok(`  verdict=${result.meta.verdict} critical=${result.meta.critical ?? "?"} quorum=${result.meta.quorum ?? "?"}`);
}
