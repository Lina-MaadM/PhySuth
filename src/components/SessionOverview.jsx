import { useState, useMemo } from "react";
import { InlineMath } from "react-katex";
import { allSweetFlavour } from "../allSweetFlavour";

// ── Helpers ──────────────────────────────────────────────────────────────────

function baseOf(key) {
  return key?.split("_")[0] || "";
}

function getVarKeys(entry, formulaIndex, variableIndex) {
  if (entry.page === "formula") {
    return formulaIndex[entry.id]?.variable || [];
  }
  return variableIndex[entry.key] ? [entry.key] : [];
}

function getSharedWithPrev(currEntry, prevEntry, formulaIndex, variableIndex) {
  if (!prevEntry) return [];
  const curr = getVarKeys(currEntry, formulaIndex, variableIndex);
  const prev = getVarKeys(prevEntry, formulaIndex, variableIndex);

  const prevMap = {};
  prev.forEach((k) => {
    prevMap[baseOf(k)] = k;
  });

  return curr
    .filter((k) => prevMap[baseOf(k)] !== undefined)
    .map((k) => {
      const prevKey = prevMap[baseOf(k)];
      const cInfo = variableIndex[k] || {};
      const pInfo = variableIndex[prevKey] || {};
      return {
        key: k,
        base: baseOf(k),
        symbol: cInfo.symbol || baseOf(k),
        isCross: cInfo.systemTopic !== pInfo.systemTopic,
      };
    });
}

