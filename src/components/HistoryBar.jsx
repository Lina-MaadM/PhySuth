import { InlineMath } from "react-katex";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useMemo, useRef } from "react";

function HistoryBar({ history = [], onClear }) {

  const navigate = useNavigate();

  const MAX_VISIBLE = 6;
  const STEP = 3;

  const [startIndex, setStartIndex] = useState(0);
  const [flash, setFlash] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const closeTimer = useRef(null);

  const getKey = (item) => item.id || item.key;

  useEffect(() => {
    if (history.length <= MAX_VISIBLE) {
      setStartIndex(0);
    } else {
      setStartIndex(history.length - MAX_VISIBLE);
    }
  }, [history]);

  // -----------------------------
  // warning ของ item ล่าสุด
  const latest = history[history.length - 1];

  const warning = useMemo(() => {
    if (!latest) return null;

    if (latest.disconnected) {
      return {
        text: "⚠ No shared symbol with previous step",
        color: "bg-red-500"
      };
    }

    if (latest.crossTopic) {
      return {
        text: `⚠ Cross topic: ${latest.topic}`,
        color: "bg-yellow-400"
      };
    }

    if (latest.repeat) {
      return {
        text: "↻ Revisited",
        color: "bg-purple-400"
      };
    }

    return null;
  }, [latest]);

  useEffect(() => {
    if (!warning) return;
    if (warning.text.includes("Revisited")) return;

    setFlash(true);

    const timer = setTimeout(() => {
      setFlash(false);
    }, 1200);

    return () => clearTimeout(timer);
  }, [warning]);

  // -----------------------------

  const handleClick = (item) => {

    if (item.page === "formulaHistory") {
      navigate(`/formula/${item.id}`, {
        state: { fromHistory: true }
      });
    }

    if (item.page === "variableHistory") {
      navigate(`/variable/${item.key}`, {
        state: { fromHistory: true }
      });
    }

  };

  // smart hover
  const handleMouseEnter = (index) => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
    }
    setHoveredIndex(index);
  };

  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => {
      setHoveredIndex(null);
    }, 350);
  };

  const handlePrev = () => {
    setStartIndex((prev) =>
      Math.max(prev - STEP, 0)
    );
  };

  const handleNext = () => {
    setStartIndex((prev) => {

      const nextIndex = prev + STEP;

      if (nextIndex + MAX_VISIBLE > history.length) {
        return Math.max(history.length - MAX_VISIBLE, 0);
      }

      return nextIndex;

    });
  };

  const visibleHistory = history.slice(
    startIndex,
    startIndex + MAX_VISIBLE
  );

  const canPrev = startIndex > 0;
  const canNext = startIndex + MAX_VISIBLE < history.length;

  return (
    <>
      <div className="w-full border-b bg-gray-50 p-3 flex items-center">

        <button
          onClick={handlePrev}
          disabled={!canPrev}
          className={`px-3 py-1 mr-3 text-lg font-bold rounded
          ${canPrev ? "text-blue-600 hover:text-blue-800"
                    : "text-gray-400 cursor-default"}`}
        >
          {"←"}
        </button>

        <div className="flex-1 overflow-visible flex justify-center">
          <div className="flex gap-2">

            {history.length === 0 && (
              <span className="text-sm text-gray-400">
                No history yet
              </span>
            )}

            {visibleHistory.map((item, index) => {

              let extraStyle = "bg-white";

              if (item.repeat) {
                extraStyle = "bg-purple-100 border-purple-400";
              }

              if (item.disconnected) {
                extraStyle = "bg-red-100 border-red-400";
              }

              if (item.crossTopic) {
                extraStyle = "bg-yellow-100 border-yellow-400";
              }

              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={`${item.page}-${getKey(item)}-${index}`}
                  className="relative"
                  onMouseEnter={() => handleMouseEnter(index)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onClick={() => handleClick(item)}
                    className={`px-3 py-1 border rounded text-sm cursor-pointer hover:bg-blue-50 whitespace-nowrap ${extraStyle}`}
                  >
                    <InlineMath math={item.label} />
                  </div>

                  {isHovered && (
                    <div
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 w-64 p-3 bg-white border shadow-lg rounded text-sm transition-opacity duration-150"
                      onMouseEnter={() => handleMouseEnter(index)}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="font-semibold mb-1">
                        <InlineMath math={item.label} />
                      </div>

                      {item.topic && (
                        <div className="text-gray-600">
                          {item.topic}
                          {item.subtopic && ` – ${item.subtopic}`}
                        </div>
                      )}

                      {item.symbols && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {item.symbols.map((sym, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-gray-100 rounded"
                            >
                              <InlineMath math={sym} />
                            </span>
                          ))}
                        </div>
                      )}

                      {item.crossTopic && (
                        <div className="mt-2 text-yellow-600 text-xs">
                          Cross topic
                        </div>
                      )}

                      {item.disconnected && (
                        <div className="mt-2 text-red-600 text-xs">
                          Not connected to previous step
                        </div>
                      )}

                      {item.repeat && (
                        <div className="mt-2 text-purple-600 text-xs">
                          Revisited
                        </div>
                      )}

                      <button
                        onClick={() => handleClick(item)}
                        className="mt-3 w-full border rounded py-1 hover:bg-blue-50"
                      >
                        Open
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
          className={`px-3 py-1 ml-3 text-lg font-bold rounded
          ${canNext ? "text-blue-600 hover:text-blue-800"
                    : "text-gray-400 cursor-default"}`}
        >
          {"→"}
        </button>

        <button
          onClick={() => {
            setStartIndex(0);
            onClear?.();
          }}
          className="ml-4 px-3 py-1 border rounded text-sm hover:bg-red-100"
        >
          Clear
        </button>

      </div>

      {warning && (
        <div
          className={`w-full text-sm text-white px-4 py-1 flex justify-center
          ${warning.color}
          ${flash ? "animate-pulse" : ""}`}
        >
          {warning.text}
        </div>
      )}
    </>
  );
}

export default HistoryBar;