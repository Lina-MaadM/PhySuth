import { useState } from "react";

export default function VariableMem({ memory = {}, onClear = () => {} }) {
  const [open, setOpen] = useState(false);

  const entries = Object.entries(memory);

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

      {/* Memory Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            right: "24px",
            width: "260px",
            background: "white",
            borderRadius: "10px",
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

          {entries.map(([key, value]) => (
            <div
              key={key}
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
                fontSize: "0.95rem"
              }}
            >
              <span>{key}</span>
              <span>{value}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}