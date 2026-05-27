import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";

import { ROUTE_PATH } from "./routes";

import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";
import SessionOverview from "./components/SessionOverview";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";
import HistoryAnalyze from "./pages/HistoryAnalyze";
import FormulaMap from "./pages/FormulaMap";

import { formulaIndex, variableIndex } from "./data/physicsData";


// ======================
// App Content
// ======================

function AppContent() {

  // ─── Navigation & Routing ───

  const location = useLocation();
  const navigate = useNavigate();


  // ─── Global State ───

  const [memory, setMemory] = useState({});
  // เก็บ History path
  const [historyState, setHistoryState] = useState({
    list: [],
    pointer: -1
  });

  const [warning, setWarning] = useState({
    show: false,
    message: "",
    type: "info"
  });


  // ─── Navigation Control ───

  // Guard: ป้องกันการเพิ่ม history ซ้ำติดกันกับรายการล่าสุด
  const lastAddedId = useRef(null);

  // Note: อยู่ในสถานะอดีตหรือไม่
  const isNavigatingFromHistory = useRef(false);


  // ======================
  // Memory Management
  // ======================
  // บันทึกค่าตัวแปรลง memory
  function handleSaveMemory(data) {
    setMemory((prev) => ({ ...prev, ...data }));
  }


  // ======================
  // History Management
  // ======================

  // ─── Reset Session ───

  // ล้างทั้ง history และ memory
  function clearAll() {
    setHistoryState({ list: [], pointer: -1 });
    setMemory({});
    setWarning({ show: false, message: "", type: "info" });

    lastAddedId.current = null;
    isNavigatingFromHistory.current = false;
  }

  // ล้างเฉพาะ history
  function clearHistory() {
    setHistoryState({ list: [], pointer: -1 });
    setWarning({ show: false, message: "", type: "info" });

    lastAddedId.current = null;
    isNavigatingFromHistory.current = false;
  }


  // ─── Add History Entry ───

  function addHistory(entry, options = {}) {

    // Guard: หยุดหากไม่มีข้อมูล
    if (!entry) return;

    const newId = entry.id || entry.key;

    // Guard: ต้องมี id สำหรับใช้ติดตาม history
    if (!newId) return;

    // Guard: ไม่เพิ่ม history ซ้ำเมื่อเปิดจากประวัติเดิม
    if (options.fromHistory || location.state?.fromHistory) return;

    // Guard: ป้องกันการเพิ่ม history ระหว่าง navigation จาก history
    if (isNavigatingFromHistory.current) {
      isNavigatingFromHistory.current = false;
      return;
    }

    // Guard: ป้องกันรายการซ้ำติดกัน
    if (lastAddedId.current === newId) return;

    lastAddedId.current = newId;

    setHistoryState(({ list, pointer }) => {

      // History: ตัด timeline หลัง pointer เมื่อเปิดรายการใหม่
      const isInMiddle = pointer >= 0 && pointer < list.length - 1;

      const base = isInMiddle
        ? list.slice(0, pointer + 1)
        : [...list];

      const newEntry = {
        ...entry,
        id: newId,
        key: newId,
        time: Date.now() // Note: time ใช้สำหรับเรียงลำดับและอ้างอิงเวลาที่เปิดข้อมูล
      };

      const next = [...base, newEntry];

      const MAX = 30; // Note: จำนวน history สูงสุด

      // UI: ลบรายการเก่าสุดเมื่อ history เต็ม
      if (next.length > MAX) {

        next.shift();

        setWarning({
          show: true,
          message: "History full: Oldest entry removed.",
          type: "danger"
        });

        setTimeout(() => {
          setWarning((prev) => ({ ...prev, show: false }));
        }, 1000);

      }

      // UI: แจ้งเตือนเมื่อ history ใกล้เต็ม
      else if (next.length > MAX - 3) {

        setWarning({
          show: true,
          message: "History almost full.",
          type: "warning"
        });

        setTimeout(() => {
          setWarning((prev) => ({ ...prev, show: false }));
        }, 1000);

      }

      return {
        list: next,
        pointer: next.length - 1
      };

    });
  }


  // ─── Navigate From History ───

  function handleHistoryClick(entry, index) {

    // Guard: หยุดหากไม่มีข้อมูล
    if (!entry) return;

    isNavigatingFromHistory.current = true;
    lastAddedId.current = entry.id || entry.key;

    setHistoryState((prev) => ({
      ...prev,
      pointer: index
    }));

    const targetId = entry.id || entry.key;

    const basePath =
      entry.page === "variable"
        ? "/variable"
        : "/formula";

    navigate(`${basePath}/${targetId}`, {

      // ใช้ state เพื่อบอกว่าการเปิดครั้งนี้มาจาก history
      state: { fromHistory: true },

      // ใช้ replace เพื่อไม่สร้าง route history ซ้ำ
      replace: true,

    });
  }


  // ======================
  // Warning System
  // ======================

  useEffect(() => {

    // Guard: ไม่สร้าง timer หากไม่มี warning
    if (!warning.show) return;

    const timer = setTimeout(() => {
      setWarning((p) => ({ ...p, show: false }));
    }, 1500);

    return () => clearTimeout(timer);

  }, [warning.show]);


  // ======================
  // Layout
  // ======================

  return (
    <div className="min-h-screen bg-[#F4EBE2] text-[#2D241E] font-sans">

      <Navbar />

      <HistoryAnalyze
        history={historyState.list}
        pointer={historyState.pointer}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClear={clearHistory}
        onClickEntry={handleHistoryClick}
      />

      <VariableMem
        memory={memory}
        onClear={() => setMemory({})}
      />

      <SessionOverview
        history={historyState.list}
        pointer={historyState.pointer}
        memory={memory}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClickEntry={handleHistoryClick}
        onClearAll={clearAll}
      />

      {warning.show && (

        // ─── Warning Popup ───

        <div
          className={`
            fixed top-24 left-1/2 -translate-x-1/2 z-50
            px-4 py-2 rounded-lg shadow-lg border
            flex items-center gap-3

            ${warning.type === "danger"
              ? "bg-red-100 border-red-200 text-red-700"
              : "bg-orange-100 border-orange-200 text-orange-700"
            }
          `}
        >
          <span>
            {warning.type === "danger" ? "ℹ" : "⚠"}
            {" "}
            {warning.message}
          </span>

          <button
            onClick={() =>
              setWarning((p) => ({ ...p, show: false }))
            }
            className="font-bold hover:opacity-70"
          >
            ×
          </button>
        </div>

      )}

      <main className="pt-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-xl border-[#EADFD8] border-2 min-h-[70vh] p-6">

            {/* ─── Route Definitions ─── */}

            <Routes>

              <Route
                path={ROUTE_PATH.HOME}
                element={<FormulaMap />}
              />

              <Route
                path={ROUTE_PATH.CATALOG}
                element={<FormulaCatalog />}
              />

              <Route
                path={ROUTE_PATH.VARIABLES}
                element={<VariableIndex />}
              />

              <Route
                path={ROUTE_PATH.VARIABLE_DETAIL}
                element={
                  <RelationView addHistory={addHistory} />
                }
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