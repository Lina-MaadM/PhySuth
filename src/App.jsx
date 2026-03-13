import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState } from "react";

import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";

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

  function addHistory(entry) {
  setHistory(prev => {

    const last = prev[prev.length - 1];

    // กันเพิ่มซ้ำ
    if (
      last &&
      last.type === entry.type &&
      (
        (entry.id && last.id === entry.id) ||
        (entry.symbol && last.symbol === entry.symbol)
      )
    ) {
      return prev;
    }

    const newHistory = [...prev, entry];

    // จำกัดจำนวน history
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
      <VariableMem memory={memory} onClear={clearMemory} />

      <div className="pt-24 px-6">
        <Routes>
          {/* หน้าเริ่มต้น */}
          <Route path="/" element={<FormulaCatalog />} />

          {/* หน้า Variable */}
          <Route path="/variables" element={<VariableIndex />} />

          {/* หน้า RelationView */}
          <Route path="/variable/:symbol" 
          element={<RelationView addHistory={addHistory}/>} />

          {/* ส่งต่อข้อมูลตัวแปร */}
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

