#!/usr/bin/env node
// verify:test-inputs — the census gate for PRD-036: every out-of-package path the
// package tests read must be visible to the `test` turbo task's cache key, or a
// cached green replays over a comparison that never re-ran
// (turbo-cache-masks-out-of-input-reads).
//
// Repo-class per ADR-0004: this check reads the repository's build config and test
// sources, so it lives here and never ships in packages/provegate.
//
// Four fail-closed checks plus a Turbo-layer probe:
//   (a)  boundary scan — grammar v4 over every string/template literal part in
//        packages/provegate/test/**/*.ts (module specifiers included):
//          A1  literal containing `../..` (multi-parent)
//          A2  call expression with >=2 parent-carrying string args ('..' or '../…')
//          A3  dirname(dirname(…)) nesting
//          A4  new URL('..…', new URL(…)) nesting
//          C   process.cwd() / homedir( call sites
//        outside the two exempted helper files. Single parent segments are legal
//        by grammar — no exemption list, no suppression syntax. The named limit:
//        string concatenation assembling a traversal at runtime is outside any
//        syntactic net (documented, tested as a non-catch in the harness).
//   (b1) usage → ledger — every repoPath() first argument is a string literal
//        (non-literal fails closed) covered by a REPO_READ_GLOBS entry.
//   (b2) ledger → turbo — every REPO_READ_GLOBS entry is covered by a `test`-task
//        input glob in turbo.json.
//   (b3) helper shape — repo-reads.ts exports exactly repoPath/pkgRoot/
//        REPO_READ_GLOBS, imports only node:path and node:url, makes no read or
//        spawn call; escape-fixtures.ts has zero imports, zero calls, and exactly
//        the four named string constants.
//   probe — proves the declared globs live in Turbo's actual hash: dry-run task
//        hash, exclusive-create a probe file under the snapshot root, hash must
//        change, unconditional cleanup, hash must restore. --dry=json never
//        executes tasks. Runs only on a clean scan at the real repo root
//        (fixture roots exercise the scan checks; the probe's own §11 row runs
//        here). Skippable with --no-probe.
//
// TypeScript is resolved via createRequire against the real package manifest —
// anchored to THIS script's location, not the target root, so a fixture root
// passed by the harness still parses with the repo's own compiler
// (fixture-must-reach-production-shape: the harness runs THIS file in place).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
  unlinkSync,
} from 'node:fs';
import { join, relative, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { targetRoot, makeReporter } from './lib.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const ts = createRequire(resolve(here, '../../packages/provegate/package.json'))('typescript');

const root = targetRoot();
const r0 = makeReporter('verify:test-inputs');
let failCount = 0;
const r = {
  fail: (m) => {
    failCount++;
    r0.fail(m);
  },
  note: r0.note,
  done: r0.done,
};
const noProbe = process.argv.includes('--no-probe');

const TEST_DIR = join(root, 'packages/provegate/test');
const HELPER_READS = 'helpers/repo-reads.ts';
const HELPER_FIXTURES = 'helpers/escape-fixtures.ts';
const EXEMPT = new Set([HELPER_READS, HELPER_FIXTURES]);
const MULTI = /\.\.[\\/]\.\./;
const FIXTURE_EXPORTS = [
  'TRAVERSAL_SELECTOR',
  'TRAVERSAL_COMMAND',
  'TRAVERSAL_SLUG',
  'QUICKSTART_TASKS_FIXTURE',
];
const READS_EXPORTS = ['repoPath', 'pkgRoot', 'REPO_READ_GLOBS'];
const READS_ALLOWED_IMPORTS = new Set(['node:path', 'node:url']);

// ---------------------------------------------------------------------------
// shared: glob cover (the ledger's grammar: `**` crosses slashes, `*` does not)
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else out += '[^/]*';
    } else if ('.+?^${}()|[]\\'.includes(c)) out += `\\${c}`;
    else out += c;
  }
  return new RegExp(`^${out}$`);
}
const covers = (glob, path) =>
  globToRegExp(glob).test(path) ||
  glob === path ||
  // a dir glob covers the bare dir itself (readdirSync of the group's root)
  (glob.endsWith('/**') && glob.slice(0, -3) === path);

