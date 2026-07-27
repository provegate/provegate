'use client';

import * as React from 'react';
import { CodeBlock } from '@provegate/design/react';
import { Reveal } from './reveal';
import { SectionHead, section, shell } from './ui';
import * as C from './content';

interface Tab {
  id: string;
  label: string;
}

/**
 * Hairline tab strip. The active underline is neutral `--pg-text`, never green:
 * the colour law reserves green for an earned pass, and a selected tab is not
 * evidence of anything.
 */
function Tabs({
  tabs,
  value,
  onChange,
  idPrefix,
}: {
  tabs: readonly Tab[];
  value: string;
  onChange: (id: string) => void;
  idPrefix: string;
}): React.JSX.Element {
  return (
    <div
      role="tablist"
      aria-label={idPrefix}
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--pg-border)',
        marginBottom: 16,
        flexWrap: 'wrap',
      }}
    >
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${t.id}`}
            aria-selected={active}
            aria-controls={`${idPrefix}-panel-${t.id}`}
            onClick={() => onChange(t.id)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--pg-font-mono)',
              fontSize: 'var(--pg-text-sm)',
              padding: '9px 14px',
              color: active ? 'var(--pg-text)' : 'var(--pg-text-subtle)',
              borderBottom: active ? '2px solid var(--pg-text)' : '2px solid transparent',
              marginBottom: -1,
              fontWeight: active ? 600 : 400,
            }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** Install, per package manager. Only the two the package actually ships through. */
export function InstallTabs(): React.JSX.Element {
  const [tab, setTab] = React.useState<string>(C.INSTALLERS[0].id);
  const current = C.INSTALLERS.find((i) => i.id === tab) ?? C.INSTALLERS[0];
  return (
    <section style={{ ...shell, ...section, paddingBottom: 0 }}>
      <SectionHead
        eyebrow="// install"
        title="Install however you ship."
        sub="One package, zero runtime dependencies, Node ≥ 22. The gates are the same either way — they are your commands, not ours."
      />
      <div style={{ maxWidth: 620 }}>
        <Reveal>
          <Tabs tabs={C.INSTALLERS} value={tab} onChange={setTab} idPrefix="install" />
          <div
            role="tabpanel"
            id={`install-panel-${current.id}`}
            aria-labelledby={`install-tab-${current.id}`}
          >
            <CodeBlock filename={current.file} prompt copyable>
              {current.code}
            </CodeBlock>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/**
 * CI integration. The CLI has no CI-mode flag — the gates are ordinary commands,
 * so CI runs the same ones the manifest declares. That is the whole integration.
 */
export function CIIntegration(): React.JSX.Element {
  const [tab, setTab] = React.useState<string>(C.CI_SNIPPETS[0].id);
  const current = C.CI_SNIPPETS.find((s) => s.id === tab) ?? C.CI_SNIPPETS[0];
  return (
    <section id="ci" style={{ ...shell, ...section }}>
      <SectionHead
        eyebrow="// ci integration"
        title="Same gates in CI. Exit codes travel."
        sub="A gate is a command, so it drops into any pipeline unchanged — no plugin, no adapter, no ProveGate-specific runner. The one thing CI must not do is push on your behalf, and it can't: the runner has no push code path."
      />
      <div style={{ maxWidth: 680 }}>
        <Reveal>
          <Tabs tabs={C.CI_SNIPPETS} value={tab} onChange={setTab} idPrefix="ci" />
          <div role="tabpanel" id={`ci-panel-${current.id}`} aria-labelledby={`ci-tab-${current.id}`}>
            <CodeBlock filename={current.file} copyable>
              {current.code}
            </CodeBlock>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
