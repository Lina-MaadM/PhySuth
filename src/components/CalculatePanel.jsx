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

        if (!isFinite(val)) throw new Error("Invalid input");

        const min = variable?.min ?? GLOBAL_MIN;
        const max = variable?.max ?? GLOBAL_MAX;
        if (val < min || val > max) throw new Error(`Input out of range ${min} to ${max}`);

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
        throw new Error("Invalid output");
      }

      if (!isFinite(calculated)) throw new Error("Invalid output");

      // 5️⃣ ตรวจสอบ result เกิน min/max
      const minTarget = variableMap[target]?.min ?? GLOBAL_MIN;
      const maxTarget = variableMap[target]?.max ?? GLOBAL_MAX;
      if (calculated < minTarget || calculated > maxTarget) throw new Error(`Output out of range ${minTarget} to ${maxTarget}`);

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
      <div className="flex justify-center mt-12 px-4">
        {/* Main Container: กรอบน้ำตาลเข้ม ชัดเจน นุ่มนวลด้วยความโค้ง */}
        <div className="w-full max-w-[480px] p-8 rounded-[2.5rem] bg-white border-2 border-[#5d4037]">

          {/* Title: ใช้ฟอนต์หนา สี Cocoa */}
          <h3 className="text-xl font-black text-center mb-8 tracking-tight text-[#5d4037]">
            Physics Calculator
          </h3>

          {/* Target Selection Section: พื้นหลังสีครีมอ่อน */}
          <div className="mb-8 p-5 bg-[#fdfaf7] rounded-3xl border border-[#efe0d5]">
            <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#a1887f] mb-3 ml-1">
              Solve for variable
            </label>
            <select
              value={target}
              onChange={e => setTarget(e.target.value)}
              className="w-full p-3.5 rounded-2xl border-2 border-[#eaddd2] bg-white focus:border-[#8d6e63] outline-none transition-all cursor-pointer font-bold text-[#5d4037]"
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
          <div className="flex flex-col gap-6">
            {variableKeys.map(key => {
              const variable = variableMap[key];
              const isMissing = missingFields.includes(key);

              if (key === target) return null;

              return (
                <div key={key} className="grid grid-cols-[60px_1fr_80px] gap-3 items-center px-2">
                  {/* Symbol column: ใช้สีเข้มให้อ่านง่าย */}
                  <div className="text-[#5d4037] font-bold text-center text-xl">
                    {variable?.symbol ? <InlineMath math={variable.symbol} /> : key}
                  </div>

                  {/* Input/Fixed value column */}
                  {variable?.isFixed ? (
                    <div className="p-3 rounded-xl bg-[#f5ece5] text-right text-[#8d6e63] font-mono text-sm border border-transparent italic opacity-80">
                      {variable.value}
                    </div>
                  ) : (
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputs[key] ?? ""}
                      onChange={e => handleChange(key, e.target.value)}
                      placeholder="0.00"
                      className={`w-full p-3 rounded-xl text-right font-mono text-sm transition-all outline-none border-2
                        ${isMissing
                          ? "border-red-300 bg-red-50 text-red-600 animate-pulse"
                          : "border-[#f5ece5] focus:border-[#d7ccc8] bg-white text-[#5d4037]"
                        }`}
                    />
                  )}

                  {/* Unit column: สีชานมจางๆ */}
                  <div className="text-[10px] font-black text-[#a1887f] uppercase tracking-tighter text-left ml-2">
                    {variable?.unit ? <InlineMath math={variable.unit} /> : ""}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Display Area: ส่วนแสดงผลลัพธ์ ดีไซน์ให้เหมือนป้ายเมนู */}
          <div className="mt-10 min-h-[110px] flex flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-[#eaddd2] bg-[#fdfaf7] px-6 py-6">

            {/* 1. Success State */}
            {result !== null && !error && (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8d6e63] block mb-2 opacity-60">Solved Result</span>
                <div className="text-3xl font-black text-[#5d4037]">
                  <InlineMath math={`${currentVariable?.symbol} = ${result}`} />
                  <span className="ml-2 text-sm text-[#a1887f] lowercase font-medium">
                    {currentVariable?.unit && <InlineMath math={currentVariable.unit} />}
                  </span>
                </div>
              </div>
            )}

            {/* 2. Ready State */}
            {result === null && !error && (
              <div className="text-center opacity-30 transition-opacity">
                <div className="text-2xl font-bold text-[#8d6e63]">
                  <InlineMath math={`${currentVariable?.symbol} = \\dots`} />
                </div>
              </div>
            )}

            {/* 3. Error State */}
            {error && (
              <div className="flex flex-col items-center gap-2 animate-in slide-in-from-top-1">
                <div className="text-[#8d6e63] text-[10px] font-black uppercase tracking-widest bg-white py-2 px-5 rounded-full border border-[#eaddd2]">
                  ⚠️ {error}
                </div>
              </div>
            )}
          </div>

          {/* Calculate Button: สี Dark Chocolate ตัวหนังสือขาวเด่นชัด */}
          <button
            onClick={handleCalculate}
            className="mt-8 w-full py-4.5 rounded-[1.5rem] bg-[#5d4037] hover:bg-[#3e2723] active:scale-[0.98] text-white font-black tracking-widest uppercase text-sm transition-all flex items-center justify-center gap-3 shadow-none group"
          >
            <span>Process Calculation</span>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

        </div>
      </div>
    );
}