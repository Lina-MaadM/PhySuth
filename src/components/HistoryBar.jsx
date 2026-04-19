import { InlineMath } from "react-katex";
import { useState, useEffect, useMemo, useRef } from "react";
import { allSweetFlavour } from "../allSweetFlavour";

// สีและ label สำหรับแต่ละประเภท relation
const RELATION_STYLE = {
  "shared": {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    text: "text-emerald-700",
    label: "Shared",
    dot: "bg-emerald-400",
  },
  "cross-topic": {
    bg: "bg-orange-50",
    border: "border-orange-300",
    text: "text-orange-700",
    label: "Cross-topic",
    dot: "bg-orange-400",
  },
  "new": {
    bg: "bg-stone-50",
    border: "border-stone-200",
    text: "text-stone-500",
    label: "New",
    dot: "bg-stone-300",
  },
};

function HistoryBar({ history = [], activePointer, onClear }) {
  const [flash, setFlash] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [visible, setVisible] = useState(true);

  const activeIndex = activePointer;

  const lastScroll = useRef(0);
  const hoverTimer = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(".history-item-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activePointer]);

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(!(current > lastScroll.current && current > 120));
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentItem = history[activeIndex];
  const warning = useMemo(() => {
    if (!currentItem) return null;
    if (currentItem.disconnected)
      return { text: "⚠ No shared symbol with previous step", color: "bg-red-500" };
    if (currentItem.crossTopic) {
      const prevTopic = history[activeIndex - 1]?.topic || "Previous";
      return {
        text: `⚠ Cross topic: ${prevTopic} → ${currentItem.topic}`,
        color: "bg-orange-500",
      };
    }
    if (currentItem.repeat)
      return { text: "↻ Revisited", color: "bg-pink-400" };
    return null;
  }, [currentItem, history, activeIndex]);

  useEffect(() => {
    if (!warning || warning.text.includes("Revisited")) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [warning]);

  const handleMouseEnter = (item) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => setHoveredItem(null), 1000);
  };

  const handleItemClick = (item) => {
    item.onClick?.();
  };

  const shouldShowPopup = hoveredItem && visible;

  return (
    <div
      className={`fixed left-0 right-0 top-[72px] z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* MAIN BAR */}
      <div className="w-full border-y-2 border-[#EADFD8]/50 bg-[#FFF8F0]/95 backdrop-blur-sm h-[80px] flex items-center shadow-sm px-4">
        <button
          onClick={() => onClear?.()}
          className="px-3 py-1.5 text-xs font-bold tracking-wider text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border border-transparent hover:border-red-100"
        >
          🗑 Clear
        </button>

        <div className="h-8 w-[1px] bg-stone-200 mx-2 shrink-0" />

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto whitespace-nowrap h-[80px] flex pt-4 scrollbar-thin"
        >
          <div className="flex gap-3 pl-8 pr-16 h-full">
            {history.length === 0 && (
              <div className="flex items-center h-full">
                <span className="text-sm text-gray-400 ml-2 italic">No history yet</span>
              </div>
            )}

            {history.map((item, index) => {
              let extraStyle = "bg-[#FFFAF5] border border-[#F3E8E2] text-[#5A3E36]";
              let hasWarning = false;

              if (item.repeat) { extraStyle = "bg-pink-100 text-black border-pink-200"; hasWarning = true; }
              if (item.disconnected) { extraStyle = "bg-red-100 text-black border-red-200"; hasWarning = true; }
              if (item.crossTopic) { extraStyle = "bg-orange-100 text-black border-orange-200"; hasWarning = true; }

              const isCurrent = index === activeIndex;
              let highlightStyle = "";

              if (isCurrent) {
                if (hasWarning) {
                  if (item.repeat) highlightStyle = "bg-pink-500 text-white border-pink-600 shadow-md";
                  if (item.disconnected) highlightStyle = "bg-red-500 text-white border-red-600 shadow-md";
                  if (item.crossTopic) highlightStyle = "bg-orange-500 text-white border-orange-600 shadow-md";
                } else {
                  highlightStyle = "bg-blue-600 text-white border-blue-700 shadow-md";
                }
              }

              return (
                <div
                  key={`${item.id}-${index}`}
                  className={`shrink-0 py-1 ${isCurrent ? "history-item-active" : ""}`}
                  onMouseEnter={() => handleMouseEnter(item)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onClick={() => handleItemClick(item)}
                    className={`px-5 py-1.5 rounded-full text-sm cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${extraStyle} ${highlightStyle}`}
                  >
                    <InlineMath math={item.label} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* POPUP HOVER */}
      {shouldShowPopup && (() => {
        const flavour = allSweetFlavour[hoveredItem.systemTopic] || allSweetFlavour.default;
        const symbols = hoveredItem.symbols || [];
        const relations = hoveredItem.symbolRelations || [];
        const isFirstEntry = relations.every((r) => r === null);

        // หา relation ประเภทที่มีจริงในไอเทมนี้ เพื่อแสดง legend เฉพาะที่จำเป็น
        const presentRelations = [...new Set(relations.filter(Boolean))];

        return (
          <div
            className={`fixed left-1/2 -translate-x-1/2 top-[110px] z-[9999] w-64 bg-white border-2 ${flavour.border} rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200 shadow-xl`}
            onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current); }}
            onMouseLeave={handleMouseLeave}
          >
            {/* Header */}
            <div className={`${flavour.soft} py-4 px-4 border-b-2 border-stone-100 text-center`}>
              <div className={`scale-150 inline-block ${flavour.deep}`}>
                <InlineMath math={hoveredItem.label} />
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Metadata */}
              <div className="space-y-2">
                {hoveredItem.topic && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-10">Topic</span>
                    <span className={`text-xs font-bold ${flavour.deep} ${flavour.light} border ${flavour.border} px-2.5 py-1 rounded-lg shadow-sm`}>
                      {hoveredItem.topic}
                    </span>
                  </div>
                )}
                {hoveredItem.subtopic && (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-10">Sub</span>
                    <span className="text-xs text-stone-600 font-medium italic">
                      {hoveredItem.subtopic}
                    </span>
                  </div>
                )}
              </div>

              {/* Symbols + Relations */}
              {symbols.length > 0 && (
                <div className="pt-3 border-t border-stone-100 space-y-2">
                  {/* หัวข้อบอก context ว่านี่คือการเปรียบเทียบกับตัวก่อนหน้า */}
                  <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest">
                    {isFirstEntry ? "Symbols" : "Compared with previous"}
                  </div>

                  {/* Symbol pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {symbols.map((sym, i) => {
                      const rel = relations[i];
                      const style = rel ? RELATION_STYLE[rel] : null;

                      // entry แรก ใช้สีตาม topic เหมือนเดิม
                      if (!style) {
                        return (
                          <span
                            key={i}
                            className={`px-2.5 py-1 ${flavour.soft} border ${flavour.border} rounded-md text-[11px] ${flavour.deep} font-bold`}
                          >
                            <InlineMath math={sym} />
                          </span>
                        );
                      }

                      return (
                        <span
                          key={i}
                          className={`px-2.5 py-1 ${style.bg} border ${style.border} rounded-md text-[11px] ${style.text} font-bold`}
                        >
                          <InlineMath math={sym} />
                        </span>
                      );
                    })}
                  </div>

                  {/* Legend — แสดงเฉพาะ relation ที่มีจริง */}
                  {!isFirstEntry && presentRelations.length > 0 && (
                    <div className="flex flex-col gap-1 pt-1">
                      {presentRelations.map((rel) => {
                        const style = RELATION_STYLE[rel];
                        return (
                          <div key={rel} className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${style.dot}`} />
                            <span className="text-[10px] text-stone-400">{style.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Warning Status Bar */}
      {warning && (
        <div
          className={`w-full text-[11px] font-bold tracking-wide px-4 py-1.5 flex justify-center text-white transition-colors duration-500 ${warning.color} ${flash ? "animate-pulse" : ""}`}
        >
          {warning.text.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default HistoryBar;