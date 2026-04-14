import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";
import { routeBuilder } from "../routes";

function VariableList({ varKey, symbol, name, unit, description, isLast }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(routeBuilder.variable(varKey))}
      className={`
        group cursor-pointer flex items-center gap-6 px-6 py-5
        transition-colors duration-300 hover:bg-[#faf7f4]
        /* ใส่เส้นคั่นด้านล่าง ยกเว้นไอเทมสุดท้าย */
        ${!isLast ? 'border-b border-[#eaddd2]' : ''} 
      `}
    >
      {/* Symbol Box - ปรับให้ดูเด่นขึ้นในกรอบเข้ม */}
      <div className="flex items-center justify-center min-w-[64px] h-[64px] rounded-2xl bg-[#f5ece5] border border-[#d7ccc8] text-[#5d4037]">
        <div className="text-xl font-bold group-hover:scale-110 transition-transform">
          <InlineMath math={symbol} />
        </div>
      </div>

      {/* Text Section */}
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-black text-[#5d4037] text-lg">{name}</span>
          <span className="text-xs font-bold text-[#a1887f]">({unit})</span>
        </div>
        <p className="text-sm text-[#8d6e63] mt-1 line-clamp-1 group-hover:line-clamp-none">
          {description}
        </p>
      </div>

      {/* Icon เล็กๆ ปิดท้ายแถว */}
      <div className="text-[#d7ccc8] group-hover:text-[#8d6e63] transition-colors">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default VariableList;