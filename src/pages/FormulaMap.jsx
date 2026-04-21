import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formulaIndex, variableIndex } from "../data/physicsData";
import { allSweetFlavour } from "../allSweetFlavour";
import { routeBuilder } from "../routes";

// ─────────────────────────────────────────────────────────────────────────────
// latexToPlain — แปลง LaTeX formula string → plain text สำหรับแสดงบน Canvas
// เรียกใช้เฉพาะตอนสร้าง node label ไม่แตะ data ต้นทาง
// ─────────────────────────────────────────────────────────────────────────────
export function latexToPlain(str) {
  if (!str) return "";
  let s = str;

  // 1. Greek letters
  const greek = {
    "\\omega": "ω", "\\Omega": "Ω",
    "\\alpha": "α", "\\beta": "β", "\\gamma": "γ", "\\Gamma": "Γ",
    "\\delta": "δ", "\\Delta": "Δ", "\\theta": "θ", "\\Theta": "Θ",
    "\\lambda": "λ", "\\Lambda": "Λ", "\\mu": "μ", "\\nu": "ν",
    "\\pi": "π",  "\\Pi": "Π",  "\\rho": "ρ",  "\\sigma": "σ",
    "\\tau": "τ", "\\phi": "φ", "\\Phi": "Φ",  "\\psi": "ψ",
    "\\chi": "χ", "\\epsilon": "ε", "\\eta": "η", "\\kappa": "κ",
  };
  Object.entries(greek).forEach(([k, v]) => {
    s = s.replaceAll(k, v);
  });

  // 2. \frac{num}{den} → num/den  (handles nested braces one level deep)
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  // second pass for remaining \frac after greek substitution
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");

  // 3. superscripts  ^{...} and ^single
  const supMap = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","n":"ⁿ" };
  s = s.replace(/\^\{([^}]+)\}/g, (_, inner) =>
    [...inner].map(c => supMap[c] || c).join("")
  );
  s = s.replace(/\^([0-9])/g, (_, c) => supMap[c] || ("^" + c));

  // 4. subscripts  _{...} and _single  → keep readable, wrap in nothing special
  // _{max} → max  _{0} → ₀  etc.
  const subMap = { "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉" };
  s = s.replace(/_\{([^}]+)\}/g, (_, inner) => {
    if ([...inner].every(c => subMap[c])) return [...inner].map(c => subMap[c]).join("");
    return inner; // e.g. _{max} → max
  });
  s = s.replace(/_([0-9])/g, (_, c) => subMap[c] || c);

  // 5. \sqrt{...} → √(...)
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");

  // 6. \cdot → ·   \times → ×   \pm → ±   \infty → ∞   \approx → ≈
  const ops = { "\\cdot":"·", "\\times":"×", "\\pm":"±", "\\infty":"∞", "\\approx":"≈", "\\neq":"≠", "\\leq":"≤", "\\geq":"≥" };
  Object.entries(ops).forEach(([k, v]) => { s = s.replaceAll(k, v); });

  // 7. strip remaining backslash-commands  e.g. \left \right \text{...}
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");

  // 8. strip stray braces
  s = s.replace(/[{}]/g, "");

  // 9. collapse multiple spaces
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

// ── Topic meta ────────────────────────────────────────────────────────────────
const TOPIC_ORDER  = ["Mechanics","Electricity","Waves","Thermodynamics","Optics","ModernPhysics"];
const TOPIC_LABEL  = { Mechanics:"Mechanics", Electricity:"Electricity", Waves:"Waves", Thermodynamics:"Thermodynamics", Optics:"Optics", ModernPhysics:"Modern Physics" };
const HEIGHT_SHARE = { Mechanics:0.44, Electricity:0.11, Waves:0.11, Thermodynamics:0.11, Optics:0.115, ModernPhysics:0.115 };
const MAX_PER_ROW  = 4; // ไม่เกิน 4 ต่อแถว

function flColour(systemTopic) {
  const fl = allSweetFlavour[systemTopic] || allSweetFlavour.default;
  return { text: fl.deepCode, border: fl.deepCode + "55", bg: fl.deepCode + "18", soft: fl.deepCode + "0A" };
}

