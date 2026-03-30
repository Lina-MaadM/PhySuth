import { useState, useMemo } from "react";
import { variableIndex } from "../data/physicsData"; 

export default function VariableMem({ memory = {}, onClear = () => {} }) {
  const [open, setOpen] = useState(false);

  const entries = Object.entries(memory);

  const grouped = useMemo(() => {
    const result = {};

    for (const [key, value] of entries) {
      const info = variableIndex[key];
      if (!info) continue;

      const variable = key.split("_")[0];
      const topic = info.topic; // ใช้ display topic จาก JSON

      if (!result[topic]) result[topic] = [];

      result[topic].push({ variable, value });
    }

    return result;
  }, [entries]);

  const topics = Object.keys(grouped);

  const unitMap = {
    v: "m/s",
    a: "m/s²",
    m: "kg",
    F: "N",
    p: "kg·m/s",
    f: "Hz",
    lambda: "m",
    T: "s",
    Q: "J",
    c: "J/(kg·K)",
    L: "J/kg"
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          border: "none",
          background: "#3b82f6",
          color: "white",
          fontWeight: "bold",
          fontSize: "18px",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
          zIndex: 1000
        }}
      >
        M{entries.length > 0 ? `(${entries.length})` : ""}
      </button>

      {/* Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "320px",
            maxHeight: "420px",
            overflowY: "auto",
            background: "white",
            borderRadius: "12px",
            padding: "1rem",
            boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
            border: "1px solid #ddd",
            zIndex: 1000
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "0.8rem"
            }}
          >
            <strong>Saved Variables</strong>

            <button
              onClick={onClear}
              style={{
                border: "none",
                background: "transparent",
                color: "#ef4444",
                cursor: "pointer",
                fontSize: "0.85rem"
              }}
            >
              Clear
            </button>
          </div>

          {entries.length === 0 && (
            <div style={{ opacity: 0.6, fontSize: "0.9rem" }}>
              No values saved
            </div>
          )}

          {topics.map(topic => (
            <div key={topic} style={{ marginBottom: "14px" }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  marginBottom: "6px",
                  color: "#374151"
                }}
              >
                {topic}
              </div>

              {grouped[topic].map((item, index) => (
                <div
                  key={index}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 80px",
                    columnGap: "10px",
                    alignItems: "center",
                    fontSize: "0.9rem",
                    paddingLeft: "6px",
                    marginBottom: "2px"
                  }}
                >
                  {/* variable */}
                  <span style={{ fontWeight: 500 }}>{item.variable}</span>

                  {/* value */}
                  <span
                    style={{
                      textAlign: "right",
                      fontFamily: "monospace",
                      color: "#2563eb",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {item.value}
                  </span>

                  {/* unit */}
                  <span
                    style={{
                      opacity: 0.7,
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      whiteSpace: "nowrap" // ป้องกันหน่วยตกบรรทัด
                    }}
                  >
                    {unitMap[item.variable] || ""}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </>
  );
}