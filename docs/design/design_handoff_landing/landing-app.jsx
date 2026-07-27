const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "depth": "full",
  "rhythm": "standard",
  "voice": "editorial"
}/*EDITMODE-END*/;

/* Which sections belong to each narrative depth. "full" = everything. */
const PG_ESSENTIALS = ["Nav","Hero","TrustStrip","Problem","CoreRule","How","Playground","Phases","Refusal","Proof","Comparison","InstallTabs","FaqAndQuickstart","Install","Footer"];
const PG_SKIM = ["Nav","Hero","TrustStrip","CoreRule","How","Playground","Proof","Install","Footer"];
const PG_ORDER = ["Nav","Hero","TrustStrip","Problem","CoreRule","How","Playground","Phases","PhaseDetail","OperatorFlow","Refusal","Ledger","Proof","Anatomy","Comparison","Positioning","Features","InstallTabs","CommandRef","CIIntegration","FaqAndQuickstart","Install","Footer"];

const PG_RHYTHM_CSS = {
  airy: `[data-rhythm="airy"]{--pg-container:1000px}
[data-rhythm="airy"] #root section{padding-top:132px!important;padding-bottom:132px!important}
[data-rhythm="airy"] #root section>div:only-child{padding-top:132px!important;padding-bottom:132px!important}`,
  standard: ``,
  tight: `[data-rhythm="tight"]{--pg-container:1220px}
[data-rhythm="tight"] #root section{padding-top:46px!important;padding-bottom:46px!important}
[data-rhythm="tight"] #root section>div:only-child{padding-top:46px!important;padding-bottom:46px!important}`
};
const PG_VOICE_CSS = {
  editorial: ``,
  terminal: `[data-voice="terminal"] #root h1,[data-voice="terminal"] #root h2,[data-voice="terminal"] #root h3{font-family:var(--pg-font-mono)!important;font-weight:500!important;letter-spacing:-0.012em!important}
[data-voice="terminal"] #root h1{font-size:clamp(2.1rem,4.1vw,2.9rem)!important;line-height:1.12!important}
[data-voice="terminal"] #root h2{line-height:1.2!important}`,
  quiet: `[data-voice="quiet"] #root h1{font-weight:400!important;font-size:clamp(2.1rem,4vw,2.85rem)!important;letter-spacing:-0.02em!important}
[data-voice="quiet"] #root h2{font-weight:400!important;font-size:clamp(1.4rem,2.5vw,1.85rem)!important}
[data-voice="quiet"] #root h3{font-weight:500!important}`
};

function ProveGateLanding() {
  const { useTweaks, TweaksPanel, TweakSection, TweakRadio } = window;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [theme, setTheme] = React.useState("dark");
  React.useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  React.useEffect(() => {
    const el = document.documentElement;
    el.setAttribute("data-rhythm", t.rhythm);
    el.setAttribute("data-voice", t.voice);
  }, [t.rhythm, t.voice]);

  const allowed = t.depth === "skim" ? PG_SKIM : t.depth === "essentials" ? PG_ESSENTIALS : PG_ORDER;
  const show = (k) => allowed.indexOf(k) !== -1;
  const navLinks = [["How it works", "#how", "How"], ["Method", "#phases", "Phases"], ["Ledger", "#ledger", "Ledger"], ["Proof", "#proof", "Proof"], ["Install", "#install", "Install"]].filter(l => show(l[2])).map(l => [l[0], l[1]]);

  return (
    <div style={{ background: "var(--pg-bg)", minHeight: "100vh", fontFamily: "var(--pg-font-sans)" }}>
      <style>{(PG_RHYTHM_CSS[t.rhythm] || "") + "\n" + (PG_VOICE_CSS[t.voice] || "")}</style>
      <window.PG_Nav theme={theme} links={navLinks} onToggle={() => setTheme(x => x === "dark" ? "light" : "dark")} />
      <window.PG_Hero />
      <window.PG_TrustStrip />
      {show("Problem") ? <window.PG_Problem /> : null}
      <window.PG_CoreRule />
      <window.PG_How />
      {show("Playground") ? <window.PG_Playground /> : null}
      {show("Phases") ? <window.PG_Phases /> : null}
      {show("PhaseDetail") ? <window.PG_PhaseDetail /> : null}
      {show("OperatorFlow") ? <window.PG_OperatorFlow /> : null}
      {show("Refusal") ? <window.PG_Refusal /> : null}
      {show("Ledger") ? <window.PG_Ledger /> : null}
      {show("Proof") ? <window.PG_Proof /> : null}
      {show("Anatomy") ? <window.PG_Anatomy /> : null}
      {show("Comparison") ? <window.PG_Comparison /> : null}
      {show("Positioning") ? <window.PG_Positioning /> : null}
      {show("Features") ? <window.PG_Features /> : null}
      {show("InstallTabs") ? <window.PG_InstallTabs /> : null}
      {show("CommandRef") ? <window.PG_CommandRef /> : null}
      {show("CIIntegration") ? <window.PG_CIIntegration /> : null}
      {show("FaqAndQuickstart") ? <window.PG_FaqAndQuickstart /> : null}
      <window.PG_Install />
      <window.PG_Footer />
      <TweaksPanel>
        <TweakSection label="Narrative" />
        <TweakRadio label="Depth" value={t.depth} options={["skim", "essentials", "full"]} onChange={(v) => setTweak("depth", v)} />
        <TweakSection label="Pacing" />
        <TweakRadio label="Rhythm" value={t.rhythm} options={["tight", "standard", "airy"]} onChange={(v) => setTweak("rhythm", v)} />
        <TweakSection label="Type" />
        <TweakRadio label="Voice" value={t.voice} options={["editorial", "terminal", "quiet"]} onChange={(v) => setTweak("voice", v)} />
      </TweaksPanel>
    </div>
  );
}
window.ProveGateLanding = ProveGateLanding;