// ── Data ──────────────────────────────────────────────────────────────────────
function buildFormulaList() {
  return Object.values(formulaIndex).map((f) => ({
    id:       f.id,
    label:    latexToPlain(f.formula), // ← แปลงตรงนี้เพียงที่เดียว
    labelRaw: f.formula,               // เก็บ LaTeX ต้นฉบับสำหรับ detail panel (ใช้ KaTeX ได้)
    name:     f.name,
    topic:    f.systemTopic,
    vars:     (f.variable || []).map((k) => variableIndex[k]?.symbol || k.split("_")[0]),
    varKeys:  f.variable || [],
  }));
}

function buildEdges(formulas) {
  const edges = [];
  for (let i = 0; i < formulas.length; i++) {
    for (let j = i + 1; j < formulas.length; j++) {
      const a = formulas[i], b = formulas[j];
      const shared = a.vars.filter((v) => b.vars.includes(v));
      if (shared.length)
        edges.push({ a: a.id, b: b.id, shared, sameTopic: a.topic === b.topic });
    }
  }
  return edges;
}

let _mCtx = null;
function measureText(text, font = "500 11px monospace") {
  if (!_mCtx) { const c = document.createElement("canvas"); _mCtx = c.getContext("2d"); }
  _mCtx.font = font;
  return _mCtx.measureText(text).width;
}

function computeBandHeights(formulas) {
  const groups = {};
  formulas.forEach((f) => {
    if (!groups[f.topic]) groups[f.topic] = [];
    groups[f.topic].push(f);
  });
  const heights = {};
  TOPIC_ORDER.forEach((tk) => {
    const members = groups[tk] || [];
    const cols = Math.min(Math.max(members.length, 1), MAX_PER_ROW);
    const rows = Math.ceil(members.length / cols);
    heights[tk] = Math.max(rows * 64 + 32, 80); // fixed per-row height, no ratio
  });
  return heights;
}

