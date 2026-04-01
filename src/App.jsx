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
  const [navigationContext, setNavigationContext] = useState(null);

  function handleSaveMemory(data) {
    setMemory((prev) => ({
      ...prev,
      ...data,
    }));
  }

  function clearMemory() {
    setMemory({});
  }

  function clearHistory() {
    setHistory([]);
  }

  function addHistory(entry) {
    setHistory((prev) => {
      if (!entry) return prev;

      let baseHistory = prev;

      if (
        navigationContext?.source === "history" &&
        navigationContext?.fromIndex !== prev.length - 1
      ) {
        baseHistory = prev.slice(0, navigationContext.fromIndex + 1);
      }

      const last = baseHistory[baseHistory.length - 1];

      const sameFormula = entry.id && last?.id === entry.id;
      const sameVariable = entry.key && last?.key === entry.key;

      if (last && last.page === entry.page && (sameFormula || sameVariable)) {
        return baseHistory;
      }

      const repeated = baseHistory.some(
        (h) =>
          h.page === entry.page &&
          ((entry.id && h.id === entry.id) ||
            (entry.key && h.key === entry.key))
      );

      const newEntry = {
        ...entry,
        repeat: repeated,
        time: Date.now(),
      };

      const newHistory = [...baseHistory, newEntry];

      const MAX = 20;

      if (newHistory.length > MAX) {
        newHistory.shift();
      }

      return newHistory;
    });

    setNavigationContext(null);
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FFF8F0]">

        <Navbar />

        <HistoryAnalyze
          history={history}
          formulaIndex={formulaIndex}
          variableIndex={variableIndex}
          setNavigationContext={setNavigationContext}
          onClear={() => {
            clearMemory();
            clearHistory();
          }}
        />

        <VariableMem memory={memory} onClear={clearMemory} />

        <main className="pt-24 px-6">
          <div className="max-w-6xl mx-auto">

            <div className="bg-white rounded-xl shadow-sm min-h-[70vh] p-6">
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

          </div>
        </main>

      </div>
    </BrowserRouter>
  );
}

export default App;