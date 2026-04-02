import { InlineMath } from "react-katex";
import { useNavigate } from "react-router-dom";
import { routeBuilder } from "../routes";
import { useState, useEffect, useMemo, useRef } from "react";

function HistoryBar({ history = [], onClear, setNavigationContext, navigationContext }) {
  const navigate = useNavigate();

  const [flash, setFlash] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);

  const [visible, setVisible] = useState(true);
  const lastScroll = useRef(0);

  const hoverTimer = useRef(null);
  const scrollRef = useRef(null);

  const getKey = (item) => item.id || item.key;

  const latestIndex = history.length - 1;

  const currentIndex =
    navigationContext?.fromIndex !== undefined
      ? navigationContext.fromIndex
      : latestIndex;

  const currentItem = history[currentIndex];

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;

      if (current > lastScroll.current && current > 120) {
        setVisible(false);
      } else {
        setVisible(true);
      }

      lastScroll.current = current;
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      left: scrollRef.current.scrollWidth,
      behavior: "smooth"
    });
  }, [history]);

  const warning = useMemo(() => {
    if (!currentItem) return null;

    if (currentItem.disconnected)
      return { text: "⚠ No shared symbol with previous step", color: "bg-red-500" };

    if (currentItem.crossTopic)
      return {
        text: `⚠ Cross topic: ${currentItem.topic}`,
        color: "bg-yellow-400 text-black"
      };

    if (currentItem.repeat)
      return { text: "↻ Revisited", color: "bg-purple-400" };

    return null;
  }, [currentItem]);

  useEffect(() => {
    if (!warning || warning.text.includes("Revisited")) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [warning]);

  const handleClick = (item, index) => {
    setNavigationContext?.({
      source: "history",
      fromIndex: index
    });

    if (item.page === "formulaHistory") {
      navigate(routeBuilder.formula(item.id), { state: { fromHistory: true } });
    }

    if (item.page === "variableHistory") {
      navigate(routeBuilder.variable(item.key), { state: { fromHistory: true } });
    }
  };

  // ✅ hover logic ใหม่ (คุมด้วย state เดียว)
  const handleMouseEnter = (item) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setHoveredItem(null);
    }, 1000); //  2 วิ
  };

  return (
    <>
      <div
        className={`fixed left-0 right-0 top-16 z-40 transition-transform duration-300 ${
          visible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="w-full border-b bg-gray-50/90 backdrop-blur-sm p-3 flex items-center shadow-sm">
          <button
            onClick={() => onClear?.()}
            className="mr-4 px-3 py-1 border rounded text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
          >
            Clear
          </button>

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto whitespace-nowrap pr-16"
          >
            <div className="flex gap-2">
              {history.length === 0 && (
                <span className="text-sm text-gray-400">No history yet</span>
              )}

              {history.map((item, index) => {
                let extraStyle = "text-black";
                let hasWarning = false;

                if (item.repeat) {
                  extraStyle = "bg-purple-100 border-purple-400";
                  hasWarning = true;
                }
                if (item.disconnected) {
                  extraStyle = "bg-red-100 border-red-400";
                  hasWarning = true;
                }
                if (item.crossTopic) {
                  extraStyle = "bg-yellow-100 border-yellow-400";
                  hasWarning = true;
                }

                const isCurrent = index === currentIndex;

                let highlightStyle = "";

                if (isCurrent) {
                  if (hasWarning) {
                    if (item.repeat) highlightStyle = "bg-purple-500 text-white";
                    if (item.disconnected) highlightStyle = "bg-red-500 text-white";
                    if (item.crossTopic) highlightStyle = "bg-yellow-500 text-white";
                  } else {
                    highlightStyle = "bg-blue-600 text-white";
                  }
                }

                return (
                  <div
                    key={`${item.page}-${getKey(item)}-${index}`}
                    className="shrink-0"
                    onMouseEnter={() => handleMouseEnter(item)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <div
                      onClick={() => handleClick(item, index)}
                      className={`px-3 py-1 border rounded text-sm cursor-pointer hover:bg-blue-50 whitespace-nowrap ${extraStyle} ${highlightStyle}`}
                    >
                      <InlineMath math={item.label} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ✅ Floating Hover Panel (แยกออกมาเลย) */}
        {hoveredItem && (
          <div
            className="fixed left-1/2 -translate-x-1/2 top-[60px] z-[9999] w-60 p-4 bg-white border shadow-2xl rounded-xl text-sm"
            onMouseEnter={() => {
              if (hoverTimer.current) clearTimeout(hoverTimer.current);
            }}
            onMouseLeave={handleMouseLeave}
          >
            <div className="font-semibold mb-2 border-b pb-1">
              <InlineMath math={hoveredItem.label} />
            </div>

            {hoveredItem.topic && (
              <div className="text-gray-600 text-xs">
                <span className="font-medium text-gray-800">
                  {hoveredItem.topic}
                </span>
                {hoveredItem.subtopic && ` – ${hoveredItem.subtopic}`}
              </div>
            )}

            {hoveredItem.symbols?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {hoveredItem.symbols.map((sym, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-gray-100 border rounded text-[10px]"
                  >
                    <InlineMath math={sym} />
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* warning */}
        {warning && (
          <div
            className={`w-full text-xs px-4 py-1 flex justify-center ${warning.color} ${
              flash ? "animate-pulse" : ""
            }`}
          >
            {warning.text}
          </div>
        )}
      </div>
    </>
  );
}

export default HistoryBar;