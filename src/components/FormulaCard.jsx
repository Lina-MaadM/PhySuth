import { useNavigate } from "react-router-dom";
import { BlockMath } from "react-katex";
import { routeBuilder } from "../routes";

function FormulaCard({ id, name, formula }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => id && navigate(routeBuilder.formula(id))}
      className="
        cursor-pointer
        rounded-xl
        bg-blue-100
        p-4
        max-w-xl
        mx-auto
        shadow-sm
        transition
        hover:shadow-md
        hover:-translate-y-0.5
      "
    >
      {name && (
        <div className="mb-2 text-sm font-medium text-gray-700 text-center">
          {name}
        </div>
      )}
      

      <div className="text-center">
        <BlockMath math={formula} />
        
      </div>
    </div>
  );
}

export default FormulaCard;