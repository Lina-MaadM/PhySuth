// npm i cytoscape katex
// index.html → <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css">
import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import cytoscape from "cytoscape";
import katex from "katex";
import "katex/dist/katex.min.css";

import { formulaIndex, variableIndex } from "../data/physicsData";
import { allSweetFlavour } from "../allSweetFlavour";
import { routeBuilder } from "../routes";

const TOPIC_ORDER = ["Mechanics","Electricity","Waves","Thermodynamics","Optics","ModernPhysics"];
const TOPIC_LABEL = {
  Mechanics:"Mechanics", Electricity:"Electricity", Waves:"Waves",
  Thermodynamics:"Thermodynamics", Optics:"Optics", ModernPhysics:"Modern Physics",
};

const CELL_H        = 120;
const TOPIC_PADDING = 60;
const BOTTOM_GAP    = 48;
const NODE_H        = 54;
const NODE_PAD      = 24;

function flColour(topic) {
  const fl = allSweetFlavour[topic] || allSweetFlavour.default;
  return {
    text:   fl.deepCode,
    border: fl.borderCode,
    bg:     fl.lightCode,
    soft:   fl.softCode,
    fl,
  };
}

export function latexToPlain(str) {
  if (!str) return "";
  let s = str;
  ["sin","cos","tan"].forEach((fn) => { s = s.replaceAll("\\"+fn, fn); });
  const greek = {
    "\\omega":"ω","\\Omega":"Ω","\\alpha":"α","\\beta":"β","\\gamma":"γ","\\Gamma":"Γ",
    "\\delta":"δ","\\Delta":"Δ","\\theta":"θ","\\Theta":"Θ","\\lambda":"λ","\\Lambda":"Λ",
    "\\mu":"μ","\\nu":"ν","\\pi":"π","\\Pi":"Π","\\rho":"ρ","\\sigma":"σ","\\tau":"τ",
    "\\phi":"φ","\\Phi":"Φ","\\psi":"ψ","\\chi":"χ","\\epsilon":"ε","\\eta":"η","\\kappa":"κ",
  };
  Object.entries(greek).forEach(([k,v]) => { s = s.replace(new RegExp(k.replace("\\","\\\\"),"g"), v); });
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  const sup = {"0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","n":"ⁿ"};
  s = s.replace(/\^\{([^}]+)\}/g,(_,i)=>[...i].map(c=>sup[c]||c).join(""));
  s = s.replace(/\^([0-9])/g,(_,c)=>sup[c]||("^"+c));
  const sub = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ","g":"₉"};
  const toSub = t => [...t].map(c=>sub[c]||c).join("");
  s = s.replace(/_\{([^}]+)\}/g,(_,i)=>toSub(i));
  s = s.replace(/_([a-zA-Z0-9]+)/g,(_,i)=>toSub(i));
  s = s.replace(/\\sqrt\{([^}]*)\}/g,"√($1)");
  const ops = {"\\cdot":"·","\\times":"×","\\pm":"±","\\infty":"∞","\\approx":"≈","\\neq":"≠","\\leq":"≤","\\geq":"≥"};
  Object.entries(ops).forEach(([k,v]) => { s = s.replaceAll(k,v); });
  s = s.replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}]/g,"").replace(/\s+/g," ").trim();
  return s;
}

function renderKatex(latex) {
  try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }); }
  catch { return latexToPlain(latex); }
}

const MEASURE_FONT = "500 15px monospace";
let _mCtx = null;
function measureText(text) {
  if (!_mCtx) { const c = document.createElement("canvas"); _mCtx = c.getContext("2d"); }
  _mCtx.font = MEASURE_FONT;
  return _mCtx.measureText(text).width;
}

function buildFormulaList() {
  return Object.values(formulaIndex).map((f) => ({
    id:       f.id,
    label:    latexToPlain(f.formula),
    labelRaw: f.formula,
    name:     f.name,
    topic:    f.systemTopic,
    vars:     (f.variable||[]).map(k => latexToPlain(variableIndex[k]?.symbol || k.split("_")[0])),
    varRaw:   (f.variable||[]).map(k => variableIndex[k]?.symbol || k.split("_")[0]),
  }));
}

