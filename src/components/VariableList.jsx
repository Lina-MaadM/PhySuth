// src/components/VariableList.jsx
import { useNavigate } from "react-router-dom";
import { InlineMath } from "react-katex";

function VariableList({ symbol, name, unit, description }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/variable/${encodeURIComponent(symbol)}`)}
      className="
        group
        cursor-pointer
        flex
        items-start
        gap-6
        px-6
        py-5
        transition
        hover:bg-gray-50
      "
    >
      {/* Symbol */}
      <div className="text-xl font-mono min-w-[80px]">
        <InlineMath math={symbol} />
      </div>

      {/* Text Section */}
      <div className="flex-1 space-y-1">
        <div className="font-semibold text-gray-800">
          {name}
        </div>

        {description && (
          <div className="text-sm text-gray-500">
            {description}
          </div>
        )}

        <div className="text-xs text-gray-500 pt-1">
          Unit: {unit}
        </div>
      </div>
    </div>
  );
}

export default VariableList;