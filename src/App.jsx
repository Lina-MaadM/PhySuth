import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <div className="pt-24 px-6">
        <Routes>
          {/* หน้าเริ่มต้น */}
          <Route path="/" element={<FormulaCatalog />} />

          {/* หน้า Variable */}
          <Route path="/variables" element={<VariableIndex />} />

          {/* หน้า FormulaDetail */}
          <Route path="/formula/:id" element={<FormulaDetail/>}/>

          {/* หน้า RelationView */}
          <Route path="/variable/:symbol" element={<RelationView />} />

        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;