import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";
import { routeBuilder } from "../routes";

function FormulaCard({ id, name, formula, flavour, subtopic }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => id && navigate(routeBuilder.formula(id))}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = flavour.deepCode;
        e.currentTarget.style.borderColor = flavour.deepCode;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "";
        e.currentTarget.style.borderColor = "";
      }}
      className={`
        group relative cursor-pointer rounded-2xl p-5
        flex flex-col transition-all duration-300 ease-out border-2
        ${flavour.soft} ${flavour.border}
        hover:scale-[1.02] hover:shadow-xl
        /* Fix ขนาดให้เท่ากันทุกกล่อง */
        w-full max-w-[340px] h-[200px]
      `}
    >
      {/* 1. Header: จัดการพื้นที่ Subtopic กับป้าย VIEW */}
      <div className="flex justify-between items-start gap-4 mb-2">
        <div className={`
          text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded
          truncate bg-white/50 ${flavour.deep} 
          group-hover:bg-white/20 group-hover:text-white transition-colors
        `}>
          {subtopic}
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-[9px] font-bold mt-1 shrink-0">
          VIEW →
        </div>
      </div>

      {/* 2. Body: ส่วนแสดงสูตร จัดให้อยู่กลางพอดี */}
      <div className={`
        flex-1 flex items-center justify-center
        ${flavour.deep} group-hover:text-white transition-colors
      `}>
        {/* คุมขนาด InlineMath ไม่ให้ฉีดบรรทัดด้วยการใช้ scale เล็กน้อยถ้าสูตรยาว */}
        <div className="text-2xl font-bold max-w-full overflow-hidden">
          <InlineMath math={formula} />
        </div>
      </div>

      {/* 3. Footer: ชื่อสูตร ล็อคไว้ที่ 2 บรรทัดเสมอเพื่อให้เส้น Border อยู่ระดับเดียวกัน */}
      <div className="mt-2 pt-3 border-t border-stone-200/40 group-hover:border-white/20">
        <h3 className="text-[13px] font-bold text-stone-600 group-hover:text-white leading-tight line-clamp-2 min-h-[32px]">
          {name}
        </h3>
      </div>
    </div>
  );
}

export default FormulaCard;