import { InlineMath } from "react-katex";

// แสดงความสัมพันธ์ของ entry ปัจจุบันกับ entry ก่อนหน้าบน HistoryBar
// currentEntry คือ analyzed entry ที่ได้จาก HistoryAnalyze
function ConnectionBanner({ currentEntry }) {
  if (!currentEntry) return null;

  const { disconnected, crossTopic, sharedSymbols, prevLabel, prevTopic } = currentEntry;

  // entry แรกสุด ไม่มีตัวเปรียบ ไม่แสดงอะไร
  if (!prevLabel) return null;

  // ===== กำหนด content ตาม status =====

  let icon = null;
  let bgStyle = "";
  let textStyle = "";
  let borderStyle = "";
  let message = null;

  if (disconnected) {
    icon = "✕";
    bgStyle = "bg-red-50";
    borderStyle = "border-red-200";
    textStyle = "text-red-600";
    message = (
      <>
        No shared variables with{" "}
        <span className="font-bold">
          <InlineMath math={prevLabel} />
        </span>
      </>
    );
  } else if (crossTopic) {
    icon = "⇢";
    bgStyle = "bg-orange-50";
    borderStyle = "border-orange-200";
    textStyle = "text-orange-700";
    message = (
      <>
        Cross-topic from{" "}
        <span className="font-bold">{prevTopic}</span>
        {sharedSymbols?.length > 0 && (
          <>
            {" "}via{" "}
            {sharedSymbols.map((sym, i) => (
              <span key={i} className="font-bold">
                <InlineMath math={sym} />
                {i < sharedSymbols.length - 1 && ", "}
              </span>
            ))}
            <span className="opacity-60 ml-1 text-[10px]">(different context)</span>
          </>
        )}
      </>
    );
  } else {
    // connected, same topic
    icon = "✓";
    bgStyle = "bg-emerald-50";
    borderStyle = "border-emerald-200";
    textStyle = "text-emerald-700";
    message = (
      <>
        Shared with{" "}
        <span className="font-bold">
          <InlineMath math={prevLabel} />
        </span>
        {sharedSymbols?.length > 0 && (
          <>
            {" "}via{" "}
            {sharedSymbols.map((sym, i) => (
              <span key={i} className="font-bold">
                <InlineMath math={sym} />
                {i < sharedSymbols.length - 1 && ", "}
              </span>
            ))}
          </>
        )}
      </>
    );
  }

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-xs ${bgStyle} ${borderStyle} ${textStyle}`}
    >
      <span className="text-sm font-black shrink-0">{icon}</span>
      <span className="leading-relaxed">{message}</span>
    </div>
  );
}

export default ConnectionBanner;