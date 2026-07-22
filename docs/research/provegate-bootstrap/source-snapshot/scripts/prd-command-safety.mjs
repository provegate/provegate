// Shared §11 command safety checks for prd-autorun and verify-prd-ready.
export const RUNNABLE_PREFIX = /^(pnpm |node |tsx |vitest |playwright |psql |curl |test |grep )/;

export function isSafeCommand(cmd) {
  if (/[`$><]|\$\(|\bgit\s+push\b/.test(cmd)) return false;
  const segments = cmd
    .split(/&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
  return segments.length > 0 && segments.every((s) => RUNNABLE_PREFIX.test(s));
}

export function section(content, heading) {
  const m = new RegExp(`^##\\s+${heading}\\s*$`, "im").exec(content);
  if (!m) return "";
  const rest = content.slice(m.index + m[0].length);
  const next = rest.search(/^##\s+/m);
  return next === -1 ? rest : rest.slice(0, next);
}

export function parseVerificationCommands(content) {
  const verification = section(content, ".*Verification Commands.*");
  const cmds = [];
  for (const line of verification.split("\n")) {
    if (!/^\s*\|\s*FR-\d+\b/.test(line)) continue;
    for (const match of line.matchAll(/`([^`]+)`/g)) {
      const cmd = match[1].trim();
      if (RUNNABLE_PREFIX.test(cmd)) cmds.push({ cmd, safe: isSafeCommand(cmd) });
    }
  }
  const seen = new Set();
  return cmds.filter(({ cmd }) => (seen.has(cmd) ? false : seen.add(cmd)));
}
