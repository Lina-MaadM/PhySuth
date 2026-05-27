import { allSweetFlavour } from "../allSweetFlavour";

function QuickNav({ pageTitle, pageSubtitle, topics }) {
  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="mb-16 space-y-8 animate-in fade-in duration-1000">
      {/* Title */}
      <div className="flex flex-col items-center text-center space-y-5">
        <h1 className="text-3xl font-black text-[#4a3728] tracking-[0.2em] uppercase italic opacity-90">
          {pageTitle}
        </h1>
        
        <div className="flex items-center gap-3">
          <div className="h-[1px] w-8 bg-stone-200"></div>
          <p className="text-[9px] font-bold text-stone-400 uppercase tracking-[0.3em]">
            {pageSubtitle}
          </p>
          <div className="h-[1px] w-8 bg-stone-200"></div>
        </div>
      </div>

      {/* แผงปุ่มพาวาร์ป */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-4xl mx-auto px-4">
        {topics.map((t) => {
          const flavour = allSweetFlavour[t.systemTopic] || allSweetFlavour.default;
          
          return (
            <button
              key={t.systemTopic}
              onClick={() => scrollToSection(t.systemTopic)}
              /* ใช้ Inline Style เพื่อดึง deepCode มาทำเป็นสีพื้นหลังตอน Hover */
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = flavour.deepCode;
                e.currentTarget.style.borderColor = flavour.deepCode;
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "";
                e.currentTarget.style.borderColor = "";
                e.currentTarget.style.color = "";
              }}
              className={`
                px-4 py-1.5 rounded-full border-2 text-[10px] font-black uppercase tracking-wider
                transition-all duration-300 active:scale-95
                bg-white ${flavour.border} ${flavour.deep}
                hover:shadow-md hover:-translate-y-0.5
              `}
            >
              {t.topic}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default QuickNav;