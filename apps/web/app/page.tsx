export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1.5rem',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '-0.02em' }}>ProveGate</h1>
      <p style={{ fontSize: '1.25rem', margin: 0, color: '#9aa0a6' }}>
        prove it, then let it propagate.
      </p>
      <p style={{ maxWidth: '40rem', margin: 0, lineHeight: 1.6 }}>
        Your coding agent&apos;s &quot;done&quot; is not evidence. Seven phases where every
        autonomous boundary is a machine-checkable gate — a verification command&apos;s exit code
        or an independent cross-model reviewer&apos;s structured verdict — and nothing pushes to a
        remote without a human. Hardened over ~390 production work items. MIT, agent-agnostic,
        bring your own gates.
      </p>
      <pre
        style={{
          background: '#16191d',
          border: '1px solid #2a2e33',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          fontSize: '1rem',
          textAlign: 'left',
        }}
      >
        <code>{'npm install -D provegate\nnpx gate init'}</code>
      </pre>
      <div style={{ display: 'flex', gap: '1.5rem' }}>
        <a href="/docs/quickstart" style={{ color: '#8ab4f8', textDecoration: 'none' }}>
          Quickstart →
        </a>
        <a href="/docs/case-study" style={{ color: '#8ab4f8', textDecoration: 'none' }}>
          The evidence →
        </a>
        <a
          href="https://github.com/provegate/provegate"
          style={{ color: '#8ab4f8', textDecoration: 'none' }}
        >
          GitHub →
        </a>
      </div>
    </main>
  );
}
