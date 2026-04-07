import { useMemo } from "react";
import HistoryBar from "../components/HistoryBar";

function HistoryAnalyze({
  history,
  formulaIndex,
  variableIndex,
  onClear,
  currentEntry,
  latestEntry,
  onClickEntry,
}) {
  const analyzedHistory = useMemo(() => {
    if (!history || history.length === 0) return [];

    const seen = new Set();
    const keyToSymbol = (key) => variableIndex[key]?.symbol || key;
    const getBaseKey = (key) => key?.split("_")[0] || "";

    return history.map((entry, i) => {
      const prev = history[i - 1];
      let topic = null;
      let subtopic = null;
      let symbols = [];
      let variableKeys = [];

      if (entry.id && formulaIndex[entry.id]) {
        const f = formulaIndex[entry.id];
        topic = f.topic;
        subtopic = f.subtopic;
        variableKeys = f.variable || [];
        symbols = variableKeys.map(keyToSymbol);
      }

      if (entry.key && variableIndex[entry.key]) {
        const v = variableIndex[entry.key];
        topic = v.topic;
        subtopic = v.subtopic;
        variableKeys = [entry.key];
        symbols = [v.symbol];
      }

      let prevTopic = null;
      let prevVariableKeys = [];
      if (prev) {
        if (prev.id && formulaIndex[prev.id]) {
          const pf = formulaIndex[prev.id];
          prevTopic = pf.topic;
          prevVariableKeys = pf.variable || [];
        }
        if (prev.key && variableIndex[prev.key]) {
          const pv = variableIndex[prev.key];
          prevTopic = pv.topic;
          prevVariableKeys = [prev.key];
        }
      }

      let hasConnection = false;
      if (prev) {
        const currentBases = variableKeys.map(getBaseKey);
        const prevBases = prevVariableKeys.map(getBaseKey);
        hasConnection = currentBases.some((b) => prevBases.includes(b));
      }

      const sameTopic = prev && prevTopic && topic ? prevTopic === topic : false;
      let crossTopic = false;
      let disconnected = false;

      if (prev) {
        if (!hasConnection) {
          disconnected = true;
        } else if (!sameTopic) {
          crossTopic = true;
        }
      }

      // ✅ แก้ไข: REPEAT ให้ทำงานได้ทุกตัวที่เคยปรากฏมาแล้ว
      const uniqueKey = entry.id || entry.key;
      const repeat = seen.has(uniqueKey); 
      seen.add(uniqueKey);

      // ✅ แก้ไข: เช็กแค่ว่า ID ตรงกับ URL หรือไม่ (ยังไม่ระบุว่าเป็น Active Index)
      const isMatchUrl =
        currentEntry &&
        ((currentEntry.id && currentEntry.id === entry.id) ||
          (currentEntry.key && currentEntry.key === entry.key));


            return {
              ...entry,
              id: entry.id || entry.key,   // บังคับให้มี id
              key: entry.id || entry.key,  // บังคับให้มี key (เพื่อความชัวร์ของหน้า Detail)
              topic,
              subtopic,
              symbols,
              crossTopic,
              disconnected,
              repeat,
              isMatchUrl,
              isLatest: i === history.length - 1,
              label: entry.label || symbols[0] || "?", 
              // 🔥 จุดสำคัญ: ต้องมั่นใจว่า onClick นี้ถูกส่งทอดไปยัง HistoryBar
              onClick: () => onClickEntry?.(entry, i === history.length - 1),
            };
          });
        }, [history, formulaIndex, variableIndex, currentEntry, latestEntry, onClickEntry]);

  // ✅ ตรงนี้สำคัญมาก: HistoryBar ต้องได้รับ analyzedHistory ที่มี onClick อยู่ข้างใน
  return <HistoryBar history={analyzedHistory} onClear={onClear} />;

}

export default HistoryAnalyze;