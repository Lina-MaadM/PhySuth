import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";

function VariableCard({ symbol, name, unit, description }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/variable/${encodeURIComponent(symbol)}`)}
      className="
        group
        cursor-pointer
        rounded-2xl
        border
        bg-white
        p-5
        shadow-sm
        transition-all
        duration-200
        hover:shadow-lg
        hover:-translate-y-1
        hover:border-gray-300
        flex
        flex-col
        h-full
      "
    >
      {/* Symbol */}
      <div className="text-2xl font-mono mb-2">
        <InlineMath math={symbol} />
      </div>

      {/* Name */}
      <div className="font-semibold text-gray-800">
        {name}
      </div>

      {/* Optional description */}
      {description && (
        <div className="text-sm text-gray-500 mt-1 line-clamp-2">
          {description}
        </div>
      )}

      {/* Unit */}
      <div className="text-xs text-gray-500 mt-auto pt-3 border-t">
        Unit: {unit}
      </div>
    </div>
  );
}

export default VariableCard;