import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { physicsTopics } from "../data/physicsData";
import { InlineMath } from "react-katex";
import { BlockMath } from "react-katex";

import "katex/dist/katex.min.css";

import FormulaCard from "../components/FormulaCard";


function RelationView({ addHistory }) {
  const { symbol } = useParams();
  const decodedSymbol = decodeURIComponent(symbol);

  useEffect(() => {
  if (!decodedSymbol) return;

  addHistory({
    page: "variableHistory",
    symbol: decodedSymbol,
    label: decodedSymbol
  });

  }, [decodedSymbol, addHistory]);
  
  const matches = [];

  physicsTopics.forEach((topicBlock) => {
    topicBlock.datasets.forEach((dataset) => {
      if (!Array.isArray(dataset.variable_sub)) return;

      dataset.variable_sub.forEach((v) => {
        if (v.symbol === decodedSymbol) {

          const filteredFormula = (dataset.formula_sub || []).filter(f =>
            Array.isArray(f.variable) &&
            f.variable.includes(v.key)
          );

          matches.push({
            ...v,
            topic: topicBlock.topic,
            subtopic: dataset.subtopic,
            formula: filteredFormula
          });
        }
      });
    });
  });

  if (matches.length === 0) {
    return (
      <div className="p-6 pt-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Variable not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 pt-24 space-y-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold">
        <InlineMath math={decodedSymbol} />
      </h1>

      {matches.map((v, index) => (
        <div
          key={`${v.topic}-${index}`}
          className="border rounded-lg p-6 space-y-3"
        >
          <h2 className="text-xl font-semibold">
            {v.topic}
            {v.subtopic && ` – ${v.subtopic}`}
          </h2>

          <p className="font-medium">{v.name}</p>

          {v.unit && (
            <p className="text-sm text-gray-500">
              Unit: {v.unit}
            </p>
          )}

          {v.description && (
            <p className="text-gray-700">
              {v.description}
            </p>
          )}

          {v.formula.length > 0 && (
            <div className="pt-3">
              <p className="font-semibold mb-2">
                Appears in formula:
              </p>

              <div className="list-disc list-inside space-y-1">
                {v.formula.map((f) => (
                  <FormulaCard
                    key={f.id}
                    id={f.id}
                    name={f.name}
                    formula={f.formula}
                    />
                  ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RelationView;