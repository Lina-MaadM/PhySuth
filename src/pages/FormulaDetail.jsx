import { useParams, useLocation } from "react-router-dom";
import { useEffect, useMemo } from "react";
import { formulaIndex, variableIndex } from "../data/physicsData";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

// Components
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

  //เลื่อนไปบนสุดเมื่อเข้าหน้า
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    if (!targetEquation) return;
    const entry = {
      page: "formula",
      id: id,
      key: id,
      label: targetEquation.formula
    };
    addHistory(entry, { fromHistory: location.state?.fromHistory });
  }, [id, targetEquation, location.state?.fromHistory, addHistory]);

  if (!targetEquation) {
    return <div className="p-6 pt-32 text-center text-stone-300">Equation not found</div>;
  }

  return (
    <div className="px-6 pt-24 pb-20 max-w-3xl mx-auto space-y-14 animate-in fade-in duration-500">
      
      {/* --- ส่วนที่ 1: Header และ Formula Card (แสดงผลตรงกลาง) --- */}
      <div className="space-y-6 flex flex-col items-center text-center">
        
        {/* ชื่อบท - ชื่อสูตร */}
        <div className="flex items-center gap-2 text-sm">
          <span className={`font-black uppercase tracking-wider ${flavour.deep}`}>
            {targetEquation.systemTopic}
          </span>
          <span className="text-stone-300">—</span>
          <h1 className="font-bold text-stone-600">
            {targetEquation.name}
          </h1>
        </div>

        {/* Formula Display: ปรับมาไว้ตรงกลางและขยายขนาดเล็กน้อย */}
        <div className={`
          inline-block
          px-10 py-6
          rounded-2xl
          bg-white
          border-2 ${flavour.border}
          shadow-sm
          transition-transform
          hover:scale-[1.01]
        `}>
          <div className={`text-2xl md:text-3xl ${flavour.deep}`}>
            <BlockMath math={targetEquation.formula} />
          </div>
        </div>
      </div>

      {/* --- ส่วนที่ 2: Content (Variables -> Calculator) --- */}
      {/* เพิ่ม space-y-12 เพื่อเว้นระยะห่างจากส่วนสูตรด้านบน */}
      <div className="space-y-12">
        
        {/* รายการตัวแปร */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 ml-1 whitespace-nowrap">
              Variable Index
            </h3>
            <div className="h-[1px] w-full bg-stone-100"></div>
          </div>

          <div className="rounded-2xl border-2 border-[#5d4037] bg-white overflow-hidden shadow-none">
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
        </div>

        {/* เครื่องคิดเลข */}
        <CalculatePanel
          formula={targetEquation}
          variables={usedVariables}
          memory={memory}
          onSaveMemory={onSaveMemory}
          flavour={flavour} 
        />
        
      </div>
    </div>
  );
}

export default FormulaDetail;