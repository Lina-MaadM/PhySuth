import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { variableIndex, formulaIndex } from "../data/physicsData";
import { InlineMath } from "react-katex";

import "katex/dist/katex.min.css";
import FormulaCard from "../components/FormulaCard";

function RelationView({ addHistory }) {
  const { key } = useParams();
  const location = useLocation();

  const baseKey = key?.split("_")[0];

  // หา variable ที่มีรูปแบบ x_*
  const relatedVariables = useMemo(() => {
    return Object.values(variableIndex).filter((v) =>
      v.key.startsWith(baseKey + "_")
    );
  }, [baseKey]);

  const formulas = useMemo(() => {
    if (!relatedVariables.length) return [];

    const variableKeys = relatedVariables.map((v) => v.key);

    return Object.values(formulaIndex).filter(
      (f) =>
        Array.isArray(f.variable) &&
        f.variable.some((v) => variableKeys.includes(v))
    );
  }, [relatedVariables]);

  // group สูตรตาม topic
  const groupedFormulas = useMemo(() => {
    const groups = {};

    formulas.forEach((f) => {
      const groupKey = `${f.topic}__${f.subtopic || ""}`;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          topic: f.topic,
          subtopic: f.subtopic,
          formulas: [],
        };
      }

      groups[groupKey].formulas.push(f);
    });

    return Object.values(groups);
  }, [formulas]);

  const currentVariable = variableIndex[key] || relatedVariables[0];

  useEffect(() => {
    if (!currentVariable) return;
    if (location.state?.fromHistory) return;

    addHistory({
      page: "variableHistory",
      key: key,
      label: currentVariable.symbol,
    });
  }, [key]);

  if (!currentVariable) {
    return (
      <div className="p-6 pt-24 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center">Variable not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 pt-24 space-y-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center">
        <InlineMath math={currentVariable.symbol} />
      </h1>

      <div className="space-y-8">
        {groupedFormulas.map((group) => {
          // หา variable ที่ตรงกับ group นี้จริง ๆ
          const variableForGroup = relatedVariables.find(
            (v) =>
              v.topic === group.topic &&
              v.subtopic === group.subtopic
          );

          if (!variableForGroup) return null;

          return (
            <div
              key={group.topic + group.subtopic}
              className="border rounded-lg p-6 space-y-3"
            >
              <h2 className="text-xl font-semibold">
                {group.topic}
                {group.subtopic && ` – ${group.subtopic}`}
              </h2>

              <p className="font-medium">{variableForGroup.name}</p>

              {variableForGroup.unit && (
                <p className="text-sm text-gray-500">
                  Unit: {variableForGroup.unit}
                </p>
              )}

              {variableForGroup.description && (
                <p className="text-gray-700">
                  {variableForGroup.description}
                </p>
              )}

              <div className="pt-2">
                <p className="font-semibold mb-2">
                  Appears in formula:
                </p>

                <div className="space-y-2">
                  {group.formulas.map((f) => (
                    <FormulaCard
                      key={f.id}
                      id={f.id}
                      name={f.name}
                      formula={f.formula}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RelationView;