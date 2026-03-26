// --------------------------------------------
// ดึงไฟล์ JSON ทั้งหมดด้วย Vite glob
const mechanics = import.meta.glob(
  "./formulas/mechanics/*.json",
  { eager: true }
);

const electricity = import.meta.glob(
  "./formulas/electricity/*.json",
  { eager: true }
);

const modernPhysics = import.meta.glob(
  "./formulas/modern-physics/*.json",
  { eager: true }
);

const optics = import.meta.glob(
  "./formulas/optics/*.json",
  { eager: true }
);

const thermodynamics = import.meta.glob(
  "./formulas/thermodynamics/*.json",
  { eager: true }
);

const waves = import.meta.glob(
  "./formulas/waves/*.json",
  { eager: true }
);

// --------------------------------------------
// GLOBAL INDEX
export const formulaIndex = {};
export const variableIndex = {};

// --------------------------------------------
// normalize dataset ให้ตรงกับ schema ใหม่
function normalizeDataset(dataset) {
  if (!dataset || typeof dataset !== "object") return null;

  if (!Array.isArray(dataset.formula_sub)) return null;

  // กรองสูตรที่พัง
  const cleanedFormula = dataset.formula_sub.filter((f) => {
    if (!f || !f.id || typeof f.formula !== "string" || !f.calculate) {
      console.warn("Invalid formula removed:", f);
      return false;
    }
    return true;
  });

  if (cleanedFormula.length === 0) return null;

  return {
    topic: dataset.topic ?? "",
    subtopic: dataset.subtopic ?? "",
    description: dataset.description ?? "",

    // กรอง variable ที่พัง
    variable_sub: Array.isArray(dataset.variable_sub)
      ? dataset.variable_sub.filter((v) => {
          if (!v || !v.key) {
            console.warn("Invalid variable removed:", v);
            return false;
          }
          return true;
        })
      : [],

    formula_sub: cleanedFormula,
  };
}

// --------------------------------------------
// ตรวจว่าสูตรใช้ตัวแปรถูกต้องไหม
function validateFormulaVariables(formula) {
  const declaredVars = new Set(formula.variable || []);

  const calcVars = Object.values(formula.calculate || {})
    .flatMap((c) => {
      if (!c) return [];
      if (typeof c.value !== "string") return [];
      return c.value.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    });

  // เอาเฉพาะตัวแปรที่ดูเหมือน key จริง
  const usedVars = calcVars.filter((v) => v.includes("_"));

  const missing = usedVars.filter((v) => !declaredVars.has(v));

  if (missing.length > 0) {
    console.warn(
      "Formula skipped (undeclared variables):",
      formula.id,
      missing
    );
    return false;
  }

  return true;
}

// --------------------------------------------
// รวม glob → topic
function buildTopic(topicName, globResult) {
  const rawDatasets = Object.values(globResult).map(
    (m) => m.default
  );

  const cleanedDatasets = rawDatasets
    .map(normalizeDataset)
    .filter((d) => d !== null);

  cleanedDatasets.forEach((dataset) => {

    // ----------------------------------------
    // สร้าง variableIndex
    dataset.variable_sub.forEach((v) => {

      if (variableIndex[v.key]) {
        console.warn("Duplicate variable skipped:", v.key);
        return;
      }

      variableIndex[v.key] = {
        ...v,
        topic: dataset.topic,
        subtopic: dataset.subtopic
      };
    });

    // ----------------------------------------
    // สร้าง formulaIndex
    dataset.formula_sub.forEach((formula) => {

      if (!validateFormulaVariables(formula)) {
        console.warn("Formula skipped:", formula.id);
        return;
      }

      if (formulaIndex[formula.id]) {
        console.warn("Duplicate formula skipped:", formula.id);
        return;
      }

      formulaIndex[formula.id] = {
        ...formula,
        topic: formula.topic ?? dataset.topic,
        subtopic: formula.subtopic ?? dataset.subtopic,
      };
    });

  });

  return {
    topic: topicName,
    datasets: cleanedDatasets,
  };
}

// --------------------------------------------
// export
export const physicsTopics = [
  buildTopic("Mechanics", mechanics),
  buildTopic("Electricity", electricity),
  buildTopic("Modern Physics", modernPhysics),
  buildTopic("Optics", optics),
  buildTopic("Thermodynamics", thermodynamics),
  buildTopic("Waves", waves),
];