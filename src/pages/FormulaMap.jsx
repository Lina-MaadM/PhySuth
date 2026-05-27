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

// ─── ค่าคงที่สำหรับ layout กราฟ ───────────────────────────────────────────────
// ปรับตรงนี้ถ้าอยากเพิ่ม/ลดระยะห่างระหว่าง node หรือความสูงของแต่ละ band
const CELL_H        = 120;  // ความสูง "ช่อง" ของแต่ละ node (รวม padding บน-ล่าง)
const TOPIC_PADDING = 60;   // ระยะจากขอบบน band ถึง node แถวแรก (พื้นที่ชื่อ Topic)
const BOTTOM_GAP    = 48;   // ระยะเผื่อใต้ node แถวสุดท้ายของแต่ละ band
const NODE_H        = 54;   // ความสูงจริงของ node (กล่อง)
const NODE_PAD      = 24;   // padding ซ้าย-ขวาภายใน node (กำหนดความกว้างขั้นต่ำ)

// ─── helper: ดึง hex color จาก allSweetFlavour ───────────────────────────────
// Cytoscape ต้องการ hex/rgb จริงๆ — ใช้ Tailwind class ไม่ได้
// ถ้าเพิ่ม topic ใหม่ ต้องเพิ่ม softCode/lightCode/borderCode ใน allSweetFlavour ด้วย
function flColour(topic) {
  const fl = allSweetFlavour[topic] || allSweetFlavour.default;
  return {
    text:   fl.deepCode,    // สีข้อความ + border เวลา hover/select
    border: fl.borderCode,  // สี border ปกติ (อ่อน)
    bg:     fl.lightCode,   // สีพื้น node ปกติ (light-100)
    soft:   fl.softCode,    // สีพื้น band background (soft-50)
    fl,                     // object ดั้งเดิม (ใช้ใน Tailwind className)
  };
}

// ─── แปลง LaTeX string → plain text สำหรับ label บน Cytoscape canvas ─────────
// Cytoscape วาด label ด้วย Canvas API — ไม่รองรับ HTML/KaTeX
// ฟังก์ชันนี้แปลง \frac, ^{}, _{}, \alpha ฯลฯ → unicode ที่อ่านได้
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
  const sub = {"0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉","a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ","o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ","g":"₉","d":"ₔ"};
  const toSub = t => [...t].map(c=>sub[c]||c).join("");
  s = s.replace(/_\{([^}]+)\}/g,(_,i)=>toSub(i));
  s = s.replace(/_([a-zA-Z0-9]+)/g,(_,i)=>toSub(i));
  s = s.replace(/\\sqrt\{([^}]*)\}/g,"√($1)");
  const ops = {"\\cdot":"·","\\times":"×","\\pm":"±","\\infty":"∞","\\approx":"≈","\\neq":"≠","\\leq":"≤","\\geq":"≥"};
  Object.entries(ops).forEach(([k,v]) => { s = s.replaceAll(k,v); });
  s = s.replace(/\\text\{([^}]*)\}/g,"$1").replace(/\\[a-zA-Z]+/g,"").replace(/[{}]/g,"").replace(/\s+/g," ").trim();
  return s;
}

// ─── render LaTeX เป็น HTML string (ใช้ใน DetailPanel เท่านั้น) ───────────────
// ต่างจาก latexToPlain — อันนี้ใช้ KaTeX จริงๆ เพราะ DetailPanel เป็น HTML ธรรมดา
function renderKatex(latex) {
  try { return katex.renderToString(latex, { throwOnError: false, displayMode: false }); }
  catch { return latexToPlain(latex); }
}

// ─── วัดความกว้างข้อความด้วย Canvas (สำหรับคำนวณ node width) ─────────────────
// ใช้ font เดียวกับที่ Cytoscape วาด label จริง → node จะพอดีกับข้อความ
const MEASURE_FONT = "500 15px monospace";
let _mCtx = null;
function measureText(text) {
  if (!_mCtx) { const c = document.createElement("canvas"); _mCtx = c.getContext("2d"); }
  _mCtx.font = MEASURE_FONT;
  return _mCtx.measureText(text).width;
}

