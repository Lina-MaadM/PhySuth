import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";
import { routeBuilder } from "../routes";

function VariableCard({ varKey, symbol, name, unit, description, flavour }) {
  const navigate = useNavigate();

  return (
    /* 1. Wrapper: ล็อคขนาดพื้นที่ของการ์ดไว้ (กัน Grid ขยับ) */
    <div className="w-[200px] h-[180px] relative group">
      <div
        onClick={() => varKey && navigate(routeBuilder.variable(varKey))}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = flavour.deepCode;
          e.currentTarget.style.borderColor = flavour.deepCode;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "";
          e.currentTarget.style.borderColor = "";
        }}
        className={`
          relative w-full z-10
          cursor-pointer rounded-2xl border
          p-5 flex flex-col min-h-[180px]
          transition-all duration-300 ease-out
          ${flavour.soft} ${flavour.border}

          /* Hover: กางความสูงออก และลอยขึ้น */
          hover:h-auto hover:z-50 hover:-translate-y-2 hover:shadow-2xl
        `}
      >
        {/* SYMBOL: ปรับให้แสดงผลกึ่งกลาง (Centered) */}
        <div className="flex justify-center mb-2">
          <div
            className={`
              min-w-[45px] h-10 px-3 flex items-center justify-center
              rounded-xl shrink-0
              ${flavour.light}
              group-hover:bg-white/20
              transition-all duration-300
            `}
          >
            <div className={`text-2xl font-bold ${flavour.deep} group-hover:text-white transition-all`}>
              {symbol && <InlineMath math={symbol} />}
            </div>
          </div>
        </div>

        {/* NAME: ปรับให้กึ่งกลางตามไอคอน */}
        <div className="
          font-bold text-center text-[#3e2f23] 
          group-hover:text-white 
          transition-colors 
          leading-tight h-[2.5rem] 
          flex items-center justify-center 
          line-clamp-2 overflow-hidden">
          {name}
        </div>

        {/* DESCRIPTION */}
        {description && (
          <div className="text-[11px] mt-2 text-center text-stone-600 group-hover:text-white/90 line-clamp-2 group-hover:line-clamp-none transition-all">
            {description}
          </div>
        )}

        {/* UNIT: Baseline ที่ส่วนท้าย */}
        <div className={`mt-auto pt-3 border-t border-dashed ${flavour.border} group-hover:border-white/30 flex justify-center items-center gap-1.5 text-xs ${flavour.deep} group-hover:text-white`}>
          <span className="opacity-70">Unit:</span>
          <span className="italic font-serif">
            <InlineMath math={unit || "N/A"} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default VariableCard;