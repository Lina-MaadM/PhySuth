import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { variableIndex, formulaIndex } from "../data/physicsData";
import { allSweetFlavour } from "../allSweetFlavour"; 
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";
import FormulaCard from "../components/FormulaCard";

function RelationView({ addHistory }) {
  const { key } = useParams();
  const location = useLocation();

  const baseKey = key?.split("_")[0];

  const relatedVariables = useMemo(() => {
    return Object.values(variableIndex).filter((v) => {
      const vBase = v.key.split("_")[0];
      return vBase === baseKey;
    });
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

  const topicGroups = useMemo(() => {
    const groups = {};
    formulas.forEach((f) => {
      if (!groups[f.topic]) {
        groups[f.topic] = {
          topicName: f.topic,
          systemTopic: f.systemTopic,
          subGroups: {}
        };
      }
      const subKey = f.subtopic || "General";
      if (!groups[f.topic].subGroups[subKey]) {
        groups[f.topic].subGroups[subKey] = {
          subtopicName: f.subtopic,
          formulas: []
        };
      }
      groups[f.topic].subGroups[subKey].formulas.push(f);
    });
    return Object.values(groups);
  }, [formulas]);

  const currentVariable = variableIndex[key] || relatedVariables[0];

  useEffect(() => {
    if (!currentVariable) return;
    addHistory({
      page: "variable",
      id: key,
      key: key,
      label: currentVariable.symbol
    }, { fromHistory: location.state?.fromHistory });
  }, [key, currentVariable?.symbol, location.state?.fromHistory, addHistory]);

  if (!currentVariable) {
    return (
      <div className="p-6 pt-24 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-stone-400">Variable not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 pt-24 pb-20 space-y-12 max-w-6xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col items-center text-center space-y-3">
        <div className="bg-[#2d241e] text-[#fdfaf5] w-20 h-20 
             flex items-center justify-center rounded-md">
          <div className="text-3xl font-semibold">
            <InlineMath math={currentVariable.symbol} />
          </div>
        </div>

        <p className="text-base text-[#4a3728] font-medium">
          Formulas that use this variable
        </p>
      </div>

      {/* CONTENT */}
      <div className="space-y-16">
        {topicGroups.map((group) => {
          const flavour = allSweetFlavour[group.systemTopic] || allSweetFlavour.default;

          return (
            <div
              key={group.topicName}
              className={`border rounded-[2rem] p-6 md:p-8 bg-white space-y-8 ${flavour.border}`}
            >
              
              {/* TOPIC */}
              <div className="border-b-2 pb-3 border-stone-300">
                <h2 className={`text-2xl md:text-3xl font-bold ${flavour.deep}`}>
                  {group.topicName}
                </h2>
              </div>

              {Object.values(group.subGroups).map((subGroup, index, arr) => {
                const variableForGroup = relatedVariables.find(
                  (v) => v.topic === group.topicName && v.subtopic === subGroup.subtopicName
                ) || currentVariable;

                return (
                  <div key={subGroup.subtopicName || "gen"} className="space-y-4">

                    {/* VARIABLE INFO */}
                    <div className="bg-[#faf7f2] border border-[#e5dccb] rounded-xl p-4 space-y-2">

                      <p className="text-base text-[#3e2f23] leading-relaxed">
                        {subGroup.subtopicName && (
                          <span className={`${flavour.deep} font-semibold`}>
                            {subGroup.subtopicName}:
                          </span>
                        )}{" "}
                        <span className="font-semibold">
                          {variableForGroup.name}
                        </span>
                        {variableForGroup.unit && (
                          <span className="text-[#8c786a] ml-1">
                            (<InlineMath math={variableForGroup.unit} />)
                          </span>
                        )}
                      </p>

                      <div className="border-t border-[#e5dccb]" />

                      {variableForGroup.description && (
                        <p className="text-[#5e544d] text-sm leading-relaxed">
                          {variableForGroup.description}
                        </p>
                      )}
                    </div>

                    {/* FORMULAS GRID (3 ต่อแถว) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 
                         gap-5 lg:gap-6 w-full">
                      {subGroup.formulas.map((f) => (
                        <div key={f.id} className="flex justify-center">
                          <FormulaCard
                            id={f.id}
                            name={f.name}
                            formula={f.formula}
                            flavour={flavour}
                            subtopic={f.subtopic}
                          />
                        </div>
                      ))}
                    </div>

                    {/* DIVIDER */}
                    {index !== arr.length - 1 && (
                      <div className="border-t border-stone-200 pt-4"></div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RelationView;