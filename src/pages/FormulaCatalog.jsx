import { physicsTopics } from "../data/physicsData";
import FormulaCard from "../components/FormulaCard";

function FormulaCatalog() {
  return (
    <div className="p-6 space-y-12">
      {physicsTopics.map((topic) => {
        if (!topic || !Array.isArray(topic.datasets)) return null;

        return (
          <div key={topic.topic} className="space-y-8">
            <h1 className="text-2xl font-bold">
              {topic.topic}
            </h1>

            {topic.datasets
              .filter(
                (dataItem) =>
                  dataItem &&
                  Array.isArray(dataItem.formula_sub)
              )
              .map((dataItem) => (
                <section
                  key={dataItem.subtopic}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold">
                    {dataItem.subtopic}
                  </h2>

                  <p className="text-gray-600">
                    {dataItem.description}
                  </p>

                  <div className="grid gap-4 mt-4">
                    {dataItem.formula_sub.map((formulaItem) => (
                      <FormulaCard
                        key={formulaItem.id}
                        id={formulaItem.id}
                        name={formulaItem.name}
                        formula={formulaItem.formula}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        );
      })}
    </div>
  );
}

export default FormulaCatalog;