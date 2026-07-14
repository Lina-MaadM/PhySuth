import { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import { allSweetFlavour } from "../allSweetFlavour";
import { analyzeHistory, baseOf } from "../utils/historyAnalysis";

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmClearDialog({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center">
      {/* Backdrop */}
      {/* UI: คลิกพื้นที่ด้านนอกเพื่อปิด dialog */}
      <div className="absolute inset-0 bg-black/30" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative bg-[#FBF4EC] border-2 border-[#C8A882] rounded-2xl
        shadow-2xl w-[300px] overflow-hidden z-10 animate-in fade-in zoom-in duration-150">

        {/* Header */}
        <div className="bg-[#F2E6D8] border-b border-[#E2CDB8] px-5 py-4">
          <div className="text-[13px] font-black text-[#3B2415] tracking-tight">
            Clear everything?
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-2">
          <p className="text-[12px] text-[#5A3E2B] leading-relaxed">
            This will permanently delete:
          </p>
          <ul className="text-[12px] text-[#5A3E2B] space-y-1 ml-1">
            <li className="flex items-start gap-2">
              <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-[#C8A882] flex-shrink-0" />
              Session history (all visited formulas)
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-[3px] w-1.5 h-1.5 rounded-full bg-[#C8A882] flex-shrink-0" />
              All saved variable values from memory
            </li>
          </ul>
          <p className="text-[11px] text-[#8C6A56] pt-1">This cannot be undone.</p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border-2 border-[#D7C4B4]
              text-[12px] font-bold text-[#6B5344]
              hover:bg-[#F0E4D8] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700
              text-[12px] font-bold text-white transition-colors"
          >
            Clear all
          </button>
        </div>
      </div>
    </div>
  );
}

// ── VarChip ───────────────────────────────────────────────────────────────────
// UI: แสดงสถานะตัวไอเทมในประวัติ
// saved, shared, cross-topic
function VarChip({ varKey, variableIndex, memory, sharedMap }) {
  const info = variableIndex[varKey] || {};
  const sym = info.symbol || baseOf(varKey);

  // State: ตรวจสอบสถานะความสัมพันธ์ของตัวแปร
  const inMem = memory[varKey] !== undefined;
  const sharedInfo = sharedMap[varKey];
  const isSharedSame = sharedInfo && !sharedInfo.isCross;
  const isSharedCross = sharedInfo?.isCross;
  const fl = allSweetFlavour[info.systemTopic] || allSweetFlavour.default;

  let className = "text-[11px] px-[8px] py-[2px] rounded-full font-mono border ";
  let title = `${info.name || sym}${info.unit ? ` (${info.unit})` : ""}`;

  // Priority:
  // memory > cross-topic > shared > normal
  if (inMem) {
    className += "border-emerald-500 text-emerald-900 bg-emerald-100 font-medium";
    title += " · saved in memory";
  } else if (isSharedCross) {
    className += "border-orange-400 text-orange-900 bg-orange-100 font-medium";
    title += " · same symbol — different topic";
  } else if (isSharedSame) {
    className += "border-emerald-400 text-emerald-800 bg-emerald-50 font-medium";
    title += " · shared with previous entry";
  } else {
    className += "border-[#C8B8A8] text-[#4A3020] bg-[#EDE0D0]";
  }

  return (
    <span className={className} title={title}>
      {inMem ? <><InlineMath math={sym} /> = {memory[varKey]}</> : <InlineMath math={sym} />}
    </span>
  );
}

// ── Bridge ────────────────────────────────────────────────────────────────────
function Bridge({ entryB }) {
  const shared = entryB.sharedWithPrev || [];

  // ไม่มีตัวแปรร่วมระหว่าง entry
  if (!shared.length) {
    return (
      <div className="ml-[35px] px-2 py-[3px] flex items-center gap-1">
        <span className="text-[10px] text-red-700 font-medium">
          ⚠ no shared variable</span>
      </div>
    );
  }

  const allCross = shared.every((b) => b.isCross);
  const someCross = shared.some((b) => b.isCross);
  const label = allCross ? "same symbol, may differ" : someCross ? "some may differ" : "shared";
  const labelColor = allCross || someCross ? "text-orange-700" : "text-[#7A5C44]";

  return (
    <div className="ml-[35px] px-2 py-[3px] flex items-center gap-[5px] flex-wrap">
      {shared.map((b) => (
        <span
          key={b.key}
          className={`text-[11px] px-[7px] py-[1px] rounded-full font-mono border ${
            b.isCross
              ? "border-orange-400 text-orange-900 bg-orange-100"
              : "border-purple-400 text-purple-900 bg-purple-100"
          }`}
        >
          <InlineMath math={b.symbol} />
        </span>
      ))}
      <span className={`text-[10px] font-medium ${labelColor}`}>
        {label}</span>
    </div>
  );
}

// ── EntryCard ─────────────────────────────────────────────────────────────────

function EntryCard({ entry, idx, analyzedHistory, pointer, formulaIndex, variableIndex, memory, onClickEntry }) {
  const fData = formulaIndex[entry.id];
  const vData = variableIndex[entry.key];

  // เลือกสีตาม Topic
  const sysT = fData?.systemTopic || vData?.systemTopic || entry.systemTopic || "default";
  const fl = allSweetFlavour[sysT] || allSweetFlavour.default;

  const topic = entry.topic || fData?.topic || vData?.topic || "—";
  const name = fData?.name || vData?.name || "—";
  const formula = fData?.formula || entry.label || "?";

  const isActive = idx === pointer;
  const repeat = entry.repeat;
  const swp = entry.sharedWithPrev || [];
  const hasPrev = idx > 0;
  const isDisc = entry.disconnected && hasPrev && !repeat;
  const isCross = entry.crossTopic && !isDisc;

  // ── dot style ──
  // UI: จุดแสดงสถานะบน timeline
  let dotClass = "absolute left-[12px] top-[14px] w-[13px] h-[13px] rounded-full border-2 ";

  // ── card style — เดียวกับ HistoryBar ──
  let cardBorder, cardBg, formulaColor, nameColor;

  // Theme: เปลี่ยนสีการ์ดตามสถานะ
  // active / disconnected / revisited / cross-topic
  if (isActive) {
    if (repeat) {
      dotClass += "border-pink-600 bg-pink-300";
      cardBorder = "border-pink-600";
      cardBg = "bg-pink-500";
      formulaColor = "text-white";
      nameColor = "text-pink-100";
    } else if (isDisc) {
      dotClass += "border-red-600 bg-red-300";
      cardBorder = "border-red-600";
      cardBg = "bg-red-500";
      formulaColor = "text-white";
      nameColor = "text-red-100";
    } else if (isCross) {
      dotClass += "border-orange-600 bg-orange-300";
      cardBorder = "border-orange-600";
      cardBg = "bg-orange-500";
      formulaColor = "text-white";
      nameColor = "text-orange-100";
    } else {
      dotClass += "border-blue-700 bg-blue-300";
      cardBorder = "border-blue-700";
      cardBg = "bg-blue-600";
      formulaColor = "text-white";
      nameColor = "text-blue-100";
    }
  } else {
    if (repeat) {
      dotClass += "border-pink-500 bg-pink-200";
      cardBorder = "border-pink-300";
      cardBg = "bg-pink-100";
      formulaColor = "text-[#3B1020]";
      nameColor = "text-pink-700";
    } else if (isDisc) {
      dotClass += "border-red-500 bg-red-200";
      cardBorder = "border-red-300";
      cardBg = "bg-red-100";
      formulaColor = "text-[#3B0A0A]";
      nameColor = "text-red-700";
    } else if (isCross) {
      dotClass += "border-orange-500 bg-orange-200";
      cardBorder = "border-orange-300";
      cardBg = "bg-orange-100";
      formulaColor = "text-[#3B1800]";
      nameColor = "text-orange-700";
    } else {
      dotClass += "border-[#B8A090] bg-[#E0CFC0]";
      cardBorder = "border-[#CDBBA8]";
      cardBg = "bg-[#F5EDE0]";
      formulaColor = "text-[#2D1A0E]";
      nameColor = "text-[#7A5A44]";
    }
  }

  // แปลง shared variable เป็น object สำหรับ lookup
  const sharedMap = {};
  swp.forEach((s) => { sharedMap[s.key] = s; });
  const varKeys = entry.variableKeys || [];

  return (
    <div className="relative pl-9 pr-[14px]">
      {idx < analyzedHistory.length - 1 && (
        <div className="absolute left-[18px] top-7 bottom-0 w-[1.5px] bg-[#D4C0AE]" />
      )}
      <div className={dotClass} />
      <div
        className={`my-[5px] px-[12px] py-[10px] border-2 ${cardBorder} ${cardBg}
          rounded-xl cursor-pointer hover:brightness-95 transition-all duration-150 shadow-sm`}
        onClick={() => onClickEntry?.(entry, idx)}
      >
        {/* top row */}
        <div className="flex items-start justify-between gap-2 mb-[3px]">
          <span className={`text-[13px] font-semibold font-mono ${formulaColor} flex-1 min-w-0 break-all`}>
            <InlineMath math={formula} />
          </span>
          <span
            className="text-[10px] px-[8px] py-[2px] rounded-full border font-bold whitespace-nowrap flex-shrink-0"
            style={{
              color: isActive ? "#fff" : fl.deepCode,
              borderColor: isActive ? "rgba(255,255,255,0.4)" : fl.deepCode + "66",
              backgroundColor: isActive ? "rgba(255,255,255,0.18)" : fl.deepCode + "18",
            }}
          >
            {topic}
          </span>
        </div>

        {/* name */}
        <div className={`text-[11px] ${nameColor} mb-[5px]`}>
          {name}
          {repeat && <span className={`ml-1 ${isActive ? "text-pink-100" : "text-pink-600"}`}>· revisited</span>}
        </div>

        {/* variables*/}
        {varKeys.length > 0 && (
          <div className={`mt-[6px] pt-[1px] rounded-lg overflow-hidden ${
            isActive ? "bg-black/15" : ""
          }`}>
            <div className="flex flex-wrap gap-[4px] p-[6px] bg-[#F5EDE0] rounded-lg">
              {varKeys.map((k) => (
                <VarChip
                  key={k}
                  varKey={k}
                  variableIndex={variableIndex}
                  memory={memory}
                  sharedMap={sharedMap}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { bg: "bg-blue-600",   border: "border-blue-700",   label: "Current" },
  { bg: "bg-[#E0CFC0]", border: "border-[#B8A090]",  label: "Normal" },
  { bg: "bg-orange-200", border: "border-orange-500", label: "Cross-topic" },
  { bg: "bg-red-200",    border: "border-red-500",    label: "No shared var" },
  { bg: "bg-pink-200",   border: "border-pink-500",   label: "Revisited" },
];

// ── Main ──────────────────────────────────────────────────────────────────────
// UI State: ควบคุม panel และ confirm dialog
function SessionOverview({
  history = [],
  pointer = -1,
  memory = {},
  formulaIndex = {},
  variableIndex = {},
  onClickEntry,
  onClearAll,   // callback ที่ลบทั้ง history + memory
}) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const analyzedHistory = useMemo(
    () => analyzeHistory(history, { formulaIndex, variableIndex }),
    [history, formulaIndex, variableIndex]
  );

  const { entryCount, topicCount } = useMemo(() => {
    const topics = new Set(analyzedHistory.map((e) => e.topic).filter(Boolean));
    return { entryCount: analyzedHistory.length, topicCount: topics.size };
  }, [analyzedHistory]);
  // Action: ล้าง session ทั้งหมด
  const handleConfirmClear = () => {
    onClearAll?.();
    setConfirmOpen(false);
    setOpen(false);
  };

  return (
    <>
      {/* FAB */}
      {/* ─── Floating Session Button ─── */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-[10px]
          bg-[#3B2415] text-[#F5EDE0] rounded-full text-[13px] font-medium shadow-lg
          hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]
          transition-all duration-150 border-2 border-white/10"
      >
        <div className="w-[18px] h-[18px] rounded-full bg-[#F5EDE0] text-[#3B2415]
          flex items-center justify-center text-[9px] font-bold flex-shrink-0">
          {history.length}
        </div>
        Session overview
      </button>

      {/* Backdrop */}
      {open && !confirmOpen && (
        <div className="fixed inset-0 bg-black/20 z-[200]" onClick={() => setOpen(false)} />
      )}

      {/* Confirm dialog */}
      {confirmOpen && (
        <ConfirmClearDialog
          onConfirm={handleConfirmClear}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed left-6 bottom-20 w-[340px] max-h-[72vh] bg-[#FBF4EC]
          border-2 border-[#C8A882] rounded-2xl overflow-hidden flex flex-col
          z-[300] transition-all duration-200 shadow-xl ${
            open
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-3 scale-[0.97] pointer-events-none"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] py-[11px]
          border-b-2 border-[#D4B896] bg-[#EDD8BE] flex-shrink-0">
          <div>
            <div className="text-[13px] font-black text-[#2D1A0E]">Session overview</div>
            <div className="text-[11px] text-[#7A5230] mt-[1px]">
              {entryCount === 0
                ? "No entries yet"
                : `${entryCount} entr${entryCount !== 1 ? "ies" : "y"} · ${topicCount} topic${topicCount !== 1 ? "s" : ""}`}
            </div>
          </div>
          {/* Clear button */}
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-[11px] font-bold text-red-700
              border-2 border-red-300 bg-red-50
              hover:bg-red-100 hover:border-red-400
              transition-colors cursor-pointer"
          >
            🗑 Clear all
          </button>
        </div>

        {/* Timeline */}
        {/* UI: เส้นเชื่อมระหว่าง timeline entries */}
        <div className="flex-1 overflow-y-auto py-2">
          {analyzedHistory.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#8C6A56] text-[13px] leading-relaxed">
              No history yet.<br />
              <span className="text-[11px] opacity-70">Browse formulas to start a session.</span>
            </div>
          ) : (
            analyzedHistory.map((entry, i) => (
              <div key={`${entry.id || entry.key}-${i}`}>
                <EntryCard
                  entry={entry}
                  idx={i}
                  analyzedHistory={analyzedHistory}
                  pointer={pointer}
                  formulaIndex={formulaIndex}
                  variableIndex={variableIndex}
                  memory={memory}
                  onClickEntry={(e, idx) => {
                    onClickEntry?.(e, idx);
                    setOpen(false);
                  }}
                />
                {i < analyzedHistory.length - 1 && (
                  <Bridge entryB={analyzedHistory[i + 1]} />
                )}
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        {/* UI: อธิบายความหมายของสีและสถานะ */}
        <div className="flex-shrink-0 px-[14px] py-[10px] border-t-2 border-[#D4B896]
          bg-[#EDD8BE] flex flex-wrap gap-x-[12px] gap-y-[6px]">
          {LEGEND.map(({ bg, border, label }) => (
            <div key={label} className="flex items-center gap-[5px]">
              <div className={`w-[10px] h-[10px] rounded-full border-2 ${bg} ${border}`} />
              <span className="text-[10px] font-medium text-[#6B4A2A]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default SessionOverview;