function buildEdges(formulas) {
  const edges = [];
  for (let i = 0; i < formulas.length; i++)
    for (let j = i+1; j < formulas.length; j++) {
      const a = formulas[i], b = formulas[j];
      const shared = a.vars.filter(v => b.vars.includes(v));
      if (shared.length) edges.push({ a: a.id, b: b.id, shared, sameTopic: a.topic === b.topic });
    }
  return edges;
}

function computeLayout(formulas, W) {
  const groups = {};
  TOPIC_ORDER.forEach(tk => { groups[tk] = []; });
  formulas.forEach(f => { if (groups[f.topic]) groups[f.topic].push(f); });

  const positions = {};
  const nodeSizes = {};
  const bandMeta  = [];
  let yOff = 0;

  TOPIC_ORDER.forEach(tk => {
    const members = groups[tk] || [];
    if (!members.length) { bandMeta.push({ topic: tk, yStart: yOff, height: 0 }); return; }

    const bandStart = yOff;
    let rowCount = 0, tempIdx = 0;
    while (tempIdx < members.length) { tempIdx += (rowCount % 2 === 0) ? 4 : 3; rowCount++; }

    const sliceH = TOPIC_PADDING + rowCount * CELL_H + BOTTOM_GAP;

    let idx = 0, row = 0;
    while (idx < members.length) {
      const isEven   = row % 2 === 0;
      const rowSlice = members.slice(idx, idx + (isEven ? 4 : 3));
      const usableW  = rowSlice.length === 3 ? W * 0.75 : W - 40;
      const cellW    = usableW / rowSlice.length;
      const rowY     = yOff + TOPIC_PADDING + row * CELL_H + CELL_H / 2;

      rowSlice.forEach((f, col) => {
        const xStart = (W - rowSlice.length * cellW) / 2;
        positions[f.id] = { x: xStart + col * cellW + cellW / 2, y: rowY };
        nodeSizes[f.id] = { w: Math.max(measureText(f.label) + NODE_PAD * 2, 90), h: NODE_H };
      });

      idx += rowSlice.length;
      row++;
    }

    yOff += sliceH;
    bandMeta.push({ topic: tk, yStart: bandStart, height: sliceH });
  });

  return { positions, nodeSizes, bandMeta, totalH: yOff };
}

function buildCyStyle() {
  const base = [
    // ── บังคับ Cytoscape core background โปร่งใส ──────────────────────────────
    {
      selector: "core",
      style: {
        "active-bg-color":            "transparent",
        "active-bg-opacity":          0,
        "outside-texture-bg-color":   "transparent",
        "outside-texture-bg-opacity": 0,
        "bg-color":                   "transparent",
      },
    },
    {
      selector: "node",
      style: {
        "shape":        "round-rectangle",
        "width":        "data(w)",
        "height":       "data(h)",
        "label":        "data(label)",
        "font-family":  "monospace",
        "font-size":    17,
        "font-weight":  500,
        "text-valign":  "center",
        "text-halign":  "center",
        "text-wrap":    "none",
        "border-width": 1.5,
        "outline-width":   6,
        "outline-color":   "transparent",  // ← เปลี่ยนจาก #FDF6EE เป็น transparent
        "outline-opacity": 0,              // ← ปิด outline ที่ทำให้เกิด halo สีครีม
        "shadow-blur":  0,
        "transition-property": "background-color, border-color, border-width, color, shadow-blur",
        "transition-duration": "150ms",
      },
    },
    {
      selector: "node:selected",
      style: {
        "background-blacken": 0,
        "overlay-opacity":    0,
        "underlay-opacity":   0,
      },
    },
    { selector: "node.faded", style: { opacity: 0.15 } },
    {
      selector: "edge",
      style: {
        "width":           1,
        "line-color":      "#C07030",
        "line-style":      "dashed",
        "line-dash-pattern": [5, 4],
        "opacity":         0.30,
        "curve-style":     "straight",
        "source-endpoint": "outside-to-node",
        "target-endpoint": "outside-to-node",
        "transition-property": "opacity, width, line-color",
        "transition-duration": "150ms",

        "z-index": 5,
      },
    },
    {
      selector: "edge[sameTopic = 'true']",
      style: { "line-color": "#6B3E26", "line-style": "solid", "width": 1.5, "opacity": 0.28 },
    },
    {
      selector: "edge.highlighted",
      style: { 
        "width": 2.5, 
        "opacity": 0.85, 
        "z-index": 5, "label": "" },
    },
    { selector: "edge.faded", style: { opacity: 0.04 } },
    { selector: "edge.highlighted[sameTopic = 'true']",  style: { "line-color": "#6B3E26", "line-style": "solid" } },
    { selector: "edge.highlighted[sameTopic = 'false']", style: { "line-color": "#C07030", "line-style": "dashed" } },
  ];

  TOPIC_ORDER.forEach(tk => {
    const c = flColour(tk);

    base.push({ selector: `node[topic="${tk}"]`, style: {
      "background-color": c.bg,
      "border-color":     c.border,
      "color":            c.text,
    }});

    base.push({ selector: `node[topic="${tk}"].hovered, node[topic="${tk}"].selected`, style: {
      "background-color":   c.text,
      "background-opacity": 1,
      "border-color":       c.text,
      "border-width":       2.5,
      "color":              "#FDF6EE",
      "text-opacity":       1,
      "font-weight":        700,
      "z-index":            100,
    }});

    base.push({ selector: `node[topic="${tk}"].connected`, style: {
      "background-color": c.bg,
      "border-color":     c.text,
      "border-width":     2,
      "z-index":          10,
    }});
  });

  return base;
}

