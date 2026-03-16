import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";
import HistoryBar from "./components/HistoryBar";
import { formulaIndex } from "./data/physicsData";

function App() {

  const [memory, setMemory] = useState({});
  const [history, setHistory] = useState([]);

  const handleSaveMemory = (data) => {
    setMemory(prev => ({
      ...prev,
      ...data
    }));
  };

  const clearMemory = () => {
    setMemory({});
  };

  function clearHistory() {
    setHistory([]);
  }

  function addHistory(entry) {
    setHistory(prev => {

      // ป้องกัน entry ว่าง
      if (!entry) return prev;

      const last = prev[prev.length - 1];

      const sameFormula =
        entry.id && last?.id === entry.id;

      const sameVariable =
        entry.symbol && last?.symbol === entry.symbol;

      // กัน A → A
      if (last && last.page === entry.page && (sameFormula || sameVariable)) {
        return prev;
      }

      // ตรวจว่าซ้ำใน history หรือไม่
      const repeated = prev.some(
        (h) =>
          h.page === entry.page &&
          (
            (entry.id && h.id === entry.id) ||
            (entry.symbol && h.symbol === entry.symbol)
          )
      );

      const newEntry = {
        ...entry,
        repeat: repeated
      };

      const newHistory = [...prev, newEntry];

      const MAX = 8;

      if (newHistory.length > MAX) {
        newHistory.shift();
      }

      return newHistory;
    });
  }

  return (
    <BrowserRouter>
      <Navbar />

      <HistoryBar 
        history={history}
        formulaIndex={formulaIndex}
        onClear={() => {
          clearMemory();
          clearHistory();
        }} />

      <VariableMem memory={memory} onClear={clearMemory} />

      <div className="pt-24 px-6">
        <Routes>

          {/* หน้าเริ่มต้น */}
          <Route path="/" element={<FormulaCatalog />} />

          {/* หน้า Variable */}
          <Route path="/variables" element={<VariableIndex />} />

          {/* หน้า RelationView */}
          <Route
            path="/variable/:symbol"
            element={<RelationView addHistory={addHistory} />}
          />

          {/* หน้า FormulaDetail */}
          <Route
            path="/formula/:id"
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