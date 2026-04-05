import { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import { variableIndex } from "../data/physicsData"; 

export default function VariableMem({ memory = {}, onClear = () => {} }) {
  const [open, setOpen] = useState(false);

  const entries = Object.entries(memory);

  const grouped = useMemo(() => {
    const result = {};

    for (const [key, value] of entries) {
      const info = variableIndex[key];
      if (!info) continue;

      const topic = info.topic || "Others";
      const symbol = info.symbol || key;
      const unit = info.unit || "";

      if (!result[topic]) result[topic] = [];
      result[topic].push({ key, value, symbol, unit });
    }

    return result;
  }, [entries]);

  const topics = Object.keys(grouped);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-15 h-15 rounded-full bg-blue-500 text-white font-bold text-lg shadow-md z-50"
      >
        M{entries.length > 0 ? `(${entries.length})` : ""}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 max-h-[420px] overflow-y-auto bg-white rounded-xl p-4 shadow-lg border border-gray-200 z-50">
          <div className="flex justify-between mb-2">
            <strong className="text-lg">Saved Variables</strong>
            <button
              onClick={onClear}
              className="text-red-500 text-sm cursor-pointer bg-transparent border-none"
            >
              Clear
            </button>
          </div>

          {entries.length === 0 && (
            <div className="opacity-60 text-sm">No values saved</div>
          )}

          {topics.map(topic => (
            <div key={topic} className="mb-3">
              <div className="text-center font-semibold text-blue-700 text-lg mb-1">
                {topic}
              </div>

              {grouped[topic].map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[40px_1fr_80px] gap-x-2 items-center text-sm pl-1 mb-0.5"
                >
                  {/* variable (symbol) */}
                  <span className="font-medium">
                    <InlineMath math={item.symbol} />
                  </span>

                  {/* value */}
                  <span className="text-right font-mono text-blue-600 truncate">
                    {item.value}
                  </span>

                  {/* unit */}
                  <span className="opacity-70 font-mono text-xs whitespace-nowrap">
                    <InlineMath math={item.unit} />
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}