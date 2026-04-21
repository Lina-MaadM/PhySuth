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
import SessionOverview from "./components/SessionOverview";
import FormulaMap from "./pages/FormulaMap";

import { formulaIndex, variableIndex } from "./data/physicsData";

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [memory, setMemory] = useState({});
  const [historyState, setHistoryState] = useState({ list: [], pointer: -1 });
  const [warning, setWarning] = useState({ show: false, message: "", type: "info" });

  const lastAddedId = useRef(null);
  // แยก ref สำหรับบอกว่ากำลัง navigate จาก Bar
  // ป้องกันหน้าปลายทาง re-render แล้วเรียก addHistory แล้วขยับ pointer โดยไม่ตั้งใจ
  const isNavigatingFromHistory = useRef(false);

  function handleSaveMemory(data) {
    setMemory((prev) => ({ ...prev, ...data }));
  }

  function clearHistory() {
    setHistoryState({ list: [], pointer: -1 });
    setWarning({ show: false, message: "", type: "info" });
    lastAddedId.current = null;
    isNavigatingFromHistory.current = false;
  }

  // =========================================================
  // [CORE ENGINE] Logic การบันทึกประวัติ
  // =========================================================
  function addHistory(entry, options = {}) {
    if (!entry) return;

    const newId = entry.id || entry.key;
    if (!newId) return;

    // กรณีที่ 1: มาจาก location.state (เช่น FormulaDetail อ่าน fromHistory จาก state)
    if (options.fromHistory || location.state?.fromHistory) return;

    // กรณีที่ 2: กำลัง navigate จาก HistoryBar อยู่
    // หน้าปลายทางจะ re-render แล้วเรียก addHistory — ให้หยุดครั้งแรกแล้วเปิด flag คืน
    if (isNavigatingFromHistory.current) {
      isNavigatingFromHistory.current = false;
      return;
    }

    // กรณีที่ 3: entry เดิมกับที่เพิ่งเพิ่ม (ป้องกัน re-render เบิ้ล)
    if (lastAddedId.current === newId) return;
    lastAddedId.current = newId;

    setHistoryState(({ list, pointer }) => {
      // slice เกิดเฉพาะตอนนี้ เมื่อมี entry ใหม่เข้ามาจริงๆ
      // และ pointer อยู่กลาง timeline (ไม่ได้อยู่ท้ายสุด)
      const isInMiddle = pointer >= 0 && pointer < list.length - 1;
      const base = isInMiddle ? list.slice(0, pointer + 1) : [...list];

      const newEntry = { ...entry, id: newId, key: newId, time: Date.now() };
      const next = [...base, newEntry];

      const MAX = 30;

      if (next.length > MAX) {
        next.shift();

        setWarning({
          show: true,
          message: "History full: Oldest entry removed.",
          type: "danger",
        });

        setTimeout(() => {
          setWarning((prev) => ({ ...prev, show: false }));
        }, 1000);
      }

      else if (next.length > MAX - 3) {
        setWarning({
          show: true,
          message: "History almost full.",
          type: "warning",
        });

        setTimeout(() => {
          setWarning((prev) => ({ ...prev, show: false }));
        }, 1000);
      }

      return { list: next, pointer: next.length - 1 };
    });
  }

  // =========================================================
  // [NAVIGATION] คลิกจาก HistoryBar
  // =========================================================
  function handleHistoryClick(entry, index) {
    if (!entry) return;

    // เปิด flag ก่อน navigate เพื่อกัน addHistory จากหน้าปลายทาง
    isNavigatingFromHistory.current = true;
    lastAddedId.current = entry.id || entry.key;

    // set pointer ตรงๆ ไม่ต้องแตะ list
    setHistoryState((prev) => ({ ...prev, pointer: index }));

    const targetId = entry.id || entry.key;
    const basePath = entry.page === "variable" ? "/variable" : "/formula";

    navigate(`${basePath}/${targetId}`, {
      state: { fromHistory: true },
      replace: true,
    });
  }

  // Warning Auto-hide
  useEffect(() => {
    if (!warning.show) return;
    const timer = setTimeout(() => {
      setWarning((p) => ({ ...p, show: false }));
    }, 1500);
    return () => clearTimeout(timer);
  }, [warning.show]);

  return (
    <div className="min-h-screen bg-[#F4EBE2]  text-[#2D241E] font-sans">
      <Navbar />

      <HistoryAnalyze
        history={historyState.list}
        pointer={historyState.pointer}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClear={clearHistory}
        onClickEntry={handleHistoryClick}
      />

      <VariableMem memory={memory} onClear={() => setMemory({})} />

      <SessionOverview
        history={historyState.list}
        pointer={historyState.pointer}
        memory={memory}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClickEntry={handleHistoryClick}
      />

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

      {/* MAIN CONTENT SECTION: ส่วนพื้นที่เนื้อหาหลัก */}
      <main className="pt-24 px-6">

        {/* CONTAINER LIMITER: ส่วนควบคุมความกว้างสูงสุดของเนื้อหาให้สมดุลกับสายตา */}
        <div className="max-w-5xl mx-auto">
          {/* PAGE CARD: แผ่นพื้นหลังสำหรับแสดงเนื้อหาจาก Routes */}
          <div className="bg-white rounded-xl border-[#EADFD8] border-2 min-h-[70vh] p-6">
            <Routes>
              <Route path={ROUTE_PATH.HOME}    element={<FormulaMap />} />
              <Route path={ROUTE_PATH.CATALOG} element={<FormulaCatalog />} />
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