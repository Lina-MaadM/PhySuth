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

      // 2. ตรวจสอบประวัติก่อนหน้าเพื่อวิเคราะห์ความเชื่อมโยง
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

      // 3. วิเคราะห์สถานะ (Connection / Topic / Repeat)
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

      const uniqueKey = entry.id || entry.key;
      const repeat = seen.has(uniqueKey); 
      seen.add(uniqueKey);

      const isMatchUrl =
        currentEntry &&
        ((currentEntry.id && currentEntry.id === entry.id) ||
          (currentEntry.key && currentEntry.key === entry.key));

      // 4. Return Object ที่สมบูรณ์พร้อมส่งให้ HistoryBar
      return {
        ...entry,
        id: entry.id || entry.key,
        key: entry.id || entry.key,
        topic,
        subtopic,
        systemTopic,
        symbols,
        crossTopic,
        disconnected,
        repeat,
        isMatchUrl,
        isLatest: i === history.length - 1,
        label: entry.label || symbols[0] || "?", 
        // 🔥 จุดที่แก้: ส่งค่า i (index) กลับไปที่ handleHistoryClick ใน App.js
        onClick: () => onClickEntry?.(entry, i), 
      };
    });
  }, [history, formulaIndex, variableIndex, currentEntry, latestEntry, onClickEntry]);

  // ส่งข้อมูลที่วิเคราะห์แล้วไปแสดงผลที่ HistoryBar
  return <HistoryBar 
  history={analyzedHistory}
  activePointer={pointer}
  onClear={onClear} />;
}

export default HistoryAnalyze;