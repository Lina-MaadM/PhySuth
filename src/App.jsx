import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
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
  
  // เพิ่ม State สำหรับจัดการการแจ้งเตือน
  const [warning, setWarning] = useState({ show: false, message: "", type: "info" });

  function handleSaveMemory(data) {
    setMemory((prev) => ({ ...prev, ...data }));
  }

  function clearMemory() {
    setMemory({});
  }

  function clearHistory() {
    setHistory([]);
    setWarning({ show: false, message: "" });
  }

  function addHistory(entry) {
    setHistory((prev) => {
      if (!entry) return prev;

      let baseHistory = prev;
      const isFromHistory =
        navigationContext?.source === "history" &&
        navigationContext?.fromIndex !== undefined;

      // ✅ STEP 1: ถ้าเป็น "ตัวถัดไป" → แค่เลื่อน
      if (isFromHistory) {
        const nextIndex = navigationContext.fromIndex + 1;
        const nextItem = prev[nextIndex];
        const sameAsNext =
          nextItem &&
          nextItem.page === entry.page &&
          ((entry.id && nextItem.id === entry.id) ||
            (entry.key && nextItem.key === entry.key));

        if (sameAsNext) {
          setNavigationContext({
            source: "history",
            fromIndex: nextIndex
          });
          return prev;
        }
      }

      // ✅ STEP 2: ถ้ามาจากอดีต ห้ามตัดอนาคตทิ้ง (ตามความตั้งใจของคุณ)
      if (isFromHistory) {
        baseHistory = prev;
      } else {
        const lastIndex = prev.length - 1;
        if (
          navigationContext?.fromIndex !== undefined &&
          navigationContext.fromIndex < lastIndex
        ) {
          baseHistory = prev.slice(0, navigationContext.fromIndex + 1);
        }
      }

      const last = baseHistory[baseHistory.length - 1];
      const sameFormula = entry.id && last?.id === entry.id;
      const sameVariable = entry.key && last?.key === entry.key;

      // กันกดซ้ำ
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
      const THRESHOLD = MAX - 3; // เริ่มเตือนเมื่อเหลืออีก 3 ช่อง

      // Logic แจ้งเตือนล่วงหน้าแบบ Countdown
      if (newHistory.length > MAX) {
        newHistory.shift(); // ลบอันเก่าสุดออก (FIFO)
        setWarning({ 
          show: true, 
          message: "History full: Overwriting the oldest entry.", 
          type: "danger" 
        });
      } else if (newHistory.length >= THRESHOLD) {
        const remaining = MAX - newHistory.length;
        setWarning({ 
          show: true, 
          message: remaining === 0 
            ? "Last history slot reached." 
            : `History almost full: ${remaining} slot remain`,
          type: "warning" 
        });
      } else {
        if (warning.show) setWarning({ ...warning, show: false });
      }

      return newHistory;
    });
  }

  // ตัวช่วยปิดแจ้งเตือนอัตโนมัติ (เลือกใช้ได้)
    useEffect(() => {
      if (!warning.show) return;

      const timer = setTimeout(() => {
        setWarning(prev => ({ ...prev, show: false }));
      }, 1500); 

      return () => clearTimeout(timer);
    }, [warning.show]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FFF8F0]">
        <Navbar />

        <HistoryAnalyze
          history={history}
          formulaIndex={formulaIndex}
          variableIndex={variableIndex}
          setNavigationContext={setNavigationContext}
          navigationContext={navigationContext}
          onClear={() => {
            clearMemory();
            clearHistory();
          }}
        />

        <VariableMem memory={memory} onClear={clearMemory} />

        {/* UI ส่วนแจ้งเตือน */}
        {warning.show && (
          <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg border transition-all flex items-center gap-3
            ${warning.type === 'danger' ? 'bg-red-100 border-red-200 text-red-700' : 'bg-orange-100 border-orange-200 text-orange-700'}`}>
            <span>{warning.type === 'danger' ? 'ℹ' : '⚠'} {warning.message}</span>
            <button onClick={() => setWarning({ ...warning, show: false })} className="font-bold hover:opacity-70">×</button>
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
    </BrowserRouter>
  );
}

export default App;