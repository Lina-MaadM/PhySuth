import { useMemo } from "react";
import HistoryBar from "../components/HistoryBar";

function HistoryAnalyze({
  history,
  formulaIndex,
  variableIndex,
  onClear
}) {

  const analyzedHistory = useMemo(() => {

    if (!history || history.length === 0) return [];

    const seen = new Set();

    // helper: แปลง key -> symbol
    const keyToSymbol = (key) => {
      return variableIndex[key]?.symbol || key;
    };

    return history.map((entry, i) => {

      const prev = history[i - 1];

      let topic = null;
      let subtopic = null;
      let symbols = [];

      // --------------------
      // CURRENT ENTRY
      // --------------------

      if (entry.id && formulaIndex[entry.id]) {
        const f = formulaIndex[entry.id];
        topic = f.topic;
        subtopic = f.subtopic;

        symbols = (f.variable || []).map(keyToSymbol);
      }

      if (entry.key && variableIndex[entry.key]) {
        const v = variableIndex[entry.key];
        topic = v.topic;
        subtopic = v.subtopic;

        symbols = [v.symbol];
      }

      // --------------------
      // PREVIOUS ENTRY
      // --------------------

      let prevTopic = null;
      let prevSymbols = [];

      if (prev) {

        if (prev.id && formulaIndex[prev.id]) {
          const pf = formulaIndex[prev.id];
          prevTopic = pf.topic;

          prevSymbols = (pf.variable || []).map(keyToSymbol);
        }

        if (prev.key && variableIndex[prev.key]) {
          const pv = variableIndex[prev.key];
          prevTopic = pv.topic;

          prevSymbols = [pv.symbol];
        }

      }

      // --------------------
      // ANALYZE CONNECTION
      // --------------------

      let sharedSymbol = false;

      if (prev) {
        sharedSymbol = symbols.some(s =>
          prevSymbols.includes(s)
        );
      }

      let crossTopic = false;
      let disconnected = false;

      if (prev) {
        crossTopic =
          sharedSymbol &&
          prevTopic &&
          topic &&
          prevTopic !== topic;

        disconnected = !sharedSymbol;
      }

      // --------------------
      // REPEAT
      // --------------------

      const uniqueKey = entry.id || entry.key;
      let repeat = false;

      if (seen.has(uniqueKey)) {
        repeat = true;
      }

      seen.add(uniqueKey);

      return {
        ...entry,
        topic,
        subtopic,
        symbols,
        crossTopic,
        disconnected,
        repeat
      };

    });

  }, [history, formulaIndex, variableIndex]);

  return (
    <HistoryBar
      history={analyzedHistory}
      onClear={onClear}
    />
  );
}

export default HistoryAnalyze;