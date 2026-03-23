import { InlineMath } from "react-katex";
import { useNavigate } from "react-router-dom";
import { routeBuilder } from "../routes";
import { useState, useEffect, useMemo, useRef } from "react";

function HistoryBar({ history = [], onClear }) {
  const navigate = useNavigate();
  const STEP = 3;

  const getMaxVisible = () => {
    const width = window.innerWidth;
    if (width >= 1700) return 10;
    if (width >= 1500) return 9;
    if (width >= 1300) return 8;
    if (width >= 1100) return 7;
    if (width >= 900) return 6;
    return 5;
  };

  const [maxVisible, setMaxVisible] = useState(getMaxVisible());
  const [startIndex, setStartIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  
  // เปลี่ยนจาก index เป็น key เพื่อความแม่นยำ
  const [hoveredKey, setHoveredKey] = useState(null);

  const closeTimer = useRef(null);

  const getKey = (item) => item.id || item.key;

  useEffect(() => {
    const handleResize = () => setMaxVisible(getMaxVisible());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (history.length <= maxVisible) {
      setStartIndex(0);
    } else {
      setStartIndex(history.length - maxVisible);
    }
  }, [history, maxVisible]);

  const latest = history[history.length - 1];

  const warning = useMemo(() => {
    if (!latest) return null;
    if (latest.disconnected) return { text: "⚠ No shared symbol with previous step", color: "bg-red-500" };
    if (latest.crossTopic) return { text: `⚠ Cross topic: ${latest.topic}`, color: "bg-yellow-400" };
    if (latest.repeat) return { text: "↻ Revisited", color: "bg-purple-400" };
    return null;
  }, [latest]);

  useEffect(() => {
    if (!warning || warning.text.includes("Revisited")) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [warning]);

  const handleClick = (item) => {
    if (item.page === "formulaHistory") {
      navigate(routeBuilder.formula(item.id), { state: { fromHistory: true } });
    }
    if (item.page === "variableHistory") {
      navigate(routeBuilder.variable(item.key), { state: { fromHistory: true } });
    }
  };

  // Smart Hover ใช้ Key แทน Index
  const handleMouseEnter = (key) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setHoveredKey(key);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => {
      setHoveredKey(null);
    }, 300);
  };

  const handlePrev = () => setStartIndex((prev) => Math.max(prev - STEP, 0));
  const handleNext = () => setStartIndex((prev) => {
    const nextIndex = prev + STEP;
    return nextIndex + maxVisible > history.length ? Math.max(history.length - maxVisible, 0) : nextIndex;
  });

  const visibleHistory = history.slice(startIndex, startIndex + maxVisible);
  const canPrev = startIndex > 0;
  const canNext = startIndex + maxVisible < history.length;

  return (
    <>
      {/* ส่วนแถบประวัติหลัก */}
      <div className="w-full border-b bg-gray-50 p-3 flex items-center relative z-[40]">
        
        <button
          onClick={handlePrev}
          disabled={!canPrev}
          className={`px-3 py-1 mr-3 text-lg font-bold rounded ${canPrev ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-default"}`}
        >
          {"←"}
        </button>

        {/* สำคัญ: เอา overflow-hidden ออกจาก div นี้ถ้า Tooltip โดนตัดขอบ */}
        <div className="flex-1 flex justify-center">
          <div className="flex gap-2">
            {history.length === 0 && <span className="text-sm text-gray-400">No history yet</span>}

            {visibleHistory.map((item, index) => {
              let extraStyle = "bg-white";
              if (item.repeat) extraStyle = "bg-purple-100 border-purple-400";
              if (item.disconnected) extraStyle = "bg-red-100 border-red-400";
              if (item.crossTopic) extraStyle = "bg-yellow-100 border-yellow-400";

              // สร้าง Unique Key สำหรับ Item นี้โดยเฉพาะ
              const itemUniqueKey = `${item.page}-${getKey(item)}-${startIndex + index}`;
              const isHovered = hoveredKey === itemUniqueKey;

              return (
                <div
                  key={itemUniqueKey}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(itemUniqueKey)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onClick={() => handleClick(item)}
                    className={`px-3 py-1 border rounded text-sm cursor-pointer hover:bg-blue-50 whitespace-nowrap transition-colors ${extraStyle}`}
                  >
                    <InlineMath math={item.label} />
                  </div>

                  {/* Tooltip Overlay */}
                  {isHovered && (
                    <div
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-[999] w-64 p-3 bg-white border shadow-2xl rounded-lg text-sm"
                      onMouseEnter={() => handleMouseEnter(itemUniqueKey)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="font-semibold mb-1 border-b pb-1">
                        <InlineMath math={item.label} />
                      </div>

                      {item.topic && (
                        <div className="text-gray-600 text-xs mt-1">
                          <span className="font-medium text-gray-800">{item.topic}</span>
                          {item.subtopic && ` – ${item.subtopic}`}
                        </div>
                      )}

                      {item.symbols && item.symbols.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {item.symbols.map((sym, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]">
                              <InlineMath math={sym} />
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1 mt-2">
                        {item.crossTopic && <div className="text-yellow-600 text-[10px] font-bold">⚠ Cross topic</div>}
                        {item.disconnected && <div className="text-red-600 text-[10px] font-bold">⚠ Not connected</div>}
                        {item.repeat && <div className="text-purple-600 text-[10px] font-bold">↻ Revisited</div>}
                      </div>

                      <button
                        onClick={() => handleClick(item)}
                        className="mt-3 w-full bg-blue-50 text-blue-600 font-medium border border-blue-200 rounded py-1 hover:bg-blue-600 hover:text-white transition-all text-xs"
                      >
                        View Details
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!canNext}
          className={`px-3 py-1 ml-3 text-lg font-bold rounded ${canNext ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-default"}`}
        >
          {"→"}
        </button>

        <button
          onClick={() => { setStartIndex(0); onClear?.(); }}
          className="ml-4 px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Warning Bar */}
      {warning && (
        <div className={`w-full text-xs text-white px-4 py-1 flex justify-center transition-all ${warning.color} ${flash ? "animate-pulse" : ""}`}>
          {warning.text}
        </div>
      )}
    </>
  );
}

export default HistoryBar;