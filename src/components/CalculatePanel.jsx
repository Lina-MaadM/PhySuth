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

  // ถ้า formula เปลี่ยน ให้ reset target
  useEffect(() => {
    if (variableKeys.length > 0) {
      setTarget(variableKeys[0]);
      setResult(null);
      setInputs({});
    }
  }, [formula]);

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

      // Replace variables safely
      requiredVariables.forEach(key => {
        const val =
          inputs[key] !== undefined
            ? parseFloat(inputs[key])
            : parseFloat(memory[key]);

        if (isNaN(val)) throw new Error("Missing value");

        // safer regex
        const regex = new RegExp(
          `(?<![a-zA-Z0-9_])${key}(?![a-zA-Z0-9_])`,
          "g"
        );

        expression = expression.replace(regex, val);
      });

      // Evaluate expression
      const calculated = Function(
        "sqrt",
        "pow",
        `return ${expression}`
      )(Math.sqrt, Math.pow);

      if (typeof calculated !== "number" || isNaN(calculated)) {
        throw new Error("Invalid result");
      }

      // Format result (round nicely)
      const formatted = Number(calculated.toFixed(6));

      setResult(formatted);

      // Save to memory
      onSaveMemory({
        ...requiredVariables.reduce((acc, key) => {
          acc[key] =
            inputs[key] !== undefined
              ? parseFloat(inputs[key])
              : parseFloat(memory[key]);
          return acc;
        }, {}),
        [target]: formatted
      });

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
        marginTop: "2rem",
        padding: "1.5rem",
        borderTop: "1px solid #ddd"
      }}
    >
      <h3>Calculate</h3>

      {/* ---------- Find Section ---------- */}
      <div style={{ marginBottom: "1.5rem" }}>
        <label>Find: </label>

        <select
          value={target}
          onChange={e => {
            setTarget(e.target.value);
            setResult(null);
          }}
        >
          {variableKeys.map(key => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>

        <span style={{ marginLeft: "1rem", fontSize: "1.2rem" }}>
          {currentVariable?.symbol && (
            <InlineMath math={currentVariable.symbol} />
          )}
        </span>
      </div>

      {/* ---------- Input Fields ---------- */}
      {requiredVariables.map(key => {
        const variable = variables.find(v => v.key === key);

        return (
          <div key={key} style={{ marginBottom: "0.75rem" }}>
            <label>
              {variable?.symbol ? (
                <InlineMath math={variable.symbol} />
              ) : (
                key
              )}
              :
              <input
                type="number"
                value={inputs[key] ?? memory[key] ?? ""}
                onChange={e => handleChange(key, e.target.value)}
                style={{ marginLeft: "0.5rem", width: "120px" }}
              />
              <span style={{ marginLeft: "0.5rem", opacity: 0.6 }}>
                {variable?.unit}
              </span>
            </label>
          </div>
        );
      })}

      <button
        onClick={handleCalculate}
        style={{ marginTop: "1rem", padding: "0.4rem 1rem" }}
      >
        Calculate
      </button>

      {/* ---------- Result ---------- */}
      {result !== null && (
        <div style={{ marginTop: "1.5rem", fontWeight: "bold" }}>
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
  );
}