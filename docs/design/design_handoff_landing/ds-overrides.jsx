/* DS override shim — the bound _ds bundle is a STALE snapshot (old verdict vocab
   + old HandoffCard API). These 4 components are re-ported faithfully from the
   UPDATED design-system source (closed vocab: passed/failed/partial/skipped/
   operator/blocked; HandoffCard variant/lines API) and reassigned onto the DS
   namespace so the page composes the current DS. Remove once the bundle is rebuilt. */
(function () {
  const DS = window.DesignSystem_65dbcc;
  if (!DS) return;

  const GL_MAP = {
    passed:  { glyph: "\u2713", color: "var(--pg-term-green)", label: "passed" },
    failed:  { glyph: "\u2717", color: "var(--pg-term-red)",   label: "failed" },
    partial: { glyph: "\u26a0", color: "var(--pg-term-amber)", label: "partial" },
    skipped: { glyph: "=",      color: "var(--pg-term-dim)",   label: "skipped" },
    operator:{ glyph: "\u2192", color: "var(--pg-term-human)", label: "operator" },
    blocked: { glyph: "!",      color: "var(--pg-term-stale)", label: "blocked" },
  };
  function GateLine({ status = "passed", name, command, code, bare = false, className = "", style = {}, ...rest }) {
    const m = GL_MAP[status] || GL_MAP.passed;
    const body = React.createElement("div", { className: `pg-gateline pg-gateline--${status} ${className}`, style: { display: "flex", alignItems: "center", gap: 10, fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem", lineHeight: 1.7, color: "var(--pg-term-fg)", ...style }, ...rest },
      React.createElement("span", { "aria-hidden": "true", style: { color: m.color, flex: "none", fontWeight: 700, width: "1ch", textAlign: "center" } }, m.glyph),
      React.createElement("span", { style: { color: "var(--pg-term-fg)" } }, name),
      command ? React.createElement("span", { style: { color: "var(--pg-term-dim)" } }, command) : null,
      React.createElement("span", { style: { flex: 1, borderBottom: "1px dotted var(--pg-term-border)", margin: "0 2px", transform: "translateY(-3px)" } }),
      React.createElement("span", { style: { color: m.color, textTransform: "lowercase" } }, m.label),
      code != null ? React.createElement("span", { style: { color: "var(--pg-term-dim)" } }, "exit ", code) : null
    );
    if (bare) return body;
    return React.createElement("div", { style: { background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-md)", padding: "12px 16px" } }, body);
  }

  const VB_MAP = {
    passed:  { glyph: "\u2713", label: "passed",  fg: "var(--pg-pass-text)",  bg: "var(--pg-pass-bg)",   bd: "var(--pg-pass)" },
    failed:  { glyph: "\u2717", label: "failed",  fg: "var(--pg-fail-text)",  bg: "var(--pg-fail-bg)",   bd: "var(--pg-fail)" },
    partial: { glyph: "\u26a0", label: "partial", fg: "var(--pg-warn-text)",  bg: "var(--pg-warn-bg)",   bd: "var(--pg-warn)" },
    skipped: { glyph: "=",      label: "skipped", fg: "var(--pg-muted)",      bg: "var(--pg-bg-subtle)", bd: "var(--pg-border-strong)" },
    operator:{ glyph: "\u2192", label: "operator",fg: "var(--pg-human-text)", bg: "var(--pg-human-bg)",  bd: "var(--pg-human)" },
    blocked: { glyph: "!",      label: "blocked", fg: "var(--pg-stale-text)", bg: "var(--pg-stale-bg)",  bd: "var(--pg-stale)" },
  };
  const VB_SIZES = { sm: { fontSize: "0.6875rem", padding: "2px 7px", gap: 5 }, md: { fontSize: "0.8125rem", padding: "3px 9px", gap: 6 } };
  function VerdictBadge({ verdict = "passed", label, code, solid = false, size = "md", className = "", style = {}, ...rest }) {
    const v = VB_MAP[verdict] || VB_MAP.passed;
    const sz = VB_SIZES[size] || VB_SIZES.md;
    const solidStyle = solid ? { background: v.bd, color: "var(--pg-term-bg)", borderColor: v.bd } : { background: v.bg, color: v.fg, borderColor: `color-mix(in srgb, ${v.bd} 35%, transparent)` };
    return React.createElement("span", { className: `pg-verdict pg-verdict--${verdict} ${className}`, style: { display: "inline-flex", alignItems: "center", gap: sz.gap, fontFamily: "var(--pg-font-mono)", fontWeight: 500, fontSize: sz.fontSize, lineHeight: 1, letterSpacing: "0.01em", textTransform: "lowercase", padding: sz.padding, borderRadius: "var(--pg-radius-sm)", border: "1px solid", ...solidStyle, ...style }, ...rest },
      React.createElement("span", { "aria-hidden": "true", style: { fontWeight: 700 } }, v.glyph),
      label || v.label,
      code != null ? React.createElement("span", { style: { opacity: 0.7 } }, "\u00b7 exit ", code) : null
    );
  }

  const HC_GLYPH = {
    passed:  ["\u2713", "var(--pg-term-green)"],
    failed:  ["\u2717", "var(--pg-term-red)"],
    partial: ["\u26a0", "var(--pg-term-amber)"],
    skipped: ["=",      "var(--pg-term-dim)"],
    operator:["\u2192", "var(--pg-term-human)"],
    blocked: ["!",      "var(--pg-term-stale)"],
  };
  const HCLine = ({ children, style }) => React.createElement("div", { style: { whiteSpace: "pre", ...style } }, children);
  function HandoffCard({ variant = "handoff", title, width = 56, lines = [], className = "", style = {}, ...rest }) {
    const headColor = variant === "stopped" ? "var(--pg-term-red)" : "var(--pg-term-green)";
    const head = title || (variant === "stopped" ? "STOPPED" : "HANDOFF CARD");
    const gutter = React.createElement("span", { style: { color: "var(--pg-term-border)" } }, "\u2502");
    const topFill = "\u2500".repeat(Math.max(2, width - 4 - head.length));
    const bottom = "\u2500".repeat(Math.max(4, width - 1));
    return React.createElement("div", { className: `pg-handoff pg-handoff--${variant} ${className}`, style: { background: "var(--pg-term-bg)", border: "1px solid var(--pg-term-border)", borderRadius: "var(--pg-radius-md)", fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem", lineHeight: 1.75, color: "var(--pg-term-fg)", padding: "14px 18px", overflowX: "auto", ...style }, ...rest },
      React.createElement(HCLine, { style: { color: headColor } }, `\u250c\u2500 ${head} ${topFill}`),
      lines.map((ln, i) => {
        if (ln == null || ln.blank) return React.createElement(HCLine, { key: i }, gutter);
        if (typeof ln === "string") return React.createElement(HCLine, { key: i }, gutter, React.createElement("span", null, " " + ln));
        if (ln.gate) { const [g, c] = HC_GLYPH[ln.gate] || HC_GLYPH.passed; return React.createElement(HCLine, { key: i }, gutter, React.createElement("span", null, "   "), React.createElement("span", { style: { color: c, fontWeight: 700 } }, g), React.createElement("span", null, ` ${ln.text}`)); }
        if (ln.arrow) return React.createElement(HCLine, { key: i }, gutter, React.createElement("span", { style: { color: "var(--pg-term-human)" } }, ` \u2192 ${ln.text}`));
        return React.createElement(HCLine, { key: i }, gutter, React.createElement("span", null, ` ${ln.text || ""}`));
      }),
      React.createElement(HCLine, { style: { color: headColor } }, `\u2514${bottom}`)
    );
  }

  function EvidenceTable({ rows = [], caption, className = "", style = {}, ...rest }) {
    const th = { textAlign: "left", fontFamily: "var(--pg-font-mono)", fontSize: "0.6875rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--pg-text-subtle)", fontWeight: 500, padding: "10px 14px", borderBottom: "1px solid var(--pg-border)", whiteSpace: "nowrap" };
    const td = { padding: "11px 14px", fontSize: "0.875rem", color: "var(--pg-text)", borderBottom: "1px solid var(--pg-border)", verticalAlign: "middle" };
    const mono = { fontFamily: "var(--pg-font-mono)", fontSize: "0.8125rem", color: "var(--pg-text-muted)" };
    return React.createElement("div", { className: `pg-evidence ${className}`, style: { border: "1px solid var(--pg-border)", borderRadius: "var(--pg-radius-md)", overflow: "hidden", background: "var(--pg-surface)", ...style }, ...rest },
      React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontFamily: "var(--pg-font-sans)" } },
        caption ? React.createElement("caption", { style: { captionSide: "top", textAlign: "left", padding: "12px 14px 0", fontFamily: "var(--pg-font-mono)", fontSize: "0.75rem", color: "var(--pg-text-subtle)" } }, caption) : null,
        React.createElement("thead", null, React.createElement("tr", null,
          React.createElement("th", { style: th }, "check"),
          React.createElement("th", { style: th }, "command"),
          React.createElement("th", { style: th }, "verdict"),
          React.createElement("th", { style: { ...th, textAlign: "right" } }, "exit"),
          React.createElement("th", { style: th }, "evidence")
        )),
        React.createElement("tbody", null, rows.map((r, i) => React.createElement("tr", { key: i },
          React.createElement("td", { style: { ...td, fontWeight: 500 } }, r.check),
          React.createElement("td", { style: { ...td, ...mono } }, r.command),
          React.createElement("td", { style: td }, React.createElement(VerdictBadge, { verdict: r.verdict, size: "sm" })),
          React.createElement("td", { style: { ...td, ...mono, textAlign: "right", color: r.verdict === "failed" ? "var(--pg-fail-text)" : "var(--pg-text-muted)" } }, r.code != null ? r.code : "\u2014"),
          React.createElement("td", { style: { ...td, ...mono, color: "var(--pg-text-subtle)" } }, r.evidence || "\u2014")
        )))
      )
    );
  }

  Object.assign(DS, { GateLine, VerdictBadge, HandoffCard, EvidenceTable });
})();
