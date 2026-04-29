import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { formulaIndex, variableIndex } from "../data/physicsData";
import { allSweetFlavour } from "../allSweetFlavour";
import { routeBuilder } from "../routes";

// ─────────────────────────────────────────────────────────────────────────────
// latexToPlain — แปลง LaTeX formula string → plain text สำหรับแสดงบน Canvas
// ─────────────────────────────────────────────────────────────────────────────
export function latexToPlain(str) {
  if (!str) return "";
  let s = str;

  const funcs = ["sin", "cos", "tan"];
  funcs.forEach((fn) => { s = s.replaceAll(`\\${fn}`, fn); });

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
    const regex = new RegExp(k.replace("\\", "\\\\"), "g");
    s = s.replace(regex, v);
  });

  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");
  s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1)/($2)");

  const supMap = { "0":"⁰","1":"¹","2":"²","3":"³","4":"⁴","5":"⁵","6":"⁶","7":"⁷","8":"⁸","9":"⁹","+":"⁺","-":"⁻","n":"ⁿ" };
  s = s.replace(/\^\{([^}]+)\}/g, (_, inner) => [...inner].map((c) => supMap[c] || c).join(""));
  s = s.replace(/\^([0-9])/g, (_, c) => supMap[c] || ("^" + c));

  const subMap = {
    "0":"₀","1":"₁","2":"₂","3":"₃","4":"₄","5":"₅","6":"₆","7":"₇","8":"₈","9":"₉",
    "a":"ₐ","e":"ₑ","h":"ₕ","i":"ᵢ","j":"ⱼ","k":"ₖ","l":"ₗ","m":"ₘ","n":"ₙ",
    "o":"ₒ","p":"ₚ","r":"ᵣ","s":"ₛ","t":"ₜ","u":"ᵤ","v":"ᵥ","x":"ₓ","g":"₉",
  };
  function toSubscript(text) { return [...text].map((c) => subMap[c] || c).join(""); }
  s = s.replace(/_\{([^}]+)\}/g, (_, inner) => toSubscript(inner));
  s = s.replace(/_([a-zA-Z0-9]+)/g, (_, inner) => toSubscript(inner));
  s = s.replace(/\\sqrt\{([^}]*)\}/g, "√($1)");

  const ops = { "\\cdot":"·","\\times":"×","\\pm":"±","\\infty":"∞","\\approx":"≈","\\neq":"≠","\\leq":"≤","\\geq":"≥" };
  Object.entries(ops).forEach(([k, v]) => { s = s.replaceAll(k, v); });

  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

// ── Topic meta ────────────────────────────────────────────────────────────────
const TOPIC_ORDER  = ["Mechanics","Electricity","Waves","Thermodynamics","Optics","ModernPhysics"];
const TOPIC_LABEL  = { Mechanics:"Mechanics", Electricity:"Electricity", Waves:"Waves", Thermodynamics:"Thermodynamics", Optics:"Optics", ModernPhysics:"Modern Physics" };
const MAX_PER_ROW  = 4;
const CELL_H = 100;        // ระยะความสูงต่อ 1 แถวของโหนด
const TOPIC_PADDING = 60;  // ระยะห่างจากขอบบนของ Topic ถึงโหนดแถวแรก (ที่ไว้วางชื่อ Topic)
const BOTTOM_GAP = 40;     // ระยะเผื่อด้านล่างของแต่ละ Topic (สำหรับ Label ใต้โหนดแถวสุดท้าย)

// Font sizes — ปรับขึ้นทุกส่วน
const FONT = {
  nodeNormal:   "500 13px monospace",   // เดิม 11px
  nodeSelected: "700 13px monospace",
  edgeBadge:    "600 11px monospace",   // เดิม 10px
  bandLabel:    "700 13px sans-serif",  // เดิม 11px
};

function flColour(systemTopic) {
  const fl = allSweetFlavour[systemTopic] || allSweetFlavour.default;
  return { text: fl.deepCode, border: fl.deepCode + "55", bg: fl.deepCode + "18", soft: fl.deepCode + "0A" };
}

