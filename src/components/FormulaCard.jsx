import { useNavigate } from "react-router-dom";
import { BlockMath } from "react-katex";

function FormulaCard({ id, name, formula }) {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/formula/${id}`)}
      className="
        cursor-pointer
        rounded-xl
        border
        bg-blue-100
        p-4
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