// ─── SharedVarOverlay ─────────────────────────────────────────────────────────
function SharedVarOverlay({ sharedMap, selectedId, cyRef, containerW, totalH }) {
  const ref = useRef(null);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !ref.current) return;
    const update = () => {
      if (!ref.current) return;
      const { x, y } = cy.pan();
      const z = cy.zoom();
      ref.current.style.transform = `translate(${x}px,${y}px) scale(${z})`;
    };
    cy.on("pan zoom render", update);
    update();
    return () => cy.off("pan zoom render", update);
  });

  if (!selectedId || !sharedMap || Object.keys(sharedMap).length === 0) return null;

  return (
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:2 }}>
      <div ref={ref} style={{ position:"absolute", top:0, left:0, transformOrigin:"0 0", width: containerW, height: totalH }}>
        {Object.entries(sharedMap).map(([nodeId, { pos, size, shared, sameTopic }]) => {
          const x = pos.x - size.w / 2;
          const y = pos.y + size.h / 2 + 6;
          return (
            <div key={nodeId} style={{
              position: "absolute", left: x, top: y, width: size.w,
              display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 3,
            }}>
              <span style={{
                position: "relative",
                zIndex: 10,

                fontSize: 13,
                fontFamily: "monospace",
                fontWeight: 700,

                padding: "4px 12px",
                borderRadius: 10,

                border: `1.5px solid ${sameTopic ? "#6B3E26" : "#C07030"}`,
                color:      sameTopic ? "#3A1F0D" : "#7A3A0A",
                background: sameTopic ? "#F2E6D4"  : "#FFF3E0",

                boxShadow: "0 0 0 4px #FFFAF5",

                whiteSpace: "nowrap",
              }}>
                {shared.join(", ")}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Band background overlay ──────────────────────────────────────────────────
// วาง zIndex:1 ให้อยู่ใต้ Cytoscape (zIndex:3) แต่เหนือ wrapper background
function BandOverlay({ bandMeta, hiddenTopics, cyRef, totalH, containerW }) {
  const ref = useRef(null);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !ref.current) return;
    const update = () => {
      if (!ref.current) return;
      const { x, y } = cy.pan();
      const z = cy.zoom();
      ref.current.style.transform = `translate(${x}px,${y}px) scale(${z})`;
    };
    cy.on("pan zoom render", update);
    update();
    return () => cy.off("pan zoom render", update);
  });

  return (
    // zIndex:1 — อยู่ใต้ Cytoscape canvas (zIndex:3)
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:1 }}>
      <div ref={ref} style={{ position:"absolute", top:0, left:0, transformOrigin:"0 0", width: containerW, height: totalH }}>
        {bandMeta.map(({ topic, yStart, height }, i) => {
          if (hiddenTopics.has(topic) || height === 0) return null;
          const c = flColour(topic);
          return (
            <div key={topic} style={{ position:"absolute", top: yStart, left:0, width:"100%", height }}>

              {/* ── พื้นหลัง: ใช้ lightCode ซึ่งมี saturation มากพอให้เห็นได้ ── */}
              <div style={{ position:"absolute", inset:0, background: c.bg }} />

              {/* ── เส้นแบ่ง topic: ประ 6/10 ใช้ borderCode ของ topic นั้น ── */}
              {i > 0 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 2,
                  background: `repeating-linear-gradient(90deg,
                    ${c.border} 0px, ${c.border} 8px,
                    transparent 8px, transparent 18px)`,
                }} />
              )}

              {/* ── Topic label ── */}
              <div style={{
                position:"absolute", top:14, left:16,
                fontFamily:"sans-serif", fontWeight:700, fontSize:13,
                color: c.text + "99", userSelect:"none", letterSpacing:"0.05em",
                zIndex: 2,
              }}>
                {TOPIC_LABEL[topic] || topic}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({ selectedId, formulas, edges, hiddenTopics }) {
  const navigate = useNavigate();

  if (!selectedId) {
    return (
      <div style={{ padding:"16px 20px", borderTop:"2px solid #E8D5BC", background:"#FFFAF5" }}>
        <span style={{ fontSize:15, color:"#C8A882", fontStyle:"italic" }}>
          Click any formula node to explore its connections
        </span>
      </div>
    );
  }

  const f = formulas.find(f => f.id === selectedId);
  if (!f) return null;
  const c  = flColour(f.topic);
  const fl = c.fl;

  const isVisible = id => { const ff = formulas.find(x => x.id === id); return ff && !hiddenTopics.has(ff.topic); };
  const conns = edges.filter(e => (e.a === selectedId || e.b === selectedId) && isVisible(e.a) && isVisible(e.b));
  const byTopic = {};
  conns.forEach(e => {
    const oid = e.a === selectedId ? e.b : e.a;
    const of2 = formulas.find(ff => ff.id === oid);
    if (!of2) return;
    if (!byTopic[of2.topic]) byTopic[of2.topic] = [];
    byTopic[of2.topic].push({ edge: e, formula: of2 });
  });

  return (
    <div style={{ borderTop:"2px solid #E8D5BC", background:"#FFFAF5" }}>
      <div style={{ padding:"16px 20px 14px", borderBottom:"1.5px dashed #E8D5BC", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        <span
          style={{ fontWeight:700, fontSize:26, color:c.text, lineHeight:1 }}
          dangerouslySetInnerHTML={{ __html: renderKatex(f.labelRaw) }}
        />
        <span style={{ fontSize:16, color:"#9A8070", flex:1, minWidth:0 }}>{f.name}</span>
        <span className={`text-[13px] px-4 py-1.5 rounded-full font-bold whitespace-nowrap ${fl.deep} ${fl.light} border ${fl.border}`}>
          {TOPIC_LABEL[f.topic] || f.topic}
        </span>
        <button
          onClick={() => setTimeout(() => navigate(routeBuilder.formula(f.id)), 0)}
          className="px-5 py-2 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[14px] font-bold cursor-pointer border-0 hover:opacity-85 transition-opacity"
        >
          Open formula →
        </button>
      </div>

      <div style={{ padding:"14px 20px", borderBottom:"1.5px dashed #E8D5BC" }}>
        <div className="text-[11px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-3">Variables</div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
          {f.varRaw.map((sym, i) => (
            <span
              key={i}
              className={`rounded-lg px-4 py-2 font-mono font-bold border ${fl.deep} ${fl.light} ${fl.border}`}
              style={{ fontSize:20 }}
              dangerouslySetInnerHTML={{ __html: renderKatex(sym) }}
            />
          ))}
        </div>
      </div>

      <div style={{ padding:"14px 20px 18px" }}>
        <div className="text-[11px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-4">Connected formulas</div>
        {Object.keys(byTopic).length === 0 ? (
          <span style={{ fontSize:15, color:"#B83030" }}>No connections visible in current filter</span>
        ) : (
          TOPIC_ORDER.filter(tk => byTopic[tk]).map(tk => {
            const otc = flColour(tk);
            const ofl = otc.fl;
            return (
              <div key={tk} style={{ marginBottom:18 }}>
                <div className={`text-[13px] font-bold pb-1.5 mb-3 border-b ${ofl.deep} ${ofl.border}`}>
                  {TOPIC_LABEL[tk] || tk}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {byTopic[tk].map(({ edge, formula: of2 }) => (
                    <div key={of2.id}
                      onClick={() => navigate(routeBuilder.formula(of2.id))}
                      style={{
                        display:"flex", alignItems:"center", gap:12,
                        padding:"11px 16px", borderRadius:12,
                        border:"1.5px solid #E8D5BC", background:"white", cursor:"pointer",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor="#C8A882"; e.currentTarget.style.background="#FDF6EE"; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor="#E8D5BC"; e.currentTarget.style.background="white"; }}
                    >
                      <span
                        style={{ fontWeight:700, fontSize:22, color:otc.text, flexShrink:0 }}
                        dangerouslySetInnerHTML={{ __html: renderKatex(of2.labelRaw) }}
                      />
                      <span style={{ fontSize:14, color:"#9A8070", flex:1, minWidth:0, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                        {of2.name}
                      </span>
                      <div style={{ display:"flex", gap:5, flexShrink:0 }}>
                        {edge.shared.map(sym => (
                          <span key={sym} style={{
                            fontSize:14, padding:"3px 10px", borderRadius:6,
                            fontFamily:"monospace", fontWeight:700,
                            border:`1.5px solid ${edge.sameTopic ? "#6B3E26" : "#C07030"}`,
                            color:      edge.sameTopic ? "#3A1F0D" : "#7A3A0A",
                            background: edge.sameTopic ? "#F2E6D4"  : "#FFF3E0",
                          }}>
                            {sym}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={ev => { ev.stopPropagation(); navigate(routeBuilder.formula(of2.id)); }}
                        className="px-4 py-1.5 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[12px] font-bold cursor-pointer border-0 whitespace-nowrap hover:opacity-85 transition-opacity"
                      >
                        Open →
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── QuickNav ─────────────────────────────────────────────────────────────────
function QuickNav({ bandMeta, containerRef }) {
  const scrollToTopic = (topic) => {
    const band = bandMeta.find(b => b.topic === topic);
    if (!band || !containerRef.current) return;
    const wrapRect = containerRef.current.getBoundingClientRect();
    const absTop   = window.scrollY + wrapRect.top + band.yStart;
    window.scrollTo({ top: absTop - 80, behavior: "smooth" });
  };

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {TOPIC_ORDER.map(tk => {
        const fl = allSweetFlavour[tk] || allSweetFlavour.default;
        return (
          <button key={tk} onClick={() => scrollToTopic(tk)}
            className={`px-4 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-[.12em] transition-all duration-200 active:scale-95 ${fl.border} ${fl.deep} bg-white hover:-translate-y-0.5 hover:shadow-md`}
            onMouseEnter={e => { e.currentTarget.style.background=fl.deepCode; e.currentTarget.style.color="#fff"; e.currentTarget.style.borderColor=fl.deepCode; }}
            onMouseLeave={e => { e.currentTarget.style.background=""; e.currentTarget.style.color=""; e.currentTarget.style.borderColor=""; }}
          >
            {TOPIC_LABEL[tk]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function FormulaMap() {
  const cyContainer = useRef(null);
  const cyRef       = useRef(null);
  const wrapRef     = useRef(null);

  const [selectedId, setSelectedId] = useState(null);
  const [graphH,     setGraphH]     = useState(600);
  const [layout, setLayout] = useState({ bandMeta:[], totalH:600, containerW:800 });
  const [sharedMap, setSharedMap] = useState({});

  const formulas = useMemo(() => buildFormulaList(), []);
  const edges    = useMemo(() => buildEdges(formulas), [formulas]);

  useEffect(() => {
    const container = cyContainer.current;
    if (!container) return;

    const containerW = container.clientWidth || 800;
    const { positions, nodeSizes, bandMeta, totalH } = computeLayout(formulas, containerW);

    setLayout({ bandMeta, totalH, containerW });
    setGraphH(Math.max(totalH, 400));

    const elements = [
      ...formulas.map(f => ({
        data: { id:f.id, label:f.label, topic:f.topic,
                w: nodeSizes[f.id]?.w ?? 120, h: nodeSizes[f.id]?.h ?? NODE_H },
        position: positions[f.id] || { x:0, y:0 },
      })),
      ...edges.map((e, i) => ({
        data: { id:"e"+i, source:e.a, target:e.b,
                sameTopic:String(e.sameTopic), shared:e.shared.join(" · ") },
      })),
    ];

    const cy = cytoscape({
      container,
      elements,
      style:  buildCyStyle(),
      layout: { name:"preset" },

      userZoomingEnabled:  false,
      userPanningEnabled:  false,
      boxSelectionEnabled: false,
      autoungrabify:       true,
      autounselectify:     true,
      selectionType:       "single",
      textureOnViewport:   false,
      motionBlur:          false,
      minZoom: 1,
      maxZoom: 1,
    });

    cy.zoom(1);
    cy.pan({ x: 0, y: 0 });

    // ── บังคับ Cytoscape canvas โปร่งใสทุกชั้นด้วย MutationObserver ──────────
    // Cytoscape inject background ผ่าน inline style ทุกครั้งที่ render
    // MutationObserver คอย strip มันออกทันที
    const stripBg = () => {
      container.style.removeProperty("background-color");
      container.style.removeProperty("background");
      container.querySelectorAll("canvas").forEach(cvs => {
        cvs.style.removeProperty("background-color");
        cvs.style.removeProperty("background");
      });
    };
    stripBg();
    const mo = new MutationObserver(stripBg);
    mo.observe(container, { attributes: true, attributeFilter: ["style"], subtree: true });

    cy.on("tap", "node", evt => {
      const node = evt.target;
      const id   = node.id();
      setSelectedId(prev => {
        if (prev === id) { node.removeClass("selected"); return null; }
        cy.nodes().removeClass("selected");
        node.addClass("selected");
        return id;
      });
    });

    cy.on("tap", evt => {
      if (evt.target === cy) { cy.nodes().removeClass("selected"); setSelectedId(null); }
    });

    cy.on("mouseover", "node", evt => { evt.target.addClass("hovered");    container.style.cursor = "pointer"; });
    cy.on("mouseout",  "node", evt => { evt.target.removeClass("hovered"); container.style.cursor = "default"; });

    cyRef.current = cy;

    const ro = new ResizeObserver(() => {
      const newW = container.clientWidth;
      const { bandMeta: nb, totalH: nh, containerW: nc } = computeLayout(formulas, newW);
      setLayout({ bandMeta: nb, totalH: nh, containerW: nc });
      setGraphH(Math.max(nh, 400));
      cy.resize();
    });
    ro.observe(container);

    return () => { mo.disconnect(); ro.disconnect(); cy.destroy(); cyRef.current = null; };
  }, [formulas, edges]); // eslint-disable-line

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const visNodes = cy.nodes();
    const visEdges = cy.edges();

    visNodes.removeClass("faded connected");
    visEdges.removeClass("highlighted faded");
    setSharedMap({});

    if (selectedId) {
      const sel    = cy.getElementById(selectedId);
      const hlEdge = sel.connectedEdges().intersection(visEdges);
      const hlNode = hlEdge.connectedNodes().intersection(visNodes).not(sel);

      visNodes.addClass("faded");
      visEdges.addClass("faded");
      sel.removeClass("faded");
      hlEdge.removeClass("faded").addClass("highlighted");
      hlNode.removeClass("faded").addClass("connected");

      const newMap = {};
      hlEdge.forEach(e => {
        const srcId  = e.source().id();
        const tgtId  = e.target().id();
        const connId = srcId === selectedId ? tgtId : srcId;
        const connNode = cy.getElementById(connId);
        const pos  = connNode.position();
        const w    = connNode.data("w");
        const h    = connNode.data("h");
        const sharedSyms = e.data("shared").split(" · ");
        const sameTopic  = e.data("sameTopic") === "true";
        if (!newMap[connId]) {
          newMap[connId] = { pos, size: { w, h }, shared: sharedSyms, sameTopic };
        } else {
          newMap[connId].shared = [...new Set([...newMap[connId].shared, ...sharedSyms])];
        }
      });
      setSharedMap(newMap);
    }
  }, [selectedId]);

  return (
    <div className="pb-8">

      {/* ── inject CSS บังคับ Cytoscape container โปร่งใส ── */}
      <style>{`
        .cy-map-container,
        .cy-map-container canvas {
          background: transparent !important;
          background-color: transparent !important;
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="text-center py-8 px-4 max-w-[600px] mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#FDF6EE] border border-[#E8D5BC] rounded-full px-4 py-1 text-[9px] font-bold text-[#A8601A] uppercase tracking-[.2em] mb-4">
          <div className="w-[5px] h-[5px] rounded-full bg-[#D4831A]" />
          Physics Formula System
        </div>
        <div className="text-[38px] font-black text-[#2D1810] tracking-[.15em] uppercase italic leading-none mb-2">
          PHY<span className="text-[#D4831A]">SUTH</span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="w-6 h-px bg-[#D5C8BC]" />
          <span className="text-[10px] font-bold text-[#9A8070] uppercase tracking-[.22em]">
            ระบบแสดงความเชื่อมโยงสูตรฟิสิกส์จากตัวแปร
          </span>
          <div className="w-6 h-px bg-[#D5C8BC]" />
        </div>
        <div className="text-[12px] text-[#A8601A] mb-5 leading-relaxed">เพื่อการแก้โจทย์ปัญหา</div>
        <QuickNav bandMeta={layout.bandMeta} containerRef={wrapRef} />
      </div>

      {/* ── Graph card ── */}
      <div className="border-2 border-[#C8A882] rounded-[18px] overflow-hidden" ref={wrapRef}>
        {/*
          wrapper ไม่มี background — ให้ BandOverlay เป็นคนวาดพื้นหลังทั้งหมด
          ถ้า Cytoscape โปร่งใส BandOverlay จะโชว์ได้เต็มๆ
        */}
        <div style={{ position:"relative", width:"100%", height: graphH }}>

          {/* zIndex:1 — band background */}
          <BandOverlay
            bandMeta={layout.bandMeta}
            hiddenTopics={new Set()}
            cyRef={cyRef}
            totalH={layout.totalH}
            containerW={layout.containerW}
          />

          {/* zIndex:2 — shared var labels */}
          <SharedVarOverlay
            sharedMap={sharedMap}
            selectedId={selectedId}
            cyRef={cyRef}
            containerW={layout.containerW}
            totalH={layout.totalH}
          />

          {/* zIndex:3 — Cytoscape canvas (ต้องโปร่งใส) */}
          <div
            ref={cyContainer}
            className="cy-map-container"
            style={{ position:"absolute", inset:0, zIndex:3 }}
          />
        </div>

        <DetailPanel selectedId={selectedId} formulas={formulas} edges={edges} hiddenTopics={new Set()} />

        {/* legend */}
        <div className="flex flex-wrap gap-4 items-center px-5 py-3 border-t border-[#E8D5BC] bg-[#F2E6D4]">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B4A30]">
            <div className="w-5 h-[2.5px] bg-[#6B3E26] rounded" />
            shared variable (same topic)
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6B4A30]">
            <svg width="20" height="4">
              <line x1="0" y1="2" x2="20" y2="2" stroke="#C07030" strokeWidth="1.5" strokeDasharray="4 3"/>
            </svg>
            same symbol, different topic
          </div>
          <div className="ml-auto text-[11px] text-[#C8A882]">click node to explore · scroll to navigate</div>
        </div>
      </div>
    </div>
  );
}