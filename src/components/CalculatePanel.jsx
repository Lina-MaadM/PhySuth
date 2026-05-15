import { useState, useMemo, useEffect, useRef } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

const GLOBAL_MIN = -9999999;
const GLOBAL_MAX = 9999999;

// ── Custom LaTeX dropdown ─────────────────────────────────────────────────────

function LatexSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3
          rounded-xl border-2 border-[#c9b9ae] bg-white
          hover:border-[#a1887f] focus:border-[#8d6e63] outline-none
          transition-all cursor-pointer"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <span className="text-lg font-bold text-[#5d4037] min-w-[28px] text-center">
                <InlineMath math={selected.symbol} />
              </span>
              <span className="text-sm text-[#7a5c50] truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-[#a1887f]">—</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 flex-shrink-0 text-[#a1887f] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50
          bg-white border-2 border-[#c9b9ae] rounded-xl overflow-hidden shadow-lg">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-colors hover:bg-[#faf5f0]
                    ${isActive ? "bg-[#f0e6de]" : ""}`}
                >
                  <span className={`text-base font-bold min-w-[28px] text-center
                    ${isActive ? "text-[#5d4037]" : "text-[#8d6e63]"}`}>
                    <InlineMath math={opt.symbol} />
                  </span>
                  <span className={`text-sm ${isActive ? "text-[#3e2723] font-semibold" : "text-[#7a5c50]"}`}>
                    {opt.label}
                  </span>
                  {isActive && (
                    <svg className="ml-auto w-3.5 h-3.5 text-[#8d6e63]" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function CalculatePanel({
  formula,
  variables = [],
  memory = {},
  onSaveMemory = () => {},
}) {
  const variableKeys = formula?.variable || [];

  const variableMap = useMemo(() => {
    const map = {};
    variables.forEach((v) => (map[v.key] = v));
    return map;
  }, [variables]);

  const editableKeys = useMemo(
    () => variableKeys.filter((key) => variableMap[key]?.isFixed !== true),
    [variableKeys, variableMap]
  );

  const [target, setTarget] = useState("");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    const initialInputs = {};
    variableKeys.forEach((key) => {
      const v = variableMap[key];
      if (v?.isFixed) initialInputs[key] = v.value;
      else if (memory[key] !== undefined) initialInputs[key] = memory[key];
      else if (v?.value !== undefined) initialInputs[key] = v.value;
      else initialInputs[key] = "";
    });
    setInputs(initialInputs);
    setTarget(editableKeys[0] || "");
    setResult(null);
    setError(null);
    setMissingFields([]);
  }, [formula]);

  useEffect(() => {
    if (!target) return;
    const newInputs = {};
    variableKeys.forEach((key) => {
      const v = variableMap[key];
      if (v?.isFixed) { newInputs[key] = v.value; return; }
      if (key === target) return;
      newInputs[key] = memory[key] !== undefined ? memory[key] : "";
    });
    setInputs(newInputs);
    setResult(null);
    setError(null);
    setMissingFields([]);
  }, [target]);

  const requiredVariables = useMemo(
    () => variableKeys.filter((key) => key !== target && variableMap[key]?.isFixed !== true),
    [variableKeys, target, variableMap]
  );

  const isValidNumberInput = (val) => /^-?\d*\.?\d*$/.test(val);

  const handleChange = (key, value) => {
    if (!isValidNumberInput(value)) return;
    setInputs((prev) => ({ ...prev, [key]: value }));
    setResult(null);
    setError(null);
    setMissingFields((prev) => prev.filter((k) => k !== key));
  };

  const handleCalculate = () => {
    try {
      setError(null);
      setMissingFields([]);
      if (!formula?.calculate) throw new Error("Invalid formula");
      const calculation = formula.calculate[target];
      if (!calculation) throw new Error("Invalid formula");

      const missing = requiredVariables.filter(
        (key) => inputs[key] === "" || inputs[key] === undefined
      );
      if (missing.length > 0) { setMissingFields(missing); throw new Error("Missing input"); }

      const values = {};
      for (const key of requiredVariables) {
        const v = variableMap[key];
        const val = Number(inputs[key]);
        if (!isFinite(val)) throw new Error("Invalid input");
        const min = v?.min ?? GLOBAL_MIN;
        const max = v?.max ?? GLOBAL_MAX;
        if (val < min || val > max) throw new Error(`Input out of range ${min} to ${max}`);
        values[key] = val;
      }

      let expression = calculation.value.includes("=")
        ? calculation.value.split("=")[1].trim()
        : calculation.value;

      Object.keys(values).sort((a, b) => b.length - a.length).forEach((key) => {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), values[key]);
      });
      variableKeys
        .filter((key) => variableMap[key]?.isFixed)
        .sort((a, b) => b.length - a.length)
        .forEach((key) => {
          expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), variableMap[key].value);
        });

      let calculated;
      try {
        calculated = Function(
          "sqrt","pow","sin","cos","tan","asin","acos","atan","PI",
          `return ${expression}`
        )(Math.sqrt,Math.pow,Math.sin,Math.cos,Math.tan,Math.asin,Math.acos,Math.atan,Math.PI);
      } catch { throw new Error("Invalid output"); }

      if (!isFinite(calculated)) throw new Error("Invalid output");
      const minT = variableMap[target]?.min ?? GLOBAL_MIN;
      const maxT = variableMap[target]?.max ?? GLOBAL_MAX;
      if (calculated < minT || calculated > maxT) throw new Error(`Output out of range ${minT} to ${maxT}`);

      const formatted = parseFloat(calculated.toPrecision(6));
      setResult(formatted);
      const memoryData = { ...memory };
      requiredVariables.forEach((key) => { memoryData[key] = values[key]; });
      memoryData[target] = formatted;
      onSaveMemory(memoryData);
    } catch (err) {
      setResult(null);
      setError(err.message);
    }
  };

  const currentVariable = variableMap[target];
  if (!formula) return null;

  const dropdownOptions = editableKeys.map((key) => ({
    value: key,
    label: variableMap[key]?.name || key,
    symbol: variableMap[key]?.symbol || key,
  }));

  return (
    <div className="w-full p-7 rounded-[2rem] bg-white border-2 border-[#5d4037]">

      {/* Title */}
      <h3 className="text-lg font-black text-center mb-6 tracking-tight text-[#3e2723]">
        Physics Calculator
      </h3>

      {/* Solve for */}
      <div className="mb-6 p-4 bg-[#faf5f0] rounded-2xl border border-[#d7c8be]">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#a1887f] mb-2 ml-1">
          Solve for variable
        </label>
        <LatexSelect options={dropdownOptions} value={target} onChange={setTarget} />
      </div>

      {/* Inputs */}
      <div className="flex flex-col gap-4">
        {variableKeys.map((key) => {
          const variable = variableMap[key];
          const isMissing = missingFields.includes(key);
          if (key === target) return null;

          return (
            <div key={key} className="flex items-center gap-3 px-1">

              {/* Symbol */}
              <div className="w-12 flex-shrink-0 flex items-center justify-center
                text-[#5d4037] font-bold text-xl">
                {variable?.symbol ? <InlineMath math={variable.symbol} /> : key}
              </div>

              {/* Input / Fixed */}
              <div className="flex-1">
                {variable?.isFixed ? (
                  <div className="w-full px-4 py-3 rounded-xl
                    bg-[#f0e6de] border border-[#d7c8be]
                    text-right font-mono text-sm text-[#8d6e63] italic">
                    {variable.value}
                  </div>
                ) : (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputs[key] ?? ""}
                    onChange={(e) => handleChange(key, e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-4 py-3 rounded-xl text-right font-mono text-sm
                      transition-all outline-none border-2
                      ${isMissing
                        ? "border-red-400 bg-red-50 text-red-600 animate-pulse"
                        : "border-[#c9b9ae] focus:border-[#8d6e63] bg-white text-[#3e2723]"
                      }`}
                  />
                )}
              </div>

              {/* Unit */}
              <div className="w-16 flex-shrink-0 text-[11px] font-bold text-[#a1887f] tracking-tight text-left">
                {variable?.unit ? <InlineMath math={variable.unit} /> : ""}
              </div>

            </div>
          );
        })}
      </div>

      {/* Result */}
      <div className="mt-7 min-h-[108px] flex flex-col items-center justify-center
        rounded-2xl border-2 border-[#d7c8be] bg-[#faf5f0] px-6 py-5">

        {result !== null && !error && (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]
              text-[#8d6e63] block mb-2 opacity-70">
              Solved Result
            </span>
            <div className="text-3xl font-black text-[#3e2723]">
              <InlineMath math={`${currentVariable?.symbol} = ${result}`} />
              <span className="ml-2 text-sm text-[#a1887f] lowercase font-medium">
                {currentVariable?.unit && <InlineMath math={currentVariable.unit} />}
              </span>
            </div>
          </div>
        )}

        {result === null && !error && (
          <div className="text-center opacity-25">
            <div className="text-2xl font-bold text-[#8d6e63]">
              <InlineMath math={`${currentVariable?.symbol || "?"} = \\dots`} />
            </div>
          </div>
        )}

        {error && (
          <div className="animate-in slide-in-from-top-1">
            <div className="text-[11px] font-black uppercase tracking-widest
              text-[#7a4040] bg-white py-2 px-5 rounded-full border border-[#e8c4c4]">
              ⚠️ {error}
            </div>
          </div>
        )}
      </div>

      {/* Button */}
      <button
        onClick={handleCalculate}
        className="mt-6 w-full py-4 rounded-2xl bg-[#5d4037] hover:bg-[#3e2723]
          active:scale-[0.98] text-[#fdf8f4] font-black tracking-widest uppercase
          text-sm transition-all flex items-center justify-center gap-3 group"
      >
        <span>Process Calculation</span>
        <svg xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 group-hover:translate-x-1 transition-transform"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>

    </div>
  );
}