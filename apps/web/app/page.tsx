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
      <p style={{ maxWidth: '38rem', margin: 0, lineHeight: 1.6 }}>
        Your coding agent&apos;s &quot;done&quot; is not evidence. Autonomous phases,
        machine-checkable gates, human-only push.
      </p>
      <pre
        style={{
          background: '#16191d',
          border: '1px solid #2a2e33',
          borderRadius: '8px',
          padding: '0.75rem 1.25rem',
          fontSize: '1rem',
        }}
      >
        <code>npm install -D provegate</code>
      </pre>
      <a
        href="https://github.com/provegate/provegate"
        style={{ color: '#8ab4f8', textDecoration: 'none' }}
      >
        GitHub →
      </a>
    </main>
  );
}
