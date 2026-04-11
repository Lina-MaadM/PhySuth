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
      
    if (currentItem.crossTopic) {
      // ดึง Topic ก่อนหน้าจาก Index ลบหนึ่ง
      const prevTopic = history[activeIndex - 1]?.topic || "Previous";
      return { 
        text: `⚠ Cross topic: ${prevTopic} → ${currentItem.topic}`, 
        color: "bg-orange-500" 
      };
    }
      
    if (currentItem.repeat)
      return { text: "↻ Revisited", color: "bg-pink-400" };
      
    return null;
  }, [currentItem, history, activeIndex]); 

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

  const shouldShowPopup = hoveredItem && visible;
  return (
    <div
      className={`fixed left-0 right-0 top-[72px] z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      {/* 1. MAIN BAR*/}
      <div className="w-full border-y-2 border-[#EADFD8]/50 bg-[#FFF8F0]/95 backdrop-blur-sm h-[80px] flex items-center shadow-sm px-4">
        {/* 2. CLEAR BUTTON*/}
        <button
          onClick={() => onClear?.()}
          className="px-3 py-1.5 text-xs font-bold tracking-wider text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all shrink-0 flex items-center gap-1.5 border border-transparent hover:border-red-100"
        >
          🗑 Clear
        </button>

        {/* เส้นแบ่งโซน (Vertical Divider) เพื่อความชัดเจน */}
        <div className="h-8 w-[1px] bg-stone-200 mx-2 shrink-0" />

        {/* 3. SCROLL CONTAINER */}
        <div 
          ref={scrollRef} 
          className="flex-1 overflow-x-auto whitespace-nowrap h-[80px] flex pt-4 scrollbar-thin"
        >
          {/* 4. ITEM LIST */}
          <div className="flex gap-3 pl-8 pr-16 h-full">
            {history.length === 0 && (
              <div className="flex items-center h-full"> {/* เพิ่ม div หุ้มเพื่อคุมความสูง */}
                <span className="text-sm text-gray-400 ml-2 italic">No history yet</span>
              </div>
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

{/* 5. POPUP HOVER - ปรับสีสันและเอาลูกศรออก */}
{shouldShowPopup && (
  <div
    className="fixed left-1/2 -translate-x-1/2 top-[110px] z-[9999] w-64 bg-[#FFF8F0] border-2 border-[#EADFD8] rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
    onMouseEnter={() => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
    }}
    onMouseLeave={handleMouseLeave}
  >
    {/* 1. Header Area: เน้นสูตรให้เด่น */}
    <div className="bg-white/60 py-3 px-4 border-b-2 border-[#EADFD8]/30 text-center">
      <div className="scale-125 inline-block text-[#5A3E36]">
        <InlineMath math={hoveredItem.label} />
      </div>
    </div>

    <div className="p-4 space-y-4">
      {/* 2. Metadata Section */}
      <div className="space-y-2">
        {hoveredItem.topic && (
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest w-10">Topic</span>
            <span className="text-xs font-bold text-blue-700 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg shadow-sm">
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

      {/* 3. Relevant Symbols Section: ทำเป็นแคปซูลสีครีมอุ่นๆ */}
      {hoveredItem.symbols?.length > 0 && (
        <div className="pt-3 border-t border-[#EADFD8]/50">
          <div className="text-[9px] text-stone-400 font-black uppercase tracking-widest mb-2">Symbols</div>
          <div className="flex flex-wrap gap-1.5">
            {hoveredItem.symbols.map((sym, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-[#F3E8E2] border border-[#DCCFCA] rounded-md text-[11px] text-[#5A3E36] font-bold"
              >
                <InlineMath math={sym} />
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
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