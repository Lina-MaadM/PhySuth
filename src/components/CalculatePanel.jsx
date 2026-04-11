import { useState, useMemo, useEffect } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

const GLOBAL_MIN = -9999999;
const GLOBAL_MAX = 9999999;

export default function CalculatePanel({
  formula,
  variables = [],
  memory = {},
  onSaveMemory = () => {}
}) {
  const variableKeys = formula?.variable || [];

  const variableMap = useMemo(() => {
    const map = {};
    variables.forEach(v => (map[v.key] = v));
    return map;
  }, [variables]);

  const editableKeys = useMemo(() => {
    return variableKeys.filter(key => {
      const v = variableMap[key];
      return v && v.isFixed !== true;
    });
  }, [variableKeys, variableMap]);

  const [target, setTarget] = useState("");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [missingFields, setMissingFields] = useState([]);

  // reset เมื่อเปลี่ยนสูตร
  useEffect(() => {
    const initialInputs = {};

    variableKeys.forEach(key => {
      const variable = variableMap[key];

      if (variable?.isFixed) {
        initialInputs[key] = variable.value;
      } else if (memory[key] !== undefined) {
        // ดึงค่าจาก memory ถ้ามี (ค่าที่บันทึกจากการคำนวณสูตรก่อนหน้า)
        initialInputs[key] = memory[key];
      } else if (variable?.value !== undefined) {
        initialInputs[key] = variable.value;
      } else {
        initialInputs[key] = "";
      }
    });

    setInputs(initialInputs);
    setTarget(editableKeys[0] || "");
    setResult(null);
    setError(null);
    setMissingFields([]);
  }, [formula]);

  // reset input เมื่อเปลี่ยน target
  useEffect(() => {
    if (!target) return;

    const newInputs = {};

    variableKeys.forEach(key => {
      const variable = variableMap[key];

      if (variable?.isFixed) {
        newInputs[key] = variable.value;
        return;
      }

      if (key === target) return;

      if (memory[key] !== undefined) {
        newInputs[key] = memory[key];
      } else {
        newInputs[key] = "";
      }
    });

    setInputs(newInputs);
    setResult(null);
    setError(null);
    setMissingFields([]);
  }, [target]);

  const requiredVariables = useMemo(() => {
    return variableKeys.filter(key => {
      if (key === target) return false;
      const variable = variableMap[key];
      return variable?.isFixed !== true;
    });
  }, [variableKeys, target, variableMap]);

  const isValidNumberInput = val => /^-?\d*\.?\d*$/.test(val);

  const handleChange = (key, value) => {
    if (!isValidNumberInput(value)) return;

    setInputs(prev => ({ ...prev, [key]: value }));
    setResult(null);
    setError(null);
    setMissingFields(prev => prev.filter(k => k !== key));
  };

  const handleCalculate = () => {
    try {
      setError(null);
      setMissingFields([]);

      if (!formula?.calculate) throw new Error("Invalid formula");
      const calculation = formula.calculate[target];
      if (!calculation) throw new Error("Invalid formula");

      // 1️⃣ ตรวจสอบ input ที่ยังว่าง
      const missing = requiredVariables.filter(
        key => inputs[key] === "" || inputs[key] === undefined
      );
      if (missing.length > 0) {
        setMissingFields(missing);
        throw new Error("Missing input");
      }

      // 2️⃣ ตรวจสอบ input เกิน min/max และไม่ใช่ตัวเลข
      const values = {};
      for (const key of requiredVariables) {
        const variable = variableMap[key];
        const val = Number(inputs[key]);

        if (!isFinite(val)) throw new Error("Result is undefined or infinite");

        const min = variable?.min ?? GLOBAL_MIN;
        const max = variable?.max ?? GLOBAL_MAX;
        if (val < min || val > max) throw new Error("Input out of allowed range");

        values[key] = val;
      }

      // 3️⃣ สร้าง expression
      let expression = calculation.value.includes("=")
        ? calculation.value.split("=")[1].trim()
        : calculation.value;

      // แทนค่าตัวแปร input — sort จากชื่อยาวไปสั้นก่อน
      // เพื่อป้องกัน key สั้น (เช่น s) แทนทับ key ยาว (เช่น s0) ก่อน
      const sortedInputKeys = Object.keys(values).sort((a, b) => b.length - a.length);
      for (const key of sortedInputKeys) {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), values[key]);
      }

      // แทนค่าตัวแปร fixed — sort เช่นกัน
      const sortedFixedKeys = variableKeys
        .filter(key => variableMap[key]?.isFixed)
        .sort((a, b) => b.length - a.length);
      for (const key of sortedFixedKeys) {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), variableMap[key].value);
      }

      // 4️⃣ คำนวณ
      let calculated;
      try {
        calculated = Function(
          "sqrt", "pow", "sin", "cos", "tan", "asin", "acos", "atan", "PI",
          `return ${expression}`
        )(
          Math.sqrt, Math.pow, Math.sin, Math.cos, Math.tan,
          Math.asin, Math.acos, Math.atan, Math.PI
        );
      } catch {
        throw new Error("Not physically defined");
      }

      if (!isFinite(calculated)) throw new Error("Not physically defined");

      // 5️⃣ ตรวจสอบ result เกิน min/max
      const minTarget = variableMap[target]?.min ?? GLOBAL_MIN;
      const maxTarget = variableMap[target]?.max ?? GLOBAL_MAX;
      if (calculated < minTarget || calculated > maxTarget) throw new Error("Result overflow");

      // 6️⃣ ตั้งผลลัพธ์และบันทึก memory
      // ใช้ toPrecision(6) แทน toFixed(6) เพื่อรองรับทั้งเลขใหญ่และเลขเล็กมากๆ
      const formatted = parseFloat(calculated.toPrecision(6));
      setResult(formatted);

      // บันทึก input ทั้งหมดและผลลัพธ์ลง memory
      // ครั้งถัดไปที่เปิดสูตรอื่นที่มีตัวแปรเดียวกัน จะดึงค่ามาใส่อัตโนมัติ
      const memoryData = { ...memory };
      requiredVariables.forEach(key => { memoryData[key] = values[key]; });
      memoryData[target] = formatted;
      onSaveMemory(memoryData);

    } catch (err) {
      setResult(null);
      setError(err.message);
    }
  };

  const currentVariable = variableMap[target];
  if (!formula) return null;

  return (
    <div className="flex justify-center mt-12 px-4 text-slate-900">
      <div className="w-full max-w-[480px] p-8 rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-100/50">

        {/* Title */}
        <h3 className="text-xl font-bold text-center mb-8 tracking-tight text-slate-800">
          Physics Calculator
        </h3>

        {/* Target Selection Section */}
        <div className="mb-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2 ml-1">
            Solve for variable
          </label>
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            className="w-full p-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all cursor-pointer font-medium text-slate-700"
          >
            {editableKeys.map(key => {
              const variable = variableMap[key];
              return (
                <option key={key} value={key}>
                  {variable?.name || key}
                </option>
              );
            })}
          </select>
        </div>

        {/* Inputs List */}
        <div className="flex flex-col gap-5">
          {variableKeys.map(key => {
            const variable = variableMap[key];
            const isMissing = missingFields.includes(key);

            if (key === target) return null;

            return (
              <div key={key} className="grid grid-cols-[60px_1fr_90px] gap-4 items-center">
                {/* Symbol column */}
                <div className="text-slate-700 font-medium text-center text-xl">
                  {variable?.symbol ? <InlineMath math={variable.symbol} /> : key}
                </div>

                {/* Input/Fixed value column */}
                {variable?.isFixed ? (
                  <div className="p-3 rounded-xl bg-slate-100 text-right text-slate-500 font-mono text-sm border border-transparent italic">
                    {variable.value}
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputs[key] ?? ""}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder="0.00"
                      className={`w-full p-3 rounded-xl text-right font-mono text-sm shadow-sm transition-all outline-none border
                        ${isMissing
                          ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
                          : "border-slate-200 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-400 text-slate-700"
                        }`}
                    />
                  </div>
                )}

                {/* Unit column */}
                <div className="text-[11px] font-bold text-slate-400 truncate uppercase tracking-tighter text-left ml-1">
                  {variable?.unit ? <InlineMath math={variable.unit} /> : ""}
                </div>
              </div>
            );
          })}
        </div>

        {/* Display Area */}
        <div className="mt-8 min-h-[100px] flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 px-6 py-4">

          {/* 1. Success State */}
          {result !== null && !error && (
            <div className="text-center animate-in fade-in zoom-in duration-300">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 block mb-2">Solved Result</span>
              <div className="text-2xl font-bold text-blue-700">
                <InlineMath math={`${currentVariable?.symbol} = ${result}`} />
                <span className="ml-2 text-sm text-blue-400 font-medium lowercase">
                  {currentVariable?.unit && <InlineMath math={currentVariable.unit} />}
                </span>
              </div>
            </div>
          )}

          {/* 2. Ready State */}
          {result === null && !error && (
            <div className="text-center opacity-40 transition-opacity">
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 block mb-2">Target Equation</span>
              <div className="text-2xl font-medium text-slate-400">
                <InlineMath math={`${currentVariable?.symbol} = \\text{?}`} />
                <span className="ml-2 text-sm">
                  {currentVariable?.unit && <InlineMath math={currentVariable.unit} />}
                </span>
              </div>
            </div>
          )}

          {/* 3. Error State */}
          {error && (
            <div className="flex flex-col items-center gap-2 animate-in slide-in-from-top-1">
              <div className="text-red-500 text-xs font-bold bg-red-50 py-2 px-4 rounded-full border border-red-100">
                ⚠️ {error}
              </div>
            </div>
          )}
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          className="mt-6 w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
        >
          <span>Calculate</span>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>

      </div>
    </div>
  );
}