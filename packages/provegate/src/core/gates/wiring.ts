import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig } from '../config/index.js';
import { resolveContainedPaths } from '../config/load.js';
import { manifestCommands, type GatesManifest } from './manifest.js';

/**
 * Wire-or-delete audit: a gate that exists but runs nowhere is a declared
 * guarantee that isn't one. Two directions:
 *  1. every manifest command that names a package.json script must name one
 *     that exists (a typo'd gate is a silent no-op);
 *  2. every package.json script matching `verifyScriptPattern` must be wired
 *     (manifest, CI executing text) or carry a shrink-only exception; a stale
 *     exception (script wired meanwhile, or gone) fails.
 */

/** Executing text of a workflow YAML: `run:` step bodies (incl. block
 * scalars), from jobs not disabled with `if: false`. Comments and step names
 * never count as wiring. */
export function yamlRunText(content: string): string[] {
  const lines = content.split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];
  let inJobs = false;
  for (const line of lines) {
    if (/^jobs:\s*$/.test(line)) {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (/^ {2}[\w-]+:\s*$/.test(line)) {
      if (current.length) blocks.push(current);
      current = [line];
    } else if (current.length) {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const out: string[] = [];
  for (const block of blocks) {
    if (block.some((line) => /^\s*if:\s*(\$\{\{\s*)?false\s*(\}\})?\s*$/.test(line))) continue;
    let runIndent: number | null = null;
    for (const line of block) {
      const runMatch = /^(\s*)(?:-\s*)?run:\s*(.*)$/.exec(line);
      if (runMatch) {
        const body = runMatch[2]!.trim();
        if (body && !/^[|>][+-]?$/.test(body)) out.push(body);
        runIndent = runMatch[1]!.length;
        continue;
      }
      if (runIndent !== null) {
        const indent = line.length - line.trimStart().length;
        if (line.trim().length > 0 && indent > runIndent) {
          out.push(line.trim());
        } else if (line.trim().length > 0) {
          runIndent = null;
        }
      }
    }
  }
  return out;
}

export interface WiringReport {
  ok: boolean;
  issues: string[];
  /**
   * PRD-025: the surfaces the audit actually read, each with what it found
   * there (`hooks:2`, `bundle:10`, …). A narrow grammar loses a surface
   * SILENTLY when the input stops satisfying it — this list is what turns a
   * silently-lost surface into a number a maintainer can watch change.
   */
  surfaces: string[];
}

// ————————————————————————— PRD-025: the narrow command grammar —————————————————————————

/**
 * The closed interpreter head list. In source, not config: an adopter silently
 * widening their own gate is the failure the meta-gate exists to prevent, so
 * extension costs a code change and a test. There is deliberately NO flag
 * table beside it — see `interpreterInvokedFile`.
 */
const INTERPRETERS = new Set(['node', 'bun', 'deno', 'tsx', 'ts-node']);

/** Basename after stripping any directory prefix (`/usr/bin/node` counts). */
const baseOf = (p: string): string =>
  p.slice(Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\')) + 1);

const ASSIGNMENT = /^[A-Za-z_][A-Za-z0-9_]*=/;

/**
 * One left-to-right scan of a command surface (a whole hook file body or a
 * whole package.json script body), carrying exactly three pieces of state:
 * in-single-quote, in-double-quote, and pending-backslash. Both the command
 * boundaries and the tokens fall out of this one pass — a separate segmenter
 * and lexer is exactly how three boundary cases disagreed for two review
 * rounds (PRD-025 FR-3(b)).
 *
 * Rules, each a fact about the state:
 *  1. a backslash escapes the next character — except a newline;
 *  2. a newline ALWAYS cuts a command boundary;
 *  3. `;`, `&&`, `||` cut only outside both quote states and unescaped
 *     according to that state (so `\;` does not cut and `\\;` does);
 *  4. a `#` that begins a token outside quotes starts a comment discarded
 *     through the newline — a commented-out invocation declares nothing, and
 *     the shebang is just a comment.
 *
 * A quoted run therefore cannot span a newline; a quote still open at one is
 * unterminated, and an unterminated quote anywhere returns `null`: the WHOLE
 * surface is unparseable, no fragment is salvaged, never a crash, never a
 * substring fallback.
 */
export function scanCommandSurface(text: string): string[][] | null {
  const commands: string[][] = [];
  let tokens: string[] = [];
  let token: string | null = null;
  let inSingle = false;
  let inDouble = false;
  let backslash = false;
  let comment = false;
  const endToken = (): void => {
    if (token !== null) {
      tokens.push(token);
      token = null;
    }
  };
  const endCommand = (): void => {
    endToken();
    if (tokens.length > 0) {
      commands.push(tokens);
      tokens = [];
    }
  };
  const append = (ch: string): void => {
    token = (token ?? '') + ch;
  };
  let i = 0;
  while (i < text.length) {
    const ch = text[i]!;
    if (comment) {
      if (ch === '\n') {
        comment = false;
        endCommand();
      }
      i += 1;
      continue;
    }
    if (backslash) {
      backslash = false;
      if (ch === '\n') {
        // The backslash does not escape a newline: it stays an ordinary
        // character in the command before the cut, and the cut happens.
        append('\\');
        if (inSingle || inDouble) return null;
        endCommand();
        i += 1;
        continue;
      }
      append(ch);
      i += 1;
      continue;
    }
    if (ch === '\\') {
      backslash = true;
      i += 1;
      continue;
    }
    if (inSingle || inDouble) {
      if (ch === '\n') return null; // quote open at a newline: unterminated, whole surface
      if ((inSingle && ch === "'") || (inDouble && ch === '"')) {
        inSingle = false;
        inDouble = false;
        i += 1;
        continue;
      }
      append(ch);
      i += 1;
      continue;
    }
    if (ch === "'" || ch === '"') {
      // A quoted run is (part of) one token, quotes stripped.
      inSingle = ch === "'";
      inDouble = ch === '"';
      token = token ?? '';
      i += 1;
      continue;
    }
    if (ch === '\n') {
      endCommand();
      i += 1;
      continue;
    }
    if (ch === ' ' || ch === '\t' || ch === '\r') {
      endToken();
      i += 1;
      continue;
    }
    if (ch === '#' && token === null) {
      comment = true;
      i += 1;
      continue;
    }
    if (ch === ';') {
      endCommand();
      i += 1;
      continue;
    }
    if (ch === '&' && text[i + 1] === '&') {
      endCommand();
      i += 2;
      continue;
    }
    if (ch === '|' && text[i + 1] === '|') {
      endCommand();
      i += 2;
      continue;
    }
    // A single `|` or `&` is not a separator here (matches the set production
    // already used); it is an ordinary character, and a command reachable only
    // through a pipe or background operator declares no wiring — fail closed.
    append(ch);
    i += 1;
  }
  if (inSingle || inDouble) return null;
  if (backslash) append('\\'); // a trailing backslash at EOF is an ordinary character
  endCommand();
  return commands;
}

/**
 * The narrow command shape (PRD-025 FR-3(b)): strip `NAME=value` wrappers and
 * a leading literal `env` with its own `NAME=value` arguments; the head token
 * must be a closed-list interpreter (directory prefix stripped); `deno` may
 * take one optional literal `run`; the IMMEDIATELY next token is the script
 * path — it must not start with `-` — and everything after it is a script
 * argument, never read.
 *
 * Any `-`-leading token between the head (or `run`) and the path means the
 * command declares no wiring, fail-closed. That single rule replaces both
 * flag tables an earlier draft carried: `--check`, `-e`, `--require` and
 * `--enable-source-maps` all resolve identically, and the question of which
 * flag consumes a value for which interpreter is not answered here — it is
 * not asked. The false negative on a harmless flag surfaces as "wired
 * nowhere", never as a silent pass; the remedies are dropping the flag or a
 * justified `wiringExceptions` entry.
 */
export function interpreterInvokedFile(tokens: string[]): string | null {
  let i = 0;
  while (i < tokens.length && ASSIGNMENT.test(tokens[i]!)) i += 1;
  if (tokens[i] === 'env') {
    // `env` carrying anything but NAME=value (-i, -u VAR) leaves a head token
    // that is not an interpreter, so the command declares no wiring — there
    // is no env option table for the same reason there is no flag table.
    i += 1;
    while (i < tokens.length && ASSIGNMENT.test(tokens[i]!)) i += 1;
  }
  const head = tokens[i];
  if (head === undefined || !INTERPRETERS.has(baseOf(head))) return null;
  i += 1;
  // deno's one subcommand: the literal `run`, optional — both `deno run x`
  // and `deno x` wire. No other head takes a subcommand (`bun run x` reads
  // `run` as the path and matches nothing — a stated false negative).
  if (baseOf(head) === 'deno' && tokens[i] === 'run') i += 1;
  const path = tokens[i];
  if (path === undefined || path.startsWith('-')) return null;
  return path;
}

/**
 * The bundle's declared membership under the line- and column-anchored grammar
 * (PRD-025 FR-3(c)). Opens at a line whose FIRST character begins
 * `const CHECKS = [` (column zero); closes at the first subsequent line whose
 * first non-whitespace is `];`. Between them every line is a single
 * string-literal element (no backslash, no occurrence of its own delimiting
 * quote, optional trailing comma, optional `//` comment after that comma), a
 * whole-line `//` comment, or blank. Anything else — and more than one opening
 * line anywhere in the file, including inside what a JavaScript parser would
 * call a string or template literal — declares NO membership: absence,
 * unparseability and ambiguity are the same verdict, fail closed, never an
 * error, never a fallback to text search. The worst an impostor achieves is
 * removing this surface (visible by its absence from `WiringReport.surfaces`),
 * never adding a member.
 *
 * Returns `null` when there is no readable declaration (absent, unparseable,
 * ambiguous) and an array — possibly empty — when there is one: a valid empty
 * declaration IS a surface that declares nothing, while a refused file is not
 * a surface at all, and the report must not claim it was read.
 */
export function bundleMembers(content: string): string[] | null {
  const lines = content.split('\n');
  const openers: number[] = [];
  for (const [idx, line] of lines.entries()) {
    if (line.startsWith('const CHECKS = [')) openers.push(idx);
  }
  if (openers.length !== 1) return null;
  const members: string[] = [];
  for (let i = openers[0]! + 1; i < lines.length; i += 1) {
    const line = lines[i]!;
    if (/^\s*\];/.test(line)) return members;
    if (line.trim() === '') continue;
    if (/^\s*\/\//.test(line)) continue;
    const m = /^\s*(['"])(.*)\1\s*(?:,\s*(?:\/\/.*)?)?$/.exec(line);
    if (m === null) return null;
    const quote = m[1]!;
    const body = m[2]!;
    if (body.includes('\\') || body.includes(quote)) return null;
    members.push(body);
  }
  return null; // never closed — unparseable, no membership
}

/** Manager subcommands that are NOT package.json script invocations. */
const NON_SCRIPT_SUBCOMMANDS = new Set([
  'exec',
  'dlx',
  'x',
  'create',
  'init',
  'install',
  'i',
  'add',
  'remove',
  'rm',
  'update',
  'up',
  'ci',
  'publish',
  'pack',
  'link',
  'unlink',
  'audit',
  'outdated',
  'why',
  'config',
  'store',
  'setup',
  'help',
  'login',
  'logout',
  'version',
]);

/**
 * Which package.json script does this command invoke, if any?
 * Parses the real grammar of pnpm/npm/yarn/bun instead of a happy-path
 * prefix — `pnpm run ghost`, `npm test`, `yarn ghost`, and `bun test` all
 * resolve to their script name; installs/execs/dlx do not; a `--filter`ed
 * command targets another package's scripts and is out of this audit's
 * scope (the root package.json cannot answer for it).
 */
/** Manager options that consume the NEXT token as their value. */
const VALUE_FLAGS = new Set([
  '--dir',
  '-C',
  '--prefix',
  '--cwd',
  '--loglevel',
  '--reporter',
  '--config',
  '--userconfig',
]);

/** Modes that make the command exit without running the script. */
const NON_EXECUTING_FLAGS = new Set([
  '--help',
  '-h',
  '--version',
  '-v',
  '--dry-run',
  '--if-present',
]);

export function packageScriptOf(cmd: string): string | null {
  const tokens = cmd.trim().split(/\s+/);
  const manager = tokens[0];
  if (!manager || !['pnpm', 'npm', 'yarn', 'bun'].includes(manager)) return null;
  let i = 1;
  let sawRun = false;
  while (i < tokens.length) {
    const tok = tokens[i]!;
    if (
      tok === '--filter' ||
      tok === '-F' ||
      tok === '--workspace' ||
      tok === '-w' ||
      tok.startsWith('--filter=') ||
      tok.startsWith('-F=') ||
      tok.startsWith('--workspace=') ||
      tok.startsWith('-w=')
    ) {
      return null; // cross-package scope — root scripts cannot resolve it
    }
    // A mode that does NOT run the script is not an invocation of it.
    // `pnpm --help verify:brain` and `npm --dry-run verify:brain` exit
    // successfully and run nothing, and both counted as wiring and as a
    // validator.
    if (NON_EXECUTING_FLAGS.has(tok) || NON_EXECUTING_FLAGS.has(tok.split('=')[0] ?? tok)) {
      return null;
    }
    if (tok.startsWith('-')) {
      // Options that take a SEPARATE value consume it, or the value is read as
      // the script name: `pnpm --dir . run verify:brain` resolved to `.`.
      if (VALUE_FLAGS.has(tok)) {
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (!sawRun && (tok === 'run' || tok === 'run-script')) {
      sawRun = true;
      i += 1;
      continue;
    }
    if (!sawRun && NON_SCRIPT_SUBCOMMANDS.has(tok)) return null;
    return tok; // script name: bare shorthand, lifecycle alias, or after `run`
  }
  return null;
}

export function auditWiring(
  config: WorkflowConfig,
  manifest: GatesManifest,
  root: string,
): WiringReport {
  const issues: string[] = [];

  const pkgPath = resolve(root, 'package.json');
  const hasPkg = existsSync(pkgPath);
  const pkg = hasPkg
    ? (JSON.parse(readFileSync(pkgPath, 'utf8')) as { scripts?: Record<string, string> })
    : {};
  const scripts = pkg.scripts ?? {};
  const scriptNames = new Set(Object.keys(scripts));

  // Direction 1: manifest commands naming pnpm/npm scripts must exist.
  // With no package.json, a fresh non-node scaffold has nothing to audit
  // against — but a manifest that still references package-manager scripts is
  // mis-wired by shape, not exempt: those commands cannot resolve anywhere.
  // Repo shape must not buy silence, so that case is flagged, not skipped.
  // (For node repos this audit is wiring hygiene, not the execution gate —
  // manifest commands still EXECUTE at gate run and fail loud.)
  for (const cmd of manifestCommands(manifest)) {
    const script = packageScriptOf(cmd);
    if (script === null) continue;
    if (!hasPkg) {
      issues.push(
        `manifest command "${cmd}" needs a package.json script "${script}" but the repo has no package.json`,
      );
    } else if (!scriptNames.has(script)) {
      issues.push(
        `manifest command "${cmd}" names package.json script "${script}" which does not exist`,
      );
    }
  }

  // Direction 2: verify-pattern scripts must be wired or excepted.
  const pattern = new RegExp(config.verifyScriptPattern);
  const surfaces: string[] = ['manifest'];
  const wiringText: string[] = [...manifestCommands(manifest)];
  const workflowsDir = resolve(root, '.github/workflows');
  if (existsSync(workflowsDir)) {
    let ciFiles = 0;
    for (const name of readdirSync(workflowsDir)) {
      if (!/\.ya?ml$/.test(name)) continue;
      ciFiles += 1;
      wiringText.push(...yamlRunText(readFileSync(resolve(workflowsDir, name), 'utf8')));
    }
    surfaces.push(`ci:${ciFiles}`);
  }
  // The script a COMMAND resolves to, decided by the same parser the rest of
  // this audit uses. Text matching failed both ways: `echo pnpm verify:brain`
  // counted as wiring because the regex began matching mid-line, and a genuine
  // `pnpm --silent run verify:brain` was called unwired because the flag sat
  // where the parser did not look. One command, one answer, one parser.
  const wiredScripts = new Set<string>();
  for (const text of wiringText) {
    for (const command of text.split(/[\n;]|&&|\|\|/)) {
      const script = packageScriptOf(command);
      if (script !== null) wiredScripts.add(script);
    }
  }
  // ——— PRD-025: the three read paths, containment-checked before any read.
  // Lexical validation cannot see a symlink escape, so each read resolves
  // through the same containment primitive the other configured paths use
  // (`resolveContainedPaths`, exported from config/load.ts — never a copy).
  // An escaping path is refused loudly; an ABSENT path is "not a surface".
  const contained = resolveContainedPaths(root, [
    ['wiring.scriptsDir', config.wiring.scriptsDir],
    ['wiring.hooksDir', config.wiring.hooksDir],
    ['wiring.bundlePath', config.wiring.bundlePath],
  ]);
  for (const issue of contained.issues) {
    issues.push(`${issue.path} ${issue.message} — refusing to read it`);
  }
  const readPath = (label: string): string | null => contained.resolved.get(label) ?? null;

  // FR-3(a): derive each verify script's KEY — the basename of the .mjs file
  // its own body invokes under wiring.scriptsDir. The new surfaces match keys
  // (a hook or bundle names a file, not a package.json script name). The
  // under-scriptsDir test is LEXICAL against the configured value — comparing
  // a lexical path against a realpath'd base is the exact mismatch
  // `absolute-in-repo-symlink-refused` records, so like is compared with like.
  const scriptsDirPath = readPath('wiring.scriptsDir');
  // Both sides normalized the same lexical way (leading `./` stripped, no
  // trailing separator), and a path carrying ANY `.`/`..` segment after that
  // is refused outright — `scripts/verify/../outside/verify-foo.mjs` must not
  // pass a prefix test whose claim is "under scriptsDir". Fail closed: a
  // traversal is no key, never a resolved one.
  // Interior `.` segments are legal spellings of the same directory and are
  // normalized out on BOTH sides; `..` stays refused on the invocation side
  // (config-side `..` is already refused by lexical validation).
  const normLexical = (p: string): string =>
    p
      .replace(/[/\\]+/g, '/')
      .split('/')
      .filter((seg, idx) => seg !== '.' || idx === -1)
      .join('/')
      .replace(/\/+$/, '');
  const scriptsDirNorm = normLexical(config.wiring.scriptsDir);
  // `.` (and its spellings) legally mean the repository root: the prefix is
  // then empty and every non-traversal relative path is under it.
  const scriptsDirPrefix = scriptsDirNorm === '.' || scriptsDirNorm === '' ? '' : scriptsDirNorm + '/';
  const keyOf = new Map<string, string>();
  // FR-1 registration is by FILE, not by basename: a script invoking
  // `scripts/verify/nested/verify-foo.mjs` must not make the top-level
  // `verify-foo.mjs` candidate look registered (round-2 [P1]). So the
  // scriptsDir-RELATIVE path is kept for registration while the basename
  // stays the surface-matching key.
  const registeredRelative = new Set<string>();
  for (const [name, body] of Object.entries(scripts)) {
    if (!pattern.test(name)) continue;
    const cmds = scanCommandSurface(body);
    if (cmds === null) continue;
    for (const tokens of cmds) {
      const file = interpreterInvokedFile(tokens);
      if (file === null || !file.endsWith('.mjs')) continue;
      const normalized = normLexical(file);
      if (normalized.split('/').includes('..')) continue; // a traversal is no key
      if (!normalized.startsWith(scriptsDirPrefix)) {
        continue; // invokes a file outside wiring.scriptsDir — not a key
      }
      // EVERY qualifying invocation registers (a verify body may chain two
      // checks — round-3 [P2]); the FIRST one is the surface-matching key.
      registeredRelative.add(normalized.slice(scriptsDirPrefix.length));
      if (!keyOf.has(name)) keyOf.set(name, baseOf(normalized));
    }
  }

  // FR-2: the three surfaces the repository script counted and the package
  // did not — hooks, the bundle's declared membership, and every NON-verify
  // script body. The verify-prefix exclusion is load-bearing: without it a
  // bundle listing its members marks them all wired by existing, and two
  // checks naming each other wire themselves.
  const wiredKeys = new Set<string>();
  const collectKeys = (surface: string): void => {
    const cmds = scanCommandSurface(surface);
    if (cmds === null) return; // unparseable — the surface declares nothing
    for (const tokens of cmds) {
      const file = interpreterInvokedFile(tokens);
      if (file !== null) wiredKeys.add(baseOf(file));
    }
  };

  const hooksDirPath = readPath('wiring.hooksDir');
  if (hooksDirPath !== null && existsSync(hooksDirPath)) {
    let rootReal: string | null;
    try {
      rootReal = realpathSync(resolve(root));
    } catch {
      rootReal = null;
    }
    let hookFiles = 0;
    for (const name of readdirSync(hooksDirPath)) {
      const full = resolve(hooksDirPath, name);
      // The DIRECTORY was containment-checked; each entry was not, and stat
      // would follow a symlink wherever it points — external content could
      // silently wire a check. Git DOES execute a symlinked hook, so a link
      // whose target stays inside the repository is read (round-2 [P2]);
      // an external or dangling target is refused, fail-closed.
      const entry = lstatSync(full);
      if (entry.isSymbolicLink()) {
        if (rootReal === null || contained.under === null) continue;
        let target: string;
        try {
          target = realpathSync(full);
        } catch {
          continue; // dangling — not a hook
        }
        if (!contained.under(target, rootReal) || !statSync(target).isFile()) continue;
        hookFiles += 1;
        collectKeys(readFileSync(target, 'utf8'));
        continue;
      }
      if (!entry.isFile()) continue;
      hookFiles += 1;
      collectKeys(readFileSync(full, 'utf8'));
    }
    surfaces.push(`hooks:${hookFiles}`);
  }

  let nonVerifyBodies = 0;
  for (const [name, body] of Object.entries(scripts)) {
    if (pattern.test(name)) continue; // the exclusion — a verify body wires nothing
    nonVerifyBodies += 1;
    collectKeys(body);
  }
  surfaces.push(`scripts:${nonVerifyBodies}`);

  const bundlePath = readPath('wiring.bundlePath');
  if (bundlePath !== null && existsSync(bundlePath)) {
    const members = bundleMembers(readFileSync(bundlePath, 'utf8'));
    // null = no readable declaration: NOT a surface, so it must not appear in
    // the report as one — that absence is exactly what a maintainer watches.
    if (members !== null) {
      for (const member of members) wiredKeys.add(member);
      surfaces.push(`bundle:${members.length}`);
    }
  }

  const wiredIn = (script: string): boolean => {
    if (wiredScripts.has(script)) return true;
    const key = keyOf.get(script);
    return key !== undefined && wiredKeys.has(key);
  };

  for (const script of scriptNames) {
    if (!pattern.test(script)) continue;
    const excepted = script in manifest.wiringExceptions;
    const wired = wiredIn(script);
    if (wired && excepted) {
      issues.push(`stale wiring exception: "${script}" is wired now — remove the exception`);
    } else if (!wired && !excepted) {
      issues.push(
        `gate script "${script}" is wired nowhere (manifest, CI, hooks, bundle, or another script body) — wire it, delete it, or add a justified wiringExceptions entry`,
      );
    }
  }

  // FR-1: the direction the repository script had and the package did not —
  // on-disk → registered. Selection is a FILENAME pattern (distinct from
  // `verifyScriptPattern`, which matches script NAMES); registration is
  // decided by the same command rule as everything else, never a substring
  // search (`echo verify-foo.mjs` in an unrelated body is not registration).
  if (scriptsDirPath !== null && existsSync(scriptsDirPath)) {
    let candidateRootReal: string | null;
    try {
      candidateRootReal = realpathSync(resolve(root));
    } catch {
      candidateRootReal = null;
    }
    // A regular file is a candidate; a symlink is one only when its target is
    // a regular file INSIDE the repository (node executes such a link, so it
    // must not evade wire-or-delete — round-3 [P2]); dangling and external
    // targets are skipped, never a crash (round-2 [P2]).
    const isCandidateFile = (full: string): boolean => {
      const entry = lstatSync(full);
      if (entry.isFile()) return true;
      if (!entry.isSymbolicLink() || candidateRootReal === null || contained.under === null) {
        return false;
      }
      try {
        const target = realpathSync(full);
        return contained.under(target, candidateRootReal) && statSync(target).isFile();
      } catch {
        return false;
      }
    };
    let onDisk = 0;
    for (const name of readdirSync(scriptsDirPath)) {
      if (!isCandidateFile(resolve(scriptsDirPath, name))) continue;
      if (!/^verify-.*\.mjs$/.test(name)) continue;
      onDisk += 1;
      if (!registeredRelative.has(name)) {
        issues.push(
          `script on disk "${name}" is not registered as a package.json gate — register it or delete it`,
        );
      }
    }
    surfaces.push(`scriptsDir:${onDisk}`);
  }

  // Exceptions for scripts that no longer exist are stale too.
  for (const excepted of Object.keys(manifest.wiringExceptions)) {
    if (!scriptNames.has(excepted)) {
      issues.push(`stale wiring exception: "${excepted}" names no package.json script — remove it`);
    }
  }

  return { ok: issues.length === 0, issues, surfaces };
}
