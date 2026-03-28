import { useState, useMemo, useEffect } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

const GLOBAL_MIN = -999999;
const GLOBAL_MAX = 999999;

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

  const validatePhysics = (targetKey, value) => {
    const variable = variableMap[targetKey];
    if (!variable) return null;

    const min = variable.min ?? GLOBAL_MIN;
    const max = variable.max ?? GLOBAL_MAX;

    if (value < min || value > max) {
      return "Not physically defined";
    }

    return null;
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

        if (!isFinite(val)) throw new Error("Not physically defined"); // NaN, Infinity

        const min = variable?.min ?? GLOBAL_MIN;
        const max = variable?.max ?? GLOBAL_MAX;
        if (val < min || val > max) throw new Error("Input out of allowed range");

        values[key] = val;
      }

      // 3️⃣ สร้าง expression
      let expression = calculation.value.includes("=")
        ? calculation.value.split("=")[1].trim()
        : calculation.value;

      // แทนค่าตัวแปร
      for (const key in values) {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), values[key]);
      }
      // แทนค่าตัวแปร fixed
      variableKeys.forEach(key => {
        const variable = variableMap[key];
        if (variable?.isFixed) {
          expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), variable.value);
        }
      });

      // 4️⃣ คำนวณ
      let calculated;
      try {
        calculated = Function(
          "sqrt","pow","sin","cos","tan","asin","acos","atan","PI",
          `return ${expression}`
        )(
          Math.sqrt,Math.pow,Math.sin,Math.cos,Math.tan,
          Math.asin,Math.acos,Math.atan,Math.PI
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
      const formatted = Number(calculated.toFixed(6));
      setResult(formatted);

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
    <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem" }}>
      <div style={{
        width: "460px",
        padding: "2rem",
        borderRadius: "16px",
        background: "white",
        border: "1px solid #e5e7eb",
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)"
      }}>

        <h3 style={{ textAlign: "center", marginBottom: "2rem" }}>
          Physics Calculator
        </h3>

        {/* Target */}
        <div style={{ marginBottom: "1.5rem" }}>
          <select
            value={target}
            onChange={e => setTarget(e.target.value)}
            style={{ width: "100%", padding: "0.6rem" }}
          >
            {editableKeys.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>

        {/* Inputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {variableKeys.map(key => {
            const variable = variableMap[key];
            const isMissing = missingFields.includes(key);

            if (key === target) return null;

            return (
              <div key={key} style={{
                display: "grid",
                gridTemplateColumns: "60px 1fr 90px",
                gap: "10px",
                alignItems: "center"
              }}>
                <span>
                  {variable?.symbol
                    ? <InlineMath math={variable.symbol} />
                    : key}
                </span>

                {variable?.isFixed ? (
                  <div style={{
                    padding: "0.5rem",
                    borderRadius: "8px",
                    background: "#f1f5f9",
                    textAlign: "right"
                  }}>
                    {variable.value}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={inputs[key] ?? ""}
                    onChange={e => handleChange(key, e.target.value)}
                    style={{
                      padding: "0.5rem",
                      borderRadius: "8px",
                      border: isMissing
                        ? "1px solid #ef4444"
                        : "1px solid #d1d5db",
                      background: isMissing ? "#fef2f2" : "white",
                      textAlign: "right"
                    }}
                  />
                )}

                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {variable?.unit}
                </span>
              </div>
            );
          })}
        </div>

        {/* Result */}
        <div style={{ marginTop: "1.5rem", minHeight: "60px", textAlign: "center" }}>
          {result !== null && (
            <div style={{ fontWeight: "bold", fontSize: "1.2rem" }}>
              <InlineMath math={`${currentVariable?.symbol} = ${result}`} /> {currentVariable?.unit}
            </div>
          )}

          {error && (
            <div style={{ color: "#ef4444", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}
        </div>

        <button
          onClick={handleCalculate}
          style={{
            marginTop: "1rem",
            width: "100%",
            padding: "0.8rem",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Calculate
        </button>

      </div>
    </div>
  );
}