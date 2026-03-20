import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { variableIndex, formulaIndex } from "../data/physicsData";
import { InlineMath } from "react-katex";

import "katex/dist/katex.min.css";

import FormulaCard from "../components/FormulaCard";

function RelationView({ addHistory }) {

  const { key } = useParams();
  const location = useLocation();

  // หา variable จาก global index
  const variable = variableIndex[key];

  // หา formula ที่ใช้ variable นี้
  const formulas = useMemo(() => {

    if (!variable) return [];

    return Object.values(formulaIndex).filter((f) =>
      Array.isArray(f.variable) &&
      f.variable.includes(key)
    );

  }, [key, variable]);

  useEffect(() => {

    if (!variable) return;

    if (location.state?.fromHistory) return;

    addHistory({
      page: "variableHistory",
      key: key,
      label: variable.symbol
    });

  }, [key]);

  if (!variable) {
    return (
      <div className="p-6 pt-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Variable not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 pt-24 space-y-10 max-w-4xl mx-auto">

      <h1 className="text-3xl font-bold">
        <InlineMath math={variable.symbol} />
      </h1>

      <div className="border rounded-lg p-6 space-y-3">

        <h2 className="text-xl font-semibold">
          {variable.topic}
          {variable.subtopic && ` – ${variable.subtopic}`}
        </h2>

        <p className="font-medium">{variable.name}</p>

        {variable.unit && (
          <p className="text-sm text-gray-500">
            Unit: {variable.unit}
          </p>
        )}

        {variable.description && (
          <p className="text-gray-700">
            {variable.description}
          </p>
        )}

        {formulas.length > 0 && (
          <div className="pt-3">

            <p className="font-semibold mb-2">
              Appears in formula:
            </p>

            <div className="space-y-1">

              {formulas.map((f) => (
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

    </div>
  );
}

export default RelationView;