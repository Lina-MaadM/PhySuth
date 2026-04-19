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
      
      // หา systemTopic เพื่อเอาไว้ดึงสี flavour
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
      {/* Floating Button: สีน้ำตาลเข้ม (Brown-800) เด่นๆ */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-[#3e2723] text-white font-bold text-lg shadow-2xl z-50 hover:scale-110 transition-transform flex items-center justify-center border-2 border-white/20"
      >
        M{entries.length > 0 ? `(${entries.length})` : ""}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 right-6 w-80 max-h-[420px] overflow-y-auto bg-white rounded-2xl p-5 shadow-2xl border border-gray-100 z-50">
          <div className="flex justify-between items-center mb-4 border-b pb-2">
            <strong className="text-stone-800">Saved Variables</strong>
            <button
              onClick={onClear}
              className="text-red-500 text-xs font-bold hover:underline cursor-pointer"
            >
              Clear All
            </button>
          </div>

          {entries.length === 0 && (
            <div className="opacity-40 text-sm italic py-4 text-center">No values saved</div>
          )}

          {topics.map(topicName => {
            const { vars, systemTopic } = grouped[topicName];
            const flavour = allSweetFlavour[systemTopic] || allSweetFlavour.default;

            return (
              <div key={topicName} className="mb-4">
                {/* Topic: สีตามหัวข้อ (flavour.deep) */}
                <div className={`text-center font-black text-sm mb-2 uppercase tracking-tighter ${flavour.deep}`}>
                  {topicName}
                </div>

                <div className="space-y-1">
                  {vars.map((item, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-[40px_1fr_70px] gap-x-2 items-center text-sm py-1 px-2 bg-stone-50 rounded-lg border border-stone-100"
                    >
                      {/* variable */}
                      <span className="font-bold text-black">
                        <InlineMath math={item.symbol} />
                      </span>

                      {/* value */}
                      <span className="text-right font-mono font-bold text-black truncate">
                        {item.value}
                      </span>

                      {/* unit: */}
                      <span className="opacity-50 font-serif italic text-[10px] text-right">
                        <InlineMath math={item.unit} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}