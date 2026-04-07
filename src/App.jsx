import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useState, useEffect, useMemo } from "react";
import { ROUTE_PATH, routeBuilder } from "./routes";

import Navbar from "./components/Navbar";
import VariableMem from "./components/VariableMem";

import FormulaCatalog from "./pages/FormulaCatalog";
import VariableIndex from "./pages/VariableIndex";
import FormulaDetail from "./pages/FormulaDetail";
import RelationView from "./pages/RelationView";
import HistoryAnalyze from "./pages/HistoryAnalyze";

import { formulaIndex, variableIndex } from "./data/physicsData";

// =========================
// 🔥 CORE APP
// =========================
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  const [memory, setMemory] = useState({});
  const [history, setHistory] = useState([]);

  const [warning, setWarning] = useState({
    show: false,
    message: "",
    type: "info",
  });

  const [isInPast, setIsInPast] = useState(false);

  // =========================
  // 🔹 MEMORY & CLEAR
  // =========================
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
    setWarning({ show: false, message: "" });
    setIsInPast(false);
  }

  // =========================
  // 🔥 CURRENT ENTRY FROM URL
  // =========================
  const currentEntry = useMemo(() => {
    const path = location.pathname;
    const lastPart = path.split("/").pop();

    if (!lastPart || path === "/") return null;

    if (path.includes("/formula/")) {
      return { page: "formula", id: lastPart };
    }

    if (path.includes("/variable/")) {
      return { page: "variable", id: lastPart };
    }

    return null;
  }, [location.pathname]);

  // =========================
  // 🔹 HELPERS
  // =========================
  const isSameEntry = (a, b) => {
    if (!a || !b) return false;

    const idA = a.id || a.key;
    const idB = b.id || b.key;

    return a.page === b.page && idA === idB;
  };

  // =========================
  // 🔥 HISTORY ENGINE
  // =========================
  const processHistory = (prev, entry) => {
    if (!entry) return { history: prev, changed: false };

    // 🛑 กดจาก HistoryBar → ห้ามเพิ่ม
    if (location.state?.fromHistory) {
      return { history: prev, changed: false };
    }

    let list = [...prev];
    const last = list[list.length - 1];

    // ❌ กัน A → A
    if (last && isSameEntry(last, entry)) {
      return { history: prev, changed: false };
    }

    // 🔥 ตัดอนาคตเมื่ออยู่ในอดีต
    if (isInPast) {
      const currentIndex = list.findIndex((h) =>
        isSameEntry(h, currentEntry)
      );

      if (currentIndex !== -1) {
        list = list.slice(0, currentIndex + 1);
      }

      setIsInPast(false);
    }

    // ✅ push ใหม่
    list.push({
      ...entry,
      time: Date.now(),
    });

    // =========================
    // limit + warning
    // =========================
    const MAX = 20;
    const THRESHOLD = MAX - 3;

    let resultWarning = { show: false };

    if (list.length > MAX) {
      list.shift();

      resultWarning = {
        show: true,
        message: "History full: Overwriting the oldest entry.",
        type: "danger",
      };
    } else if (list.length >= THRESHOLD) {
      const remaining = MAX - list.length;

      resultWarning = {
        show: true,
        message:
          remaining === 0
            ? "Last history slot reached."
            : `History almost full: ${remaining} slot remain`,
        type: "warning",
      };
    }

    return {
      history: list,
      changed: true,
      warning: resultWarning,
    };
  };

  // =========================
  // 🔥 MAIN API
  // =========================
  function addHistory(entry) {
    if (location.state?.fromHistory) return;

    setHistory((prev) => {
      const result = processHistory(prev, entry);

      if (result.warning?.show) {
        setWarning((prevWarn) => ({
          ...prevWarn,
          ...result.warning,
        }));
      }

      return result.history;
    });
  }

  // =========================
  // 🔹 MATCH CURRENT ENTRY
  // =========================
  const currentEntryFromHistory = useMemo(() => {
    if (!history.length || !currentEntry) return null;

    return history.find((h) =>
      isSameEntry(h, currentEntry)
    );
  }, [history, currentEntry]);

  const latestEntry = history[history.length - 1] || null;

  // =========================
  // 🔹 NAVIGATE FROM HISTORY
  // =========================
  const handleHistoryClick = (entry, isLatest) => {
    if (!entry) return;

    const targetId = entry.id || entry.key;
    if (!targetId) return;

    if (entry.page === "formulaHistory") {
      navigate(`/formula/${targetId}`, {
        state: { fromHistory: true },
      });
    } else if (entry.page === "variableHistory") {
      navigate(`/variable/${targetId}`, {
        state: { fromHistory: true },
      });
    }

    setIsInPast(!isLatest);
  };

  // =========================
  // AUTO HIDE WARNING
  // =========================
  useEffect(() => {
    if (!warning.show) return;

    const timer = setTimeout(() => {
      setWarning((prev) => ({
        ...prev,
        show: false,
      }));
    }, 1500);

    return () => clearTimeout(timer);
  }, [warning.show]);

  // =========================
  // 🎨 UI
  // =========================
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Navbar />

      <HistoryAnalyze
        history={history}
        currentEntry={currentEntryFromHistory}
        latestEntry={latestEntry}
        formulaIndex={formulaIndex}
        variableIndex={variableIndex}
        onClear={clearHistory}
        onClickEntry={handleHistoryClick}
      />

      <VariableMem
        memory={memory}
        onClear={clearMemory}
      />

      {warning.show && (
        <div
          className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg border flex items-center gap-3 ${
            warning.type === "danger"
              ? "bg-red-100 border-red-200 text-red-700"
              : "bg-orange-100 border-orange-200 text-orange-700"
          }`}
        >
          <span>
            {warning.type === "danger" ? "ℹ" : "⚠"}{" "}
            {warning.message}
          </span>

          <button
            onClick={() =>
              setWarning((prev) => ({
                ...prev,
                show: false,
              }))
            }
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
              <Route
                path={ROUTE_PATH.HOME}
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

// =========================
// 🚀 ROOT
// =========================
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;