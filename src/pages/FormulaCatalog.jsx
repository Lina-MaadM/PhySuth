import { physicsTopics } from "../data/physicsData";
import FormulaCard from "../components/FormulaCard";
import { allSweetFlavour } from "../allSweetFlavour";

function FormulaCatalog() {
  return (
    <div className="px-6 lg:px-12 py-12 space-y-20 max-w-7xl mx-auto">
      {physicsTopics.map((topic) => {
        if (!topic || !Array.isArray(topic.datasets)) return null;
        
        // ดึงสีตามบทใหญ่ (เช่น Mechanics, Electricity)
        const flavour = allSweetFlavour[topic.systemTopic] || allSweetFlavour.default;

        return (
          <div key={topic.topic} className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* ส่วนหัวของบทใหญ่ (Main Topic) */}
            <div className="flex items-center gap-6 mb-10">
              <h1 className={`text-4xl font-black tracking-tight ${flavour.deep}`}>
                {topic.topic}
              </h1>
              <div className={`h-1 flex-1 rounded-full ${flavour.light} opacity-40`} />
            </div>

            <div className="space-y-16">
              {topic.datasets
                .filter((dataItem) => dataItem && Array.isArray(dataItem.formula_sub))
                .map((dataItem) => (
                  <section key={dataItem.subtopic} className="space-y-6">
                    {/* ส่วนหัวของหมวดหมู่ย่อย (Subtopic) */}
                    <div className="border-l-4 pl-4 border-stone-200">
                      <h2 className="text-xl font-bold text-stone-800">{dataItem.subtopic}</h2>
                      <p className="text-sm text-stone-500 max-w-2xl">{dataItem.description}</p>
                    </div>

                    {/* Grid System: แสดงผล 1 คอลัมน์ (Mobile), 2 (Tablet/Half Screen), 3 (Desktop) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
                      {dataItem.formula_sub.map((formulaItem) => (
                        <FormulaCard
                          key={formulaItem.id}
                          id={formulaItem.id}
                          name={formulaItem.name}
                          formula={formulaItem.formula}
                          flavour={flavour}
                          subtopic={dataItem.subtopic}
                        />
                      ))}
                    </div>
                  </section>
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FormulaCatalog;