// ---------------------------------------------------------------------------
// (a) + (b1) — the AST scan
if (!existsSync(TEST_DIR)) {
  r.fail(`test directory missing: ${TEST_DIR}`);
  r.done();
}

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (name.endsWith('.ts')) files.push(full);
  }
})(TEST_DIR);
files.sort();

/** repoPath() call-site literals, collected for (b1). */
const repoPathArgs = [];
let violations = 0;

// Read APIs whose path argument B4 inspects (the reviewed accident shape).
const READ_APIS = new Set([
  'readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync',
  'cpSync', 'copyFileSync', 'openSync', 'createReadStream',
  // promise-API twins (node:fs/promises) — the round-3 review's gap
  'readFile', 'readdir', 'stat', 'lstat', 'access', 'cp', 'copyFile',
  'open', 'opendir', 'realpath', 'readlink',
]);

for (const file of files) {
  const rel = relative(TEST_DIR, file).replaceAll('\\', '/');
  const exempt = EXEMPT.has(rel);
  const text = readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const loc = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const flag = (n, kind, detail) => {
    if (exempt) return;
    violations++;
    r.fail(`${rel}:${loc(n)} [${kind}] ${detail}`);
  };
  const parentArgs = (c) =>
    c.arguments.filter(
      (a) => ts.isStringLiteral(a) && (a.text === '..' || a.text.startsWith('../')),
    ).length;
  // B4 support: identifiers bound to the base accessor repoPath('.') in this file.
  const baseNames = new Set();
  const isBaseCall = (n) =>
    ts.isCallExpression(n) &&
    n.expression.getText(sf) === 'repoPath' &&
    n.arguments.length === 1 &&
    ts.isStringLiteral(n.arguments[0]) &&
    n.arguments[0].text === '.';
  (function collectBases(n) {
    if (ts.isVariableDeclaration(n) && n.initializer && isBaseCall(n.initializer))
      baseNames.add(n.name.getText(sf));
    ts.forEachChild(n, collectBases);
  })(sf);
  // Base-ness resolves at the NEAREST lexical binding (the round-3 review:
  // an inner repoPath('.') binding shadowing an outer ordinary variable is a
  // live base; an outer base shadowed by a nearer parameter/local is not).
  const nearestBindingIsBase = (idNode, name) => {
    for (let p = idNode.parent; p !== undefined; p = p.parent) {
      if (ts.isFunctionLike(p)) {
        for (const param of p.parameters ?? [])
          if (param.name.getText(sf) === name) return false;
      }
      if (ts.isBlock(p) || ts.isSourceFile(p)) {
        for (const s of p.statements ?? []) {
          if (ts.isVariableStatement(s))
            for (const d of s.declarationList.declarations)
              if (d.name.getText(sf) === name)
                return d.initializer !== undefined && isBaseCall(d.initializer);
        }
      }
      if (ts.isSourceFile(p)) break;
    }
    return false;
  };
  const referencesBase = (n) => {
    if (ts.isIdentifier(n) && baseNames.has(n.getText(sf)) && nearestBindingIsBase(n, n.getText(sf)))
      return true;
    if (isBaseCall(n)) return true;
    let found = false;
    ts.forEachChild(n, (c) => {
      if (!found && referencesBase(c)) found = true;
    });
    return found;
  };
  // A "path literal" is a segment with real NAME content: separator-only
  // parts (`${base}/${rel}`'s '/') are plumbing for pure-dynamic reads, which
  // stay legal by the named allowance (round-4 review).
  const hasNameContent = (text) => {
    const content = text.replace(/[\\/]/g, '');
    return content.length > 0 && !/^\.+$/.test(content);
  };
  const containsPathLiteral = (n) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && hasNameContent(n.text))
      return true;
    if (
      ts.isTemplateExpression(n) &&
      (hasNameContent(n.head.text) || n.templateSpans.some((s) => hasNameContent(s.literal.text)))
    )
      return true;
    let found = false;
    ts.forEachChild(n, (c) => {
      if (!found && containsPathLiteral(c)) found = true;
    });
    return found;
  };
  const scanText = (n, t) => {
    if (MULTI.test(t)) flag(n, 'multi-parent', JSON.stringify(t).slice(0, 80));
  };
  (function visit(n) {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) scanText(n, n.text);
    else if (ts.isTemplateExpression(n)) {
      scanText(n.head, n.head.text);
      for (const span of n.templateSpans) scanText(span.literal, span.literal.text);
    } else if (ts.isCallExpression(n)) {
      const et = n.expression.getText(sf);
      if (et === 'process.cwd') flag(n, 'process-cwd', 'process.cwd()');
      if (et === 'homedir' || et.endsWith('.homedir')) flag(n, 'homedir', `${et}(`);
      if (et === 'dirname' && n.arguments.length === 1) {
        const a = n.arguments[0];
        if (ts.isCallExpression(a) && a.expression.getText(sf) === 'dirname')
          flag(n, 'nested-dirname', 'dirname(dirname(…))');
      }
      if (parentArgs(n) >= 2) flag(n, 'multi-parent-args-call', `${et}(… ≥2 parent args)`);
      // B4 — a read API whose path expression composes the BASE with a string
      // literal evades the usage ledger (the reviewed accident shape:
      // readFileSync(join(repoPath('.'), 'file'))). Name the leaf with a
      // literal repoPath('file') instead. Pure-dynamic base reads (a walk's
      // variable) stay legal: they are covered at the glob level by design.
      const bare = et.includes('.') ? et.slice(et.lastIndexOf('.') + 1) : et;
      if (READ_APIS.has(bare) && n.arguments.length > 0) {
        const pathArg = n.arguments[0];
        if (referencesBase(pathArg) && containsPathLiteral(pathArg))
          flag(n, 'base-literal-read', `${et}(…repoPath('.')… + a string literal) — name the leaf with repoPath('<literal>')`);
      }
      if (et === 'repoPath') {
        const first = n.arguments[0];
        if (first !== undefined && ts.isStringLiteral(first))
          repoPathArgs.push({ rel, line: loc(n), path: first.text });
        else flag(n, 'repoPath-non-literal', 'repoPath() first argument must be a string literal');
      }
    } else if (
      ts.isNewExpression(n) &&
      n.expression.getText(sf) === 'URL' &&
      (n.arguments?.length ?? 0) >= 2
    ) {
      const [first, second] = n.arguments;
      const firstUp =
        ts.isStringLiteral(first) && (first.text === '..' || first.text.startsWith('../'));
      const secondNested = ts.isNewExpression(second) && second.expression.getText(sf) === 'URL';
      if (firstUp && secondNested) flag(n, 'nested-url', "new URL('..…', new URL(…))");
    }
    ts.forEachChild(n, visit);
  })(sf);
}
console.log(
  `verify:test-inputs: ${files.length} test source(s) scanned, ${violations} boundary violation(s)`,
);

