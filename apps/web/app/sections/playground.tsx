'use client';

import * as React from 'react';
import { Icon } from '@provegate/design/react';
import { mono, terminal, termButton } from './ui';
import * as C from './content';

/** The phase keys the runner actually executes (`core/gates/manifest.ts`). */
const RUNNER_PHASES = ['4', '6', '7'];
const KNOWN_KEYS = ['phases', 'classDefaults', 'hardCaps', 'postMerge', 'wiringExceptions'];

export interface ManifestIssue {
  path: string;
  message: string;
}

interface PlanLine {
  text: string;
  kind: 'header' | 'cmd' | 'builtin' | 'tail';
}

interface PlanResult {
  issues: ManifestIssue[];
  lines: PlanLine[];
  gateCount: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCommandArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string' && v.trim().length > 0);
}

/**
 * The shipped validation, rule for rule: unknown top-level keys, `phases` shape,
 * phase keys outside the runner set, and non-command arrays. Same messages the
 * CLI prints, so a manifest this editor accepts is one `gate run` accepts.
 */
export function validateManifest(value: unknown): ManifestIssue[] {
  const issues: ManifestIssue[] = [];
  if (!isPlainObject(value)) return [{ path: '', message: 'manifest must be a JSON object' }];
  for (const key of Object.keys(value)) {
    if (!KNOWN_KEYS.includes(key)) issues.push({ path: key, message: 'unknown key' });
  }
  const phases = value['phases'];
  if (phases !== undefined) {
    if (!isPlainObject(phases)) {
      issues.push({ path: 'phases', message: 'must be an object of phase → command list' });
    } else {
      for (const [phase, cmds] of Object.entries(phases)) {
        if (!RUNNER_PHASES.includes(phase)) {
          issues.push({
            path: `phases.${phase}`,
            message: `unknown phase key (runner executes ${RUNNER_PHASES.join(', ')})`,
          });
        }
        if (!isCommandArray(cmds)) {
          issues.push({ path: `phases.${phase}`, message: 'must be an array of non-empty commands' });
        }
      }
    }
  }
  return issues;
}

/**
 * Build the chain `gate run --dry-run` would print for this manifest, in the
 * shipped `planChain` grammar. Phases 5, 6 and 7 carry built-in gates the
 * manifest cannot remove — they are shown as such, not as manifest entries.
 */
export function planFor(source: string): PlanResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch (error) {
    const why = error instanceof Error ? error.message : 'invalid JSON';
    return { issues: [{ path: 'gates.manifest.json', message: why }], lines: [], gateCount: 0 };
  }

  const issues = validateManifest(parsed);
  if (issues.length > 0) return { issues, lines: [], gateCount: 0 };

  const phases = (isPlainObject(parsed) ? parsed['phases'] : undefined) ?? {};
  const at = (key: string): string[] => {
    const value = isPlainObject(phases) ? phases[key] : undefined;
    return isCommandArray(value) ? value : [];
  };

  const lines: PlanLine[] = [];
  let gateCount = 0;
  const header = (text: string): void => void lines.push({ text: `── Phase ${text}`, kind: 'header' });
  const cmd = (text: string): void => {
    lines.push({ text: `     • ${text}`, kind: 'cmd' });
    gateCount += 1;
  };
  const builtin = (text: string): void => {
    lines.push({ text: `     • gate: ${text}`, kind: 'builtin' });
    gateCount += 1;
  };

  const phase4 = at('4');
  if (phase4.length > 0) {
    header('4 Implementation');
    for (const c of phase4) cmd(c);
  }

  header('5 Testing');
  builtin(C.BUILTIN_GATES['5']);

  header('6 Final Auditing');
  builtin(C.BUILTIN_GATES['6']);
  const phase6 = at('6');
  if (phase6.length > 0) {
    header('6 Final Auditing');
    for (const c of phase6) cmd(c);
  }

  header('7 Learning');
  builtin(C.BUILTIN_GATES['7']);
  const phase7 = at('7');
  if (phase7.length > 0) {
    header('7 Learning');
    for (const c of phase7) cmd(c);
  }

  for (const text of C.PLAN_TAIL) lines.push({ text, kind: 'tail' });
  return { issues: [], lines, gateCount };
}

const LINE_COLOR: Record<PlanLine['kind'], string> = {
  header: 'var(--pg-term-fg)',
  cmd: 'var(--pg-term-fg)',
  builtin: 'var(--pg-term-dim)',
  tail: 'var(--pg-term-dim)',
};

/**
 * Edit the real `gates.manifest.json` and watch the plan `gate run --dry-run`
 * would print. It is a PLAN, so nothing carries a verdict: no green is shown
 * for work that has not run (the colour law — green is earned).
 */
export function Playground(): React.JSX.Element {
  const [src, setSrc] = React.useState<string>(C.MANIFEST_SEED);
  const plan = React.useMemo(() => planFor(src), [src]);

  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'stretch' }}
      className="pg-play-grid"
    >
      <div style={{ ...terminal, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 14px',
            borderBottom: '1px solid var(--pg-term-border)',
            color: 'var(--pg-term-dim)',
            ...mono,
            fontSize: 'var(--pg-text-xs)',
          }}
        >
          <Icon name="terminal" size={14} /> gates.manifest.json
          <button
            type="button"
            onClick={() => setSrc(C.MANIFEST_SEED)}
            aria-label="Reset the manifest to the default"
            style={termButton}
          >
            reset
          </button>
        </div>
        <label htmlFor="pg-manifest" className="pg-visually-hidden">
          gates.manifest.json source
        </label>
        <textarea
          id="pg-manifest"
          value={src}
          onChange={(e) => setSrc(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            minHeight: 280,
            resize: 'vertical',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--pg-term-fg)',
            fontFamily: 'var(--pg-font-mono)',
            fontSize: 'var(--pg-text-sm)',
            lineHeight: 'var(--pg-leading-relaxed)',
            padding: '14px 16px',
          }}
        />
      </div>

      <div
        style={{
          ...terminal,
          padding: '16px 18px',
          height: '100%',
          ...mono,
          fontSize: 'var(--pg-text-sm)',
          lineHeight: 'var(--pg-leading-relaxed)',
        }}
      >
        <div style={{ color: 'var(--pg-term-plan)', marginBottom: 10 }}>$ gate run --dry-run PRD-001</div>
        {plan.issues.length > 0 ? (
          <div aria-live="polite">
            <div style={{ color: 'var(--pg-term-red)' }}>[run] gates.manifest.json is invalid — nothing planned</div>
            {plan.issues.map((issue) => (
              <div key={`${issue.path}:${issue.message}`} style={{ color: 'var(--pg-term-red)' }}>
                {`  - ${issue.path}: ${issue.message}`}
              </div>
            ))}
          </div>
        ) : (
          <div aria-live="polite">
            {plan.lines.map((l) => (
              <div key={l.text} style={{ color: LINE_COLOR[l.kind], whiteSpace: 'pre-wrap' }}>
                {`  ${l.text}`}
              </div>
            ))}
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: '1px dotted var(--pg-term-border)',
                color: 'var(--pg-term-plan)',
              }}
            >
              {C.PLAN_FOOTER}
            </div>
            <div style={{ color: 'var(--pg-term-dim)' }}>
              {`[run] ${plan.gateCount} gates planned — nothing executed, nothing merged, nothing pushed`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
