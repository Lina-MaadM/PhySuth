import { useState, useMemo, useEffect } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function CalculatePanel({
  formula,
  variables = [],
  memory = {},
  onSaveMemory = () => {}
}) {
  const variableKeys = formula?.variable || [];

  // target จะเลือกเฉพาะ isFixed=false
  const editableKeys = useMemo(() => {
    return variableKeys.filter(key => {
      const v = variables.find(v => v.key === key);
      return v?.isFixed !== true;
    });
  }, [variableKeys, variables]);

  const [target, setTarget] = useState(editableKeys[0] || "");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // initialize inputs จาก memory หรือ default value
  useEffect(() => {
    if (!initialized && variableKeys.length > 0) {
      const initialInputs = {};
      variableKeys.forEach(key => {
        const variable = variables.find(v => v.key === key);
        if (memory[key] !== undefined) {
          initialInputs[key] = memory[key];
        } else if (variable?.value !== undefined) {
          initialInputs[key] = variable.value;
        }
      });
      setInputs(initialInputs);
      setTarget(editableKeys[0] || "");
      setResult(null);
      setInitialized(true);
    }
  }, [initialized, variableKeys, variables, memory, editableKeys]);

  const requiredVariables = useMemo(() => {
    return variableKeys.filter(key => key !== target);
  }, [variableKeys, target]);

  const isValidNumberInput = val => /^-?\d*\.?\d*$/.test(val);

  const handleChange = (key, value) => {
    if (!isValidNumberInput(value)) return;
    setInputs(prev => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const handleCalculate = () => {
    try {
      if (!formula?.calculate) throw new Error("Invalid input");

      const calculation = formula.calculate[target];
      if (!calculation) throw new Error("Invalid input");

      let expression = calculation.value;
      if (expression.includes("=")) expression = expression.split("=")[1].trim();

      requiredVariables.forEach(key => {
        const variable = variables.find(v => v.key === key);
        const raw = inputs[key] ?? variable?.value ?? memory[key];
        const val = Number(raw);

        if (!isFinite(val)) throw new Error("Invalid input");
        if (variable?.min !== undefined && val < variable.min) throw new Error("Invalid input");
        if (variable?.max !== undefined && val > variable.max) throw new Error("Invalid input");

        const regex = new RegExp(`\\b${key}\\b`, "g");
        expression = expression.replace(regex, val);
      });

      if (/[a-zA-Z_]/.test(expression)) throw new Error("Invalid input");

      const calculated = Function("sqrt", "pow", `return ${expression}`)(Math.sqrt, Math.pow);

      if (typeof calculated !== "number" || isNaN(calculated) || !isFinite(calculated))
        throw new Error("Not physically defined");

      const formatted = Number(calculated.toFixed(6));
      setResult(formatted);

      // Save memory
      const memoryData = {};
      requiredVariables.forEach(key => {
        const raw = inputs[key] ?? variables.find(v => v.key === key)?.value ?? memory[key];
        const val = Number(raw);
        if (isFinite(val)) memoryData[key] = val;
      });
      memoryData[target] = formatted;
      onSaveMemory(memoryData);
    } catch (err) {
      console.error(err);
      setResult(err.message === "Not physically defined" ? "Not physically defined" : "Invalid input");
    }
  };

  const currentVariable = variables.find(v => v.key === target);
  if (!formula) return null;

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: "3rem", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ 
        background: "#ffffff", 
        padding: "2rem", 
        borderRadius: "16px", 
        boxShadow: "0 10px 25px rgba(0,0,0,0.05)", 
        width: "440px", 
        border: "1px solid #eaeaea" 
      }}>
        <h3 style={{ textAlign: "center", marginBottom: "2rem", color: "#1f2937", fontSize: "1.25rem" }}>
          Physics Calculator
        </h3>

        {/* Find Section - ปรับให้ดูสะอาดขึ้น */}
        <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f8fafc", borderRadius: "12px" }}>
          <label style={{ fontWeight: "600", color: "#64748b", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Target Variable
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", marginTop: "0.6rem" }}>
            <select
              value={target}
              onChange={e => { setTarget(e.target.value); setResult(null); }}
              style={{ 
                flex: 1,
                padding: "0.6rem", 
                borderRadius: "8px", 
                border: "1px solid #cbd5e1",
                background: "white",
                fontSize: "1rem",
                outline: "none"
              }}
            >
              {editableKeys.map(key => (
                <option key={key} value={key}>{key}</option>
              ))}
            </select>
            <div style={{ minWidth: "50px", textAlign: "center", fontSize: "1.5rem", color: "#2563eb" }}>
              {currentVariable?.symbol && <InlineMath math={currentVariable.symbol} />}
            </div>
          </div>
        </div>

        {/* Inputs Section - ใช้ Grid เพื่อแก้ปัญหา Alignment */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {requiredVariables.map(key => {
            const variable = variables.find(v => v.key === key);
            const value = inputs[key] ?? variable?.value ?? "";
            const belowMin = variable?.min !== undefined && Number(value) < variable.min;

            return (
              <div key={key} style={{ 
                display: "grid", 
                gridTemplateColumns: "50px 1fr 80px", // [สัญลักษณ์] [ช่องกรอก] [หน่วย]
                alignItems: "center",
                gap: "10px"
              }}>
                {/* 1. Symbol - ชิดซ้าย */}
                <span style={{ fontSize: "1.1rem", color: "#475569" }}>
                  {variable?.symbol ? <InlineMath math={variable.symbol} /> : key}
                </span>

                {/* 2. Input - ชิดขวาข้างในเพื่อให้เลขใกล้หน่วย */}
                <input
                  type="text"
                  inputMode="decimal"
                  value={value}
                  onChange={e => !variable?.isFixed && handleChange(key, e.target.value)}
                  disabled={variable?.isFixed}
                  style={{
                    padding: "0.5rem 0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                    background: variable?.isFixed ? "#f1f5f9" : "white",
                    textAlign: "right",
                    fontSize: "1rem",
                    transition: "all 0.2s",
                    outline: "none",
                    width: "100%" // ให้ขยายเต็ม Column กลาง
                  }}
                />

                {/* 3. Unit - ล็อกความกว้างและชิดซ้าย เพื่อให้ระยะห่างจากเลขคงที่ */}
                <span style={{ 
                  fontSize: "0.9rem", 
                  color: "#94a3b8", 
                  paddingLeft: "5px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}>
                  {variable?.unit}
                </span>
              </div>
            );
          })}
        </div>

        {/* Result Area */}
        <div style={{ minHeight: "80px", marginTop: "2rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {result !== null ? (
            <div style={{ 
              padding: "1rem", 
              background: "#eff6ff", 
              borderRadius: "12px", 
              textAlign: "center", 
              border: "1px solid #dbeafe"
            }}>
              <div style={{ color: "#3b82f6", fontSize: "0.8rem", fontWeight: "600", marginBottom: "0.25rem" }}>RESULT</div>
              <div style={{ color: "#1e40af", fontSize: "1.2rem", fontWeight: "bold" }}>
                {typeof result === "number" && currentVariable?.symbol ? (
                  <>
                    <InlineMath math={`${currentVariable.symbol} = ${result}`} />
                    <span style={{ marginLeft: "0.5rem", fontSize: "1rem" }}>{currentVariable?.unit}</span>
                  </>
                ) : result}
              </div>
            </div>
          ) : (
            /* Memory Preview กรณีไม่มีผลลัพธ์ */
            memory[target] !== undefined && currentVariable && (
              <div style={{ textAlign: "center", color: "#94a3b8", fontSize: "0.95rem", fontStyle: "italic" }}>
                Prev: <InlineMath math={`${currentVariable.symbol} = ${memory[target]}`} /> {currentVariable.unit}
              </div>
            )
          )}
        </div>

        {/* Calculate Button */}
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
            fontSize: "1rem",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
            transition: "transform 0.1s"
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.98)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Calculate & Save
        </button>
      </div>
    </div>
  );
}