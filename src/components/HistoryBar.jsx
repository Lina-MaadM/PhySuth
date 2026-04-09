import { InlineMath } from "react-katex";
import { useState, useEffect, useMemo, useRef } from "react";

function HistoryBar({ history = [], activePointer, onClear }) {
  const [flash, setFlash] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [visible, setVisible] = useState(true);

  const activeIndex = activePointer;

  const lastScroll = useRef(0);
  const hoverTimer = useRef(null);
  const scrollRef = useRef(null);

  // =========================================================
  // AUTO SCROLL: เลื่อนไปหาตัวที่กำลัง Active
  // =========================================================
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(".history-item-active");
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  }, [activePointer]);

  // ซ่อน/แสดง Bar เมื่อ scroll
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(!(current > lastScroll.current && current > 120));
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // วิเคราะห์ Warning สำหรับแถบสถานะด้านล่าง
  const currentItem = history[activeIndex];
  const warning = useMemo(() => {
    if (!currentItem) return null;
    if (currentItem.disconnected)
      return { text: "⚠ No shared symbol with previous step", color: "bg-red-500" };
    if (currentItem.crossTopic)
      return { text: `⚠ Cross topic: ${currentItem.topic}`, color: "bg-orange-500 text-black" };
    if (currentItem.repeat)
      return { text: "↻ Revisited", color: "bg-pink-400" };
    return null;
  }, [currentItem]);

  // เอฟเฟกต์ไฟกะพริบตอนเจอ Warning ใหม่
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
    hoverTimer.current = setTimeout(() => {
      setHoveredItem(null);
    }, 1000);
  };

  // =========================================================
  // CLICK HANDLER: ส่ง event ขึ้นไปให้ App จัดการอย่างเดียว
  // navigate ถูกย้ายไปอยู่ที่ handleHistoryClick ใน App.jsx แล้ว
  // =========================================================
  const handleItemClick = (item) => {
    item.onClick?.();
  };

  return (
    <div
      className={`fixed left-0 right-0 top-[72px] z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="w-full border-b border-[#EADFD8] bg-[#FFF8F0]/90 backdrop-blur-sm p-3 flex items-center shadow-sm">
        <button
          onClick={() => onClear?.()}
          className="mr-4 px-4 py-1.5 text-xs font-bold tracking-wider text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0 flex items-center gap-1"
        >
          🗑 Clear
        </button>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto whitespace-nowrap pr-16 no-scrollbar"
        >
          <div className="flex gap-3 items-center">
            {history.length === 0 && (
              <span className="text-sm text-gray-400 ml-2">No history yet</span>
            )}

            {history.map((item, index) => {
              let extraStyle = "bg-[#FFFAF5] border border-[#F3E8E2] text-[#5A3E36]";
              let hasWarning = false;

              if (item.repeat) {
                extraStyle = "bg-pink-100 text-black border-pink-200";
                hasWarning = true;
              }
              if (item.disconnected) {
                extraStyle = "bg-red-100 text-black border-red-200";
                hasWarning = true;
              }
              if (item.crossTopic) {
                extraStyle = "bg-orange-100 text-black border-orange-200";
                hasWarning = true;
              }

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

      {/* Tooltip Hover */}
      {hoveredItem && (
        <div
          className="fixed left-1/2 -translate-x-1/2 top-[135px] z-[9999] w-60 p-4 bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl text-sm animate-in fade-in zoom-in duration-200"
          onMouseEnter={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="font-bold mb-2 border-b border-stone-100 pb-2 text-stone-800">
            <InlineMath math={hoveredItem.label} />
          </div>

          <div className="text-stone-500 text-xs mt-1">
            <span className="font-mono bg-stone-100 px-1 rounded">ID: {hoveredItem.id}</span>
          </div>

          {hoveredItem.topic && (
            <div className="text-stone-500 text-xs mt-1">
              <span className="font-bold text-[#2D241E] px-2 py-0.5 bg-stone-100 rounded-md mr-2">
                {hoveredItem.topic}
              </span>
            </div>
          )}

          {hoveredItem.symbols?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hoveredItem.symbols.map((sym, i) => (
                <span
                  key={i}
                  className="px-2 py-1 bg-stone-50 border border-stone-100 rounded-lg text-[10px] text-stone-600 shadow-sm"
                >
                  <InlineMath math={sym} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

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