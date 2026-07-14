import { useMemo } from "react";
import HistoryBar from "../components/HistoryBar";
import { analyzeHistory } from "../utils/historyAnalysis";

function HistoryAnalyze({
  history,
  pointer,
  formulaIndex,
  variableIndex,
  onClear,
  currentEntry,
  onClickEntry,
}) {
  const analyzedHistory = useMemo(
    () =>
      analyzeHistory(history, {
        formulaIndex,
        variableIndex,
        currentEntry,
        onClickEntry,
      }),
    [history, formulaIndex, variableIndex, currentEntry, onClickEntry]
  );

  return (
    <HistoryBar
      history={analyzedHistory}
      activePointer={pointer}
      onClear={onClear}
    />
  );
}

export default HistoryAnalyze;
