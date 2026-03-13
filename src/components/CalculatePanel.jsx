import { useState, useMemo, useEffect } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

export default function CalculatePanel({
  formula,
  variables = [],
  memory = {},
  onSaveMemory = () => {}
}) {

  // -----------------------------
  // Safe guards
  // -----------------------------
  const variableKeys = formula?.variable || [];

  const [target, setTarget] = useState(variableKeys[0] || "");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);

// reset + auto fill จาก memory เมื่อ formula เปลี่ยน
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

  // -----------------------------
  // Required variables
  // -----------------------------
  const requiredVariables = useMemo(() => {
    return variableKeys.filter(v => v !== target);
  }, [variableKeys, target]);

  const handleChange = (key, value) => {
    setInputs(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // -----------------------------
  // Calculation
  // -----------------------------
  const handleCalculate = () => {
    try {
      if (!formula?.calculate) {
        throw new Error("No calculation defined");
      }

      const calculation = formula.calculate[target];

      if (!calculation) {
        throw new Error("No calculation for target");
      }

      if (calculation.type === "quadratic") {
        setResult("Quadratic solving not implemented yet");
        return;
      }

      let expression = calculation.value;

      // -----------------------------
      // Replace variables
      // -----------------------------
      requiredVariables.forEach(key => {

        // priority: user input -> memory
        const val =
          inputs[key] !== undefined && inputs[key] !== ""
            ? parseFloat(inputs[key])
            : parseFloat(memory[key]);

        if (isNaN(val)) {
          throw new Error("Missing value");
        }

        const regex = new RegExp(
          `(?<![a-zA-Z0-9_])${key}(?![a-zA-Z0-9_])`,
          "g"
        );

        expression = expression.replace(regex, val);
      });

      // -----------------------------
      // Evaluate
      // -----------------------------
      const calculated = Function(
        "sqrt",
        "pow",
        `return ${expression}`
      )(Math.sqrt, Math.pow);

      if (typeof calculated !== "number" || isNaN(calculated)) {
        throw new Error("Invalid result");
      }

      const formatted = Number(calculated.toFixed(6));

      setResult(formatted);

      // -----------------------------
      // Save to memory
      // -----------------------------
      const memoryData = {};

      requiredVariables.forEach(key => {
        const val =
          inputs[key] !== undefined && inputs[key] !== ""
            ? parseFloat(inputs[key])
            : parseFloat(memory[key]);

        if (!isNaN(val)) {
          memoryData[key] = val;
        }
      });

      memoryData[target] = formatted;

      onSaveMemory(memoryData);

    } catch (err) {
      setResult("Invalid input");
    }
  };

  const currentVariable = variables.find(v => v.key === target);

  // -----------------------------
  // Render
  // -----------------------------
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

        {/* ---------- Find Section ---------- */}
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

        {/* ---------- Inputs ---------- */}
        {requiredVariables.map(key => {
          const variable = variables.find(v => v.key === key);

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
                  type="number"
                  value={inputs[key] ?? ""}
                  onChange={e => handleChange(key, e.target.value)}
                  style={{
                    width: "100px",
                    padding: "0.3rem",
                    borderRadius: "6px",
                    border: "1px solid #ccc",
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

        {/* ---------- Current Stored Value ---------- */}
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

        {/* ---------- Button ---------- */}
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

        {/* ---------- Result ---------- */}
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