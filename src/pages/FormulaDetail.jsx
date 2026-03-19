import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { physicsTopics } from "../data/physicsData";
import { BlockMath } from "react-katex";

import "katex/dist/katex.min.css";

import VariableList from "../components/VariableList";
import CalculatePanel from "../components/CalculatePanel";

function FormulaDetail({ memory, onSaveMemory, addHistory }) {
  const { id } = useParams();

  let targetEquation = null;
  let datasetVariables = [];

  // หา equation + dataset
  outer:
  for (const topic of physicsTopics) {
    for (const dataset of topic.datasets) {
      if (!Array.isArray(dataset?.formula_sub)) continue;

      const found = dataset.formula_sub.find(
        (f) => f.id === id
      );

      if (found) {
        targetEquation = found;
        datasetVariables = dataset.variable_sub ?? [];
        break outer;
      }
    }
  }

  if (!targetEquation) {
    return (
      <div className="p-6 pt-24 text-center">
        Equation not found
      </div>
    );
  }

  // history
  const location = useLocation();

  useEffect(() => {
    if (location.state?.fromHistory) return;

    if(!targetEquation) return;

    addHistory({
      page: "formulaHistory",
      id: id,
      label: targetEquation.formula
    })
  }, [id]); 

  // map variable key → object
  const usedVariables = datasetVariables.filter(
    (variable) =>
      Array.isArray(targetEquation.variable) &&
      targetEquation.variable.includes(variable.key)
  );

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
        variables={datasetVariables}
        memory={memory}
        onSaveMemory={onSaveMemory}
      />
    </div>
  );
}

export default FormulaDetail;