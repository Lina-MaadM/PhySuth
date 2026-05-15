import { physicsTopics } from "../data/physicsData";
import FormulaCard from "../components/FormulaCard";
import { allSweetFlavour } from "../allSweetFlavour";
import QuickNav from "../components/QuickNav";

function FormulaCatalog() {
  return (
    <div className="px-6 lg:px-12 py-12 pt-32 space-y-20 max-w-7xl mx-auto">
      
      <QuickNav 
        pageTitle="Formula Catalog" 
        pageSubtitle="Physic Formula Catalog" 
        topics={physicsTopics}
      />      
      
      
      {physicsTopics.map((topic) => {

        
        if (!topic || !Array.isArray(topic.datasets)) return null;
        
        const flavour = allSweetFlavour[topic.systemTopic] || allSweetFlavour.default;

        {/* Logic: นับจำนวนสูตรทั้งหมดที่มีอยู่ในทุก datasets ของบทนี้ */}
        const totalFormulas = topic.datasets.reduce((acc, curr) => {
          return acc + (curr.formula_sub?.length || 0);
        }, 0);

        return (
          <div
            id={topic.systemTopic} 
            key={topic.topic} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* 1. ส่วนหัวของบทใหญ่ (Main Topic) */}
            <div className="flex items-center gap-6 mb-12">
              <h1 className={`text-4xl font-black tracking-tight ${flavour.deep}`}>
                {topic.topic}
              </h1>
              <div className={`h-1 flex-1 rounded-full ${flavour.light} opacity-40`} />
              
              {/* แสดงจำนวนสูตรทั้งหมดในบทนี้ */}
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hidden sm:block">
                {totalFormulas} Formulas
              </span>
            </div>

            <div className="space-y-20">
              {topic.datasets
                .filter((dataItem) => dataItem && Array.isArray(dataItem.formula_sub))
                .map((dataItem) => (
                  <section key={dataItem.subtopic} className="space-y-8">
                    {/* 2. ส่วนหัวของหมวดหมู่ย่อย (Subtopic) */}
                    <div className="border-l-4 pl-5 border-stone-200 py-1">
                      <h2 className="text-xl font-black text-[#4a3728] tracking-tight">
                        {dataItem.subtopic}
                      </h2>
                      {dataItem.description && (
                        <p className="text-sm text-stone-500 max-w-2xl mt-1 leading-relaxed">
                          {dataItem.description}
                        </p>
                      )}
                    </div>

                    {/* 3. Grid System: FormulaCards */}
                    <div className="
                      grid
                      grid-cols-1
                      sm:grid-cols-2
                      lg:grid-cols-3
                      gap-x-6 gap-y-10
                      justify-items-center
                      ">
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