// --------------------------------------------
// ดึงไฟล์ JSON ทั้งหมดด้วย Vite glob
const mechanics = import.meta.glob("./formulas/mechanics/*.json", { eager: true });
const electricity = import.meta.glob("./formulas/electricity/*.json", { eager: true });
const modernPhysics = import.meta.glob("./formulas/modern-physics/*.json", { eager: true });
const optics = import.meta.glob("./formulas/optics/*.json", { eager: true });
const thermodynamics = import.meta.glob("./formulas/thermodynamics/*.json", { eager: true });
const waves = import.meta.glob("./formulas/waves/*.json", { eager: true });

// --------------------------------------------
// GLOBAL INDEX
export const formulaIndex = {};
export const variableIndex = {};

// --------------------------------------------
// 1. normalize dataset
function normalizeDataset(dataset) {
  if (!dataset || typeof dataset !== "object") return null;
  if (!Array.isArray(dataset.formula_sub)) return null;

  const cleanedFormula = dataset.formula_sub.filter((f) => {
    if (!f || !f.id || typeof f.formula !== "string" || !f.calculate) {
      console.warn("Invalid formula removed:", f?.id || "Unknown ID");
      return false;
    }
    return true;
  });

  if (cleanedFormula.length === 0) return null;

  return {
    topic: dataset.topic ?? "", // display topic
    subtopic: dataset.subtopic ?? "",
    description: dataset.description ?? "",

    variable_sub: Array.isArray(dataset.variable_sub)
      ? dataset.variable_sub
          .filter((v) => v && v.key)
          .map((v) => ({
            ...v,
            isFixed: v.isFixed ?? false,
            value: v.value !== undefined ? v.value : undefined,
          }))
      : [],

    formula_sub: cleanedFormula,
  };
}

// --------------------------------------------
// 2. validate variables
function validateFormulaVariables(formula) {
  const declaredVars = new Set(formula.variable || []);

  const mathReserved = new Set(["sqrt", "pow", "abs", "sin", "cos", "tan", "Math"]);

  const calcVars = Object.values(formula.calculate || {})
    .flatMap((c) => {
      if (!c || typeof c.value !== "string") return [];
      return c.value.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    });

  const usedVars = calcVars.filter(
    (v) => v.includes("_") && !mathReserved.has(v)
  );

  const missing = usedVars.filter((v) => !declaredVars.has(v));

  if (missing.length > 0) {
    console.warn(
      `Formula [${formula.id}] error: Missing variable definitions for ->`,
      missing
    );
    return false;
  }

  return true;
}

// --------------------------------------------
// 3. build topic
function buildTopic(systemTopic, globResult) {
  const rawDatasets = Object.values(globResult).map((m) => m.default);

  const cleanedDatasets = rawDatasets
    .map(normalizeDataset)
    .filter((d) => d !== null);

  cleanedDatasets.forEach((dataset) => {
    // ⭐ ใช้ topic จาก JSON ถ้ามี (สำหรับ UI)
    const displayTopic = dataset.topic || systemTopic;

    // ⭐ บังคับให้ทุก dataset ใช้ topic เดียวกันในระบบ
    dataset.topic = displayTopic;
    dataset.systemTopic = systemTopic;

    // VARIABLE INDEX
    dataset.variable_sub.forEach((v) => {
      if (variableIndex[v.key]) return;

      variableIndex[v.key] = {
        ...v,
        topic: displayTopic,
        systemTopic,
        subtopic: dataset.subtopic,
      };
    });

    // FORMULA INDEX
    dataset.formula_sub.forEach((formula) => {
      if (!validateFormulaVariables(formula)) return;

      if (formulaIndex[formula.id]) {
        console.warn("Duplicate formula skipped:", formula.id);
        return;
      }

      formulaIndex[formula.id] = {
        ...formula,
        topic: displayTopic,
        systemTopic,
        subtopic: dataset.subtopic,
      };
    });
  });

  return {
    topic: cleanedDatasets[0]?.topic || systemTopic, // UI
    systemTopic, // internal
    datasets: cleanedDatasets,
  };
}

// --------------------------------------------
// export
export const physicsTopics = [
  buildTopic("Mechanics", mechanics),
  buildTopic("Electricity", electricity),
  buildTopic("ModernPhysics", modernPhysics),
  buildTopic("Optics", optics),
  buildTopic("Thermodynamics", thermodynamics),
  buildTopic("Waves", waves),
];