function buildLayout(formulas, W) {
  const groups = {};
  formulas.forEach((f) => { if (!groups[f.topic]) groups[f.topic] = []; groups[f.topic].push(f); });

  const nodes = {};
  let yOff = 0;


  const bandHeights = computeBandHeights(formulas);

    TOPIC_ORDER.forEach((tk) => {
      const members = groups[tk] || [];
      const sliceH  = bandHeights[tk];
      const cy       = yOff + sliceH / 2;

      const cols  = Math.min(members.length, MAX_PER_ROW);
      const rows  = Math.ceil(members.length / cols);
      // generous horizontal spacing
      const cellW = Math.min((W - 40) / cols, 160);
      const cellH = 64;

      members.forEach((f, fi) => {
        const col = fi % cols, row = Math.floor(fi / cols);
        const x   = (W - cols * cellW) / 2 + col * cellW + cellW / 2;
        const y   = cy - (rows * cellH) / 2 + row * cellH + cellH / 2;
        const tw  = measureText(f.label);
        nodes[f.id] = { x, y, rx: Math.max(tw / 2 + 14, 30), ry: 14 };
      });

      yOff += sliceH;
    });
  return { nodes, totalH: yOff };
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawGraph({ bgCtx, fgCtx, W, H, nodes, formulas, edges, hiddenTopics, selectedId, hoveredId }) {
  bgCtx.clearRect(0, 0, W, H);
  fgCtx.clearRect(0, 0, W, H);

  function nodeVisible(id) { const f = formulas.find((f) => f.id === id); return f && !hiddenTopics.has(f.topic); }
  function edgeVisible(e)  { return nodeVisible(e.a) && nodeVisible(e.b); }

  const connectedToSelected = new Set();
  if (selectedId) {
    edges.forEach((e) => {
      if (!edgeVisible(e)) return;
      if (e.a === selectedId) connectedToSelected.add(e.b);
      if (e.b === selectedId) connectedToSelected.add(e.a);
    });
  }

  // ── band backgrounds ──
  let yy = 0, cumH = 0;
  // compute band heights same as buildLayout
  const groups = {};
  formulas.forEach((f) => { if (!groups[f.topic]) groups[f.topic] = []; groups[f.topic].push(f); });

  TOPIC_ORDER.forEach((tk) => {
    const members = groups[tk] || [];
    
    const bandHeights = computeBandHeights(formulas);
    const sh = bandHeights[tk];

    if (!hiddenTopics.has(tk)) {
      const c = flColour(tk);
      bgCtx.fillStyle = c.soft;
      bgCtx.fillRect(0, yy, W, sh);
      bgCtx.font = "700 11px sans-serif";
      bgCtx.fillStyle = c.text + "99";
      bgCtx.textAlign = "left"; bgCtx.textBaseline = "top";
      bgCtx.fillText(TOPIC_LABEL[tk] || tk, 10, yy + 10);
      if (yy > 0) {
        bgCtx.strokeStyle = "#E8D5BC"; bgCtx.lineWidth = 1;
        bgCtx.setLineDash([4, 4]);
        bgCtx.beginPath(); bgCtx.moveTo(0, yy); bgCtx.lineTo(W, yy); bgCtx.stroke();
        bgCtx.setLineDash([]);
      }
    }
    yy += sh;
  });

  // ── edges ──
  edges.forEach((e) => {
    if (!edgeVisible(e)) return;
    const na = nodes[e.a], nb = nodes[e.b]; if (!na || !nb) return;
    const isHl = selectedId && (selectedId === e.a || selectedId === e.b);
    const isFd = selectedId && !isHl;

    fgCtx.beginPath(); fgCtx.moveTo(na.x, na.y); fgCtx.lineTo(nb.x, nb.y);
    fgCtx.strokeStyle = isFd ? "#EEE5DC" : e.sameTopic ? "#6B3E26" : "#C07030";
    fgCtx.lineWidth   = isFd ? 0.6 : e.sameTopic ? 2 : 1.5;
    fgCtx.setLineDash(e.sameTopic ? [] : [5, 4]);
    fgCtx.globalAlpha = isFd ? 0.1 : 0.5;
    fgCtx.stroke(); fgCtx.setLineDash([]); fgCtx.globalAlpha = 1;

    // shared var badge — larger font now
    if (isHl) {
      const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
      const txt = e.shared.join(" · ");
      fgCtx.font = "600 10px monospace";
      const tw = fgCtx.measureText(txt).width;
      fgCtx.fillStyle = "#FDF6EE";
      fgCtx.fillRect(mx - tw / 2 - 5, my - 9, tw + 10, 15);
      fgCtx.strokeStyle = e.sameTopic ? "#C8A882" : "#F5DFB8"; fgCtx.lineWidth = 1;
      fgCtx.strokeRect(mx - tw / 2 - 5, my - 9, tw + 10, 15);
      fgCtx.fillStyle = e.sameTopic ? "#6B3E26" : "#C07030";
      fgCtx.textAlign = "center"; fgCtx.textBaseline = "middle";
      fgCtx.fillText(txt, mx, my); fgCtx.textBaseline = "alphabetic";
    }
  });

  // ── nodes ──
  formulas.forEach((f) => {
    if (!nodeVisible(f.id)) return;
    const n = nodes[f.id]; if (!n) return;
    const c     = flColour(f.topic);
    const isSel = selectedId === f.id, isHov = hoveredId === f.id;
    const isFd  = selectedId && !isSel && !connectedToSelected.has(f.id);
    fgCtx.globalAlpha = isFd ? 0.2 : 1;
    if (isSel) { fgCtx.shadowColor = "rgba(58,31,13,0.22)"; fgCtx.shadowBlur = 14; }

    const rx = n.rx + (isHov || isSel ? 3 : 0), ry = n.ry + (isHov || isSel ? 3 : 0);

    // cream backing — prevents edge bleed through text
    fgCtx.beginPath(); fgCtx.ellipse(n.x, n.y, rx + 4, ry + 4, 0, 0, Math.PI * 2);
    fgCtx.fillStyle = "#FDF6EE"; fgCtx.fill();

    // ellipse body
    fgCtx.beginPath(); fgCtx.ellipse(n.x, n.y, rx, ry, 0, 0, Math.PI * 2);
    fgCtx.fillStyle = isSel ? c.text : c.bg; fgCtx.fill();
    fgCtx.strokeStyle = c.text; fgCtx.lineWidth = isSel ? 2.5 : 1.5; fgCtx.stroke();
    fgCtx.shadowBlur = 0;

    // label — 11px monospace (ขึ้นจาก 9px)
    fgCtx.font         = `${isSel ? 700 : 500} 11px monospace`;
    fgCtx.fillStyle    = isSel ? "#FDF6EE" : c.text;
    fgCtx.textAlign    = "center"; fgCtx.textBaseline = "middle";
    fgCtx.fillText(f.label, n.x, n.y);
    fgCtx.textBaseline = "alphabetic"; fgCtx.globalAlpha = 1;
  });
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ selectedId, formulas, edges, hiddenTopics }) {
  const navigate = useNavigate();

  if (!selectedId) {
    return (
      <div style={{ padding: "10px 16px", borderTop: "2px solid #E8D5BC", background: "#FFFAF5" }}>
        <span style={{ fontSize: 11, color: "#C8A882", fontStyle: "italic" }}>
          Click any formula node to explore its connections
        </span>
      </div>
    );
  }

  const f = formulas.find((f) => f.id === selectedId);
  if (!f) return null;
  const c  = flColour(f.topic);
  const fl = allSweetFlavour[f.topic] || allSweetFlavour.default;

  function edgeVisible(e) {
    const fa = formulas.find((ff) => ff.id === e.a);
    const fb = formulas.find((ff) => ff.id === e.b);
    return fa && fb && !hiddenTopics.has(fa.topic) && !hiddenTopics.has(fb.topic);
  }

  const conns = edges.filter((e) => (e.a === selectedId || e.b === selectedId) && edgeVisible(e));
  const byTopic = {};
  conns.forEach((e) => {
    const oid = e.a === selectedId ? e.b : e.a;
    const of2 = formulas.find((ff) => ff.id === oid);
    if (!of2) return;
    if (!byTopic[of2.topic]) byTopic[of2.topic] = [];
    byTopic[of2.topic].push({ edge: e, formula: of2 });
  });

  return (
    <div style={{ borderTop: "2px solid #E8D5BC", background: "#FFFAF5" }}>

      {/* header */}
      <div style={{ padding: "13px 16px 11px", borderBottom: "1.5px dashed #E8D5BC", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 16, color: c.text }}>{f.label}</span>
        <span style={{ fontSize: 12, color: "#9A8070", flex: 1, minWidth: 0 }}>{f.name}</span>
        <span className={`text-[10px] px-3 py-1 rounded-full font-bold whitespace-nowrap ${fl.deep} ${fl.light} border ${fl.border}`}>
          {TOPIC_LABEL[f.topic] || f.topic}
        </span>
        <button
          onClick={() => navigate(routeBuilder.formula(f.id))}
          className="px-4 py-1.5 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[11px] font-bold cursor-pointer border-0 hover:opacity-85 transition-opacity"
        >
          Open formula →
        </button>
      </div>

      {/* variables */}
      <div style={{ padding: "10px 16px", borderBottom: "1.5px dashed #E8D5BC" }}>
        <div className="text-[9px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-2">Variables</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {f.vars.map((sym) => (
            <span key={sym}
              className={`text-[14px] px-3 py-1 rounded-full font-mono font-bold border ${fl.deep} ${fl.light} ${fl.border}`}
            >
              {sym}
            </span>
          ))}
        </div>
      </div>

      {/* connected formulas */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div className="text-[9px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-3">
          Connected formulas
        </div>

        {Object.keys(byTopic).length === 0 ? (
          <span style={{ fontSize: 11, color: "#B83030" }}>No connections visible in current filter</span>
        ) : (
          TOPIC_ORDER.filter((tk) => byTopic[tk]).map((tk) => {
            const otc = flColour(tk);
            const ofl = allSweetFlavour[tk] || allSweetFlavour.default;
            return (
              <div key={tk} style={{ marginBottom: 14 }}>
                <div className={`text-[11px] font-bold pb-1 mb-2 border-b ${ofl.deep} ${ofl.border}`}>
                  {TOPIC_LABEL[tk] || tk}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {byTopic[tk].map(({ edge, formula: of2 }) => (
                    <div
                      key={of2.id}
                      onClick={() => navigate(routeBuilder.formula(of2.id))}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #E8D5BC", background: "white", cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#C8A882"; e.currentTarget.style.background = "#FDF6EE"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8D5BC"; e.currentTarget.style.background = "white"; }}
                    >
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 13, color: otc.text, flexShrink: 0 }}>
                        {of2.label}
                      </span>
                      <span style={{ fontSize: 11, color: "#9A8070", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {of2.name}
                      </span>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {edge.shared.map((sym) => (
                          <span key={sym} style={{
                            fontSize: 10, padding: "2px 7px", borderRadius: 99,
                            fontFamily: "monospace", fontWeight: 700,
                            border: `1.5px solid ${edge.sameTopic ? "#6B3E26" : "#C07030"}`,
                            color:      edge.sameTopic ? "#3A1F0D" : "#7A3A0A",
                            background: edge.sameTopic ? "#F2E6D4"  : "#FFF3E0",
                          }}>
                            {sym}
                          </span>
                        ))}
                      </div>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); navigate(routeBuilder.formula(of2.id)); }}
                        className="px-3 py-1 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[10px] font-bold cursor-pointer border-0 whitespace-nowrap hover:opacity-85 transition-opacity"
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function FormulaMap() {
  const bgRef    = useRef(null);
  const fgRef    = useRef(null);
  const wrapRef  = useRef(null);
  const nodesRef = useRef({});
  const dpr = window.devicePixelRatio || 1;

  const [hiddenTopics, setHiddenTopics] = useState(new Set());
  const [selectedId,   setSelectedId]   = useState(null);
  const [hoveredId,    setHoveredId]    = useState(null);
  const [canvasH,      setCanvasH]      = useState(600);

  const formulas = useMemo(() => buildFormulaList(), []);
  const edges    = useMemo(() => buildEdges(formulas), [formulas]);

  const redraw = useCallback(() => {
    const bg = bgRef.current, fg = fgRef.current;
    if (!bg || !fg) return;
    const W = bg.width / dpr, H = bg.height / dpr;
    drawGraph({ bgCtx: bg.getContext("2d"), fgCtx: fg.getContext("2d"), W, H, nodes: nodesRef.current, formulas, edges, hiddenTopics, selectedId, hoveredId });
  }, [formulas, edges, hiddenTopics, selectedId, hoveredId, dpr]);

  useEffect(() => {
    const wrap = wrapRef.current; if (!wrap) return;
    function doResize() {
      const W = wrap.clientWidth;
      const { nodes, totalH } = buildLayout(formulas, W, 600);
      nodesRef.current = nodes;
      const H = Math.max(totalH, 400);
      setCanvasH(H);
      [bgRef, fgRef].forEach((ref) => {
        const c = ref.current; if (!c) return;
        c.width = W * dpr; c.height = H * dpr;
        c.style.width = W + "px"; c.style.height = H + "px";
        c.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      redraw();
    }
    doResize();
    const ro = new ResizeObserver(doResize);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [formulas, dpr, redraw]);

  useEffect(() => { redraw(); }, [redraw]);

  function getNodeAt(x, y) {
    for (const f of formulas) {
      if (hiddenTopics.has(f.topic)) continue;
      const n = nodesRef.current[f.id]; if (!n) continue;
      const dx = (x - n.x) / (n.rx + 4), dy = (y - n.y) / (n.ry + 4);
      if (dx * dx + dy * dy <= 1) return f.id;
    }
    return null;
  }

  function handleMouseMove(e) {
    const r = fgRef.current.getBoundingClientRect();
    const id = getNodeAt(e.clientX - r.left, e.clientY - r.top);
    setHoveredId(id || null);
    fgRef.current.style.cursor = id ? "pointer" : "default";
  }
  function handleClick(e) {
    const r = fgRef.current.getBoundingClientRect();
    const id = getNodeAt(e.clientX - r.left, e.clientY - r.top);
    setSelectedId(id === selectedId ? null : id || null);
  }
  function handleMouseLeave() { setHoveredId(null); }

  function toggleTopic(tk) {
    setHiddenTopics((prev) => { const n = new Set(prev); n.has(tk) ? n.delete(tk) : n.add(tk); return n; });
    setSelectedId(null);
  }

  return (
    <div className="pb-8">

      {/* ── Hero ── */}
      <div className="text-center py-8 px-4 max-w-[600px] mx-auto">
        <div className="inline-flex items-center gap-2 bg-[#FDF6EE] border border-[#E8D5BC] rounded-full px-4 py-1 text-[8px] font-bold text-[#A8601A] uppercase tracking-[.2em] mb-4">
          <div className="w-[5px] h-[5px] rounded-full bg-[#D4831A]" />
          Physics Formula System
        </div>
        <div className="text-[38px] font-black text-[#2D1810] tracking-[.15em] uppercase italic leading-none mb-2">
          PHY<span className="text-[#D4831A]">SUTH</span>
        </div>
        <div className="flex items-center justify-center gap-3 mb-1">
          <div className="w-6 h-px bg-[#D5C8BC]" />
          <span className="text-[9px] font-bold text-[#9A8070] uppercase tracking-[.22em]">
            ระบบแสดงความเชื่อมโยงสูตรฟิสิกส์จากตัวแปร
          </span>
          <div className="w-6 h-px bg-[#D5C8BC]" />
        </div>
        <div className="text-[11px] text-[#A8601A] mb-5 leading-relaxed">เพื่อการแก้โจทย์ปัญหา</div>

        {/* topic pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {TOPIC_ORDER.map((tk) => {
            const fl  = allSweetFlavour[tk] || allSweetFlavour.default;
            const off = hiddenTopics.has(tk);
            return (
              <button key={tk} onClick={() => toggleTopic(tk)}
                className={`px-4 py-1 rounded-full border-2 text-[9px] font-black uppercase tracking-[.12em] transition-all duration-200 active:scale-95 ${off ? "border-stone-200 text-stone-300 bg-transparent opacity-50" : `${fl.border} ${fl.deep} bg-white hover:-translate-y-0.5 hover:shadow-md`}`}
                onMouseEnter={(e) => { if (!off) { e.currentTarget.style.background = fl.deepCode; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = fl.deepCode; } }}
                onMouseLeave={(e) => { e.currentTarget.style.background = ""; e.currentTarget.style.color = ""; e.currentTarget.style.borderColor = ""; }}
              >
                {TOPIC_LABEL[tk]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Graph card ── */}
      <div className="bg-[#FDF6EE] border-2 border-[#C8A882] rounded-[18px] overflow-hidden">
        <div ref={wrapRef} style={{ position: "relative", height: canvasH, width: "100%" }}>
          <canvas ref={bgRef} style={{ position: "absolute", top: 0, left: 0 }} />
          <canvas ref={fgRef} style={{ position: "absolute", top: 0, left: 0 }}
            onMouseMove={handleMouseMove} onClick={handleClick} onMouseLeave={handleMouseLeave}
          />
        </div>

        <DetailPanel selectedId={selectedId} formulas={formulas} edges={edges} hiddenTopics={hiddenTopics} />

        {/* legend */}
        <div className="flex flex-wrap gap-4 items-center px-4 py-2 border-t border-[#E8D5BC] bg-[#F2E6D4]">
          <div className="flex items-center gap-2 text-[9px] font-semibold text-[#6B4A30]">
            <div className="w-5 h-[2.5px] bg-[#6B3E26] rounded" />
            shared variable (same topic)
          </div>
          <div className="flex items-center gap-2 text-[9px] font-semibold text-[#6B4A30]">
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#C07030" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            same symbol, different topic
          </div>
        </div>
      </div>
    </div>
  );
}