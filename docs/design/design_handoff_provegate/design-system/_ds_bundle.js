/* @ds-bundle: {"format":4,"namespace":"DesignSystem_65dbcc","components":[{"name":"CodeBlock","sourcePath":"components/cli/CodeBlock.jsx"},{"name":"GateLine","sourcePath":"components/cli/GateLine.jsx"},{"name":"HandoffCard","sourcePath":"components/cli/HandoffCard.jsx"},{"name":"Icon","sourcePath":"components/core/Icon.jsx"},{"name":"EvidenceTable","sourcePath":"components/data/EvidenceTable.jsx"},{"name":"PhasePipeline","sourcePath":"components/diagram/PhasePipeline.jsx"},{"name":"Admonition","sourcePath":"components/feedback/Admonition.jsx"},{"name":"VerdictBadge","sourcePath":"components/feedback/VerdictBadge.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"}],"sourceHashes":{"components/cli/CodeBlock.jsx":"aa176d85170f","components/cli/GateLine.jsx":"b23ebc293ae7","components/cli/HandoffCard.jsx":"fb8ce6cb40be","components/core/Icon.jsx":"dff1d7d43bf2","components/data/EvidenceTable.jsx":"82522607211e","components/diagram/PhasePipeline.jsx":"efcb23b7ed90","components/feedback/Admonition.jsx":"3b5128fa3214","components/feedback/VerdictBadge.jsx":"909cb75401fc","components/forms/Button.jsx":"ee6852cda36d","ui_kits/docs/Docs.jsx":"c97c70db1fed","ui_kits/landing/Landing.jsx":"15d9c931b94c"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_65dbcc = window.DesignSystem_65dbcc || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/cli/GateLine.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// A single gate-result line, as printed by `gate run`. Terminal surface.
// The glyph carries status (color is redundant → NO_COLOR loses nothing).
// Vocabulary is the closed ledger set. Glyph + name (left), verdict + exit (right).
const MAP = {
  passed: {
    glyph: "\u2713",
    color: "var(--pg-term-green)",
    label: "passed"
  },
  failed: {
    glyph: "\u2717",
    color: "var(--pg-term-red)",
    label: "failed"
  },
  partial: {
    glyph: "\u26a0",
    color: "var(--pg-term-amber)",
    label: "partial"
  },
  skipped: {
    glyph: "=",
    color: "var(--pg-term-dim)",
    label: "skipped"
  },
  operator: {
    glyph: "\u2192",
    color: "var(--pg-term-human)",
    label: "operator"
  },
  blocked: {
    glyph: "!",
    color: "var(--pg-term-stale)",
    label: "blocked"
  }
};
function GateLine({
  status = "passed",
  name,
  command,
  code,
  bare = false,
  className = "",
  style = {},
  ...rest
}) {
  const m = MAP[status] || MAP.passed;
  const body = /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-gateline pg-gateline--${status} ${className}`,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.8125rem",
      lineHeight: 1.7,
      color: "var(--pg-term-fg)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      color: m.color,
      flex: "none",
      fontWeight: 700,
      width: "1ch",
      textAlign: "center"
    }
  }, m.glyph), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-term-fg)"
    }
  }, name), command ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-term-dim)"
    }
  }, command) : null, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      borderBottom: "1px dotted var(--pg-term-border)",
      margin: "0 2px",
      transform: "translateY(-3px)"
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      color: m.color,
      textTransform: "lowercase"
    }
  }, m.label), code != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-term-dim)"
    }
  }, "exit ", code) : null);
  if (bare) return body;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--pg-term-bg)",
      border: "1px solid var(--pg-term-border)",
      borderRadius: "var(--pg-radius-md)",
      padding: "12px 16px"
    }
  }, body);
}
Object.assign(__ds_scope, { GateLine });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cli/GateLine.jsx", error: String((e && e.message) || e) }); }

// components/cli/HandoffCard.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// The card family — how `gate run` summarizes a phase and hands off, refuses,
// or stops. Copy-exact box-drawing: these specimens become string builders in
// packages/provegate (src/core/run/cards.ts). 56-char rule, "│" gutter.
// The glyph carries status; color is redundant (NO_COLOR loses nothing).
const GLYPH = {
  passed: ["\u2713", "var(--pg-term-green)"],
  failed: ["\u2717", "var(--pg-term-red)"],
  partial: ["\u26a0", "var(--pg-term-amber)"],
  skipped: ["=", "var(--pg-term-dim)"],
  operator: ["\u2192", "var(--pg-term-human)"],
  blocked: ["!", "var(--pg-term-stale)"]
};
function Line({
  children,
  style
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      whiteSpace: "pre",
      ...style
    }
  }, children);
}
function HandoffCard({
  variant = "handoff",
  title,
  width = 56,
  lines = [],
  className = "",
  style = {},
  ...rest
}) {
  const headColor = variant === "stopped" ? "var(--pg-term-red)" : "var(--pg-term-green)";
  const head = title || (variant === "stopped" ? "STOPPED" : "HANDOFF CARD");
  const gutter = /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-term-border)"
    }
  }, "\u2502");
  const topFill = "\u2500".repeat(Math.max(2, width - 4 - head.length));
  const bottom = "\u2500".repeat(Math.max(4, width - 1));
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-handoff pg-handoff--${variant} ${className}`,
    style: {
      background: "var(--pg-term-bg)",
      border: "1px solid var(--pg-term-border)",
      borderRadius: "var(--pg-radius-md)",
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.8125rem",
      lineHeight: 1.75,
      color: "var(--pg-term-fg)",
      padding: "14px 18px",
      overflowX: "auto",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement(Line, {
    style: {
      color: headColor
    }
  }, `\u250c\u2500 ${head} ${topFill}`), lines.map((ln, i) => {
    if (ln == null || ln.blank) return /*#__PURE__*/React.createElement(Line, {
      key: i
    }, gutter);
    if (typeof ln === "string") return /*#__PURE__*/React.createElement(Line, {
      key: i
    }, gutter, /*#__PURE__*/React.createElement("span", null, " ", ln));
    if (ln.gate) {
      const [g, c] = GLYPH[ln.gate] || GLYPH.passed;
      return /*#__PURE__*/React.createElement(Line, {
        key: i
      }, gutter, /*#__PURE__*/React.createElement("span", null, "   "), /*#__PURE__*/React.createElement("span", {
        style: {
          color: c,
          fontWeight: 700
        }
      }, g), /*#__PURE__*/React.createElement("span", null, ` ${ln.text}`));
    }
    if (ln.arrow) return /*#__PURE__*/React.createElement(Line, {
      key: i
    }, gutter, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--pg-term-human)"
      }
    }, ` \u2192 ${ln.text}`));
    return /*#__PURE__*/React.createElement(Line, {
      key: i
    }, gutter, /*#__PURE__*/React.createElement("span", null, ` ${ln.text || ""}`));
  }), /*#__PURE__*/React.createElement(Line, {
    style: {
      color: headColor
    }
  }, `\u2514${bottom}`));
}
Object.assign(__ds_scope, { HandoffCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cli/HandoffCard.jsx", error: String((e && e.message) || e) }); }

// components/core/Icon.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ProveGate icon set. Minimal, geometric, single-stroke, currentColor.
// 24x24 grid, 2px stroke, round caps/joins. Human-gate vs machine-gate
// are deliberately distinct glyphs (see `human` vs `machine`).
const PATHS = {
  // brand
  gate: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
    d: "M5 3v18M19 3v18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 12l3 3 5-6"
  })),
  check: /*#__PURE__*/React.createElement("path", {
    d: "M4 12l5 5L20 6"
  }),
  cross: /*#__PURE__*/React.createElement("path", {
    d: "M6 6l12 12M18 6L6 18"
  }),
  pending: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4l3 2"
  })),
  // authority
  human: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "7",
    r: "3",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6"
  })),
  machine: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "6",
    width: "16",
    height: "12",
    rx: "1.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 10l2.5 2L7 14M12.5 14H16"
  })),
  lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "5",
    y: "11",
    width: "14",
    height: "9",
    rx: "1.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V8a4 4 0 0 1 8 0v3"
  })),
  // exit-0 seal
  exit0: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("ellipse", {
    cx: "12",
    cy: "12",
    rx: "3",
    ry: "4.5",
    fill: "none"
  })),
  merge: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "2.4",
    fill: "none"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "18",
    r: "2.4",
    fill: "none"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "12",
    r: "2.4",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 8.4v7.2M8.2 6.9c1.2 4 4 4.8 7.4 5"
  })),
  terminal: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "4",
    width: "18",
    height: "16",
    rx: "1.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M7 9l3 3-3 3M13 15h4"
  })),
  copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "9",
    width: "11",
    height: "11",
    rx: "1.5",
    fill: "none"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 15V5a1 1 0 0 1 1-1h9"
  })),
  arrowRight: /*#__PURE__*/React.createElement("path", {
    d: "M4 12h15M13 6l6 6-6 6"
  }),
  chevronRight: /*#__PURE__*/React.createElement("path", {
    d: "M9 6l6 6-6 6"
  }),
  github: /*#__PURE__*/React.createElement("path", {
    d: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.36 1.09 2.94.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z",
    strokeWidth: "0",
    fill: "currentColor"
  })
};
function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className = "",
  style = {},
  title,
  ...rest
}) {
  const inner = PATHS[name] || PATHS.gate;
  return /*#__PURE__*/React.createElement("svg", _extends({
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    role: title ? "img" : "presentation",
    "aria-label": title,
    "aria-hidden": title ? undefined : true,
    className: className,
    style: {
      display: "inline-block",
      verticalAlign: "middle",
      flex: "none",
      ...style
    }
  }, rest), title ? /*#__PURE__*/React.createElement("title", null, title) : null, inner);
}
Object.assign(__ds_scope, { Icon });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Icon.jsx", error: String((e && e.message) || e) }); }

