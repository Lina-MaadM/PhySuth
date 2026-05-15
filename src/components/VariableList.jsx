import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";
import { routeBuilder } from "../routes";

function VariableList({ varKey, symbol, name, unit, description, isLast }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(routeBuilder.variable(varKey))}
      className={`
        group cursor-pointer flex items-center gap-5 px-5 py-4
        transition-colors duration-200 hover:bg-[#faf5f0]
        ${!isLast ? "border-b border-[#ddd0c4]" : ""}
      `}
    >
      {/* Symbol box */}
      <div className="flex items-center justify-center
        w-[56px] h-[56px] flex-shrink-0
        rounded-xl bg-[#ede3db] border border-[#cfc0b4]
        text-[#5d4037]
        group-hover:bg-[#e4d5c8] group-hover:border-[#b8a090]
        transition-colors duration-200"
      >
        <div className="text-xl font-bold group-hover:scale-110 transition-transform">
          <InlineMath math={symbol} />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-black text-[#3e2723] text-base leading-snug">
            {name}
          </span>
          <span className="text-[11px] font-semibold text-[#a1887f] bg-[#f0e6de] px-2 py-[1px] rounded-full border border-[#d7ccc8]">
            <InlineMath math={unit || "—"} />
          </span>
        </div>
        <p className="text-[13px] text-[#7a5c50] mt-[3px] line-clamp-1 group-hover:line-clamp-none transition-all leading-relaxed">
          {description}
        </p>
      </div>

      {/* Arrow */}
      <div className="flex-shrink-0 text-[#c4b0a4] group-hover:text-[#8d6e63] group-hover:translate-x-0.5 transition-all duration-200">
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth="2.5">
          <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default VariableList;