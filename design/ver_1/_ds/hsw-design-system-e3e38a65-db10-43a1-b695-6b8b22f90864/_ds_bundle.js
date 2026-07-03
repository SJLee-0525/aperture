/* @ds-bundle: {"format":3,"namespace":"HSWDesignSystem_e3e38a","components":[],"sourceHashes":{"ui_kits/dashboard/components.jsx":"d6bb19d69dbf"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HSWDesignSystem_e3e38a = window.HSWDesignSystem_e3e38a || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/dashboard/components.jsx
try { (() => {
/* global React */
const {
  useState,
  useEffect
} = React;

/* ---------- SIDEBAR ---------- */
function Sidebar({
  active,
  setActive
}) {
  const items = [{
    id: 'dash',
    icon: 'speed',
    label: 'Cockpit'
  }, {
    id: 'garage',
    icon: 'build',
    label: 'Garage'
  }, {
    id: 'recon',
    icon: 'radar',
    label: 'Recon'
  }, {
    id: 'race',
    icon: 'sports_score',
    label: 'Race'
  }];
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "sidebar-logo"
  }, /*#__PURE__*/React.createElement("div", {
    className: "diamond"
  })), items.map(i => /*#__PURE__*/React.createElement("button", {
    key: i.id,
    className: `sidebar-item ${active === i.id ? 'active' : ''}`,
    onClick: () => setActive(i.id),
    title: i.label
  }, active === i.id && /*#__PURE__*/React.createElement("span", {
    className: "sidebar-active-strip"
  }), /*#__PURE__*/React.createElement("span", {
    className: "material-symbols-outlined"
  }, i.icon))));
}

/* ---------- TOP NAV ---------- */
function TopNav({
  section
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "topnav"
  }, /*#__PURE__*/React.createElement("span", {
    className: "brand"
  }, "Hello", /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, ","), " Super World", /*#__PURE__*/React.createElement("span", {
    className: "g"
  }, "!")), /*#__PURE__*/React.createElement("span", {
    className: "topnav-divider"
  }, "|"), /*#__PURE__*/React.createElement("span", {
    className: "topnav-section"
  }, section), /*#__PURE__*/React.createElement("div", {
    className: "topnav-spacer"
  }), /*#__PURE__*/React.createElement("span", {
    className: "topnav-clock mono"
  }, "06:21:29"), /*#__PURE__*/React.createElement("span", {
    className: "topnav-status"
  }, /*#__PURE__*/React.createElement("span", {
    className: "diamond diamond-sm animate-glow"
  }), /*#__PURE__*/React.createElement("span", {
    className: "label"
  }, "LIVE")));
}

/* ---------- SVG GAUGE ---------- */
function Gauge({
  label,
  sub,
  value,
  size = 180,
  max = 100
}) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const [dash, setDash] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setDash(c * (1 - pct)), 100);
    return () => clearTimeout(t);
  }, [pct, c]);
  return /*#__PURE__*/React.createElement("div", {
    className: "gauge",
    style: {
      width: size,
      height: size
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: `0 0 ${size} ${size}`
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    stroke: "#1c1c1c",
    strokeWidth: "6",
    fill: "none"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    stroke: "#FFC000",
    strokeWidth: "6",
    fill: "none",
    strokeDasharray: c,
    strokeDashoffset: dash,
    style: {
      transition: 'stroke-dashoffset 1.2s ease-out'
    },
    transform: `rotate(-90 ${size / 2} ${size / 2})`
  })), /*#__PURE__*/React.createElement("div", {
    className: "gauge-inner"
  }, /*#__PURE__*/React.createElement("div", {
    className: `gauge-value ${size > 240 ? 'gauge-lg' : 'gauge-md'}`
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "label gauge-label"
  }, label), sub && /*#__PURE__*/React.createElement("div", {
    className: "mono gauge-sub"
  }, sub)));
}

/* ---------- PANEL ---------- */
function Panel({
  title,
  subtitle,
  children
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "panel cluster-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "panel-header"
  }, /*#__PURE__*/React.createElement("h3", null, title), subtitle && /*#__PURE__*/React.createElement("span", {
    className: "sublabel"
  }, subtitle)), /*#__PURE__*/React.createElement("div", {
    className: "panel-body"
  }, children));
}

/* ---------- STATUS CARDS ---------- */
function StatusCard({
  label,
  value
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "status-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "label",
    style: {
      color: '#000'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "status-value"
  }, value));
}
function InfoCard({
  label,
  value,
  pct
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "info-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "label",
    style: {
      color: '#a0a0a0'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    className: "info-value"
  }, value), pct != null && /*#__PURE__*/React.createElement("div", {
    className: "bar-track"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bar-fill",
    style: {
      width: pct + '%'
    }
  })));
}

/* ---------- PIPELINE LOG ---------- */
function PipelineEntry({
  tag,
  status,
  text,
  time,
  onClick
}) {
  const stripColor = status === 'active' ? '#FFC000' : status === 'queued' ? '#917300' : '#555';
  return /*#__PURE__*/React.createElement("div", {
    className: "pipeline-entry",
    onClick: onClick
  }, /*#__PURE__*/React.createElement("div", {
    className: "pipeline-strip",
    style: {
      background: stripColor
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "pipeline-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pipeline-tag"
  }, tag), /*#__PURE__*/React.createElement("span", {
    className: "timestamp mono"
  }, time)), /*#__PURE__*/React.createElement("div", {
    className: "pipeline-text"
  }, text));
}

/* ---------- TERMINAL ---------- */
function Terminal({
  lines
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "terminal cluster-glass"
  }, /*#__PURE__*/React.createElement("div", {
    className: "terminal-head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "h3-inline"
  }, "Terminal"), /*#__PURE__*/React.createElement("span", {
    className: "mono terminal-prompt"
  }, "hsw@system:~$")), /*#__PURE__*/React.createElement("div", {
    className: "terminal-body"
  }, lines.map((l, i) => /*#__PURE__*/React.createElement("div", {
    className: "terminal-line",
    key: i
  }, /*#__PURE__*/React.createElement("span", {
    className: "terminal-arrow"
  }, ">"), l)), /*#__PURE__*/React.createElement("div", {
    className: "terminal-line"
  }, /*#__PURE__*/React.createElement("span", {
    className: "terminal-arrow"
  }, ">"), /*#__PURE__*/React.createElement("span", {
    className: "cursor"
  }))));
}

/* ---------- CTA ---------- */
function GoldButton({
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    className: "btn-primary",
    onClick: onClick
  }, children);
}
function GhostButton({
  children,
  onClick
}) {
  return /*#__PURE__*/React.createElement("button", {
    className: "btn-ghost",
    onClick: onClick
  }, children);
}
Object.assign(window, {
  Sidebar,
  TopNav,
  Gauge,
  Panel,
  StatusCard,
  InfoCard,
  PipelineEntry,
  Terminal,
  GoldButton,
  GhostButton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/dashboard/components.jsx", error: String((e && e.message) || e) }); }

})();
