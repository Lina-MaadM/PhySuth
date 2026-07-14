import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { formulaIndex, variableIndex } from "../data/physicsData";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

import VariableList from "../components/VariableList";
import CalculatePanel from "../components/CalculatePanel";
import { allSweetFlavour } from "../allSweetFlavour";

function FormulaDetail({ memory, onSaveMemory, addHistory }) {
  const { id } = useParams();
  const location = useLocation();

  const targetEquation = formulaIndex[id];

  const flavour = useMemo(() => {
    if (!targetEquation) return allSweetFlavour.default;
    return allSweetFlavour[targetEquation.systemTopic] || allSweetFlavour.default;
  }, [targetEquation]);

  const usedVariables = useMemo(() => {
    if (!targetEquation) return [];
    return (targetEquation.variable || [])
      .map((key) => variableIndex[key])
      .filter(Boolean);
  }, [id, targetEquation]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  useEffect(() => {
    if (!targetEquation) return;
    addHistory(
      { page: "formula", id, key: id, label: targetEquation.formula },
      { fromHistory: location.state?.fromHistory }
    );
  }, [id, targetEquation, location.state?.fromHistory, addHistory]);

  if (!targetEquation) {
    return <div className="p-6 pt-32 text-center text-stone-300">Equation not found</div>;
  }

  return (
    <div className="px-4 sm:px-8 pt-20 pb-28 max-w-6xl mx-auto animate-in fade-in duration-500">

      {/* ── Header ── */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <span className={`font-black uppercase tracking-wider ${flavour.deep}`}>
          {targetEquation.systemTopic}
        </span>
        <span className="text-stone-300">—</span>
        <h1 className="font-bold text-stone-500">{targetEquation.name}</h1>
      </div>

      {/* ── Formula Display ── */}
      <div className="flex justify-center mb-10">
        <div className={`
          px-10 py-6 rounded-2xl bg-white
          border-2 ${flavour.border}
          shadow-sm hover:scale-[1.01] transition-transform
        `}>
          <div className={`text-2xl md:text-3xl ${flavour.deep}`}>
            <BlockMath math={targetEquation.formula} />
          </div>
        </div>
      </div>

      {/* ── Two-column body ── */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">

        {/*  */}
        <div className="w-full lg:w-[400px] lg:flex-shrink-0 space-y-3">
          <div className="flex items-center gap-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 whitespace-nowrap">
              Variable Index
            </h3>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          <div className="rounded-2xl border-2 border-[#5d4037] bg-white overflow-hidden">
            {usedVariables.map((v, i) => (
              <VariableList
                key={v.key}
                varKey={v.key}
                symbol={v.symbol}
                name={v.name}
                unit={v.unit}
                description={v.description}
                isLast={i === usedVariables.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Right: Calculator */}
        <div className="flex-1 w-full">
          {targetEquation.calculate && (
            <CalculatePanel
              formula={targetEquation}
              variables={usedVariables}
              memory={memory}
              onSaveMemory={onSaveMemory}
              flavour={flavour}
            />
          )}
        </div>

      </div>
    </div>
  );
}

export default FormulaDetail;