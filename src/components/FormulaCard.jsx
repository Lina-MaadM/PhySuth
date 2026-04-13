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
        group relative cursor-pointer rounded-xl p-4
        flex flex-col transition-all duration-300 ease-out border
        ${flavour.soft} ${flavour.border}
        hover:scale-[1.015] hover:shadow-lg
        
        w-full max-w-[260px] md:max-w-[280px] min-h-[170px] mx-auto
      `}
    >
      {/* Header */}
      <div className="flex justify-between items-start gap-3 mb-1.5">
        <div className={`
          text-[8px] font-black uppercase tracking-wide px-2 py-[2px] rounded
          truncate bg-white/50 ${flavour.deep}
          group-hover:bg-white/20 group-hover:text-white transition-colors
        `}>
          {subtopic}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 text-white text-[11px] font-semibold tracking-wide shrink-0 relative top-[1px]">
          VIEW →
        </div>
      </div>

      {/* Formula */}
      <div className={`
        flex-1 flex items-center justify-center
        ${flavour.deep} group-hover:text-white transition-colors
      `}>
        <div className="text-xl font-bold max-w-full overflow-hidden">
          <InlineMath math={formula} />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-1.5 pt-2 border-t border-stone-200/40 group-hover:border-white/20">
        <h3 className="text-[12px] font-semibold text-stone-600 group-hover:text-white leading-snug line-clamp-2 min-h-[28px]">
          {name}
        </h3>
      </div>
    </div>
  );
}

export default FormulaCard;