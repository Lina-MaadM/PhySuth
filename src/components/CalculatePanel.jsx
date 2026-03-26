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

  const [target, setTarget] = useState(variableKeys[0] || "");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);

  // reset + autofill memory
  useEffect(() => {
    if (variableKeys.length > 0) {
      const firstTarget = variableKeys[0];

      setTarget(firstTarget);
      setResult(null);

      const initialInputs = {};

      variableKeys.forEach(key => {
        if (memory[key] !== undefined) {
          initialInputs[key] = memory[key];
        }
      });

      setInputs(initialInputs);
    }
  }, [formula, memory]);

  const requiredVariables = useMemo(() => {
    return variableKeys.filter(v => v !== target);
  }, [variableKeys, target]);

  // -------------------------
  // INPUT VALIDATION
  // -------------------------
  const isValidNumberInput = val => {
    return /^-?\d*\.?\d*$/.test(val);
  };

  const handleChange = (key, value) => {
    if (!isValidNumberInput(value)) return;

    setInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // -------------------------
  // CALCULATE
  // -------------------------
  const handleCalculate = () => {
    try {
      if (!formula?.calculate) {
        throw new Error("Invalid input");
      }

      const calculation = formula.calculate[target];

      if (!calculation) {
        throw new Error("Invalid input");
      }

      let expression = calculation.value;

      if (expression.includes("=")) {
        expression = expression.split("=")[1].trim();
      }

      // -------------------------
      // Replace variables
      // -------------------------
      requiredVariables.forEach(key => {
        const variable = variables.find(v => v.key === key);

        const raw = inputs[key] ?? memory[key];
        const val = Number(raw);

        if (!isFinite(val)) {
          throw new Error("Invalid input");
        }

        // ใช้ constraint จาก schema
        if (variable?.min !== undefined && val < variable.min) {
          throw new Error("Invalid input");
        }

        if (variable?.max !== undefined && val > variable.max) {
          throw new Error("Invalid input");
        }

        const regex = new RegExp(`\\b${key}\\b`, "g");
        expression = expression.replace(regex, val);
      });

      // กันตัวแปรค้าง
      if (/[a-zA-Z_]/.test(expression)) {
        throw new Error("Invalid input");
      }

      const calculated = Function(
        "sqrt",
        "pow",
        `return ${expression}`
      )(Math.sqrt, Math.pow);

      // ตรวจผลลัพธ์
      if (
        typeof calculated !== "number" ||
        isNaN(calculated) ||
        !isFinite(calculated)
      ) {
        throw new Error("Not physically defined");
      }

      const formatted = Number(calculated.toFixed(6));
      setResult(formatted);

      // -------------------------
      // SAVE MEMORY
      // -------------------------
      const memoryData = {};

      requiredVariables.forEach(key => {
        const raw = inputs[key] ?? memory[key];
        const val = Number(raw);

        if (isFinite(val)) {
          memoryData[key] = val;
        }
      });

      memoryData[target] = formatted;

      onSaveMemory(memoryData);
    } catch (err) {
      console.error(err);

      if (err.message === "Not physically defined") {
        setResult("Not physically defined");
      } else {
        setResult("Invalid input");
      }
    }
  };

  const currentVariable = variables.find(v => v.key === target);

  if (!formula) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        marginTop: "3rem"
      }}
    >
      <div
        style={{
          background: "#f9fafc",
          padding: "2rem",
          borderRadius: "12px",
          boxShadow: "0 6px 18px rgba(0,0,0,0.1)",
          width: "420px",
          border: "1px solid #e3e3e3"
        }}
      >
        <h3 style={{ textAlign: "center", marginBottom: "1.5rem" }}>
          Calculate
        </h3>

        {/* Find */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ fontWeight: "bold" }}>Find:</label>

          <div style={{ marginTop: "0.4rem" }}>
            <select
              value={target}
              onChange={e => {
                setTarget(e.target.value);
                setResult(null);
              }}
              style={{
                padding: "0.4rem",
                borderRadius: "6px",
                border: "1px solid #ccc"
              }}
            >
              {variableKeys.map(key => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>

            <span style={{ marginLeft: "1rem", fontSize: "1.3rem" }}>
              {currentVariable?.symbol && (
                <InlineMath math={currentVariable.symbol} />
              )}
            </span>
          </div>
        </div>

        {/* Inputs */}
        {requiredVariables.map(key => {
          const variable = variables.find(v => v.key === key);
          const currentValue = inputs[key];

          const belowMin =
            variable?.min !== undefined &&
            currentValue !== undefined &&
            Number(currentValue) < variable.min;

          return (
            <div
              key={key}
              style={{
                marginBottom: "0.8rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <span>
                {variable?.symbol ? (
                  <InlineMath math={variable.symbol} />
                ) : (
                  key
                )}
              </span>

              <div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={inputs[key] ?? ""}
                  onChange={e => handleChange(key, e.target.value)}
                  style={{
                    width: "100px",
                    padding: "0.3rem",
                    borderRadius: "6px",
                    border: belowMin
                      ? "1px solid #ef4444"
                      : "1px solid #ccc",
                    background:
                      memory[key] !== undefined &&
                      inputs[key] === undefined
                        ? "#fff7ed"
                        : "white"
                  }}
                />

                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.9rem",
                    opacity: 0.7
                  }}
                >
                  {variable?.unit}
                </span>
              </div>
            </div>
          );
        })}

        {/* Memory preview */}
        {memory[target] !== undefined && currentVariable && (
          <div
            style={{
              marginTop: "1rem",
              textAlign: "center",
              fontSize: "1rem",
              color: "#444"
            }}
          >
            <InlineMath
              math={`${currentVariable.symbol} = ${memory[target]}`}
            />
            {currentVariable.unit && ` ${currentVariable.unit}`}
          </div>
        )}

        {/* Button */}
        <button
          onClick={handleCalculate}
          style={{
            marginTop: "1rem",
            width: "100%",
            padding: "0.6rem",
            borderRadius: "8px",
            border: "none",
            background: "#3b82f6",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          Calculate
        </button>

        {/* Result */}
        {result !== null && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "#eef2ff",
              borderRadius: "8px",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "1.1rem"
            }}
          >
            {typeof result === "number" && currentVariable?.symbol ? (
              <>
                <InlineMath
                  math={`${currentVariable.symbol} = ${result}`}
                />
                {currentVariable?.unit && ` ${currentVariable.unit}`}
              </>
            ) : (
              <>Result: {result}</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}