function ProveGateLanding() {
  const [theme, setTheme] = React.useState("dark");
  React.useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  return (
    <div style={{ background: "var(--pg-bg)", minHeight: "100vh", fontFamily: "var(--pg-font-sans)" }}>
      <window.PG_Nav theme={theme} onToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      <window.PG_Hero />
      <window.PG_TrustStrip />
      <window.PG_Problem />
      <window.PG_CoreRule />
      <window.PG_How />
      <window.PG_Playground />
      <window.PG_Phases />
      <window.PG_PhaseDetail />
      <window.PG_OperatorFlow />
      <window.PG_Refusal />
      <window.PG_Ledger />
      <window.PG_Proof />
      <window.PG_Anatomy />
      <window.PG_Comparison />
      <window.PG_Positioning />
      <window.PG_Features />
      <window.PG_InstallTabs />
      <window.PG_CommandRef />
      <window.PG_CIIntegration />
      <window.PG_FaqAndQuickstart />
      <window.PG_Install />
      <window.PG_Footer />
    </div>
  );
}
window.ProveGateLanding = ProveGateLanding;
