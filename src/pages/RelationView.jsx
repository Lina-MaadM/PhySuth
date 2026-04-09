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

  // ปรับ Logic การ Group: ชั้นแรก Group ด้วย Topic เพื่อให้อยู่ในกรอบเดียวกัน
  const topicGroups = useMemo(() => {
    const groups = {};

    formulas.forEach((f) => {
      if (!groups[f.topic]) {
        groups[f.topic] = {
          topicName: f.topic,
          subGroups: {} // เก็บ subtopics ย่อยข้างใน
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

  // สร้าง Entry ให้สะอาด
  const entry = {
    page: "variable",
    id: key,
    key: key,
    label: currentVariable.symbol
  };

  // ส่ง flag ไปเช็คด้วย (กันเหนียว)
  addHistory(entry, { fromHistory: location.state?.fromHistory });
  
  // สำคัญ: ใส่ Dependencies ให้ครบตามที่ ESLint แนะนำ
}, [key, currentVariable?.symbol, location.state?.fromHistory, addHistory]);

  if (!currentVariable) {
    return (
      <div className="p-6 pt-24 max-w-4xl mx-auto text-center">
        <h1 className="text-2xl font-bold">Variable not found</h1>
      </div>
    );
  }

  return (
    <div className="p-6 pt-24 space-y-10 max-w-4xl mx-auto">
      {/* Header ส่วนบนสุด */}
      <div className="text-center space-y-2">
        <h1 className="text-5xl font-bold">
          <InlineMath math={currentVariable.symbol} />
        </h1>
        {/*<p className="text-xl text-gray-600">{currentVariable.name}</p>*/}
      </div>

      <div className="space-y-8">
        {topicGroups.map((group) => (
          <div
            key={group.topicName}
            className="border rounded-xl p-6 shadow-sm bg-white space-y-6"
          >
            {/* หัวข้อใหญ่ของกรอบ (Topic) */}
            <div className="border-b pb-2">
              <h2 className="text-2xl font-bold text-blue-600 uppercase">
                {group.topicName}
              </h2>
            </div>

            {/* แสดงเนื้อหาแยกตาม Subtopic ภายในกรอบเดียวกัน */}
            {Object.values(group.subGroups).map((subGroup) => {
              // หาข้อมูลตัวแปรที่ตรงกับกลุ่มนี้เพื่อดึง Unit/Description มาแสดง
              const variableForGroup = relatedVariables.find(
                (v) => v.topic === group.topicName && v.subtopic === subGroup.subtopicName
              ) || currentVariable;

              return (
                <div key={subGroup.subtopicName || "gen"} className="space-y-4">
                  {/* หัวข้อย่อยและรายละเอียดตัวแปร */}
                  <div className="space-y-1">
                    {subGroup.subtopicName && (
                      <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">
                        {subGroup.subtopicName}
                      </h3>
                    )}
                    <p className="font-semibold text-lg">{variableForGroup.name}</p>
                    {variableForGroup.unit && (
                      <p className="text-sm text-gray-500">Unit: {variableForGroup.unit}</p>
                    )}
                    {variableForGroup.description && (
                      <p className="text-gray-600 text-sm italic">{variableForGroup.description}</p>
                    )}
                  </div>

                  {/* รายการการ์ดสูตร */}
                  <div className="space-y-2">
                    {subGroup.formulas.map((f) => (
                      <FormulaCard
                        key={f.id}
                        id={f.id}
                        name={f.name}
                        formula={f.formula}
                      />
                    ))}
                  </div>
                  
                  {/* เส้นคั่นระหว่าง Subtopic (ถ้ามีหลายอันในกรอบเดียว) */}
                  <div className="last:hidden border-t border-gray-50 pt-2"></div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default RelationView;