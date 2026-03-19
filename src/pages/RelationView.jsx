import { useParams, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { physicsTopics } from "../data/physicsData";
import { InlineMath } from "react-katex";

import "katex/dist/katex.min.css";

import FormulaCard from "../components/FormulaCard";

function RelationView({ addHistory }) {

  const { key } = useParams();
  const location = useLocation();

  const matches = [];

  physicsTopics.forEach((topicBlock) => {
    topicBlock.datasets.forEach((dataset) => {

      if (!Array.isArray(dataset.variable_sub)) return;

      dataset.variable_sub.forEach((v) => {

        if (v.key === key) {

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

  useEffect(() => {

    if (matches.length === 0) return;

    if (location.state?.fromHistory) return;

    addHistory({
      page: "variableHistory",
      key: key,
      label: matches[0].symbol
    });

  }, [key]);

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
        <InlineMath math={matches[0].symbol} />
      </h1>

      {matches.map((v, index) => (

        <div
          key={`${v.topic}-${v.key}-${index}`}
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

              <div className="space-y-1">

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