import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";

import { formulaIndex, variableIndex } from "../data/physicsData";

import { BlockMath } from "react-katex";

import "katex/dist/katex.min.css";

import VariableList from "../components/VariableList";
import CalculatePanel from "../components/CalculatePanel";

function FormulaDetail({ memory, onSaveMemory, addHistory }) {

  const { id } = useParams();
  const location = useLocation();

  const targetEquation = formulaIndex[id];

  const usedVariables = useMemo(() => {

    if (!targetEquation) return [];

    return (targetEquation.variable || [])
      .map((key) => variableIndex[key])
      .filter(Boolean);

  }, [id]);

  if (!targetEquation) {
    return (
      <div className="p-6 pt-24 text-center">
        Equation not found
      </div>
    );
  }

  // history
  useEffect(() => {

    if (location.state?.fromHistory) return;

    addHistory({
      page: "formulaHistory",
      id: id,
      label: targetEquation.formula
    });

  }, [id]);

  return (
    <div className="p-6 pt-24 max-w-3xl mx-auto space-y-8">

      {/* Title */}
      <h1 className="text-2xl font-bold text-center">
        {targetEquation.name}
      </h1>

      {/* Formula */}
      <div className="text-lg text-center">
        <BlockMath math={targetEquation.formula} />
      </div>

      {/* Variables Section */}
      {usedVariables.length > 0 && (
        <div className="rounded-2xl border divide-y bg-white">
          {usedVariables.map((v) => (
            <VariableList
              key={v.key}
              varKey={v.key}
              symbol={v.symbol}
              name={v.name}
              unit={v.unit}
              description={v.description}
            />
          ))}
        </div>
      )}

      {/* Calculate Section */}
      <CalculatePanel
        formula={targetEquation}
        variables={usedVariables}
        memory={memory}
        onSaveMemory={onSaveMemory}
      />

    </div>
  );
}

export default FormulaDetail;