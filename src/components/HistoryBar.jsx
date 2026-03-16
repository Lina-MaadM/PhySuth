import { InlineMath } from "react-katex";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

function HistoryBar({ history = [], onClear }) {

  const navigate = useNavigate();

  const MAX_VISIBLE = 10;
  const STEP = 5;

  const [startIndex, setStartIndex] = useState(0);

  const handleClick = (item) => {

    if (item.page === "formulaHistory") {
      navigate(`/formula/${item.id}`, {
        state: { fromHistory: true }
      });
    }

    if (item.page === "variableHistory") {
      navigate(`/variable/${item.symbol}`, {
        state: { fromHistory: true }
      });
    }

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
    <div className="w-full border-b bg-gray-50 p-3 flex items-center">

      {/* LEFT BUTTON */}
      <button
        onClick={handlePrev}
        disabled={!canPrev}
        className={`px-2 mr-3 text-sm font-semibold
        ${canPrev ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-default"}`}
      >
        {"<="}
      </button>

      {/* HISTORY AREA */}
      <div className="flex gap-2 flex-1 overflow-hidden">

        {history.length === 0 && (
          <span className="text-sm text-gray-400">
            No history yet
          </span>
        )}

        {visibleHistory.map((item, index) => (
          <div
            key={item.id || item.symbol || index}
            onClick={() => handleClick(item)}
            className="px-3 py-1 bg-white border rounded text-sm cursor-pointer hover:bg-blue-50 whitespace-nowrap"
          >
            <InlineMath math={item.label} />
          </div>
        ))}

      </div>

      {/* RIGHT BUTTON */}
      <button
        onClick={handleNext}
        disabled={!canNext}
        className={`px-2 ml-3 text-sm font-semibold
        ${canNext ? "text-blue-600 hover:text-blue-800" : "text-gray-400 cursor-default"}`}
      >
        {"=>"}
      </button>

      {/* CLEAR */}
      <button
        onClick={onClear}
        className="ml-4 px-3 py-1 border rounded text-sm hover:bg-red-100"
      >
        Clear
      </button>

    </div>
  );
}

export default HistoryBar;