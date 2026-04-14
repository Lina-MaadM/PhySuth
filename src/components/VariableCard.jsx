import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";
import { routeBuilder } from "../routes";

function VariableCard({ varKey, symbol, name, unit, description, flavour }) {
  const navigate = useNavigate();

  return (
    /* 1. กล่องนอกสุด (Wrapper): ล็อคความสูงไว้ที่ 170px เพื่อให้ Grid แถวเดียวกันไม่ขยับ */
    <div className="relative h-[170px]">
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
          /* 2. การ์ดจริง: ใช้ absolute และ z-index เพื่อให้ลอยทับใบอื่นเวลา Hover */
          absolute top-0 left-0 w-full z-10
          group cursor-pointer rounded-xl border
          p-4 flex flex-col min-h-[170px]
          transition-all duration-300 ease-out
          ${flavour.soft} ${flavour.border}
          
          /* เมื่อ Hover: ยืดความสูงอัตโนมัติ, ดันตัวขึ้นหน้าสุด, และยกตัวขึ้นเล็กน้อย */
          hover:h-auto hover:z-50 hover:-translate-y-1 hover:shadow-xl
        `}
      >
        {/* SYMBOL */}
        <div
          className={`
            min-w-[40px] w-fit h-10 px-2.5 flex items-center justify-center
            rounded-md mb-3 shrink-0
            ${flavour.light}
            group-hover:bg-white/20
            transition-all duration-300
          `}
        >
          <div
            className={`
              text-xl font-bold
              ${flavour.deep}
              group-hover:text-white
              transition-all duration-300 group-hover:scale-100
            `}
          >
            {symbol && <InlineMath math={symbol} />}
          </div>
        </div>

        {/* NAME */}
        <div
          className={`
            font-semibold text-sm text-[#3e2f23]
            group-hover:text-white
            transition-colors leading-tight
          `}
        >
          {name}
        </div>

        {/* DESCRIPTION: ปกติ 2 บรรทัด แต่เมื่อ Hover จะกางออกทั้งหมด */}
        {description && (
          <div
            className={`
              text-xs mt-1 leading-relaxed
              text-stone-600 group-hover:text-white/90
              line-clamp-2 group-hover:line-clamp-none
              transition-all duration-300
            `}
          >
            {description}
          </div>
        )}

        {/* UNIT: ส่วนท้ายการ์ดที่จัดการ Baseline ใหม่ */}
        <div
          className={`
            text-xs mt-auto pt-3 border-t
            ${flavour.border}
            ${flavour.deep}
            group-hover:text-white group-hover:border-white/30
            transition-colors flex items-center gap-1.5
          `}
        >
          <span className="opacity-70">Unit:</span>
          {/* ขยับสัญลักษณ์คณิตศาสตร์ลงเล็กน้อยเพื่อให้ตรงกับสายตาคำว่า Unit */}
          <span className="italic flex items-center leading-none translate-y-[0.5px]">
            <InlineMath math={unit || "N/A"} />
          </span>
        </div>
      </div>
    </div>
  );
}

export default VariableCard;