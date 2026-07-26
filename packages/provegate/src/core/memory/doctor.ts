import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import type { MemoryConfig, WorkflowConfig } from '../config/index.js';
import { validateResolvedConfig } from '../config/index.js';
import type { GatesManifest } from '../gates/manifest.js';
import { loadMemoryStore } from './artifacts.js';

/**
 * `gate doctor --memory` — is a memory install actually reachable?
 *
 * READ-ONLY, and that is a contract rather than an implementation detail: an
 * adopter runs this when something is already wrong, and a doctor that edits
 * config, manifests, entrypoints, scripts, or state would change the thing it
 * was asked to describe. Nothing in this file writes.
 *
 * It also does not RE-IMPLEMENT validation. Record shape comes from the parser,
 * store loading from `loadMemoryStore`, config containment from
 * `validateResolvedConfig` — a second validator that disagrees with the first is
 * worse than no doctor, because the adopter now has two answers and no way to
 * tell which gate will actually run.
 *
 * The split between MANDATORY and WARNING is the whole design. A mandatory check
 * fails when something the contract needs is unreachable LOCALLY, which is a
 * fact this tool can establish. CI reachability cannot be: workflow layouts are
 * user-defined, a repository may run gates from a Makefile, a monorepo task
 * runner, or a hosted service this file has never heard of. Reporting "your CI
 * does not run it" as a failure would be asserting something unknowable, so
 * absence warns and presence informs.
 */

/** Stable identifiers. These are the doctor's API — an adopter greps for them
 * and a script branches on them, so they may be added to but never renamed. */
export type DoctorCheckId =
  | 'memory.config.present'
  | 'memory.config.contained'
  | 'memory.root.resolvable'
  | 'memory.index.resolvable'
  | 'memory.records.valid'
  | 'memory.entrypoint.pointer'
  | 'memory.verify.script.present'
  | 'memory.verify.script.wired'
  | 'memory.phase7.reachable'
  | 'memory.ci.reachable'
  | 'memory.placeholders.filled';

export type DoctorSeverity = 'fail' | 'warn' | 'pass';

export interface DoctorCheck {
  id: DoctorCheckId;
  severity: DoctorSeverity;
  /** One line an adopter can act on. Names what was looked for and where. */
  detail: string;
  /** What to do about it, when there is something to do. */
  remedy?: string;
}

export interface DoctorReport {
  ok: boolean;
  /** True when memory is off: every check is skipped and that is not a failure. */
  disabled: boolean;
  checks: DoctorCheck[];
  /** Stable process exit code: 0 clean or warnings only, 1 any mandatory failure. */
  code: 0 | 1;
}

/** A path resolves to a regular file, following in-repo symlinks. */
function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Does `entry` carry a pointer to the memory index?
 *
 * The pointer is matched on the index's PATH, not on prose around it, because
 * the shipped entrypoints write it three different ways — a bare mention, a
 * Markdown link, and a fenced tree diagram — and all three are a real pointer to
 * a reader. What is NOT accepted is the path appearing only inside a comment,
 * which renders as nothing; that is the same rule the contract grammar applies
 * to a declaration.
 */
function carriesPointer(text: string, indexRel: string): boolean {
  const withoutComments = text.replace(/<!--[\s\S]*?-->/g, ' ');
  return withoutComments.includes(indexRel);
}

/**
 * Configured entrypoints that resolve to the same real file count ONCE.
 *
 * This repository ships `AGENTS.md` as a symlink to `CLAUDE.md`, and a
 * vendor-neutral entrypoint list will name both. Counting them as two satisfied
 * entrypoints would overstate coverage; counting the symlink as invalid would
 * refuse a legitimate install. Containment rejects escapes, not symlinks — a
 * link is fine as long as its target stays inside the repository.
 */
function realOrNull(path: string): string | null {
  try {
    return realpathSync(path);
  } catch {
    return null;
  }
}

function escapesRoot(rootReal: string, targetReal: string): boolean {
  return targetReal !== rootReal && !targetReal.startsWith(`${rootReal}/`);
}

export interface DoctorOptions {
  config: WorkflowConfig;
  manifest: GatesManifest;
  root: string;
  /** Package scripts, for the wiring check. Absent means no `package.json`,
   * which is a legitimate non-node adopter rather than a failure. */
  packageScripts?: Record<string, string>;
  /** CI file contents to scan for the validator. Absent means none were found. */
  ciTexts?: string[];
}