function isRepeatEntry(entry, idx, history) {
  for (let i = 0; i < idx; i++) {
    if (history[i].id === entry.id && history[i].key === entry.key) return true;
  }
  return false;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function VarChip({ varKey, variableIndex, memory, sharedMap }) {
  const info = variableIndex[varKey] || {};
  const sym = info.symbol || baseOf(varKey);
  const inMem = memory[varKey] !== undefined;
  const sharedInfo = sharedMap[varKey];
  const isSharedSame = sharedInfo && !sharedInfo.isCross;
  const isSharedCross = sharedInfo?.isCross;

  const fl = allSweetFlavour[info.systemTopic] || allSweetFlavour.default;

  let className =
    "text-[10px] px-[7px] py-[2px] rounded-full font-mono border ";
  let style = {};
  let title = `${info.name || sym}${info.unit ? ` (${info.unit})` : ""}`;

  if (inMem) {
    className += "border-emerald-400 text-emerald-800 bg-emerald-50 font-medium";
    title += " · saved in memory";
  } else if (isSharedCross) {
    className += "border-orange-300 text-orange-800 bg-orange-50 font-medium";
    title += " · same symbol — different topic, meaning may differ";
  } else if (isSharedSame) {
    // use topic colour inline
    style = {
      borderColor: fl.deepCode,
      color: fl.deepCode,
      backgroundColor: fl.deepCode + "18",
      fontWeight: 500,
    };
    title += " · shared with previous entry";
  } else {
    className += "border-[#E8DDD5] text-[#6B5344] bg-[#FFF8F2]";
  }

  return (
    <span className={className} style={style} title={title}>
      {inMem ? (
        <>
          <InlineMath math={sym} /> = {memory[varKey]}
        </>
      ) : (
        <InlineMath math={sym} />
      )}
    </span>
  );
}

function Bridge({ entryA, entryB, formulaIndex, variableIndex }) {
  const shared = getSharedWithPrev(entryB, entryA, formulaIndex, variableIndex);

  if (!shared.length) {
    return (
      <div className="ml-[35px] px-2 py-[3px] flex items-center gap-1">
        <span className="text-[9px] text-red-600">⚠ no shared variable</span>
      </div>
    );
  }

  const allCross = shared.every((b) => b.isCross);
  const someCross = shared.some((b) => b.isCross);

  const label = allCross
    ? "same symbol, may differ in meaning"
    : someCross
    ? "some may differ in meaning"
    : "shared with next";

  const labelColor = allCross || someCross ? "text-orange-600" : "text-[#9A8070]";

  return (
    <div className="ml-[35px] px-2 py-[3px] flex items-center gap-[5px] flex-wrap">
      {shared.map((b) => (
        <span
          key={b.key}
          className={`text-[10px] px-[6px] py-[1px] rounded-full font-mono border ${
            b.isCross
              ? "border-orange-300 text-orange-800 bg-orange-50"
              : "border-purple-300 text-purple-800 bg-purple-50"
          }`}
          title={b.isCross ? "Same symbol — different topic" : "Shared variable"}
        >
          <InlineMath math={b.symbol} />
        </span>
      ))}
      <span className={`text-[9px] ${labelColor}`}>{label}</span>
    </div>
  );
}

function EntryCard({ entry, idx, history, pointer, formulaIndex, variableIndex, memory, onClickEntry }) {
  const fData = formulaIndex[entry.id];
  const vData = variableIndex[entry.key];
  const sysT = fData?.systemTopic || vData?.systemTopic || "default";
  const fl = allSweetFlavour[sysT] || allSweetFlavour.default;

  const topic = fData?.topic || vData?.topic || "—";
  const name = fData?.name || vData?.name || "—";
  const formula = fData?.formula || entry.label || "?";

  const prev = idx > 0 ? history[idx - 1] : null;
  const isActive = idx === pointer;
  const repeat = isRepeatEntry(entry, idx, history);
  const swp = getSharedWithPrev(entry, prev, formulaIndex, variableIndex);
  const hasPrev = !!prev;
  const isDisc = hasPrev && swp.length === 0 && !repeat;
  const isCross = !isDisc && swp.some((v) => v.isCross);

  // state → dot + card border/bg
  let dotClass = "absolute left-[12px] top-[13px] w-3 h-3 rounded-full border-2 ";
  let cardBorder = "border-[#EEE5DC]";
  let cardBg = "bg-white";

  if (isActive) {
    dotClass += "border-blue-600 bg-blue-100";
    cardBorder = "border-blue-500";
    cardBg = "bg-blue-50";
  } else if (repeat) {
    dotClass += "border-pink-600 bg-pink-100";
    cardBorder = "border-pink-300";
    cardBg = "bg-pink-50/40";
  } else if (isDisc) {
    dotClass += "border-red-600 bg-red-100";
    cardBorder = "border-red-300";
    cardBg = "bg-red-50/40";
  } else if (isCross) {
    dotClass += "border-orange-500 bg-orange-100";
    cardBorder = "border-orange-300";
    cardBg = "bg-orange-50/30";
  } else {
    dotClass += "border-[#D5C8BC] bg-[#FFFAF6]";
  }

  // build sharedMap for VarChip
  const sharedMap = {};
  swp.forEach((s) => {
    sharedMap[s.key] = s;
  });

  const varKeys = getVarKeys(entry, formulaIndex, variableIndex);

  return (
    <div className="relative pl-9 pr-[14px]">
      {/* spine */}
      {idx < history.length - 1 && (
        <div className="absolute left-[18px] top-7 bottom-0 w-[1.5px] bg-[#EEE5DC]" />
      )}

      {/* dot */}
      <div className={dotClass} />

      {/* card */}
      <div
        className={`my-[5px] px-[11px] py-[10px] border-[1.5px] ${cardBorder} ${cardBg} rounded-xl cursor-pointer hover:border-[#D5C8BC] transition-colors duration-150`}
        onClick={() => onClickEntry?.(entry, idx)}
      >
        {/* top row */}
        <div className="flex items-start justify-between gap-2 mb-[3px]">
          <span className="text-[12px] font-medium font-mono text-[#2D241E] flex-1 min-w-0 break-all">
            <InlineMath math={formula} />
          </span>
          <span
            className="text-[9px] px-[7px] py-[2px] rounded-full border font-medium whitespace-nowrap flex-shrink-0"
            style={{
              color: fl.deepCode,
              borderColor: fl.deepCode + "55",
              backgroundColor: fl.deepCode + "15",
            }}
          >
            {topic}
          </span>
        </div>

        {/* name */}
        <div className="text-[10px] text-[#9A8070] mb-[5px]">
          {name}
          {repeat && (
            <span className="text-pink-600 ml-1">· revisited</span>
          )}
        </div>

        {/* variables */}
        {varKeys.length > 0 && (
          <div className="flex flex-wrap gap-[3px] pt-[6px] mt-[5px] border-t border-[#F0E8E0]">
            {varKeys.map((k) => (
              <VarChip
                key={k}
                varKey={k}
                variableIndex={variableIndex}
                memory={memory}
                sharedMap={sharedMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────

const LEGEND = [
  { cls: "border-blue-600 bg-blue-100",   label: "Current" },
  { cls: "border-[#D5C8BC] bg-[#FFFAF6]", label: "Normal" },
  { cls: "border-orange-500 bg-orange-100",label: "Cross-topic symbol" },
  { cls: "border-red-600 bg-red-100",      label: "No shared variable" },
  { cls: "border-pink-600 bg-pink-100",    label: "Revisited" },
];

// ── Main component ────────────────────────────────────────────────────────────

function SessionOverview({ history = [], pointer = -1, memory = {}, formulaIndex = {}, variableIndex = {}, onClickEntry }) {
  const [open, setOpen] = useState(false);

  const { entryCount, topicCount } = useMemo(() => {
    const topics = new Set(
      history.map((e) => formulaIndex[e.id]?.topic).filter(Boolean)
    );
    return { entryCount: history.length, topicCount: topics.size };
  }, [history, formulaIndex]);

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-[10px] bg-[#2D241E] text-[#FDF8F4] rounded-full text-[13px] font-medium shadow-lg hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all duration-150 border-2 border-white/10"
      >
        <div className="w-[18px] h-[18px] rounded-full bg-[#FDF8F4] text-[#2D241E] flex items-center justify-center text-[9px] font-bold flex-shrink-0">
          {history.length}
        </div>
        Session overview
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/20 z-[200]"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed left-6 bottom-20 w-[340px] max-h-[72vh] bg-[#FFFAF6] border-[1.5px] border-[#E8DDD5] rounded-2xl overflow-hidden flex flex-col z-[300] transition-all duration-200 ${
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-3 scale-[0.97] pointer-events-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[14px] py-[11px] border-b border-[#EEE5DC] bg-[#FFF8F2] flex-shrink-0">
          <div>
            <div className="text-[13px] font-medium text-[#2D241E]">Session overview</div>
            <div className="text-[10px] text-[#9A8070] mt-[1px]">
              {entryCount === 0
                ? "No entries yet"
                : `${entryCount} entr${entryCount !== 1 ? "ies" : "y"} · ${topicCount} topic${topicCount !== 1 ? "s" : ""}`}
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-[26px] h-[26px] flex items-center justify-center rounded-md text-[#9A8070] hover:bg-[#F0E8E0] hover:text-[#2D241E] text-lg transition-colors"
          >
            ×
          </button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto py-2">
          {history.length === 0 ? (
            <div className="px-4 py-8 text-center text-[#9A8070] text-[12px] leading-relaxed">
              No history yet.<br />Browse formulas to start building a session.
            </div>
          ) : (
            history.map((entry, i) => (
              <div key={`${entry.id || entry.key}-${i}`}>
                <EntryCard
                  entry={entry}
                  idx={i}
                  history={history}
                  pointer={pointer}
                  formulaIndex={formulaIndex}
                  variableIndex={variableIndex}
                  memory={memory}
                  onClickEntry={(e, idx) => {
                    onClickEntry?.(e, idx);
                    setOpen(false);
                  }}
                />
                {i < history.length - 1 && (
                  <Bridge
                    entryA={entry}
                    entryB={history[i + 1]}
                    formulaIndex={formulaIndex}
                    variableIndex={variableIndex}
                  />
                )}
              </div>
            ))
          )}
        </div>

        {/* Legend */}
        <div className="flex-shrink-0 px-[14px] py-2 border-t border-[#EEE5DC] bg-[#FFF8F2] flex flex-wrap gap-x-[14px] gap-y-[5px]">
          {LEGEND.map(({ cls, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full border-2 ${cls}`} />
              <span className="text-[9px] text-[#9A8070]">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default SessionOverview;