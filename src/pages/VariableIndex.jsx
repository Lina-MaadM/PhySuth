import { physicsTopics, variableIndex } from "../data/physicsData";
import VariableCard from "../components/VariableCard";
import { allSweetFlavour } from "../allSweetFlavour";
import QuickNav from "../components/QuickNav";

function VariableIndex() {
  return (
   
    <div className="px-6 lg:px-12 py-12 pt-32 space-y-24 max-w-7xl mx-auto">
      
      <QuickNav 
        pageTitle="Variable Index" 
        pageSubtitle="Physic Variable Index" 
        topics={physicsTopics}
      />  

      {physicsTopics.map((topicBlock) => {
        const { topic, systemTopic } = topicBlock;
        const flavour = allSweetFlavour[systemTopic] || allSweetFlavour.default;

        const variables = Object.values(variableIndex)
          .filter((v) => v.topic === topic)
          .sort((a, b) => a.key.localeCompare(b.key));

        if (variables.length === 0) return null;

        return (
          <div 
            id={systemTopic}
            key={topic} 
            className="animate-in fade-in slide-in-from-bottom-4 duration-700"
          >
            {/* ส่วนหัวของบทใหญ่ (Main Topic) - สไตล์เดียวกับ FormulaCatalog */}
            <div className="flex items-center gap-6 mb-12">
              <h1 className={`text-4xl font-black tracking-tight ${flavour.deep}`}>
                {topic}
              </h1>
              <div className={`h-1 flex-1 rounded-full ${flavour.light} opacity-40`} />
              
              {/* จำนวนตัวแปรแบบเล็กๆ ด้านหลัง ช่วยให้ดูเป็นคลังข้อมูล */}
              <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em] hidden sm:block">
                {variables.length} Variables
              </span>
            </div>

            {/* Grid Area: ใช้ Gap ที่กว้างขึ้นเพื่อให้หน้าเว็บดูไม่อึดอัด */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-6 gap-y-10 justify-items-center">
              {variables.map((v) => (
                <VariableCard
                  key={v.key}
                  varKey={v.key}
                  symbol={v.symbol}
                  name={v.name}
                  unit={v.unit}
                  description={v.description}
                  flavour={flavour}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default VariableIndex;