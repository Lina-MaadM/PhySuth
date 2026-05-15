import { useMemo } from "react";
import HistoryBar from "../components/HistoryBar";

function HistoryAnalyze({
  history,
  pointer,
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
      let systemTopic = null;
      let symbols = [];
      let variableKeys = [];

      // 1. ดึงข้อมูลจาก Index (สูตร หรือ ตัวแปร)

      if (entry.id && formulaIndex[entry.id]) {
        const f = formulaIndex[entry.id];
        topic = f.topic;
        subtopic = f.subtopic;
        systemTopic = f.systemTopic;
        variableKeys = f.variable || [];
        symbols = variableKeys.map(keyToSymbol);
      }

      if (entry.key && variableIndex[entry.key]) {
        const v = variableIndex[entry.key];
        topic = v.topic;
        subtopic = v.subtopic;
        systemTopic = v.systemTopic;
        variableKeys = [entry.key];
        symbols = [v.symbol];
      }

      // 2. ดึงข้อมูล entry ก่อนหน้า
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

      // 3. วิเคราะห์สถานะระดับ entry
      const prevBases = prevVariableKeys.map(getBaseKey);
      const currentBases = variableKeys.map(getBaseKey);
      const hasConnection = prev
        ? currentBases.some((b) => prevBases.includes(b))
        : false;

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

      // 4. classify แต่ละ symbol เพื่อใช้แสดงสีใน popup
      // "shared"      — key ตรงกันทั้งหมด (same topic)
      // "cross-topic" — base symbol เหมือนกัน แต่คนละ topic
      // "new"         — ไม่มีใน entry ก่อนหน้าเลย
      // null          — entry แรก ไม่มีตัวเปรียบ
      
      const symbolRelations = variableKeys.map((key) => {
        if (!prev) return null;
        if (disconnected) return "new";

        const base = getBaseKey(key);

        // key ตรงกันทุกอย่าง (topic เดียวกัน)
        if (prevVariableKeys.includes(key)) return "shared";

        // base symbol เหมือนกันแต่ key ต่างกัน = คนละ topic
        if (prevBases.includes(base)) return "cross-topic";

        return "new";
      });

      const uniqueKey = entry.id || entry.key;
      const repeat = seen.has(uniqueKey);
      seen.add(uniqueKey);

      const isMatchUrl =
        currentEntry &&
        ((currentEntry.id && currentEntry.id === entry.id) ||
          (currentEntry.key && currentEntry.key === entry.key));

      return {
        ...entry,
        id: entry.id || entry.key,
        key: entry.id || entry.key,
        topic,
        subtopic,
        systemTopic,
        symbols,
        symbolRelations, // index ตรงกับ symbols[]
        crossTopic,
        disconnected,
        repeat,
        isMatchUrl,
        isLatest: i === history.length - 1,
        label: entry.label || symbols[0] || "?",
        onClick: () => onClickEntry?.(entry, i),
      };
    });
  }, [history, formulaIndex, variableIndex, currentEntry, latestEntry, onClickEntry]);

  return (
    <HistoryBar
      history={analyzedHistory}
      activePointer={pointer}
      onClear={onClear}
    />
  );
}

export default HistoryAnalyze;