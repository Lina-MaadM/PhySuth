import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { ROUTE_PATH } from "./routes";

import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";
import HistoryAnalyze from "./pages/HistoryAnalyze";

import { formulaIndex, variableIndex } from "./data/physicsData";

function App() {

  const [memory, setMemory] = useState({});
  const [history, setHistory] = useState([]);

  function handleSaveMemory(data) {
    setMemory(prev => ({
      ...prev,
      ...data
    }));
  }

  function clearMemory() {
    setMemory({});
  }

  function clearHistory() {
    setHistory([]);
  }

  function addHistory(entry) {
    setHistory(prev => {

      if (!entry) return prev;

      const last = prev[prev.length - 1];

      const sameFormula =
        entry.id && last?.id === entry.id;

      const sameVariable =
        entry.key && last?.key === entry.key;

      // กัน A → A
      if (
        last &&
        last.page === entry.page &&
        (sameFormula || sameVariable)
      ) {
        return prev;
      }

      const repeated = prev.some(
        (h) =>
          h.page === entry.page &&
          (
            (entry.id && h.id === entry.id) ||
            (entry.key && h.key === entry.key)
          )
      );

      const newEntry = {
        ...entry,
        repeat: repeated,
        time: Date.now()
      };

      const newHistory = [...prev, newEntry];

      const MAX = 20;

      if (newHistory.length > MAX) {
        newHistory.shift();
      }

      return newHistory;
    });
  }

  return (
    <BrowserRouter>
      <Navbar />

      <HistoryAnalyze
        history={history}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClear={() => {
          clearMemory();
          clearHistory();
        }}
      />

      <VariableMem memory={memory} onClear={clearMemory} />

        <div className="pt-24 px-6">
          <Routes>

            <Route path={ROUTE_PATH.HOME} element={<FormulaCatalog />} />

            <Route path={ROUTE_PATH.VARIABLES} element={<VariableIndex />} />

            <Route
              path={ROUTE_PATH.VARIABLE_DETAIL}
              element={<RelationView addHistory={addHistory} />}
            />

            <Route
              path={ROUTE_PATH.FORMULA_DETAIL}
              element={
                <FormulaDetail
                  memory={memory}
                  onSaveMemory={handleSaveMemory}
                  addHistory={addHistory}
                />
              }
            />

          </Routes>
        </div>
    </BrowserRouter>
  );
}

export default App;