// ─── สร้าง list สูตรทั้งหมดจาก formulaIndex ──────────────────────────────────
function buildFormulaList() {
  return Object.values(formulaIndex).map((f) => ({
    id:       f.id,
    label:    latexToPlain(f.formula),   // plain text สำหรับ Cytoscape label
    labelRaw: f.formula,                 // LaTeX ดิบ สำหรับ KaTeX ใน DetailPanel
    name:     f.name,
    topic:    f.systemTopic,
    vars:     (f.variable||[]).map(k => latexToPlain(variableIndex[k]?.symbol || k.split("_")[0])),
    varRaw:   (f.variable||[]).map(k => variableIndex[k]?.symbol || k.split("_")[0]),
  }));
}

// ─── สร้าง edge ระหว่างสูตรที่มีตัวแปรร่วมกัน ────────────────────────────────
// วิ่ง O(n²) 
// สร้างความเชื่อมโยงสูตร-สูตร
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

// ─── คำนวณตำแหน่ง (x,y) ของทุก node และ metadata ของแต่ละ band ───────────────
// Layout แถวคู่มี 4 node, แถวคี่มี 3 node 
function computeLayout(formulas, W) {
  // จัดกลุ่มสูตรตาม topic
  const groups = {};
  TOPIC_ORDER.forEach(tk => { groups[tk] = []; });
  formulas.forEach(f => { if (groups[f.topic]) groups[f.topic].push(f); });

  const positions = {};  // { [formulaId]: { x, y } } — ส่งให้ Cytoscape
  const nodeSizes = {};  // { [formulaId]: { w, h } }  — ส่งเป็น data ให้ Cytoscape อ่าน
  const bandMeta  = [];  // [{ topic, yStart, height }] — ส่งให้ BandOverlay คำนวนความสูง
  let yOff = 0;          // ตำแหน่ง y ปัจจุบัน 

  TOPIC_ORDER.forEach(tk => {
    const members = groups[tk] || [];
    if (!members.length) { bandMeta.push({ topic: tk, yStart: yOff, height: 0 }); return; }

    const bandStart = yOff;

    // นับจำนวนแถวที่ต้องการ (สลับ 4-3-4-3...)
    let rowCount = 0, tempIdx = 0;
    while (tempIdx < members.length) { tempIdx += (rowCount % 2 === 0) ? 4 : 3; rowCount++; }

    const sliceH = TOPIC_PADDING + rowCount * CELL_H + BOTTOM_GAP;

    // วางตำแหน่ง node แต่ละตัว
    let idx = 0, row = 0;
    while (idx < members.length) {
      const isEven   = row % 2 === 0;
      const rowSlice = members.slice(idx, idx + (isEven ? 4 : 3));
      // แถว 3 node ใช้ 75% ความกว้าง → ทำให้ดู stagger
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

// ─── Cytoscape Stylesheet ─────────────────────────────────────────────────────
// Cytoscape ใช้ระบบ CSS-like selector เหมือน CSS จริงๆ แต่ property ต่างกัน
// ลำดับสำคัญ: selector ที่ specific กว่าจะ override — เหมือน CSS specificity

function buildCyStyle() {
  const base = [

    // ── บังคับ core (viewport) โปร่งใส ────────────────────────────────────────
    // ถ้าไม่ set ตรงนี้ Cytoscape จะวาด bg ขาว/เทาทับ BandOverlay HTML
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

    // ── default style ของ node ทุกตัว ─────────────────────────────────────────
    // สีจะถูก override โดย topic-specific selector ด้านล่าง
    {
      selector: "node",
      style: {
        "shape":        "round-rectangle",
        "width":        "data(w)",    // อ่านจาก element data ที่ส่งตอน init
        "height":       "data(h)",
        "label":        "data(label)",
        "font-family":  "monospace",
        "font-size":    17,
        "font-weight":  500,
        "text-valign":  "center",
        "text-halign":  "center",
        "text-wrap":    "none",       // ไม่ตัดบรรทัด — ถ้าอยากตัดให้เป็น "wrap"
        "border-width": 1.5,
        "outline-width":   6,
        "outline-color":   "transparent",
        "outline-opacity": 0,
        "shadow-blur":  0,
        // transition: animate เฉพาะ property เหล่านี้เมื่อ state เปลี่ยน
        "transition-property": "background-color, border-color, border-width, color, shadow-blur",
        "transition-duration": "150ms",
      },
    },

    // ── node ที่ถูก Cytoscape select (built-in :selected pseudo-class) ─────────
    // เราไม่ใช้ built-in select แล้ว — ใช้ class "selected" แทน 
    // แต่ต้อง reset ค่า default ของ Cytoscape ไม่งั้นจะมี highlight เทาๆ ทับ
    {
      selector: "node:selected",
      style: {
        "background-blacken": 0,   // ปิด effect เข้มขึ้นอัตโนมัติ
        "overlay-opacity":    0,   // ปิด overlay สีฟ้าอ่อนที่ Cytoscape วางทับ
        "underlay-opacity":   0,
      },
    },

    // ── node ที่ fade (ตอนมี node ถูกเลือก — node ที่ไม่ connect จะจางลง) ──────
    { selector: "node.faded", style: { opacity: 0.15 } },

    // ── default style ของ edge ทุกเส้น ───────────────────────────────────────
    {
      selector: "edge",
      style: {
        "width":           1,
        "line-color":      "#C07030",     // สี default = ส้ม (ต่าง topic)
        "line-style":      "dashed",
        "line-dash-pattern": [5, 4],      // [เส้น, ช่องว่าง] px
        "opacity":         0.30,
        "curve-style":     "straight",    // เส้นตรง — เปลี่ยนเป็น "bezier" ถ้าอยากโค้ง
        // endpoint ชนที่ขอบ node พอดี ไม่โผล่เข้าไปใน node
        "source-endpoint": "outside-to-node",
        "target-endpoint": "outside-to-node",
        "transition-property": "opacity, width, line-color",
        "transition-duration": "150ms",
        "z-index": 5,
      },
    },

    // ── edge ที่เชื่อม node ใน topic เดียวกัน → เส้นทึบ เข้มกว่า ─────────────
    {
      selector: "edge[sameTopic = 'true']",
      style: { "line-color": "#6B3E26", "line-style": "solid", "width": 1.5, "opacity": 0.28 },
    },

    // ── edge ที่ถูก highlight (เมื่อ node ถูกเลือก) ──────────────────────────
    {
      selector: "edge.highlighted",
      style: { "width": 2.5, "opacity": 0.85, "z-index": 5, "label": "" },
    },

    // ── edge ที่ fade ─────────────────────────────────────────────────────────
    { selector: "edge.faded", style: { opacity: 0.04 } },

    // ── override สี edge.highlighted ตาม sameTopic ───────────────────────────
    { selector: "edge.highlighted[sameTopic = 'true']",  style: { "line-color": "#6B3E26", "line-style": "solid" } },
    { selector: "edge.highlighted[sameTopic = 'false']", style: { "line-color": "#C07030", "line-style": "dashed" } },
  ];

  // ── Topic-specific node styles ─────────────────────────────────────────────
  // วน loop แต่ละ topic เพื่อ push selector เข้า base array
  // แต่ละ topic มี 3 state: idle / hovered+selected / connected
  TOPIC_ORDER.forEach(tk => {
    const c = flColour(tk);

    // idle — พื้นสี light ของ topic นั้น
    base.push({ selector: `node[topic="${tk}"]`, style: {
      "background-color": c.bg,      // lightCode (เช่น rose-100)
      "border-color":     c.border,  // borderCode (เช่น rose-200)
      "color":            c.text,    // deepCode (เช่น rose-700)
    }});

    // hovered หรือ selected — พื้น deepCode + ข้อความขาว (เหมือน FormulaCard hover)
    // ใช้ class "selected" แทน :selected เพราะเราจัดการ toggle เอง (ดูใน event handler)
    // เหตุที่ไม่ใช้ :selected → Cytoscape มี built-in behavior ที่ควบคุมยาก
    base.push({ selector: `node[topic="${tk}"].hovered, node[topic="${tk}"].selected`, style: {
      "background-color":   c.text,   // deepCode เป็น background
      "background-opacity": 1,
      "border-color":       c.text,
      "border-width":       2.5,
      "color":              "#FDF6EE",
      "text-opacity":       1,
      "font-weight":        700,
      "z-index":            100,
    }});

    // connected — node ที่มี edge เชื่อมกับ node ที่เลือก
    // ไม่ต้องเปลี่ยน bg มาก แค่เพิ่ม border เพื่อให้รู้ว่า "มีความสัมพันธ์"
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
// HTML div ลอยอยู่เหนือ BandOverlay แต่ต่ำกว่า Cytoscape canvas
// แสดงตัวแปรที่ใช้ร่วมกันใต้ node ที่ connected กับ node ที่เลือก
// ต้อง sync transform กับ cy.pan()/cy.zoom() เพราะ Cytoscape scroll/zoom แยก
function SharedVarOverlay({ sharedMap, selectedId, cyRef, containerW, totalH }) {
  const ref = useRef(null);

  useEffect(() => {
    const cy = cyRef.current;
    if (!cy || !ref.current) return;
    // ดัก event pan/zoom/render ของ Cytoscape → sync transform ของ div
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
          // วางไว้ใต้ node ใน Cytoscape coordinate space
          const x = pos.x - size.w / 2;
          const y = pos.y + size.h / 2 + 6;
          return (
            <div key={nodeId} style={{
              position: "absolute", left: x, top: y, width: size.w,
              display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 3,
            }}>
              <span style={{
                position: "relative", zIndex: 10,
                fontSize: 13, fontFamily: "monospace", fontWeight: 700,
                padding: "4px 12px", borderRadius: 10,
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

// ─── BandOverlay ──────────────────────────────────────────────────────────────
// HTML div วาดพื้นหลังสีของแต่ละ topic band
// อยู่ที่ zIndex:1 (ใต้ Cytoscape canvas ที่ zIndex:3)
// ต้อง sync transform กับ cy.pan()/cy.zoom() เหมือน SharedVarOverlay
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
    <div style={{ position:"absolute", inset:0, overflow:"hidden", pointerEvents:"none", zIndex:1 }}>
      <div ref={ref} style={{ position:"absolute", top:0, left:0, transformOrigin:"0 0", width: containerW, height: totalH }}>
        {bandMeta.map(({ topic, yStart, height }, i) => {
          if (hiddenTopics.has(topic) || height === 0) return null;
          const c = flColour(topic);
          return (
            <div key={topic} style={{ position:"absolute", top: yStart, left:0, width:"100%", height }}>
              {/* พื้นสี light ของ topic */}
              <div style={{ position:"absolute", inset:0, background: c.bg }} />
              {/* เส้นแบ่ง topic — ประด้วยสีของ topic */}
              {i > 0 && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2, zIndex: 2,
                  background: `repeating-linear-gradient(90deg,
                    ${c.border} 0px, ${c.border} 8px,
                    transparent 8px, transparent 18px)`,
                }} />
              )}
              {/* ชื่อ topic มุมบนซ้าย */}
              <div style={{
                position:"absolute", top:14, left:16,
                fontFamily:"sans-serif", fontWeight:700, fontSize:13,
                color: c.text + "99", userSelect:"none", letterSpacing:"0.05em", zIndex: 2,
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

// ─── DetailPanel ──────────────────────────────────────────────────────────────
// HTML panel ด้านล่างกราฟ — แสดงรายละเอียด node ที่เลือก
// ใช้ KaTeX render formula จริงๆ (ต่างจาก Cytoscape label ที่เป็น plain text)
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

  // จัดกลุ่ม connected formulas ตาม topic
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
      {/* header: สูตร + ชื่อ + topic badge + ปุ่ม Open */}
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

      {/* Variables: กรอบสี่เหลี่ยมมน render KaTeX */}
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

      {/* Connected formulas จัดกลุ่มตาม topic */}
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
                      {/* shared variable badges — สี่เหลี่ยมมน */}
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
// ปุ่ม scroll ไปยัง band ของแต่ละ topic
// คำนวณ absolute position ของ band แล้วใช้ window.scrollTo
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function FormulaMap() {
  const cyContainer = useRef(null);  // div ที่ Cytoscape จะ mount canvas เข้าไป
  const cyRef       = useRef(null);  // เก็บ cy instance ไว้ใช้ใน effect อื่นๆ
  const wrapRef     = useRef(null);  // ref ของ card wrapper (ใช้ใน QuickNav scroll)

  const [selectedId, setSelectedId] = useState(null);
  const [graphH,     setGraphH]     = useState(600);
  const [layout, setLayout] = useState({ bandMeta:[], totalH:600, containerW:800 });
  const [sharedMap, setSharedMap] = useState({});  // ข้อมูล shared vars สำหรับ overlay

  const formulas = useMemo(() => buildFormulaList(), []);
  const edges    = useMemo(() => buildEdges(formulas), [formulas]);

  // ─── Effect: สร้าง Cytoscape instance ──────────────────────────────────────
  // รันครั้งเดียวตอน mount — formulas/edges ไม่เปลี่ยน ดังนั้น deps จึงไม่ trigger
  // ถ้าอยากให้ re-init เมื่อ filter เปลี่ยน → เพิ่ม state ใน deps และ destroy/recreate
  useEffect(() => {
    const container = cyContainer.current;
    if (!container) return;

    const containerW = container.clientWidth || 800;
    const { positions, nodeSizes, bandMeta, totalH } = computeLayout(formulas, containerW);

    setLayout({ bandMeta, totalH, containerW });
    setGraphH(Math.max(totalH, 400));

    // ── Elements = nodes + edges ──────────────────────────────────────────────
    // Cytoscape รับ array of { data, position } สำหรับ node
    // และ { data: { source, target, ... } } สำหรับ edge
    const elements = [
      ...formulas.map(f => ({
        data: {
          id:    f.id,
          label: f.label,   // plain text ที่ Cytoscape วาดบน canvas
          topic: f.topic,   // ใช้ใน selector เช่น node[topic="Mechanics"]
          w:     nodeSizes[f.id]?.w ?? 120,
          h:     nodeSizes[f.id]?.h ?? NODE_H,
        },
        position: positions[f.id] || { x:0, y:0 },
      })),
      ...edges.map((e, i) => ({
        data: {
          id:        "e"+i,
          source:    e.a,
          target:    e.b,
          sameTopic: String(e.sameTopic),   // ต้องเป็น string เพื่อใช้ใน selector [sameTopic = 'true']
          shared:    e.shared.join(" · "),  // แสดงใน SharedVarOverlay
        },
      })),
    ];

    // ── สร้าง Cytoscape instance ──────────────────────────────────────────────
    const cy = cytoscape({
      container,
      elements,
      style:  buildCyStyle(),
      layout: { name:"preset" },  // "preset" = ใช้ position ที่กำหนดมา ไม่คำนวณใหม่

      // ปิด zoom/pan เพราะเราต้องการให้ scroll page แทน (layout พอดีจอ)
      // ถ้าอยากให้ zoom/pan ได้ → เปลี่ยนเป็น true และเพิ่ม minZoom/maxZoom
      userZoomingEnabled:  false,
      userPanningEnabled:  false,
      boxSelectionEnabled: false,
      autoungrabify:       true,   // ล็อก node ไม่ให้ drag
      autounselectify:     true,   // ปิด built-in select 
      selectionType:       "single",
      textureOnViewport:   false,
      motionBlur:          false,
      minZoom: 1,
      maxZoom: 1,
    });

    cy.zoom(1);
    cy.pan({ x: 0, y: 0 });

    // ── บังคับ canvas โปร่งใส ────────────────────────────────────────────────
    // Cytoscape inject background-color เข้า container ผ่าน inline style ทุกครั้งที่ render
    // MutationObserver คอย strip ออกทันที → ทำให้ BandOverlay HTML โชว์ผ่านได้
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

    // ── Event: tap node ───────────────────────────────────────────────────────
    // ใช้ class "selected" แทน cy built-in selection เพราะ:
    // 1. built-in :selected มี visual effect ที่ควบคุมยาก (overlay สีฟ้า)
    // 2. ต้องการ toggle (tap ซ้ำ = deselect)
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

    // tap บน background → deselect
    cy.on("tap", evt => {
      if (evt.target === cy) { cy.nodes().removeClass("selected"); setSelectedId(null); }
    });

    // hover effect
    cy.on("mouseover", "node", evt => { evt.target.addClass("hovered");    container.style.cursor = "pointer"; });
    cy.on("mouseout",  "node", evt => { evt.target.removeClass("hovered"); container.style.cursor = "default"; });

    cyRef.current = cy;

    // ── ResizeObserver: ปรับ layout เมื่อ container ขนาดเปลี่ยน ──────────────
    const ro = new ResizeObserver(() => {
      const newW = container.clientWidth;
      const { bandMeta: nb, totalH: nh, containerW: nc } = computeLayout(formulas, newW);
      setLayout({ bandMeta: nb, totalH: nh, containerW: nc });
      setGraphH(Math.max(nh, 400));
      cy.resize();  // บอก Cytoscape ให้ recalculate viewport
    });
    ro.observe(container);

    // cleanup เมื่อ unmount
    return () => { mo.disconnect(); ro.disconnect(); cy.destroy(); cyRef.current = null; };
  }, [formulas, edges]); // eslint-disable-line

  // ─── Effect: จัดการ highlight/fade เมื่อ selectedId เปลี่ยน ────────────────
  // แยก effect นี้ออกมาเพราะไม่ต้อง re-create cy instance — แค่จัด class ใหม่
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    const visNodes = cy.nodes();
    const visEdges = cy.edges();

    // reset ทุก class ก่อน
    visNodes.removeClass("faded connected");
    visEdges.removeClass("highlighted faded");
    setSharedMap({});

    if (selectedId) {
      const sel    = cy.getElementById(selectedId);
      const hlEdge = sel.connectedEdges().intersection(visEdges);
      // connectedNodes คือ node ปลายทางของ edge — ไม่รวม sel เอง
      const hlNode = hlEdge.connectedNodes().intersection(visNodes).not(sel);

      // fade ทุก node/edge ก่อน แล้วค่อย un-fade เฉพาะที่ต้องการ
      visNodes.addClass("faded");
      visEdges.addClass("faded");
      sel.removeClass("faded");                          // selected node = ไม่ fade
      hlEdge.removeClass("faded").addClass("highlighted");
      hlNode.removeClass("faded").addClass("connected");

      // สร้าง sharedMap สำหรับ SharedVarOverlay
      // { [connectedNodeId]: { pos, size, shared[], sameTopic } }
      const newMap = {};
      hlEdge.forEach(e => {
        const srcId  = e.source().id();
        const tgtId  = e.target().id();
        const connId = srcId === selectedId ? tgtId : srcId;
        const connNode = cy.getElementById(connId);
        const pos  = connNode.position();  // Cytoscape coordinate
        const w    = connNode.data("w");
        const h    = connNode.data("h");
        const sharedSyms = e.data("shared").split(" · ");
        const sameTopic  = e.data("sameTopic") === "true";
        if (!newMap[connId]) {
          newMap[connId] = { pos, size: { w, h }, shared: sharedSyms, sameTopic };
        } else {
          // node เดียวกันอาจมีหลาย edge → merge shared symbols
          newMap[connId].shared = [...new Set([...newMap[connId].shared, ...sharedSyms])];
        }
      });
      setSharedMap(newMap);
    }
  }, [selectedId]);

  return (
    <div className="pb-8">

      {/* บังคับ Cytoscape container โปร่งใสผ่าน CSS (backup จาก MutationObserver) */}
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
      {/*
        Layer stack (zIndex):
          1 — BandOverlay    (HTML div พื้นหลังสี topic)
          2 — SharedVarOverlay (HTML div label ตัวแปร)
          3 — Cytoscape canvas (ต้องโปร่งใสเพื่อให้ 1,2 โชว์ผ่าน)
      */}
      <div className="border-2 border-[#C8A882] rounded-[18px] overflow-hidden" ref={wrapRef}>
        <div style={{ position:"relative", width:"100%", height: graphH }}>

          <BandOverlay
            bandMeta={layout.bandMeta}
            hiddenTopics={new Set()}
            cyRef={cyRef}
            totalH={layout.totalH}
            containerW={layout.containerW}
          />

          <SharedVarOverlay
            sharedMap={sharedMap}
            selectedId={selectedId}
            cyRef={cyRef}
            containerW={layout.containerW}
            totalH={layout.totalH}
          />

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