// components/cli/CodeBlock.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Terminal code block. ALWAYS dark (terminal is its own always-dark surface).
// Evidence is monospace — commands, config, logs. Optional filename tab + copy.
function CodeBlock({
  children,
  filename,
  lang,
  prompt = false,
  copyable = true,
  className = "",
  style = {},
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const text = typeof children === "string" ? children : "";
  const doCopy = () => {
    if (text && navigator.clipboard) navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  const lines = String(children).replace(/\n$/, "").split("\n");
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-code ${className}`,
    style: {
      background: "var(--pg-term-bg)",
      border: "1px solid var(--pg-term-border)",
      borderRadius: "var(--pg-radius-md)",
      overflow: "hidden",
      fontFamily: "var(--pg-font-mono)",
      ...style
    }
  }, rest), (filename || lang || copyable) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 12px",
      borderBottom: "1px solid var(--pg-term-border)",
      color: "var(--pg-term-dim)",
      fontSize: "0.75rem"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 8
    }
  }, filename ? /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "terminal",
    size: 14
  }) : null, filename || /*#__PURE__*/React.createElement("span", {
    style: {
      textTransform: "uppercase",
      letterSpacing: "0.08em"
    }
  }, lang)), copyable && /*#__PURE__*/React.createElement("button", {
    onClick: doCopy,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      background: "transparent",
      border: "none",
      cursor: "pointer",
      color: copied ? "var(--pg-term-green)" : "var(--pg-term-dim)",
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.7rem",
      padding: 0
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: copied ? "check" : "copy",
    size: 13
  }), copied ? "copied" : "copy")), /*#__PURE__*/React.createElement("pre", {
    style: {
      margin: 0,
      padding: "14px 16px",
      overflowX: "auto",
      fontSize: "0.8125rem",
      lineHeight: 1.6
    }
  }, /*#__PURE__*/React.createElement("code", {
    style: {
      color: "var(--pg-term-fg)",
      fontFamily: "var(--pg-font-mono)"
    }
  }, lines.map((ln, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      whiteSpace: "pre"
    }
  }, prompt ? /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-term-green)",
      userSelect: "none"
    }
  }, "$ ") : null, ln)))));
}
Object.assign(__ds_scope, { CodeBlock });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/cli/CodeBlock.jsx", error: String((e && e.message) || e) }); }

// components/diagram/PhasePipeline.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// The phase pipeline. Human gates and machine gates are drawn distinctly:
// human = person glyph + operator-authority blue; machine = chip glyph + neutral.
// Default: phases 1-3 human, 4-7 autonomous, push always human.
const DEFAULT_PHASES = [{
  n: 1,
  label: "PRD",
  authority: "human"
}, {
  n: 2,
  label: "Readiness",
  authority: "human"
}, {
  n: 3,
  label: "Tasks",
  authority: "human"
}, {
  n: 4,
  label: "Implement",
  authority: "machine"
}, {
  n: 5,
  label: "Test",
  authority: "machine"
}, {
  n: 6,
  label: "Audit",
  authority: "machine"
}, {
  n: 7,
  label: "Learn",
  authority: "machine"
}];
function Node({
  p,
  active
}) {
  const human = p.authority === "human";
  const color = human ? "var(--pg-human)" : "var(--pg-text-muted)";
  const bg = human ? "var(--pg-human-bg)" : "var(--pg-bg-subtle)";
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
      minWidth: 78
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 46,
      height: 46,
      borderRadius: human ? "var(--pg-radius-pill)" : "var(--pg-radius-md)",
      background: bg,
      border: `1.5px solid ${active ? color : `color-mix(in srgb, ${color} 45%, transparent)`}`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color,
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: human ? "human" : "machine",
    size: 22,
    strokeWidth: 2
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -7,
      right: -7,
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "var(--pg-surface)",
      border: `1px solid ${color}`,
      color,
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.625rem",
      fontWeight: 600,
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, p.n)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--pg-font-sans)",
      fontSize: "0.8125rem",
      fontWeight: 600,
      color: "var(--pg-text)",
      letterSpacing: "-0.01em"
    }
  }, p.label), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.625rem",
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color
    }
  }, human ? "human" : "auto")));
}
function Connector({
  boundary
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 16,
      display: "flex",
      alignItems: "center",
      height: 46,
      position: "relative",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      height: 0,
      borderTop: boundary ? "1.5px dashed var(--pg-border-strong)" : "1.5px solid var(--pg-border-strong)"
    }
  }), boundary ? /*#__PURE__*/React.createElement("span", {
    style: {
      position: "absolute",
      top: -20,
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.5625rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--pg-text-subtle)",
      background: "var(--pg-surface)",
      padding: "0 4px",
      whiteSpace: "nowrap"
    }
  }, "hand off") : null);
}
function PhasePipeline({
  phases = DEFAULT_PHASES,
  showPush = true,
  active,
  className = "",
  style = {},
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-pipeline ${className}`,
    style: {
      background: "var(--pg-surface)",
      border: "1px solid var(--pg-border)",
      borderRadius: "var(--pg-radius-lg)",
      padding: "26px 22px 20px",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 4,
      flexWrap: "wrap",
      rowGap: 20
    }
  }, phases.map((p, i) => {
    const prev = phases[i - 1];
    const boundary = prev && prev.authority === "human" && p.authority === "machine";
    return /*#__PURE__*/React.createElement(React.Fragment, {
      key: p.n
    }, i > 0 ? /*#__PURE__*/React.createElement(Connector, {
      boundary: boundary
    }) : null, /*#__PURE__*/React.createElement(Node, {
      p: p,
      active: active === p.n
    }));
  }), showPush ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Connector, {
    boundary: true
  }), /*#__PURE__*/React.createElement(Node, {
    p: {
      n: "↑",
      label: "Push",
      authority: "human"
    },
    active: active === "push"
  })) : null), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 18,
      marginTop: 18,
      paddingTop: 14,
      borderTop: "1px solid var(--pg-border)",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.6875rem",
      color: "var(--pg-text-subtle)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "human",
    size: 14,
    style: {
      color: "var(--pg-human)"
    }
  }), " human gate \u2014 you decide"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.6875rem",
      color: "var(--pg-text-subtle)"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: "machine",
    size: 14,
    style: {
      color: "var(--pg-text-muted)"
    }
  }), " machine gate \u2014 a command decides")));
}
Object.assign(__ds_scope, { PhasePipeline });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/diagram/PhasePipeline.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Admonition.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Docs admonition / callout. Terminal-adjacent: flat, tinted, thin left rule.
const MAP = {
  note: {
    icon: "terminal",
    accent: "var(--pg-human)",
    bg: "var(--pg-bg-subtle)",
    title: "Note"
  },
  tip: {
    icon: "check",
    accent: "var(--pg-accent)",
    bg: "var(--pg-accent-bg)",
    title: "Tip"
  },
  warning: {
    icon: "pending",
    accent: "var(--pg-pending)",
    bg: "var(--pg-pending-bg)",
    title: "Warning"
  },
  pass: {
    icon: "check",
    accent: "var(--pg-pass)",
    bg: "var(--pg-pass-bg)",
    title: "Passed"
  },
  fail: {
    icon: "cross",
    accent: "var(--pg-fail)",
    bg: "var(--pg-fail-bg)",
    title: "Failed"
  },
  human: {
    icon: "human",
    accent: "var(--pg-human)",
    bg: "var(--pg-human-bg)",
    title: "Human gate"
  }
};
function Admonition({
  type = "note",
  title,
  children,
  className = "",
  style = {},
  ...rest
}) {
  const m = MAP[type] || MAP.note;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-admonition pg-admonition--${type} ${className}`,
    style: {
      display: "flex",
      gap: "12px",
      padding: "14px 16px",
      background: m.bg,
      borderRadius: "var(--pg-radius-md)",
      borderLeft: `3px solid ${m.accent}`,
      fontFamily: "var(--pg-font-sans)",
      color: "var(--pg-text)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    style: {
      color: m.accent,
      flex: "none",
      marginTop: "1px"
    }
  }, /*#__PURE__*/React.createElement(__ds_scope.Icon, {
    name: m.icon,
    size: 18,
    strokeWidth: 2.2
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: "0.8125rem",
      letterSpacing: "0.02em",
      color: m.accent,
      marginBottom: children ? "3px" : 0
    }
  }, title || m.title), children ? /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "0.9375rem",
      lineHeight: 1.55,
      color: "var(--pg-text-muted)"
    }
  }, children) : null));
}
Object.assign(__ds_scope, { Admonition });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Admonition.jsx", error: String((e && e.message) || e) }); }

// components/feedback/VerdictBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Verdict chip — the fixed ledger vocabulary a `gate run` writes.
// Vocabulary is closed: passed / failed / partial / skipped / operator / blocked.
// Never "PROVEN" / "VIOLATED" (that jargon belongs to a dead competitor).
// The GLYPH carries status; color is redundant (NO_COLOR loses nothing).
const MAP = {
  passed: {
    glyph: "\u2713",
    label: "passed",
    fg: "var(--pg-pass-text)",
    bg: "var(--pg-pass-bg)",
    bd: "var(--pg-pass)"
  },
  failed: {
    glyph: "\u2717",
    label: "failed",
    fg: "var(--pg-fail-text)",
    bg: "var(--pg-fail-bg)",
    bd: "var(--pg-fail)"
  },
  partial: {
    glyph: "\u26a0",
    label: "partial",
    fg: "var(--pg-warn-text)",
    bg: "var(--pg-warn-bg)",
    bd: "var(--pg-warn)"
  },
  skipped: {
    glyph: "=",
    label: "skipped",
    fg: "var(--pg-muted)",
    bg: "var(--pg-bg-subtle)",
    bd: "var(--pg-border-strong)"
  },
  operator: {
    glyph: "\u2192",
    label: "operator",
    fg: "var(--pg-human-text)",
    bg: "var(--pg-human-bg)",
    bd: "var(--pg-human)"
  },
  blocked: {
    glyph: "!",
    label: "blocked",
    fg: "var(--pg-stale-text)",
    bg: "var(--pg-stale-bg)",
    bd: "var(--pg-stale)"
  }
};
const SIZES = {
  sm: {
    fontSize: "0.6875rem",
    padding: "2px 7px",
    gap: 5
  },
  md: {
    fontSize: "0.8125rem",
    padding: "3px 9px",
    gap: 6
  }
};
function VerdictBadge({
  verdict = "passed",
  label,
  code,
  solid = false,
  size = "md",
  className = "",
  style = {},
  ...rest
}) {
  const v = MAP[verdict] || MAP.passed;
  const sz = SIZES[size] || SIZES.md;
  const solidStyle = solid ? {
    background: v.bd,
    color: "var(--pg-term-bg)",
    borderColor: v.bd
  } : {
    background: v.bg,
    color: v.fg,
    borderColor: `color-mix(in srgb, ${v.bd} 35%, transparent)`
  };
  return /*#__PURE__*/React.createElement("span", _extends({
    className: `pg-verdict pg-verdict--${verdict} ${className}`,
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: sz.gap,
      fontFamily: "var(--pg-font-mono)",
      fontWeight: 500,
      fontSize: sz.fontSize,
      lineHeight: 1,
      letterSpacing: "0.01em",
      textTransform: "lowercase",
      padding: sz.padding,
      borderRadius: "var(--pg-radius-sm)",
      border: "1px solid",
      ...solidStyle,
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      fontWeight: 700
    }
  }, v.glyph), label || v.label, code != null ? /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.7
    }
  }, "\xB7 exit ", code) : null);
}
Object.assign(__ds_scope, { VerdictBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/VerdictBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/EvidenceTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Evidence ledger. A record of what was checked, by what command, and the
// machine result. Commands / codes / paths are monospace (they are evidence);
// labels are grotesk. Verdict cells use VerdictBadge (color law applies).
function EvidenceTable({
  rows = [],
  caption,
  className = "",
  style = {},
  ...rest
}) {
  const th = {
    textAlign: "left",
    fontFamily: "var(--pg-font-mono)",
    fontSize: "0.6875rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--pg-text-subtle)",
    fontWeight: 500,
    padding: "10px 14px",
    borderBottom: "1px solid var(--pg-border)",
    whiteSpace: "nowrap"
  };
  const td = {
    padding: "11px 14px",
    fontSize: "0.875rem",
    color: "var(--pg-text)",
    borderBottom: "1px solid var(--pg-border)",
    verticalAlign: "middle"
  };
  const mono = {
    fontFamily: "var(--pg-font-mono)",
    fontSize: "0.8125rem",
    color: "var(--pg-text-muted)"
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: `pg-evidence ${className}`,
    style: {
      border: "1px solid var(--pg-border)",
      borderRadius: "var(--pg-radius-md)",
      overflow: "hidden",
      background: "var(--pg-surface)",
      ...style
    }
  }, rest), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily: "var(--pg-font-sans)"
    }
  }, caption ? /*#__PURE__*/React.createElement("caption", {
    style: {
      captionSide: "top",
      textAlign: "left",
      padding: "12px 14px 0",
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.75rem",
      color: "var(--pg-text-subtle)"
    }
  }, caption) : null, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "check"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "command"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "verdict"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "exit"), /*#__PURE__*/React.createElement("th", {
    style: th
  }, "evidence"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: i === rows.length - 1 ? {} : {}
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 500
    }
  }, r.check), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono
    }
  }, r.command), /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement(__ds_scope.VerdictBadge, {
    verdict: r.verdict,
    size: "sm"
  })), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono,
      textAlign: "right",
      color: r.verdict === "failed" ? "var(--pg-fail-text)" : "var(--pg-text-muted)"
    }
  }, r.code != null ? r.code : "—"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      ...mono,
      color: "var(--pg-text-subtle)"
    }
  }, r.evidence || "—"))))));
}
Object.assign(__ds_scope, { EvidenceTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/EvidenceTable.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// ProveGate Button.
// NOTE ON COLOR LAW: primary is NEUTRAL (near-black / inverted), never green.
// Green is earned — it marks passed work, not call-to-action buttons.
const SIZES = {
  sm: {
    padding: "6px 12px",
    fontSize: "0.8125rem",
    gap: "6px",
    height: 32
  },
  md: {
    padding: "9px 16px",
    fontSize: "0.9375rem",
    gap: "8px",
    height: 40
  },
  lg: {
    padding: "12px 22px",
    fontSize: "1.0625rem",
    gap: "10px",
    height: 48
  }
};
function variantStyle(variant) {
  switch (variant) {
    case "secondary":
      return {
        background: "var(--pg-surface)",
        color: "var(--pg-text)",
        border: "1px solid var(--pg-border-strong)"
      };
    case "ghost":
      return {
        background: "transparent",
        color: "var(--pg-text-muted)",
        border: "1px solid transparent"
      };
    case "primary":
    default:
      return {
        background: "var(--pg-text)",
        color: "var(--pg-text-inverted)",
        border: "1px solid var(--pg-text)"
      };
  }
}
function Button({
  children,
  variant = "primary",
  size = "md",
  leftIcon = null,
  rightIcon = null,
  block = false,
  disabled = false,
  as,
  href,
  className = "",
  style = {},
  ...rest
}) {
  const Tag = as || (href ? "a" : "button");
  const sz = SIZES[size] || SIZES.md;
  const base = {
    display: block ? "flex" : "inline-flex",
    width: block ? "100%" : undefined,
    alignItems: "center",
    justifyContent: "center",
    gap: sz.gap,
    padding: sz.padding,
    fontFamily: "var(--pg-font-sans)",
    fontWeight: 600,
    fontSize: sz.fontSize,
    lineHeight: 1,
    letterSpacing: "-0.005em",
    borderRadius: "var(--pg-radius-md)",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.5 : 1,
    textDecoration: "none",
    whiteSpace: "nowrap",
    transition: "background var(--pg-dur) var(--pg-ease), border-color var(--pg-dur) var(--pg-ease), transform var(--pg-dur-fast) var(--pg-ease)",
    ...variantStyle(variant),
    ...style
  };
  return /*#__PURE__*/React.createElement(Tag, _extends({
    href: href,
    disabled: Tag === "button" ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    className: `pg-button pg-button--${variant} ${className}`,
    style: base
  }, rest), leftIcon, children, rightIcon);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// ui_kits/docs/Docs.jsx
try { (() => {
const {
  useState
} = React;
const {
  Icon,
  Button,
  CodeBlock,
  Admonition,
  EvidenceTable,
  PhasePipeline,
  VerdictBadge,
  GateLine
} = window.DesignSystem_65dbcc;
const Mark = ({
  size = 26
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    color: "var(--pg-accent)",
    display: "inline-flex"
  }
}, /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M7 5 L7 27",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("path", {
  d: "M25 5 L25 27",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("path", {
  d: "M11 15.5 L14.5 19.5 L21.5 11",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
})));
const NAV = [{
  group: "Getting started",
  items: ["Introduction", "Install", "Quickstart"]
}, {
  group: "The method",
  items: ["The 7 phases", "Human gates", "Machine gates", "The handoff"]
}, {
  group: "CLI reference",
  items: ["gate init", "gate run", "gate push", "gate ledger"]
}, {
  group: "Concepts",
  items: ["Evidence ledger", "Exit codes", "Reviewers"]
}];
function Topbar({
  theme,
  onToggle
}) {
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 20,
      height: 56,
      background: "color-mix(in srgb, var(--pg-bg) 88%, transparent)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--pg-border)",
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "0 20px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9,
      width: 250
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    size: 24
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: "1.05rem",
      letterSpacing: "-0.025em"
    }
  }, "Prove", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-accent)"
    }
  }, "Gate")), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.7rem",
      color: "var(--pg-text-subtle)",
      border: "1px solid var(--pg-border)",
      borderRadius: 4,
      padding: "1px 5px",
      marginLeft: 2
    }
  }, "docs")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      height: 34,
      background: "var(--pg-bg-subtle)",
      border: "1px solid var(--pg-border)",
      borderRadius: "var(--pg-radius-md)",
      padding: "0 10px",
      color: "var(--pg-text-subtle)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "terminal",
    size: 15
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "0.85rem"
    }
  }, "Search docs"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.7rem",
      border: "1px solid var(--pg-border)",
      borderRadius: 4,
      padding: "1px 5px"
    }
  }, "\u2318K"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "var(--pg-text-muted)",
      textDecoration: "none",
      fontSize: "0.9rem"
    }
  }, "Spec"), /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    title: "Toggle theme",
    style: {
      background: "transparent",
      border: "1px solid var(--pg-border-strong)",
      borderRadius: "var(--pg-radius-md)",
      width: 34,
      height: 34,
      cursor: "pointer",
      color: "var(--pg-text-muted)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === "dark" ? "check" : "terminal",
    size: 16
  })), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      color: "var(--pg-text-muted)",
      display: "inline-flex"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "github",
    size: 20
  }))));
}
function Sidebar({
  active,
  setActive
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 250,
      flex: "none",
      borderRight: "1px solid var(--pg-border)",
      padding: "24px 16px",
      position: "sticky",
      top: 56,
      alignSelf: "flex-start",
      height: "calc(100vh - 56px)",
      overflowY: "auto"
    }
  }, NAV.map(sec => /*#__PURE__*/React.createElement("div", {
    key: sec.group,
    style: {
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.7rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--pg-text-subtle)",
      marginBottom: 8,
      paddingLeft: 10
    }
  }, sec.group), sec.items.map(it => {
    const on = it === active;
    return /*#__PURE__*/React.createElement("a", {
      key: it,
      href: "#",
      onClick: e => {
        e.preventDefault();
        setActive(it);
      },
      style: {
        display: "block",
        padding: "6px 10px",
        borderRadius: "var(--pg-radius-sm)",
        fontSize: "0.875rem",
        textDecoration: "none",
        color: on ? "var(--pg-text)" : "var(--pg-text-muted)",
        background: on ? "var(--pg-bg-subtle)" : "transparent",
        fontWeight: on ? 600 : 400,
        borderLeft: on ? "2px solid var(--pg-accent)" : "2px solid transparent"
      }
    }, it);
  }))));
}
function Toc() {
  const items = ["What ProveGate checks", "Install", "Your first gate", "The handoff card", "The evidence ledger"];
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 220,
      flex: "none",
      padding: "32px 20px",
      position: "sticky",
      top: 56,
      alignSelf: "flex-start",
      height: "calc(100vh - 56px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.7rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: "var(--pg-text-subtle)",
      marginBottom: 12
    }
  }, "On this page"), items.map((it, i) => /*#__PURE__*/React.createElement("a", {
    key: it,
    href: "#",
    style: {
      display: "block",
      padding: "4px 0",
      fontSize: "0.82rem",
      textDecoration: "none",
      color: i === 0 ? "var(--pg-accent-text)" : "var(--pg-text-muted)"
    }
  }, it)));
}
function Content() {
  const h2 = {
    fontSize: "1.5rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    margin: "40px 0 12px",
    color: "var(--pg-text)"
  };
  const p = {
    fontSize: "1rem",
    lineHeight: 1.7,
    color: "var(--pg-text-muted)",
    margin: "0 0 16px"
  };
  const code = {
    fontFamily: "var(--pg-font-mono)",
    fontSize: "0.85em",
    background: "var(--pg-bg-subtle)",
    border: "1px solid var(--pg-border)",
    borderRadius: 4,
    padding: "1px 5px",
    color: "var(--pg-accent-text)"
  };
  return /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      minWidth: 0,
      padding: "32px 44px",
      maxWidth: 820
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--pg-font-mono)",
      fontSize: "0.78rem",
      color: "var(--pg-text-subtle)",
      marginBottom: 14
    }
  }, "Getting started ", /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: 0.5
    }
  }, "/"), " Introduction"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "2.4rem",
      fontWeight: 700,
      letterSpacing: "-0.03em",
      margin: "0 0 14px",
      color: "var(--pg-text)"
    }
  }, "Introduction"), /*#__PURE__*/React.createElement("p", {
    style: {
      ...p,
      fontSize: "1.12rem",
      color: "var(--pg-text)"
    }
  }, "ProveGate gates autonomous coding agents on evidence a machine can check. An agent's ", /*#__PURE__*/React.createElement("span", {
    style: code
  }, "done"), " is not evidence. Work passes only when a command exits ", /*#__PURE__*/React.createElement("span", {
    style: code
  }, "0"), " \u2014 or an independent reviewer's structured verdict says ", /*#__PURE__*/React.createElement(VerdictBadge, {
    verdict: "pass",
    size: "sm"
  }), "."), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "What ProveGate checks"), /*#__PURE__*/React.createElement("p", {
    style: p
  }, "Every gate is a command with an expected exit code. If the command isn't run, the gate isn't passed \u2014 ", /*#__PURE__*/React.createElement("em", null, "listed but not run is never passed"), "."), /*#__PURE__*/React.createElement(Admonition, {
    type: "warning",
    title: "Listed \u2260 run"
  }, "A test that appears in your config but never executed does not count as evidence. ProveGate records what actually ran."), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Install"), /*#__PURE__*/React.createElement("p", {
    style: p
  }, "Install the CLI globally, then initialize a gate config in your repo."), /*#__PURE__*/React.createElement(CodeBlock, {
    lang: "bash",
    prompt: true
  }, "npm i -g provegate\ngate init"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Your first gate"), /*#__PURE__*/React.createElement("p", {
    style: p
  }, "Declare a check in ", /*#__PURE__*/React.createElement("span", {
    style: code
  }, "gate.toml"), ". Each gate names a command and the exit code that counts as pass."), /*#__PURE__*/React.createElement(CodeBlock, {
    filename: "gate.toml"
  }, "[gate.test]\ncmd = \"pnpm test\"\nrequire = \"exit0\"\n\n[gate.types]\ncmd = \"tsc --noEmit\"\nrequire = \"exit0\""), /*#__PURE__*/React.createElement("p", {
    style: {
      ...p,
      marginTop: 16
    }
  }, "Run the gate. Each check prints its verdict and exit code:"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "0 0 16px"
    }
  }, /*#__PURE__*/React.createElement(GateLine, {
    status: "pass",
    name: "test: unit",
    command: "pnpm test",
    code: 0
  })), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "The handoff card"), /*#__PURE__*/React.createElement("p", {
    style: p
  }, "When a phase completes, the gate prints a handoff card \u2014 and, at the push boundary, it refuses to push for you."), /*#__PURE__*/React.createElement(Admonition, {
    type: "human",
    title: "Push is always yours"
  }, "Phases 1\u20133 are human, 4\u20137 are autonomous. The gate never pushes on your behalf: ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--pg-font-mono)"
    }
  }, "No. Push is yours.")), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "The 7-phase model"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "8px 0 20px"
    }
  }, /*#__PURE__*/React.createElement(PhasePipeline, {
    active: 4
  })), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "The evidence ledger"), /*#__PURE__*/React.createElement("p", {
    style: p
  }, "Every run appends to an append-only ledger: the check, the command, the verdict, the exit code, and a pointer to the evidence."), /*#__PURE__*/React.createElement(EvidenceTable, {
    caption: "run a1b9f3c",
    rows: [{
      check: "unit tests",
      command: "pnpm test",
      verdict: "pass",
      code: 0,
      evidence: "312 passed · 4.1s"
    }, {
      check: "typecheck",
      command: "tsc --noEmit",
      verdict: "pass",
      code: 0,
      evidence: "0 errors"
    }, {
      check: "e2e",
      command: "playwright test",
      verdict: "fail",
      code: 1,
      evidence: "1 failed · logs/e2e.txt"
    }]
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 48,
      paddingTop: 20,
      borderTop: "1px solid var(--pg-border)"
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "chevronRight",
      size: 16,
      style: {
        transform: "rotate(180deg)"
      }
    })
  }, "Overview"), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    rightIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "arrowRight",
      size: 16
    })
  }, "Install")));
}
function Docs() {
  const [theme, setTheme] = useState("light");
  const [active, setActive] = useState("Introduction");
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--pg-bg)",
      minHeight: "100vh",
      fontFamily: "var(--pg-font-sans)",
      color: "var(--pg-text)"
    }
  }, /*#__PURE__*/React.createElement(Topbar, {
    theme: theme,
    onToggle: () => setTheme(t => t === "light" ? "dark" : "light")
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      maxWidth: "var(--pg-container-docs)",
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: active,
    setActive: setActive
  }), /*#__PURE__*/React.createElement(Content, null), /*#__PURE__*/React.createElement(Toc, null)));
}
window.Docs = Docs;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/docs/Docs.jsx", error: String((e && e.message) || e) }); }

// ui_kits/landing/Landing.jsx
try { (() => {
const {
  useState
} = React;
const {
  Icon,
  Button,
  CodeBlock,
  HandoffCard,
  GateLine,
  PhasePipeline,
  EvidenceTable,
  VerdictBadge
} = window.DesignSystem_65dbcc;
const MONO = "var(--pg-font-mono)";
const eyebrow = {
  fontFamily: MONO,
  fontSize: "0.8rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--pg-text-subtle)",
  marginBottom: 12
};
const h2 = {
  fontSize: "2rem",
  fontWeight: 600,
  letterSpacing: "-0.02em",
  margin: 0,
  color: "var(--pg-text)",
  textWrap: "balance"
};
const wrap = {
  maxWidth: "var(--pg-container)",
  margin: "0 auto",
  padding: "0 28px"
};
const Mark = ({
  size = 30
}) => /*#__PURE__*/React.createElement("span", {
  style: {
    color: "var(--pg-accent)",
    display: "inline-flex"
  }
}, /*#__PURE__*/React.createElement("svg", {
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none"
}, /*#__PURE__*/React.createElement("path", {
  d: "M7 5 L7 27",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("path", {
  d: "M25 5 L25 27",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round"
}), /*#__PURE__*/React.createElement("path", {
  d: "M11 15.5 L14.5 19.5 L21.5 11",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
})));
const Wordmark = () => /*#__PURE__*/React.createElement("span", {
  style: {
    fontWeight: 700,
    fontSize: "1.2rem",
    letterSpacing: "-0.025em",
    color: "var(--pg-text)"
  }
}, "Prove", /*#__PURE__*/React.createElement("span", {
  style: {
    color: "var(--pg-accent)"
  }
}, "Gate"));
function Nav({
  theme,
  onToggle
}) {
  const link = {
    color: "var(--pg-text-muted)",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500
  };
  return /*#__PURE__*/React.createElement("header", {
    style: {
      position: "sticky",
      top: 0,
      zIndex: 10,
      background: "color-mix(in srgb, var(--pg-bg) 85%, transparent)",
      backdropFilter: "blur(8px)",
      borderBottom: "1px solid var(--pg-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: "14px 28px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 9
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    size: 26
  }), /*#__PURE__*/React.createElement(Wordmark, null)), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      gap: 22,
      marginLeft: 28
    }
  }, /*#__PURE__*/React.createElement("a", {
    href: "#problem",
    style: link
  }, "Problem"), /*#__PURE__*/React.createElement("a", {
    href: "#method",
    style: link
  }, "Method"), /*#__PURE__*/React.createElement("a", {
    href: "#proof",
    style: link
  }, "Proof"), /*#__PURE__*/React.createElement("a", {
    href: "#faq",
    style: link
  }, "FAQ")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onToggle,
    title: "Toggle theme",
    style: {
      background: "transparent",
      border: "1px solid var(--pg-border-strong)",
      borderRadius: "var(--pg-radius-md)",
      width: 36,
      height: 36,
      cursor: "pointer",
      color: "var(--pg-text-muted)",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: theme === "dark" ? "exit0" : "terminal",
    size: 17
  })), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "github",
      size: 15
    })
  }, "GitHub"), /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "sm"
  }, "Get started"))));
}
function Hero() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "72px 28px 48px",
      display: "grid",
      gridTemplateColumns: "1.05fr 0.95fr",
      gap: 48,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// gated autonomy \xB7 machine-checkable"), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: "3.4rem",
      fontWeight: 700,
      lineHeight: 1.04,
      letterSpacing: "-0.03em",
      margin: 0,
      color: "var(--pg-text)"
    }
  }, "Your agent's ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO,
      fontWeight: 500,
      fontSize: "0.8em"
    }
  }, "done"), " is not evidence. Gate it on exit codes."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "1.18rem",
      lineHeight: 1.55,
      color: "var(--pg-text-muted)",
      maxWidth: 520,
      marginTop: 20
    }
  }, "ProveGate lets coding agents work autonomously without anyone trusting what the agent says about its own work. A phase advances only when a command exits ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO,
      color: "var(--pg-accent-text)"
    }
  }, "0"), " \u2014 or an independent reviewer's verdict says ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO,
      color: "var(--pg-accent-text)"
    }
  }, "pass"), "."), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 26,
      maxWidth: 400
    }
  }, /*#__PURE__*/React.createElement(CodeBlock, {
    lang: "bash",
    prompt: true
  }, "npm i -g provegate\ngate init")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    size: "lg"
  }, "Read the spec"), /*#__PURE__*/React.createElement(Button, {
    variant: "ghost",
    size: "lg",
    leftIcon: /*#__PURE__*/React.createElement(Icon, {
      name: "github",
      size: 17
    })
  }, "GitHub")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 22,
      fontFamily: MONO,
      fontSize: "0.78rem",
      color: "var(--pg-text-subtle)"
    }
  }, "MIT \xB7 zero deps \xB7 local-only \xB7 no telemetry \xB7 Node \u2265 22")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(HandoffCard, {
    title: "HANDOFF CARD",
    lines: ["PRD-001 (fix-login-timeout)", "merged: → LOCAL main (no-ff)", "gates:", {
      gate: "passed",
      text: "phase 4: typecheck + lint + build"
    }, {
      gate: "passed",
      text: "phase 5: §11 verification commands"
    }, {
      gate: "passed",
      text: "phase 6: review (Critical 0)"
    }, {
      gate: "passed",
      text: "phase 7: durable artifacts in diff"
    }, "operator rows: 0", {
      arrow: true,
      text: "READY TO PUSH — the runner never pushes"
    }]
  })));
}
function Problem() {
  const card = {
    background: "var(--pg-surface)",
    border: "1px solid var(--pg-border)",
    borderRadius: "var(--pg-radius-lg)",
    padding: "26px 24px"
  };
  const fig = {
    fontFamily: MONO,
    fontSize: "2.4rem",
    fontWeight: 600,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    color: "var(--pg-text)"
  };
  const body = {
    fontSize: "0.98rem",
    lineHeight: 1.55,
    color: "var(--pg-text-muted)",
    marginTop: 12
  };
  const src = {
    fontFamily: MONO,
    fontSize: "0.72rem",
    color: "var(--pg-text-subtle)",
    marginTop: 14
  };
  return /*#__PURE__*/React.createElement("section", {
    id: "problem",
    style: {
      ...wrap,
      padding: "56px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// the problem"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Strong generators. Unreliable narrators."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "1.1rem",
      color: "var(--pg-text-muted)",
      maxWidth: 640,
      margin: "14px 0 32px",
      lineHeight: 1.5
    }
  }, "Neither the agent's claim, nor a panel of agents' consensus, nor a human's felt sense of progress can serve as a gate. Only executed evidence can."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...fig,
      color: "var(--pg-fail-text)"
    }
  }, "22.58%"), /*#__PURE__*/React.createElement("div", {
    style: body
  }, "of validated failure episodes are ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--pg-text)"
    }
  }, "inaccurate self-reporting"), " \u2014 the agent claiming a test or deploy passed when it did not. Its share grows as models improve."), /*#__PURE__*/React.createElement("div", {
    style: src
  }, "20,574-session field study")), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: fig
  }, "80+ ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "1rem",
      color: "var(--pg-text-subtle)"
    }
  }, "agents")), /*#__PURE__*/React.createElement("div", {
    style: body
  }, "unanimously endorsed an OpenSSL padding-oracle vulnerability that ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--pg-text)"
    }
  }, "does not exist"), " \u2014 ten of them dedicated reviewers. One executed test killed it."), /*#__PURE__*/React.createElement("div", {
    style: src
  }, "security review campaign")), /*#__PURE__*/React.createElement("div", {
    style: card
  }, /*#__PURE__*/React.createElement("div", {
    style: fig
  }, "19% ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: "1rem",
      color: "var(--pg-text-subtle)"
    }
  }, "slower")), /*#__PURE__*/React.createElement("div", {
    style: body
  }, "Experienced devs forecast a 24% speedup and felt a 20% speedup \u2014 and were measurably ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--pg-text)"
    }
  }, "slower"), ". Felt progress is not evidence either."), /*#__PURE__*/React.createElement("div", {
    style: src
  }, "METR RCT \xB7 16 devs \xB7 246 tasks"))));
}
function CoreRule() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--pg-bg-subtle)",
      borderTop: "1px solid var(--pg-border)",
      borderBottom: "1px solid var(--pg-border)",
      padding: "80px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--pg-container-prose)",
      margin: "0 auto",
      padding: "0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// the core rule"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "2.1rem",
      fontWeight: 600,
      lineHeight: 1.28,
      letterSpacing: "-0.02em",
      color: "var(--pg-text)",
      margin: 0,
      textWrap: "pretty"
    }
  }, "A phase boundary is a gate only when a machine can check it: a command's exit code, or an independent reviewer's structured verdict. ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-text-subtle)"
    }
  }, "The implementing agent's own assessment is never a gate."))));
}
function Method() {
  return /*#__PURE__*/React.createElement("section", {
    id: "method",
    style: {
      ...wrap,
      padding: "72px 28px 40px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// seven phases, one autonomy cut"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Humans own intent and release. The machine owns the verified middle."), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "1.05rem",
      color: "var(--pg-text-muted)",
      maxWidth: 620,
      margin: "14px 0 32px",
      lineHeight: 1.5
    }
  }, "If any gate fails the runner stops and hands back, worktree intact. The absolute invariant: the runner contains no code path that pushes to a remote."), /*#__PURE__*/React.createElement(PhasePipeline, {
    active: 5
  }));
}
function Mechanisms() {
  const items = [{
    n: "01",
    t: "The PRD is an executable contract",
    d: "Per-FR target paths, per-FR verification commands, a DO-NOT list, a Conflict Surface, and a PRD class that right-sizes the pipeline — not prose.",
    art: /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: MONO,
        fontSize: "0.8rem",
        color: "var(--pg-text-muted)"
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: "var(--pg-text-subtle)"
      }
    }, "Verify:"), " pnpm test:contract auth-callback")
  }, {
    n: "02",
    t: "Readiness: verdict + hard caps",
    d: "The decimal score had zero predictive power inside the passing band (r = −0.03). So: verdict is PASS/ITERATE, decimals are advisory, and hard caps replace deductions.",
    art: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(VerdictBadge, {
      verdict: "passed",
      label: "PASS",
      size: "sm"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: MONO,
        fontSize: "0.78rem",
        color: "var(--pg-text-subtle)",
        alignSelf: "center"
      }
    }, "9.1 \xB7 advisory"))
  }, {
    n: "03",
    t: "Testing: run, don't list",
    d: "A command that was listed but not executed is never passed. The ledger vocabulary is deliberately narrow, and the escape hatches are honest ones.",
    art: /*#__PURE__*/React.createElement("div", {
      style: {
        display: "flex",
        gap: 6,
        flexWrap: "wrap"
      }
    }, /*#__PURE__*/React.createElement(VerdictBadge, {
      verdict: "passed",
      size: "sm"
    }), /*#__PURE__*/React.createElement(VerdictBadge, {
      verdict: "failed",
      size: "sm"
    }), /*#__PURE__*/React.createElement(VerdictBadge, {
      verdict: "operator",
      size: "sm"
    }), /*#__PURE__*/React.createElement(VerdictBadge, {
      verdict: "blocked",
      size: "sm"
    }))
  }, {
    n: "04",
    t: "Auditing: an adversary who didn't write the code",
    d: "Phase 6 is blocking, independent, and by default a different model family. Verdict: pass mechanically requires Critical: 0; an absent reviewer never counts as a pass.",
    art: /*#__PURE__*/React.createElement(GateLine, {
      bare: true,
      status: "passed",
      name: "review (cross-family)",
      command: "Critical 0"
    })
  }, {
    n: "05",
    t: "Parallel agents: declared ownership",
    d: "Claiming an item writes a lease. A path-conflict gate refuses when two active leases' globs overlap — at claim time, not merge time.",
    art: /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: MONO,
        fontSize: "0.8rem",
        color: "var(--pg-stale-text)"
      }
    }, "! overlap \xB7 src/auth/** refused")
  }];
  const card = {
    background: "var(--pg-surface)",
    border: "1px solid var(--pg-border)",
    borderRadius: "var(--pg-radius-lg)",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: 12
  };
  return /*#__PURE__*/React.createElement("section", {
    style: {
      ...wrap,
      padding: "40px 28px 72px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 20
    }
  }, items.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.n,
    style: {
      ...card,
      gridColumn: m.n === "05" ? "1 / -1" : "auto"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: MONO,
      fontSize: "0.8rem",
      color: "var(--pg-accent-text)"
    }
  }, m.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "1.25rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      color: "var(--pg-text)"
    }
  }, m.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "0.96rem",
      lineHeight: 1.55,
      color: "var(--pg-text-muted)",
      maxWidth: 640
    }
  }, m.d), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 4,
      paddingTop: 14,
      borderTop: "1px solid var(--pg-border)"
    }
  }, m.art)))));
}
function Refusal() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      maxWidth: "var(--pg-container-prose)",
      margin: "0 auto 72px",
      padding: "0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--pg-term-bg)",
      border: "1px solid var(--pg-term-border)",
      borderRadius: "var(--pg-radius-lg)",
      padding: "40px 32px",
      textAlign: "center",
      fontFamily: MONO
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--pg-term-dim)",
      fontSize: "0.85rem"
    }
  }, "$ gate push"), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "16px 0 10px",
      color: "var(--pg-term-human)",
      fontSize: "1.9rem",
      fontWeight: 500
    }
  }, "No. Push is yours."), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--pg-term-dim)",
      fontSize: "0.9rem",
      lineHeight: 1.6
    }
  }, "The runner contains no code path that pushes to a remote. That decision stays with a human.")));
}
function Proof() {
  const col = {
    background: "var(--pg-surface)",
    border: "1px solid var(--pg-border)",
    borderRadius: "var(--pg-radius-lg)",
    padding: "28px 26px"
  };
  const li = {
    fontSize: "0.98rem",
    lineHeight: 1.5,
    color: "var(--pg-text-muted)",
    paddingLeft: 20,
    position: "relative",
    marginBottom: 14
  };
  const bullet = {
    position: "absolute",
    left: 0,
    fontFamily: MONO
  };
  return /*#__PURE__*/React.createElement("section", {
    id: "proof",
    style: {
      ...wrap,
      padding: "56px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// proof, and its honest limits"), /*#__PURE__*/React.createElement("h2", {
    style: h2
  }, "Showing the limits next to the proof is the point."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 20,
      marginTop: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: MONO,
      fontSize: "0.8rem",
      color: "var(--pg-accent-text)",
      marginBottom: 18
    }
  }, "evidence"), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-pass-text)"
    }
  }, "\u2713"), "~390 production PRDs shipped through the workflow on a multi-tenant SaaS TypeScript monorepo, including multi-wave parallel execution."), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-pass-text)"
    }
  }, "\u2713"), "Scored era: ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--pg-text)"
    }
  }, "0"), " critical post-ship findings. Unscored era: 2. The 143-findings \xD7 83-scores study forced the redesign."), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-pass-text)"
    }
  }, "\u2713"), "This repo runs its own method \u2014 including the round where the reviewer caught the maintainers weakening its own doctrine. ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO,
      fontSize: "0.85em"
    }
  }, "gate run"), " landed the commits that built ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO,
      fontSize: "0.85em"
    }
  }, "gate run"), ".")), /*#__PURE__*/React.createElement("div", {
    style: col
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: MONO,
      fontSize: "0.8rem",
      color: "var(--pg-text-subtle)",
      marginBottom: 18
    }
  }, "limits we state out loud"), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-text-subtle)"
    }
  }, "\xB7"), "The evidence is observational and single-project. No RCT, no speedup claim."), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-text-subtle)"
    }
  }, "\xB7"), "Gates cost effort to author, and process overhead is real \u2014 below some task size the honest answer is don't use the workflow."), /*#__PURE__*/React.createElement("div", {
    style: li
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...bullet,
      color: "var(--pg-text-subtle)"
    }
  }, "\xB7"), "Verification is only as good as the commands written. And the landscape moves."))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 28
    }
  }, /*#__PURE__*/React.createElement(EvidenceTable, {
    caption: "run a1b9f3c \xB7 2026-07-22 14:02 UTC",
    rows: [{
      check: "phase 5: unit",
      command: "pnpm test",
      verdict: "passed",
      code: 0,
      evidence: "312 passed · 4.1s"
    }, {
      check: "phase 4: typecheck",
      command: "tsc --noEmit",
      verdict: "passed",
      code: 0,
      evidence: "0 errors"
    }, {
      check: "phase 5: e2e",
      command: "playwright test",
      verdict: "failed",
      code: 1,
      evidence: "1 failed · logs/e2e.txt"
    }, {
      check: "staging smoke",
      command: "needs staging",
      verdict: "operator",
      evidence: "awaiting @lead"
    }]
  }), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: MONO,
      fontSize: "0.85rem",
      color: "var(--pg-text-subtle)",
      marginTop: 16,
      textAlign: "center"
    }
  }, "one executed test killed what 80+ agents' reasoning could not.")));
}
function Positioning() {
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: "var(--pg-bg-subtle)",
      borderTop: "1px solid var(--pg-border)",
      borderBottom: "1px solid var(--pg-border)",
      padding: "64px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: "var(--pg-container-prose)",
      margin: "0 auto",
      padding: "0 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// where it sits"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: "1.5rem",
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: "-0.01em",
      color: "var(--pg-text)",
      margin: 0,
      textWrap: "pretty"
    }
  }, "Spec-driven development gates what you ", /*#__PURE__*/React.createElement("em", {
    style: {
      fontStyle: "normal",
      color: "var(--pg-text-subtle)"
    }
  }, "intend"), " to build. ProveGate gates what you actually ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--pg-accent-text)"
    }
  }, "shipped"), " \u2014 complementary, downstream of the spec.")));
}
function Faq() {
  const items = [["Is it open source?", "Yes — MIT. Files committed to your repo; nothing hosted."], ["Does it phone home?", "No telemetry, no network calls, no accounts. It runs local-only."], ["Which agent does it need?", "Agent-agnostic. It gates on evidence, not on a specific model or client."], ["What does it require?", "Node ≥ 22 and zero runtime dependencies. Any ANSI is hand-rolled in-package."]];
  return /*#__PURE__*/React.createElement("section", {
    id: "faq",
    style: {
      ...wrap,
      padding: "64px 28px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "// principles"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 24,
      marginTop: 20
    }
  }, items.map(([q, a]) => /*#__PURE__*/React.createElement("div", {
    key: q
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "1.05rem",
      fontWeight: 600,
      color: "var(--pg-text)",
      marginBottom: 6
    }
  }, q), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: "0.98rem",
      lineHeight: 1.5,
      color: "var(--pg-text-muted)"
    }
  }, a)))));
}
function Footer() {
  return /*#__PURE__*/React.createElement("footer", {
    style: {
      borderTop: "1px solid var(--pg-border)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...wrap,
      padding: "28px",
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: "var(--pg-text-subtle)",
      fontSize: "0.85rem"
    }
  }, /*#__PURE__*/React.createElement(Mark, {
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: MONO
    }
  }, "provegate"), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: "auto",
      fontFamily: MONO
    }
  }, "prove it, then let it propagate.")));
}
function Landing() {
  const [theme, setTheme] = useState("dark");
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--pg-bg)",
      minHeight: "100vh",
      fontFamily: "var(--pg-font-sans)"
    }
  }, /*#__PURE__*/React.createElement(Nav, {
    theme: theme,
    onToggle: () => setTheme(t => t === "light" ? "dark" : "light")
  }), /*#__PURE__*/React.createElement(Hero, null), /*#__PURE__*/React.createElement(Problem, null), /*#__PURE__*/React.createElement(CoreRule, null), /*#__PURE__*/React.createElement(Method, null), /*#__PURE__*/React.createElement(Mechanisms, null), /*#__PURE__*/React.createElement(Refusal, null), /*#__PURE__*/React.createElement(Proof, null), /*#__PURE__*/React.createElement(Positioning, null), /*#__PURE__*/React.createElement(Faq, null), /*#__PURE__*/React.createElement(Footer, null));
}
window.Landing = Landing;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/landing/Landing.jsx", error: String((e && e.message) || e) }); }

__ds_ns.CodeBlock = __ds_scope.CodeBlock;

__ds_ns.GateLine = __ds_scope.GateLine;

__ds_ns.HandoffCard = __ds_scope.HandoffCard;

__ds_ns.Icon = __ds_scope.Icon;

__ds_ns.EvidenceTable = __ds_scope.EvidenceTable;

__ds_ns.PhasePipeline = __ds_scope.PhasePipeline;

__ds_ns.Admonition = __ds_scope.Admonition;

__ds_ns.VerdictBadge = __ds_scope.VerdictBadge;

__ds_ns.Button = __ds_scope.Button;

})();