export function memoryDoctor(options: DoctorOptions): DoctorReport {
  const { config, manifest, root } = options;
  const checks: DoctorCheck[] = [];
  const add = (
    id: DoctorCheckId,
    severity: DoctorSeverity,
    detail: string,
    remedy?: string,
  ): void => {
    checks.push(remedy === undefined ? { id, severity, detail } : { id, severity, detail, remedy });
  };

  // Enablement is READ, never inferred. A store on disk does not mean the
  // contract is on, and guessing would tell an adopter their install works when
  // no gate is running.
  if (!config.memory.enabled) {
    add(
      'memory.config.present',
      'pass',
      '`memory.enabled` is false — the contract is off and nothing below applies',
      'set `memory.enabled: true` in workflow.config.json to adopt it',
    );
    return { ok: true, disabled: true, checks, code: 0 };
  }

  const memory: MemoryConfig = config.memory;
  add('memory.config.present', 'pass', '`memory.enabled` is true');

  // Containment comes from the CONFIG validator, so the doctor and the loader
  // agree about what a legal path is.
  const configIssues = validateResolvedConfig(config).filter((issue) =>
    issue.path.startsWith('memory.'),
  );
  if (configIssues.length > 0) {
    for (const issue of configIssues) {
      add(
        'memory.config.contained',
        'fail',
        `${issue.path}: ${issue.message}`,
        'fix the path in workflow.config.json — it must be repo-relative with no `..`',
      );
    }
  } else {
    add('memory.config.contained', 'pass', 'every configured memory path is repo-relative');
  }

  const rootAbs = resolve(root, memory.root);
  if (isDir(rootAbs)) {
    add('memory.root.resolvable', 'pass', `record store at \`${memory.root}\``);
  } else {
    add(
      'memory.root.resolvable',
      'fail',
      `\`${memory.root}\` is not a directory`,
      existsSync(rootAbs)
        ? 'the configured root exists but is not a directory'
        : 'create the store, or run `gate init --practices` to scaffold it',
    );
  }

  const indexAbs = resolve(root, memory.index);
  const indexPresent = isFile(indexAbs);
  if (indexPresent) {
    add('memory.index.resolvable', 'pass', `index at \`${memory.index}\``);
  } else {
    add(
      'memory.index.resolvable',
      'fail',
      `\`${memory.index}\` is not a readable file`,
      'the index is the store entry point — every record is reached through it',
    );
  }

  // Records come from the REAL loader, issues and all. Re-walking the store here
  // would produce a second opinion the gates do not share.
  const store = loadMemoryStore(root, memory);
  if (store.issues.length === 0 && store.unreadable.length === 0) {
    add(
      'memory.records.valid',
      'pass',
      `${store.records.length} indexed record(s), all parsing`,
    );
  } else {
    for (const issue of store.issues) {
      add('memory.records.valid', 'fail', issue, 'repair the store, then re-run');
    }
    for (const slug of store.unreadable) {
      add(
        'memory.records.valid',
        'fail',
        `record '${slug}' does not validate`,
        'run the standalone validator for the field-level reason',
      );
    }
  }

  // At least ONE entrypoint must carry the pointer. Requiring all of them would
  // refuse a repository that lists a vendor file it does not maintain; requiring
  // none would let the index be unreachable to every agent that starts here.
  const seenReal = new Set<string>();
  const rootReal = realOrNull(root) ?? resolve(root);
  let satisfied = 0;
  const entrypointDetails: string[] = [];
  for (const entry of memory.entrypoints) {
    const abs = resolve(root, entry);
    const real = realOrNull(abs);
    if (real === null) {
      entrypointDetails.push(`\`${entry}\` does not exist`);
      continue;
    }
    if (escapesRoot(rootReal, real)) {
      // A symlink is legal; a symlink pointing OUT of the repository is not —
      // the file an agent reads would not be the file the repository ships.
      add(
        'memory.entrypoint.pointer',
        'fail',
        `\`${entry}\` resolves outside the repository`,
        'an entrypoint may be a symlink, but its target must stay in the repo',
      );
      continue;
    }
    // Two entrypoints resolving to one real file are ONE satisfied entrypoint.
    if (seenReal.has(real)) {
      entrypointDetails.push(`\`${entry}\` is the same file as an earlier entrypoint`);
      continue;
    }
    seenReal.add(real);
    let text: string;
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      entrypointDetails.push(`\`${entry}\` is not readable`);
      continue;
    }
    if (carriesPointer(text, memory.index)) satisfied += 1;
    else entrypointDetails.push(`\`${entry}\` does not mention \`${memory.index}\``);
  }
  if (satisfied > 0) {
    add(
      'memory.entrypoint.pointer',
      'pass',
      `${satisfied} entrypoint(s) point at \`${memory.index}\``,
    );
  } else {
    add(
      'memory.entrypoint.pointer',
      'fail',
      memory.entrypoints.length === 0
        ? 'no entrypoints are configured'
        : `no configured entrypoint points at \`${memory.index}\` — ${entrypointDetails.join('; ')}`,
      'add the index pointer to at least one agent entrypoint, or nothing will load it',
    );
  }

  // The validator: present on disk, wired as a package script, reachable from
  // Phase 7. Each is a separate fact and each fails on its own, because "the
  // script exists" and "anything runs it" are different problems with different
  // fixes — `false-green-on-missing-file` is the same mistake from the other end.
  const phase7 = manifest.phases['7'] ?? [];
  const verifyCommand = memory.verifyCommand.trim();
  const validatorCommands = [...phase7, ...(verifyCommand.length > 0 ? [verifyCommand] : [])];

  const scriptPaths = validatorCommands
    .flatMap((cmd) => cmd.split(/\s+/))
    .filter((token) => token.endsWith('.mjs') || token.endsWith('.js') || token.endsWith('.cjs'));
  if (scriptPaths.length === 0) {
    // "There is no validator at all" is ONE fact and `memory.phase7.reachable`
    // owns it. Reporting it here as well sent an adopter to two checks for one
    // cause, which is the failure mode this whole matrix exists to catch.
    add(
      'memory.verify.script.present',
      'pass',
      validatorCommands.length > 0
        ? 'the validator runs through a package script rather than a file path'
        : 'no validator script path to resolve — see `memory.phase7.reachable`',
    );
  } else {
    const missing = scriptPaths.filter((p) => !isFile(resolve(root, p)));
    if (missing.length === 0) {
      add('memory.verify.script.present', 'pass', `validator script(s): ${scriptPaths.join(', ')}`);
    } else {
      add(
        'memory.verify.script.present',
        'fail',
        `validator script missing: ${missing.join(', ')}`,
        'the Phase 7 command names a file that is not there',
      );
    }
  }

  const scripts = options.packageScripts;
  const namedScripts = validatorCommands
    .map((cmd) => cmd.trim().split(/\s+/))
    .filter((parts) => ['pnpm', 'npm', 'yarn', 'bun'].includes(parts[0] ?? ''))
    .map((parts) => parts.filter((p) => !p.startsWith('-') && p !== 'run')[1])
    .filter((name): name is string => name !== undefined);
  if (namedScripts.length === 0) {
    add(
      'memory.verify.script.wired',
      'pass',
      'the validator is invoked directly, so no package script is needed',
    );
  } else if (scripts === undefined) {
    add(
      'memory.verify.script.wired',
      'fail',
      `the validator calls package script(s) ${namedScripts.join(', ')} but there is no package.json`,
      'invoke the validator directly, or add the script',
    );
  } else {
    const unwired = namedScripts.filter((name) => scripts[name] === undefined);
    if (unwired.length === 0) {
      add('memory.verify.script.wired', 'pass', `package script(s) ${namedScripts.join(', ')} exist`);
    } else {
      add(
        'memory.verify.script.wired',
        'fail',
        `package script(s) not defined: ${unwired.join(', ')}`,
        'add them to package.json, or the Phase 7 command fails at the shell',
      );
    }
  }

  if (validatorCommands.length > 0) {
    add(
      'memory.phase7.reachable',
      'pass',
      `Phase 7 runs ${validatorCommands.map((c) => `\`${c}\``).join(', ')} after capture`,
    );
  } else {
    add(
      'memory.phase7.reachable',
      'fail',
      'nothing runs after capture — `phases.7` is empty and `memory.verifyCommand` is blank',
      'a store that is never validated drifts silently; wire one of the two',
    );
  }

  // CI is a WARNING, and the reason is in the header: workflow layouts are
  // user-defined and absence here is not evidence of anything.
  const ciTexts = options.ciTexts ?? [];
  if (namedScripts.length === 0 && scriptPaths.length === 0) {
    add('memory.ci.reachable', 'warn', 'no validator to look for in CI');
  } else {
    const needles = [...namedScripts, ...scriptPaths];
    const found = needles.filter((n) => ciTexts.some((t) => t.includes(n)));
    if (found.length > 0) {
      add('memory.ci.reachable', 'pass', `CI mentions ${found.join(', ')}`);
    } else {
      add(
        'memory.ci.reachable',
        'warn',
        ciTexts.length === 0
          ? 'no CI workflow files were found to scan'
          : `no CI file mentions ${needles.join(', ')}`,
        'this is a warning on purpose — CI layouts are user-defined and this tool cannot prove absence',
      );
    }
  }

  // Practice placeholders: shipped templates carry `{{TOKEN}}` markers an
  // adopter is meant to replace. Leaving one is a real install defect, but it
  // does not break a gate today, so it warns.
  const unfilled: string[] = [];
  if (indexPresent) {
    const indexText = readFileSync(indexAbs, 'utf8');
    for (const match of indexText.matchAll(/\{\{([A-Z_]+)\}\}/g)) unfilled.push(match[1]!);
  }
  if (unfilled.length === 0) {
    add('memory.placeholders.filled', 'pass', 'no unfilled template placeholders in the index');
  } else {
    add(
      'memory.placeholders.filled',
      'warn',
      `unfilled placeholder(s) in \`${memory.index}\`: ${[...new Set(unfilled)].join(', ')}`,
      'replace them with real values from your repository',
    );
  }

  const failed = checks.some((c) => c.severity === 'fail');
  return { ok: !failed, disabled: false, checks, code: failed ? 1 : 0 };
}
