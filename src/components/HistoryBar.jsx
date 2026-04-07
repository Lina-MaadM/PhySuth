import { InlineMath } from "react-katex";
import { useNavigate, useLocation } from "react-router-dom";
import { routeBuilder } from "../routes";
import { useState, useEffect, useMemo, useRef } from "react";

function HistoryBar({ history = [], onClear }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [flash, setFlash] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [visible, setVisible] = useState(true);
  
  const prevHistoryLength = useRef(history.length);
  const [activeIndex, setActiveIndex] = useState(history.length - 1);

  const [clickedIndex, setClickedIndex] = useState(null);
  const lastScroll = useRef(0);
  const hoverTimer = useRef(null);
  const scrollRef = useRef(null);

  // ฟังก์ชันช่วยดึงค่า ID/Key แบบเป็นกลาง
  const getItemId = (item) => item.id || item.key;

  // =========================================================
    // 🔥 CORE LOGIC: แก้ไขเรื่องการ Sync ไฮไลท์ไม่ให้ดีดกลับ
    // =========================================================
    useEffect(() => {
      // กรณีที่ 1: มีการเพิ่มประวัติใหม่ (Length เพิ่มขึ้น)
      if (history.length > prevHistoryLength.current) {
        setActiveIndex(history.length - 1);
        setClickedIndex(null); // ล้างค่าที่คลิก เพราะเราไปหน้าใหม่ล่าสุดแล้ว
        
        if (scrollRef.current) {
          scrollRef.current.scrollTo({
            left: scrollRef.current.scrollWidth,
            behavior: "smooth"
          });
        }
      } 
      // กรณีที่ 2: กดย้อนดูหรือเปลี่ยนหน้า (Length เท่าเดิม)
      else {
        // ถ้าเพิ่งคลิกมา ให้เชื่อ index ที่คลิกเป็นอันดับแรก
        if (clickedIndex !== null) {
          setActiveIndex(clickedIndex);
        } 
        else {
          // ถ้าไม่ได้คลิก (เช่น กด Back/Forward หรือพิมพ์ URL) 
          // ให้ค้นหาจาก "ท้ายย้อนกลับมา" เพื่อให้เจอตัวล่าสุดที่ตรงกับหน้าปัจจุบัน
          const reversedIndex = [...history].reverse().findIndex(item => {
            const id = getItemId(item);
            return id && location.pathname.includes(id);
          });

          if (reversedIndex !== -1) {
            // แปลงจาก index ที่ reverse กลับเป็น index ปกติ
            setActiveIndex(history.length - 1 - reversedIndex);
          }
        }
      }
      prevHistoryLength.current = history.length;
    }, [history.length, location.pathname, clickedIndex]);

  const currentItem = history[activeIndex];

  // Logic การซ่อน/แสดง Bar เมื่อ Scroll
  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY;
      setVisible(!(current > lastScroll.current && current > 120));
      lastScroll.current = current;
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const warning = useMemo(() => {
    if (!currentItem) return null;
    if (currentItem.disconnected)
      return { text: "⚠ No shared symbol with previous step", color: "bg-red-500" };
    if (currentItem.crossTopic)
      return { text: `⚠ Cross topic: ${currentItem.topic}`, color: "bg-orange-500 text-black" };
    if (currentItem.repeat)
      return { text: "↻ Revisited", color: "bg-pink-400" };
    return null;
  }, [currentItem]);

  useEffect(() => {
    if (!warning || warning.text.includes("Revisited")) return;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 1200);
    return () => clearTimeout(timer);
  }, [warning]);

  const handleMouseEnter = (item) => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredItem(item);
  };

  const handleMouseLeave = () => {
    hoverTimer.current = setTimeout(() => {
      setHoveredItem(null);
    }, 1000);
  };

  // 🔥 ฟังก์ชันคลิก: แก้ไขเรื่อง Key และการส่ง State
  const handleClick = (item, index) => {
    // 1. อัปเดตตำแหน่งไฮไลท์ทันที
    setClickedIndex(index);
    setActiveIndex(index);
    
    // 2. เรียก callback เดิม (ถ้ามี)
    if (item.onClick) item.onClick(); 

  };

  return (
    <div
      className={`fixed left-0 right-0 top-[72px] z-40 transition-transform duration-300 ${
        visible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="w-full border-b border-[#EADFD8] bg-[#FFF8F0]/90 backdrop-blur-sm p-3 flex items-center shadow-sm">
        <button
          onClick={() => onClear?.()}
          className="mr-4 px-4 py-1.5 text-xs font-bold tracking-wider text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0 flex items-center gap-1"
        >
          🗑 Clear
        </button>

        <div
          ref={scrollRef}
          className="flex-1 overflow-x-auto whitespace-nowrap pr-16 no-scrollbar"
        >
          <div className="flex gap-3 items-center">
            {history.length === 0 && (
              <span className="text-sm text-gray-400 ml-2">No history yet</span>
            )}

            {history.map((item, index) => {
              let extraStyle = "bg-[#FFFAF5] border border-[#F3E8E2] text-[#5A3E36]";
              let hasWarning = false;

              if (item.repeat) {
                extraStyle = "bg-pink-100 text-black border-pink-200";
                hasWarning = true;
              }
              if (item.disconnected) {
                extraStyle = "bg-red-100 text-black border-red-200";
                hasWarning = true;
              }
              if (item.crossTopic) {
                extraStyle = "bg-orange-100 text-black border-orange-200";
                hasWarning = true;
              }

              // ไฮไลท์ตาม activeIndex
              const isCurrent = index === activeIndex;
              let highlightStyle = "";
              
              if (isCurrent) {
                if (hasWarning) {
                  if (item.repeat) highlightStyle = "bg-pink-500 text-white border-pink-600 shadow-md";
                  if (item.disconnected) highlightStyle = "bg-red-500 text-white border-red-600 shadow-md";
                  if (item.crossTopic) highlightStyle = "bg-orange-500 text-white border-orange-600 shadow-md";
                } else {
                  highlightStyle = "bg-blue-600 text-white border-blue-700 shadow-md";
                }
              }

              return (
                <div
                  key={`${item.page}-${getItemId(item)}-${index}`}
                  className="shrink-0 py-1"
                  onMouseEnter={() => handleMouseEnter(item)}
                  onMouseLeave={handleMouseLeave}
                >
                  <div
                    onClick={() => handleClick(item, index)}
                    className={`px-5 py-1.5 rounded-full text-sm cursor-pointer whitespace-nowrap transition-all duration-300 hover:scale-110 hover:-translate-y-0.5 shadow-sm hover:shadow-md ${extraStyle} ${highlightStyle}`}
                  >
                    <InlineMath math={item.label} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {hoveredItem && (
        <div
          className="fixed left-1/2 -translate-x-1/2 top-[135px] z-[9999] w-60 p-4 bg-white/95 backdrop-blur-md border border-stone-200 shadow-2xl rounded-2xl text-sm animate-in fade-in zoom-in duration-200"
          onMouseEnter={() => {
            if (hoverTimer.current) clearTimeout(hoverTimer.current);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="font-bold mb-2 border-b border-stone-100 pb-2 text-stone-800">
            <InlineMath math={hoveredItem.label} />
          </div>
          {hoveredItem.topic && (
            <div className="text-stone-500 text-xs">
              <span className="font-bold text-[#2D241E] px-2 py-0.5 bg-stone-100 rounded-md mr-2">
                {hoveredItem.topic}
              </span>
            </div>
          )}
          {hoveredItem.symbols?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {hoveredItem.symbols.map((sym, i) => (
                <span key={i} className="px-2 py-1 bg-stone-50 border border-stone-100 rounded-lg text-[10px] text-stone-600 shadow-sm">
                  <InlineMath math={sym} />
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {warning && (
        <div className={`w-full text-[11px] font-bold tracking-wide px-4 py-1.5 flex justify-center text-white transition-colors duration-500 ${warning.color} ${flash ? "animate-pulse" : ""}`}>
          {warning.text.toUpperCase()}
        </div>
      )}
    </div>
  );
}

export default HistoryBar;