// ---------------------------------------------------------------------------
// (b3) helper shape — validated with the same compiler; fail-closed on absence.
function helperSource(relPath) {
  const full = join(TEST_DIR, relPath);
  if (!existsSync(full)) {
    r.fail(`${relPath}: helper missing — the boundary has no door`);
    return null;
  }
  const text = readFileSync(full, 'utf8');
  return ts.createSourceFile(full, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

let ledgerGlobs = null;
{
  const sf = helperSource(HELPER_READS);
  if (sf !== null) {
    const exported = [];
    const imports = [];
    let readsOk = true;
    (function visit(n) {
      if (ts.isImportDeclaration(n)) imports.push(n.moduleSpecifier.text);
      if (ts.isCallExpression(n)) {
        const et = n.expression.getText(sf);
        // the two anchors' own calls are the only legal ones
        const legal = ['resolve', 'join', 'dirname', 'fileURLToPath'];
        if (!legal.includes(et) && !et.startsWith('String') && et !== 'URL') {
          r.fail(
            `${HELPER_READS}: forbidden call \`${et}(\` — the helper resolves paths, nothing else`,
          );
          readsOk = false;
        }
      }
      if (
        ts.isVariableStatement(n) &&
        n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        for (const d of n.declarationList.declarations) exported.push(d.name.getText(sf));
        for (const d of n.declarationList.declarations) {
          if (
            d.name.getText(sf) === 'REPO_READ_GLOBS' &&
            d.initializer &&
            ts.isArrayLiteralExpression(d.initializer)
          ) {
            ledgerGlobs = d.initializer.elements
              .filter((e) => ts.isStringLiteral(e))
              .map((e) => e.text);
          }
        }
      }
      const isExported = ts.canHaveModifiers(n)
        ? ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        : false;
      if (isExported && !ts.isVariableStatement(n))
        r.fail(
          `${HELPER_READS}: exported ${ts.SyntaxKind[n.kind]} forbidden — only the three named const exports`,
        );
      if (
        isExported &&
        ts.isVariableStatement(n) &&
        (n.declarationList.flags & ts.NodeFlags.Const) === 0
      )
        r.fail(`${HELPER_READS}: exports must be const declarations`);
      if (ts.isExportDeclaration(n) || ts.isExportAssignment(n))
        r.fail(
          `${HELPER_READS}: export declaration/assignment forbidden — only the three named declaration exports`,
        );
      ts.forEachChild(n, visit);
    })(sf);
    for (const imp of imports)
      if (!READS_ALLOWED_IMPORTS.has(imp))
        r.fail(
          `${HELPER_READS}: forbidden import \`${imp}\` — only node:path and node:url are permitted`,
        );
    const extra = exported.filter((e) => !READS_EXPORTS.includes(e));
    const missing = READS_EXPORTS.filter((e) => !exported.includes(e));
    for (const e of extra) r.fail(`${HELPER_READS}: unexpected export \`${e}\``);
    for (const e of missing) r.fail(`${HELPER_READS}: missing export \`${e}\``);
    if (ledgerGlobs === null && readsOk)
      r.fail(
        `${HELPER_READS}: REPO_READ_GLOBS is not a literal string array — the ledger must be statically readable`,
      );
  }
}
{
  const sf = helperSource(HELPER_FIXTURES);
  if (sf !== null) {
    const exported = [];
    (function visit(n) {
      if (ts.isImportDeclaration(n))
        r.fail(`${HELPER_FIXTURES}: forbidden import — the fixtures module imports nothing`);
      if (ts.isCallExpression(n))
        r.fail(
          `${HELPER_FIXTURES}: forbidden call \`${n.expression.getText(sf)}(\` — constants only`,
        );
      if (
        ts.isVariableStatement(n) &&
        n.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      )
        for (const d of n.declarationList.declarations) {
          exported.push(d.name.getText(sf));
          const init = d.initializer;
          if (
            init === undefined ||
            !(ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init))
          )
            r.fail(
              `${HELPER_FIXTURES}: export \`${d.name.getText(sf)}\` must be a string-literal constant`,
            );
        }
      const fxExported = ts.canHaveModifiers(n)
        ? ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
        : false;
      if (fxExported && !ts.isVariableStatement(n))
        r.fail(
          `${HELPER_FIXTURES}: exported ${ts.SyntaxKind[n.kind]} forbidden — only the four named const string constants`,
        );
      if (
        fxExported &&
        ts.isVariableStatement(n) &&
        (n.declarationList.flags & ts.NodeFlags.Const) === 0
      )
        r.fail(`${HELPER_FIXTURES}: exports must be const declarations`);
      if (ts.isExportDeclaration(n) || ts.isExportAssignment(n))
        r.fail(
          `${HELPER_FIXTURES}: export declaration/assignment forbidden — only the four named constants`,
        );
      ts.forEachChild(n, visit);
    })(sf);
    const extra = exported.filter((e) => !FIXTURE_EXPORTS.includes(e));
    const missing = FIXTURE_EXPORTS.filter((e) => !exported.includes(e));
    for (const e of extra) r.fail(`${HELPER_FIXTURES}: unexpected export \`${e}\``);
    for (const e of missing) r.fail(`${HELPER_FIXTURES}: missing export \`${e}\``);
  }
}

// ---------------------------------------------------------------------------
// (b1) usage → ledger, (b2) ledger → turbo
if (ledgerGlobs !== null) {
  for (const use of repoPathArgs) {
    // `repoPath('.')` is the sanctioned base accessor: consumers with
    // config-derived subpaths (loadConfig, liveMarkdown, auditWiring) cannot
    // name literals; their input groups are census-declared at the glob level.
    if (use.path === '.') continue;
    if (!ledgerGlobs.some((g) => covers(g, use.path)))
      r.fail(
        `${use.rel}:${use.line} [unledgered] repoPath('${use.path}') matches no REPO_READ_GLOBS entry`,
      );
  }
  const turboPath = join(root, 'turbo.json');
  if (!existsSync(turboPath)) r.fail('turbo.json missing at the target root');
  else {
    const turbo = JSON.parse(readFileSync(turboPath, 'utf8'));
    const inputs = (turbo.tasks?.test?.inputs ?? []).map((g) =>
      g.startsWith('$TURBO_ROOT$/') ? g.slice('$TURBO_ROOT$/'.length) : g,
    );
    for (const g of ledgerGlobs) {
      if (!inputs.includes(g))
        r.fail(
          `[uncovered] REPO_READ_GLOBS entry \`${g}\` is not a test-task input glob in turbo.json`,
        );
    }
  }
  console.log(
    `verify:test-inputs: ${repoPathArgs.length} repoPath() usage(s) checked against ${ledgerGlobs.length} ledger entries`,
  );
}

// ---------------------------------------------------------------------------
// probe — only on a clean scan at the real repo root (turbo lives there)
const isRealRoot = resolve(root) === resolve(here, '../..');
if (!noProbe && isRealRoot && failCount === 0) {
  const snapshotRoot = join(root, 'docs/research/provegate-bootstrap/source-snapshot');
  const stale = readdirSync(snapshotRoot).filter((f) => f.startsWith('.probe-'));
  if (stale.length > 0) {
    r.fail(
      `stale probe file(s) under the snapshot root: ${stale.join(', ')} — remove before running`,
    );
  } else {
    const taskHash = () => {
      const out = execFileSync(
        'pnpm',
        ['exec', 'turbo', 'run', 'test', '--filter=provegate', '--dry=json'],
        {
          cwd: root,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const parsed = JSON.parse(out.slice(out.indexOf('{')));
      const task = parsed.tasks.find((t) => t.taskId === 'provegate#test');
      if (!task?.hash) throw new Error('provegate#test hash not found in turbo dry-run output');
      return task.hash;
    };
    const probe = join(snapshotRoot, `.probe-${process.pid}-${process.hrtime.bigint()}.tmp`);
    try {
      const before = taskHash();
      writeFileSync(probe, 'cache-key probe\n', { flag: 'wx' });
      let during;
      try {
        during = taskHash();
      } finally {
        unlinkSync(probe);
      }
      if (during === before)
        r.fail(
          'probe: task hash did NOT change on a snapshot mutation — the snapshot glob is not in the cache key',
        );
      const after = taskHash();
      if (after !== before)
        r.fail('probe: task hash did not restore after cleanup — the tree is not clean');
      if (during !== before && after === before)
        console.log(
          'verify:test-inputs: probe ok — hash changed on the snapshot probe and restored after cleanup',
        );
    } catch (error) {
      if (existsSync(probe)) unlinkSync(probe);
      r.fail(`probe: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} else if (!noProbe && !isRealRoot) {
  console.log('verify:test-inputs: probe skipped (fixture root)');
}

r.done();