// ── Data ──────────────────────────────────────────────────────────────────────
function buildFormulaList() {
  return Object.values(formulaIndex).map((f) => ({
    id:       f.id,
    label:    latexToPlain(f.formula),
    labelRaw: f.formula,
    name:     f.name,
    topic:    f.systemTopic,
    vars:     (f.variable || []).map((k) => latexToPlain(variableIndex[k]?.symbol || k.split("_")[0])),
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
function measureText(text, font = FONT.nodeNormal) {
  if (!_mCtx) { const c = document.createElement("canvas"); _mCtx = c.getContext("2d"); }
  _mCtx.font = font;
  return _mCtx.measureText(text).width;
}

function computeBandHeights(formulas) {
  const groups = {};
  formulas.forEach((f) => { if (!groups[f.topic]) groups[f.topic] = []; groups[f.topic].push(f); });
  const heights = {};
  TOPIC_ORDER.forEach((tk) => {
    const members = groups[tk] || [];
    const cols = Math.min(Math.max(members.length, 1), MAX_PER_ROW);
    const rows = Math.ceil(members.length / cols);
    heights[tk] = Math.max(rows * 96 + 48, 110); // เพิ่มขึ้นจาก 90+40 เพื่อรองรับ node ที่ใหญ่ขึ้น
  });
  return heights;
}

function buildLayout(formulas, W) {
  const groups = {};
  formulas.forEach((f) => { 
    if (!groups[f.topic]) groups[f.topic] = []; 
    groups[f.topic].push(f); 
  });

  const nodes = {};
  const bandHeights = {}; 
  let yOff = 0; 

  TOPIC_ORDER.forEach((tk) => {
    const members = groups[tk] || [];
    if (members.length === 0) {
      bandHeights[tk] = 0;
      return;
    }

    // --- ส่วนที่ 1: คำนวณหาจำนวนแถว (ต้องตรงกับตอนวาดโหนดเป๊ะ) ---
    let rowCount = 0;
    let tempIdx = 0;
    while (tempIdx < members.length) {
      const cols = (rowCount % 2 === 0) ? 4 : 3;
      tempIdx += cols;
      rowCount++;
    }

    // --- ส่วนที่ 2: กำหนดความสูง Band ---
    // ใช้เลขชุดเดียวกัน: TOPIC_PADDING(60) + (แถว * 100) + BOTTOM_GAP(40)
    const sliceH = TOPIC_PADDING + (rowCount * CELL_H) + BOTTOM_GAP;
    bandHeights[tk] = sliceH;

    // --- ส่วนที่ 3: วางตำแหน่งโหนด ---
    let currentIdx = 0;
    let row = 0;
    while (currentIdx < members.length) {
      const isEvenRow = row % 2 === 0;
      const colsInRow = isEvenRow ? 4 : 3;
      const rowMembers = members.slice(currentIdx, currentIdx + colsInRow);
      const totalWForNodes = (rowMembers.length === 3) ? (W * 0.75) : (W - 40);
      const cellW = totalWForNodes / rowMembers.length;

      // ตำแหน่ง Y ของโหนด (กึ่งกลางแถว)
      const rowY = yOff + TOPIC_PADDING + (row * CELL_H) + (CELL_H / 2);

      rowMembers.forEach((f, colIdx) => {
        const x = (W - (rowMembers.length * cellW)) / 2 + (colIdx * cellW) + (cellW / 2);
        const tw = measureText(f.label, FONT.nodeNormal);
        nodes[f.id] = {
          x, 
          y: rowY,
          rx: Math.max(tw / 2 + 15, 40), 
          ry: 20 
        };
      });
      currentIdx += rowMembers.length;
      row++;
    }

    yOff += sliceH; 
  });

  return { nodes, totalH: yOff, bandHeights };
}

// ── Edge label placement helper ───────────────────────────────────────────────
// แทน midpoint ด้วย "จุดที่ดีที่สุดบนเส้น" ที่หลีกเลี่ยง node ทั้งสองฝั่ง
// และอยู่ใน canvas bounds
function findEdgeLabelPos(na, nb, txt, nodes, placedLabels, W, H, ctx) {
  ctx.font = FONT.edgeBadge;
  const tw = ctx.measureText(txt).width;
  const bw = tw + 12, bh = 16;

  const MARGIN = 8; // ห่างจากขอบ canvas

  // ลอง t ตั้งแต่ 0.3 → 0.7 (zone กลางเส้น) ทีละ 0.05
  // ใน zone นั้น ลอง perpendicular offset ±0, ±20, ±35
  const dx = nb.x - na.x, dy = nb.y - na.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // เวกเตอร์ตั้งฉาก (perpendicular)
  const px = -dy / len, py = dx / len;

  const tValues   = [0.5, 0.45, 0.55, 0.4, 0.6, 0.35, 0.65];
  const offsets   = [0, 18, -18, 32, -32, 48, -48];

  function nodeHit(cx, cy) {
    for (const n of Object.values(nodes)) {
      const ex = (cx - n.x) / (n.rx + bw / 2 + 4);
      const ey = (cy - n.y) / (n.ry + bh / 2 + 4);
      if (ex * ex + ey * ey <= 1) return true;
    }
    return false;
  }

  function labelHit(cx, cy) {
    const x1 = cx - bw / 2, x2 = cx + bw / 2;
    const y1 = cy - bh / 2, y2 = cy + bh / 2;
    return placedLabels.some((l) => {
      const lx1 = l.x - l.w / 2, lx2 = l.x + l.w / 2;
      const ly1 = l.y - l.h / 2, ly2 = l.y + l.h / 2;
      return !(x2 + 3 < lx1 || x1 - 3 > lx2 || y2 + 3 < ly1 || y1 - 3 > ly2);
    });
  }

  function inBounds(cx, cy) {
    return cx - bw / 2 > MARGIN && cx + bw / 2 < W - MARGIN &&
           cy - bh / 2 > MARGIN && cy + bh / 2 < H - MARGIN;
  }

  for (const t of tValues) {
    const bx = na.x + dx * t, by = na.y + dy * t;
    for (const off of offsets) {
      const cx = bx + px * off, cy = by + py * off;
      if (inBounds(cx, cy) && !nodeHit(cx, cy) && !labelHit(cx, cy)) {
        return { x: cx, y: cy, tw, bw, bh };
      }
    }
  }

  // fallback — midpoint clamp ไว้ใน bounds ถึงแม้จะชน
  const fallX = Math.max(bw / 2 + MARGIN, Math.min(W - bw / 2 - MARGIN, (na.x + nb.x) / 2));
  const fallY = Math.max(bh / 2 + MARGIN, Math.min(H - bh / 2 - MARGIN, (na.y + nb.y) / 2));
  return { x: fallX, y: fallY, tw, bw, bh };
}

// ── Canvas draw ───────────────────────────────────────────────────────────────
function drawGraph({ 
  bgCtx, fgCtx, W, H, nodes, formulas, edges, hiddenTopics, 
  selectedId, hoveredId, bandHeights 
}) {
  // 1. ล้างกระแสไฟ (Clear Canvas)
  bgCtx.clearRect(0, 0, W, H);
  fgCtx.clearRect(0, 0, W, H);

  // Helper functions
  const nodeVisible = (id) => { 
    const f = formulas.find((f) => f.id === id); 
    return f && !hiddenTopics.has(f.topic); 
  };
  const edgeVisible = (e) => nodeVisible(e.a) && nodeVisible(e.b);

  const connectedToSelected = new Set();
  if (selectedId) {
    edges.forEach((e) => {
      if (!edgeVisible(e)) return;
      if (e.a === selectedId) connectedToSelected.add(e.b);
      if (e.b === selectedId) connectedToSelected.add(e.a);
    });
  }

  // ── 2. วาดพื้นหลัง (Band Backgrounds) ──
  // ใช้ค่า bandHeights ที่คำนวณมาจาก buildLayout เท่านั้น
  let yy = 0;
  TOPIC_ORDER.forEach((tk) => {
    const sh = bandHeights[tk] || 0; 
    
    if (!hiddenTopics.has(tk) && sh > 0) {
      const c = flColour(tk);
      
      // วาดพื้นหลังสี Soft
      bgCtx.fillStyle = c.soft;
      bgCtx.fillRect(0, yy, W, sh);
      
      // วาดชื่อ Topic
      bgCtx.font = FONT.bandLabel;
      bgCtx.fillStyle = c.text + "99";
      bgCtx.textAlign = "left"; 
      bgCtx.textBaseline = "top";
      bgCtx.fillText(TOPIC_LABEL[tk] || tk, 16, yy + 18);
      
      // วาดเส้นประคั่นระหว่าง Topic
      if (yy > 0) {
        bgCtx.strokeStyle = "#E8D5BC"; 
        bgCtx.lineWidth = 1;
        bgCtx.setLineDash([4, 4]);
        bgCtx.beginPath(); 
        bgCtx.moveTo(0, yy); 
        bgCtx.lineTo(W, yy); 
        bgCtx.stroke();
        bgCtx.setLineDash([]);
      }
    }
    // สะสมค่า yy เสมอแม้ Topic จะซ่อน เพื่อรักษาลำดับตำแหน่ง
    yy += sh; 
  });

  // ── 3. วาดเส้นเชื่อม (Edges) ──
  // Pass 1: วาดเส้นปกติ (หรือจางลงถ้ามีการเลือกโหนด)
  edges.forEach((e) => {
    if (!edgeVisible(e)) return;
    const na = nodes[e.a], nb = nodes[e.b];
    if (!na || !nb) return;

    const isHl = selectedId && (selectedId === e.a || selectedId === e.b);
    if (isHl) return; // ข้ามไปวาดใน Pass Highlight เพื่อให้อยู่ด้านบน

    fgCtx.beginPath();
    fgCtx.moveTo(na.x, na.y);
    fgCtx.lineTo(nb.x, nb.y);
    
    fgCtx.strokeStyle = selectedId ? "#EEE5DC" : (e.sameTopic ? "#6B3E26" : "#C07030");
    fgCtx.lineWidth = selectedId ? 0.5 : (e.sameTopic ? 1.5 : 1);
    fgCtx.setLineDash(e.sameTopic ? [] : [4, 4]);
    fgCtx.globalAlpha = selectedId ? 0.1 : 0.3;
    fgCtx.stroke();
    fgCtx.setLineDash([]);
    fgCtx.globalAlpha = 1;
  });

  // Pass 2: วาดเส้นที่ถูก Highlight
  if (selectedId) {
    edges.forEach((e) => {
      if (!edgeVisible(e) || (e.a !== selectedId && e.b !== selectedId)) return;
      const na = nodes[e.a], nb = nodes[e.b];
      if (!na || !nb) return;

      fgCtx.beginPath();
      fgCtx.moveTo(na.x, na.y);
      fgCtx.lineTo(nb.x, nb.y);
      fgCtx.strokeStyle = e.sameTopic ? "#6B3E26" : "#C07030";
      fgCtx.lineWidth = 2.5;
      fgCtx.setLineDash(e.sameTopic ? [] : [5, 4]);
      fgCtx.globalAlpha = 0.8;
      fgCtx.stroke();
      fgCtx.setLineDash([]);
      fgCtx.globalAlpha = 1;

      // วาด Badge ตัวแปรที่ใช้ร่วมกัน (Shared Variables)
      const txt = e.shared.join(" · ");
      fgCtx.font = FONT.edgeBadge;
      const tw = fgCtx.measureText(txt).width;
      const bw = tw + 10, bh = 18;
      const targetNode = (e.a === selectedId) ? nb : na;
      const lx = targetNode.x;
      const ly = targetNode.y + targetNode.ry + 14; 

      fgCtx.fillStyle = "#FDF6EE";
      fgCtx.beginPath();
      fgCtx.roundRect(lx - bw / 2, ly - bh / 2, bw, bh, 4); 
      fgCtx.fill();
      fgCtx.strokeStyle = e.sameTopic ? "#C8A882" : "#F5DFB8";
      fgCtx.lineWidth = 1;
      fgCtx.stroke();

      fgCtx.fillStyle = e.sameTopic ? "#6B3E26" : "#C07030";
      fgCtx.textAlign = "center";
      fgCtx.textBaseline = "middle";
      fgCtx.fillText(txt, lx, ly);
      fgCtx.textBaseline = "alphabetic";
    });
  }

  // ── 4. วาดโหนด (Nodes) ──
  formulas.forEach((f) => {
    if (!nodeVisible(f.id)) return;
    const n = nodes[f.id];
    if (!n) return;

    const c = flColour(f.topic);
    const isSel = selectedId === f.id;
    const isHov = hoveredId === f.id;
    const isFd = selectedId && !isSel && !connectedToSelected.has(f.id);

    fgCtx.globalAlpha = isFd ? 0.2 : 1;
    if (isSel) {
      fgCtx.shadowColor = "rgba(58,31,13,0.22)";
      fgCtx.shadowBlur = 14;
    }

    const rx = n.rx + (isHov || isSel ? 3 : 0);
    const ry = n.ry + (isHov || isSel ? 3 : 0);
    const rectW = rx * 2;
    const rectH = ry * 2;

    // 1. ขอบนอก (Backing)
    fgCtx.beginPath();
    fgCtx.roundRect(n.x - rx - 4, n.y - ry - 4, rectW + 8, rectH + 8, 8); 
    fgCtx.fillStyle = "#FDF6EE"; 
    fgCtx.fill();

    // 2. ตัวโหนดหลัก
    fgCtx.beginPath();
    fgCtx.roundRect(n.x - rx, n.y - ry, rectW, rectH, 6); 
    fgCtx.fillStyle = isSel ? c.text : c.bg; 
    fgCtx.fill();
    fgCtx.strokeStyle = c.text; 
    fgCtx.lineWidth = isSel ? 2.5 : 1.5; 
    fgCtx.stroke();
    
    fgCtx.shadowBlur = 0;

    // 3. ข้อความในโหนด
    fgCtx.font = isSel ? FONT.nodeSelected : FONT.nodeNormal;
    fgCtx.fillStyle = isSel ? "#FDF6EE" : c.text;
    fgCtx.textAlign = "center"; 
    fgCtx.textBaseline = "middle";
    fgCtx.fillText(f.label, n.x, n.y);
    
    fgCtx.textBaseline = "alphabetic"; 
    fgCtx.globalAlpha = 1;
  });
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ selectedId, formulas, edges, hiddenTopics }) {
  const navigate = useNavigate();

  if (!selectedId) {
    return (
      <div style={{ padding: "10px 16px", borderTop: "2px solid #E8D5BC", background: "#FFFAF5" }}>
        <span style={{ fontSize: 12, color: "#C8A882", fontStyle: "italic" }}>
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
        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 17, color: c.text }}>{f.label}</span>
        <span style={{ fontSize: 13, color: "#9A8070", flex: 1, minWidth: 0 }}>{f.name}</span>
        <span className={`text-[11px] px-3 py-1 rounded-full font-bold whitespace-nowrap ${fl.deep} ${fl.light} border ${fl.border}`}>
          {TOPIC_LABEL[f.topic] || f.topic}
        </span>
        <button

          onClick={() => {
            setTimeout(() => {
            navigate(routeBuilder.formula(f.id));
          },0);
          }}
          
          className="px-4 py-1.5 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[12px] font-bold cursor-pointer border-0 hover:opacity-85 transition-opacity"
        >
          Open formula →
        </button>
      </div>

      {/* variables */}
      <div style={{ padding: "10px 16px", borderBottom: "1.5px dashed #E8D5BC" }}>
        <div className="text-[10px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-2">Variables</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {f.vars.map((sym) => (
            <span key={sym}
              className={`text-[15px] px-3 py-1 rounded-full font-mono font-bold border ${fl.deep} ${fl.light} ${fl.border}`}
            >
              {sym}
            </span>
          ))}
        </div>
      </div>

      {/* connected formulas */}
      <div style={{ padding: "10px 16px 14px" }}>
        <div className="text-[10px] font-bold text-[#A8601A] uppercase tracking-[.15em] mb-3">
          Connected formulas
        </div>

        {Object.keys(byTopic).length === 0 ? (
          <span style={{ fontSize: 12, color: "#B83030" }}>No connections visible in current filter</span>
        ) : (
          TOPIC_ORDER.filter((tk) => byTopic[tk]).map((tk) => {
            const otc = flColour(tk);
            const ofl = allSweetFlavour[tk] || allSweetFlavour.default;
            return (
              <div key={tk} style={{ marginBottom: 14 }}>
                <div className={`text-[12px] font-bold pb-1 mb-2 border-b ${ofl.deep} ${ofl.border}`}>
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
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 14, color: otc.text, flexShrink: 0 }}>
                        {of2.label}
                      </span>
                      <span style={{ fontSize: 12, color: "#9A8070", flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {of2.name}
                      </span>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        {edge.shared.map((sym) => (
                          <span key={sym} style={{
                            fontSize: 11, padding: "2px 7px", borderRadius: 99,
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
                        className="px-3 py-1 rounded-full bg-[#3A1F0D] text-[#FDF6EE] text-[11px] font-bold cursor-pointer border-0 whitespace-nowrap hover:opacity-85 transition-opacity"
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
  const [currentBandHeights, setCurrentBandHeights] = useState({});

  const formulas = useMemo(() => buildFormulaList(), []);
  const edges    = useMemo(() => buildEdges(formulas), [formulas]);

// แก้ในส่วน redraw
const redraw = useCallback(() => {
  const bg = bgRef.current, fg = fgRef.current;
  if (!bg || !fg) return;
  const W = bg.width / dpr, H = bg.height / dpr;

  // ส่ง currentBandHeights เข้าไปด้วย
  drawGraph({ 
    bgCtx: bg.getContext("2d"), 
    fgCtx: fg.getContext("2d"), 
    W, H, 
    nodes: nodesRef.current, 
    formulas, 
    edges, 
    hiddenTopics, 
    selectedId, 
    hoveredId,
    bandHeights: currentBandHeights // <--- เพิ่มตรงนี้
  });
}, [formulas, edges, hiddenTopics, selectedId, hoveredId, dpr, currentBandHeights]);

useEffect(() => {
    const wrap = wrapRef.current; 
    if (!wrap) return;

    let ro = null;

    function doResize() {
      const W = wrap.clientWidth;
      const { nodes, totalH, bandHeights } = buildLayout(formulas, W); 
      nodesRef.current = nodes;
      
      setCurrentBandHeights(bandHeights);
      const H = Math.max(totalH, 400);
      setCanvasH(H);

      [bgRef, fgRef].forEach((ref) => {
        const c = ref.current; if (!c) return;
        c.width = W * dpr; c.height = H * dpr;
        c.style.width = W + "px"; c.style.height = H + "px";
        const ctx = c.getContext("2d");
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      });
      redraw();
    }

    // ใช้ requestAnimationFrame ช่วยให้การวาดครั้งแรกไม่ขัดจังหวะการเปลี่ยนหน้า
    const animId = requestAnimationFrame(doResize);
    ro = new ResizeObserver(() => {
      requestAnimationFrame(doResize);
    });
    ro.observe(wrap);

    return () => {
      cancelAnimationFrame(animId);
      if (ro) ro.disconnect();
      // ล้าง Canvas ทิ้งเพื่อคืน Memory ทันที
      [bgRef, fgRef].forEach(ref => {
        if (ref.current) {
          ref.current.width = 0;
          ref.current.height = 0;
        }
      });
    };
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

        {/* topic pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {TOPIC_ORDER.map((tk) => {
            const fl  = allSweetFlavour[tk] || allSweetFlavour.default;
            const off = hiddenTopics.has(tk);
            return (
              <button key={tk} onClick={() => toggleTopic(tk)}
                className={`px-4 py-1 rounded-full border-2 text-[10px] font-black uppercase tracking-[.12em] transition-all duration-200 active:scale-95 ${off ? "border-stone-200 text-stone-300 bg-transparent opacity-50" : `${fl.border} ${fl.deep} bg-white hover:-translate-y-0.5 hover:shadow-md`}`}
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
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#6B4A30]">
            <div className="w-5 h-[2.5px] bg-[#6B3E26] rounded" />
            shared variable (same topic)
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-[#6B4A30]">
            <svg width="20" height="4"><line x1="0" y1="2" x2="20" y2="2" stroke="#C07030" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
            same symbol, different topic
          </div>
        </div>
      </div>
    </div>
  );
}