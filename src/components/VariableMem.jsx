import { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import { variableIndex, physicsTopics } from "../data/physicsData"; 
import { allSweetFlavour } from "../allSweetFlavour";

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
      
      const topicInfo = physicsTopics.find(t => t.topic === topic);
      const systemTopic = topicInfo ? topicInfo.systemTopic : "default";

      if (!result[topic]) result[topic] = { vars: [], systemTopic };
      result[topic].vars.push({ key, value, symbol, unit });
    }

    return result;
  }, [entries]);

  const topics = Object.keys(grouped);

  return (
    <>
      {/* FAB — pill shape, same style as SessionOverview */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-[10px]
          bg-[#3B2415] text-[#F5EDE0] rounded-full text-[13px] font-medium shadow-lg
          hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]
          transition-all duration-150 border-2 border-white/10"
      >
        <div className="w-[18px] h-[18px] rounded-full bg-[#F5EDE0] text-[#3B2415]
          flex items-center justify-center text-[9px] font-bold flex-shrink-0">
          {entries.length}
        </div>
        Variables
      </button>

      {/* Backdrop — click anywhere outside panel to close */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-[200]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed bottom-20 right-6 w-80 max-h-[460px] bg-[#FBF4EC]
          border-[1.5px] border-[#E2CDB8] rounded-2xl overflow-hidden flex flex-col
          z-[300] transition-all duration-200 ${
            open
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-3 scale-[0.97] pointer-events-none"
          }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] py-[11px]
          border-b border-[#E2CDB8] bg-[#F2E6D8] flex-shrink-0">
          <div>
            <div className="text-[13px] font-medium text-[#3B2415]">Saved variables</div>
            <div className="text-[10px] text-[#8C6A56] mt-[1px]">
              {entries.length === 0
                ? "No values saved"
                : `${entries.length} value${entries.length !== 1 ? "s" : ""} · ${topics.length} topic${topics.length !== 1 ? "s" : ""}`}
            </div>
          </div>
          <button
            onClick={onClear}
            className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer bg-transparent border-none"
          >
            Clear all
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-[14px] py-3">
          {entries.length === 0 && (
            <div className="text-[12px] text-[#8C6A56] italic py-6 text-center opacity-60">
              No values saved
            </div>
          )}

          {topics.map(topicName => {
            const { vars, systemTopic } = grouped[topicName];
            const flavour = allSweetFlavour[systemTopic] || allSweetFlavour.default;

            return (
              <div key={topicName} className="mb-4 last:mb-1">
                {/* Topic label — uses flavour deep colour, never white */}
                <div
                  className={`text-center text-[11px] font-black uppercase tracking-tight mb-2 ${flavour.deep}`}
                >
                  {topicName}
                </div>

                <div className="space-y-[4px]">
                  {vars.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[40px_1fr_70px] gap-x-2 items-center
                        text-sm py-[5px] px-[8px] bg-[#F2E6D8] rounded-lg
                        border border-[#E2CDB8]"
                    >
                      {/* symbol */}
                      <span className="font-bold text-[#2D1A0E]">
                        <InlineMath math={item.symbol} />
                      </span>

                      {/* value */}
                      <span className="text-right font-mono font-bold text-[#2D1A0E] truncate">
                        {item.value}
                      </span>

                      {/* unit */}
                      <span className="text-[10px] text-[#8C6A56] font-serif italic text-right">
                        <InlineMath math={item.unit} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}