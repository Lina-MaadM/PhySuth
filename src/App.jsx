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
  const handleSaveMemory = (data) => {
    setMemory(prev => ({
      ...prev,
      ...data
    }));
  };

  const clearMemory = () => {
    setMemory({});
  };

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
          <Route path="/variable/:symbol" element={<RelationView />} />

          {/* ส่งต่อข้อมูลตัวแปร */}
          <Route
            path="/formula/:id"
            element={
              <FormulaDetail
                memory={memory}
                onSaveMemory={handleSaveMemory}
          />
  }
/>
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;