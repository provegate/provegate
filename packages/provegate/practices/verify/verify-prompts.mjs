#!/usr/bin/env node
// verify:prompts — the prompt-store reconciliation check (PRD-034), pack twin.
//
// It calls the SAME primitive and evaluator `gate check --prompts` uses,
// through the installed package: the comparison, the interpretation, the
// disabled note and the absent-store failure all live in `provegate`, so this
// twin can never reach a different verdict on the same tree
// (two-parsers-wrong-together). It opens no file itself and writes nothing —
// the remedy for any finding is always the adopter's manual step.
import {
  evaluatePromptReconciliation,
  loadConfig,
  promptsCheckPreflight,
  PromptsError,
  reconcilePrompts,
} from 'provegate';
import { targetRoot } from './lib.mjs';

const root = targetRoot();

let config;
try {
  ({ config } = loadConfig(root));
} catch (error) {
  console.error(`verify:prompts: FAIL — ${error.message}`);
  process.exit(1);
}

const pre = promptsCheckPreflight(config, root);
if (pre.kind === 'disabled') {
  console.log(`verify:prompts: ${pre.note}`);
  console.log('verify:prompts: PASS');
  process.exit(0);
}
if (pre.kind === 'absent') {
  console.error(`verify:prompts: FAIL — ${pre.problem}`);
  process.exit(1);
}

try {
  const findings = reconcilePrompts(config, root);
  const report = evaluatePromptReconciliation(findings, {
    exceptions: config.prompts.exceptions,
    todayUtc: new Date().toISOString().slice(0, 10),
  });
  for (const line of report.lines) console.log(`verify:prompts: ${line}`);
  for (const problem of report.problems) console.error(`verify:prompts: ${problem}`);
  console.log(`verify:prompts: ${report.summary}`);
  if (!report.ok) {
    console.error('verify:prompts: FAIL');
    process.exit(1);
  }
  console.log('verify:prompts: PASS');
} catch (error) {
  if (!(error instanceof PromptsError)) throw error;
  console.error(`verify:prompts: FAIL — ${error.message}`);
  process.exit(1);
}
