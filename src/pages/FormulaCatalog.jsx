import { physicsTopics } from "../data/physicsData";
import FormulaCard from "../components/FormulaCard";
import { allSweetFlavour } from "../allSweetFlavour";
import QuickNav from "../components/QuickNav";

// ======================
// Formula Catalog Page
// ======================
function FormulaCatalog() {
  return (

    // ─── Main Page Layout ───
    <div className="px-6 lg:px-12 py-12 pt-32 space-y-20 max-w-7xl mx-auto">
      
      {/* ─── Quick Navigation ─── */}
      <QuickNav 
        pageTitle="Formula Catalog" 
        pageSubtitle="Physic Formula Catalog" 
        topics={physicsTopics}
      />      
      
      {/* ======================
          Topic Sections
      ====================== */}
      {physicsTopics.map((topic) => {

        // Guard: ข้ามหาก topic ไม่มี datasets
        if (!topic || !Array.isArray(topic.datasets)) return null;
        
        // Theme: เลือกชุดสีตาม systemTopic
        const flavour = allSweetFlavour[topic.systemTopic] || allSweetFlavour.default;

        // Logic: นับจำนวนสูตรทั้งหมดภายใน topic
        const totalFormulas = topic.datasets.reduce((acc, curr) => {
          return acc + (curr.formula_sub?.length || 0);
        }, 0);

        return (

           // ─── Topic Container ───
          <div
            id={topic.systemTopic} 
            key={topic.topic} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ─── Main Topic Header ─── */}
            <div className="flex items-center gap-6 mb-12">

              {/* Topic Title */}
              <h1 className={`text-4xl font-black tracking-tight ${flavour.deep}`}>
                {topic.topic}
              </h1>

              {/* Decorative Divider */}
              <div className={`h-1 flex-1 rounded-full ${flavour.light} opacity-40`} />
              
              {/* แสดงจำนวนสูตรทั้งหมดในบทนี้ */}
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hidden sm:block">
                {totalFormulas} Formulas
              </span>
            </div>

            {/* ─── Subtopic Sections ─── */}
            <div className="space-y-20">

              {/* Filter: แสดงเฉพาะ subtopic เป็นอาเรย์ */}
              {topic.datasets
                .filter((dataItem) => dataItem && Array.isArray(dataItem.formula_sub))
                .map((dataItem) => (
                  <section key={dataItem.subtopic} className="space-y-8">

                    {/* ─── Subtopic Header ─── */}
                    <div className="border-l-4 pl-5 border-stone-200 py-1">

                      {/* Subtopic Title */}
                      <h2 className="text-xl font-black text-[#4a3728] tracking-tight">
                        {dataItem.subtopic}
                      </h2>

                      {/* Subtopic Description */}
                      {dataItem.description && (
                        <p className="text-sm text-stone-500 max-w-2xl mt-1 leading-relaxed">
                          {dataItem.description}
                        </p>
                      )}
                    </div>

                    {/* ─── Formula Grid Layout ─── */}
                    {/* ─── จำนวนการ์ดเมื่อขนาดจอมือถือ-1 เล็ก-2 สูงสุด-3 ต่อบรรทัด ─── */}
                    <div className="
                      grid
                      
                      grid-cols-1  
                      sm:grid-cols-2
                      lg:grid-cols-3
                      gap-x-6 gap-y-10
                      justify-items-center
                      ">

                      {/* Render: สร้าง FormulaCard สำหรับแต่ละสูตร */}
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