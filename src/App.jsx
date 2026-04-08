import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

import { ROUTE_PATH } from "./routes";
import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";
import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";
import HistoryAnalyze from "./pages/HistoryAnalyze";

import { formulaIndex, variableIndex } from "./data/physicsData";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // --- States ---
  const [memory, setMemory] = useState({});
  const [history, setHistory] = useState([]);
  const [pointer, setPointer] = useState(-1);
  const [warning, setWarning] = useState({ show: false, message: "", type: "info" });

  // --- Refs ---
  const lastAddedId = useRef(null);

  // --- Logic Functions ---
  function handleSaveMemory(data) {
    setMemory((prev) => ({ ...prev, ...data }));
  }

  function clearHistory() {
    setHistory([]);
    setPointer(-1);
    setWarning({ show: false, message: "", type: "info" });
    lastAddedId.current = null;
  }

  // =========================================================
  // 🔥 [CORE ENGINE] Logic การบันทึกประวัติ
  // =========================================================
  function addHistory(entry, options = {}) {
    if (!entry) return;

    const newId = entry.id || entry.key;
    if (!newId) return;

    // ถ้ามาจาก HistoryBar หรือ State ระบุว่ามาจาก History → ไม่เพิ่ม entry ใหม่
    if (options.fromHistory || location.state?.fromHistory) return;

    setHistory((prevList) => {
      // 1. ถ้า entry นี้เหมือนตัวล่าสุดที่เพิ่งเพิ่ม (ป้องกัน Re-render เบิ้ล)
      if (lastAddedId.current === newId) return prevList;

      // 2. ตัด "อนาคต" ทิ้งถ้ามีการขยับจากตำแหน่งกลาง Timeline (Branching)
      let updatedList = pointer >= 0 
        ? prevList.slice(0, pointer + 1) 
        : [...prevList];

      // 3. เพิ่ม Entry ใหม่
      const newEntry = { 
        ...entry, 
        id: newId, 
        key: newId, 
        time: Date.now() 
      };
      
      updatedList.push(newEntry);

      // 4. จำกัดประวัติไม่เกิน 20 รายการ
      if (updatedList.length > 20) {
        updatedList.shift();
      }

      // 5. Sync Pointer และ Ref
      setPointer(updatedList.length - 1);
      lastAddedId.current = newId;

      return updatedList;
    });
  }

  // =========================================================
  // 🖱️ [NAVIGATION] คลิกจาก HistoryBar
  // =========================================================
  const handleHistoryClick = (entry, index) => {
    if (!entry) return;

    setPointer(index);
    lastAddedId.current = entry.id || entry.key; // อัปเดตเพื่อให้ addHistory รู้ว่าอยู่ที่ตัวนี้แล้ว

    const targetId = entry.id || entry.key;
    const basePath = entry.page?.includes("variable") ? "/variable" : "/formula";

    navigate(`${basePath}/${targetId}`, { 
      state: { fromHistory: true }, 
      replace: true 
    });
  };

  // --- Warning Auto-hide ---
  useEffect(() => {
    if (!warning.show) return;

    const timer = setTimeout(() => {
      setWarning((p) => ({ ...p, show: false }));
    }, 1500);

    return () => clearTimeout(timer);
  }, [warning.show]);

  // --- Render ---
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      <HistoryAnalyze
        history={history}
        pointer={pointer}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClear={clearHistory}
        onClickEntry={handleHistoryClick}
      />

      <VariableMem memory={memory} onClear={() => setMemory({})} />

      {/* Warning Toast */}
      {warning.show && (
        <div 
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg border flex items-center gap-3 
            ${warning.type === "danger" 
              ? "bg-red-100 border-red-200 text-red-700" 
              : "bg-orange-100 border-orange-200 text-orange-700"
            }`}
        >
          <span>{warning.type === "danger" ? "ℹ" : "⚠"} {warning.message}</span>
          <button 
            onClick={() => setWarning((p) => ({ ...p, show: false }))} 
            className="font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>
      )}

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
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}