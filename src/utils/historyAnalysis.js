/**
 * Shared history analysis — used by HistoryBar and SessionOverview.
 */

export function baseOf(key) {
  return key?.split("_")[0] || "";
}

export function resolveEntryMeta(entry, formulaIndex, variableIndex) {
  if (!entry) {
    return {
      topic: null,
      subtopic: null,
      systemTopic: null,
      variableKeys: [],
      symbols: [],
      label: "?",
    };
  }

  if (entry.page === "formula" && entry.id && formulaIndex[entry.id]) {
    const f = formulaIndex[entry.id];
    const variableKeys = f.variable || [];
    return {
      topic: f.topic,
      subtopic: f.subtopic,
      systemTopic: f.systemTopic,
      variableKeys,
      symbols: variableKeys.map((k) => variableIndex[k]?.symbol || k),
      label: entry.label || f.formula,
    };
  }

  if (entry.page === "variable" && entry.key && variableIndex[entry.key]) {
    const v = variableIndex[entry.key];
    return {
      topic: v.topic,
      subtopic: v.subtopic,
      systemTopic: v.systemTopic,
      variableKeys: [entry.key],
      symbols: [v.symbol],
      label: entry.label || v.symbol,
    };
  }

  // Fallback when page field is missing
  if (entry.id && formulaIndex[entry.id]) {
    const f = formulaIndex[entry.id];
    const variableKeys = f.variable || [];
    return {
      topic: f.topic,
      subtopic: f.subtopic,
      systemTopic: f.systemTopic,
      variableKeys,
      symbols: variableKeys.map((k) => variableIndex[k]?.symbol || k),
      label: entry.label || f.formula,
    };
  }

  if (entry.key && variableIndex[entry.key]) {
    const v = variableIndex[entry.key];
    return {
      topic: v.topic,
      subtopic: v.subtopic,
      systemTopic: v.systemTopic,
      variableKeys: [entry.key],
      symbols: [v.symbol],
      label: entry.label || v.symbol,
    };
  }

  return {
    topic: null,
    subtopic: null,
    systemTopic: null,
    variableKeys: [],
    symbols: [],
    label: entry.label || "?",
  };
}

export function getVarKeys(entry, formulaIndex, variableIndex) {
  return resolveEntryMeta(entry, formulaIndex, variableIndex).variableKeys;
}

export function getSharedWithPrev(currEntry, prevEntry, formulaIndex, variableIndex) {
  if (!prevEntry) return [];

  const curr = resolveEntryMeta(currEntry, formulaIndex, variableIndex).variableKeys;
  const prev = resolveEntryMeta(prevEntry, formulaIndex, variableIndex).variableKeys;

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

export function isRepeatEntry(entry, idx, history) {
  for (let i = 0; i < idx; i++) {
    if (history[i].id === entry.id && history[i].key === entry.key) return true;
  }
  return false;
}

export function analyzeEntryPair(entry, prevEntry, formulaIndex, variableIndex) {
  const meta = resolveEntryMeta(entry, formulaIndex, variableIndex);
  const prevMeta = prevEntry
    ? resolveEntryMeta(prevEntry, formulaIndex, variableIndex)
    : null;

  const prevBases = (prevMeta?.variableKeys || []).map(baseOf);
  const sharedWithPrev = getSharedWithPrev(entry, prevEntry, formulaIndex, variableIndex);
  const hasConnection = sharedWithPrev.length > 0;

  const sameTopic =
    prevMeta && prevMeta.topic && meta.topic
      ? prevMeta.topic === meta.topic
      : false;

  let crossTopic = false;
  let disconnected = false;

  if (prevEntry) {
    if (!hasConnection) {
      disconnected = true;
    } else if (!sameTopic) {
      crossTopic = true;
    }
  }

  const symbolRelations = meta.variableKeys.map((key) => {
    if (!prevEntry) return null;
    if (disconnected) return "new";

    const base = baseOf(key);
    if (prevMeta.variableKeys.includes(key)) return "shared";
    if (prevBases.includes(base)) return "cross-topic";
    return "new";
  });

  return {
    ...meta,
    sharedWithPrev,
    symbolRelations,
    crossTopic,
    disconnected,
    hasConnection,
    sameTopic,
  };
}

/**
 * Enrich raw history entries with analysis fields for UI components.
 */
export function analyzeHistory(
  history,
  { formulaIndex, variableIndex, currentEntry, onClickEntry } = {}
) {
  if (!history?.length) return [];

  const seen = new Set();

  return history.map((entry, i) => {
    const prev = history[i - 1];
    const analysis = analyzeEntryPair(entry, prev, formulaIndex, variableIndex);

    const uniqueKey = entry.id || entry.key;
    const repeat = seen.has(uniqueKey);
    seen.add(uniqueKey);

    const isMatchUrl =
      currentEntry &&
      ((currentEntry.id && currentEntry.id === entry.id) ||
        (currentEntry.key && currentEntry.key === entry.key));

    return {
      ...entry,
      id: entry.id || entry.key,
      key: entry.id || entry.key,
      topic: analysis.topic,
      subtopic: analysis.subtopic,
      systemTopic: analysis.systemTopic,
      symbols: analysis.symbols,
      variableKeys: analysis.variableKeys,
      symbolRelations: analysis.symbolRelations,
      sharedWithPrev: analysis.sharedWithPrev,
      crossTopic: analysis.crossTopic,
      disconnected: analysis.disconnected,
      hasConnection: analysis.hasConnection,
      sameTopic: analysis.sameTopic,
      repeat,
      isMatchUrl,
      isLatest: i === history.length - 1,
      label: analysis.label,
      onClick: () => onClickEntry?.(entry, i),
    };
  });
}
