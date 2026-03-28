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
// 1. normalize dataset: จัดการค่า Default และ isFixed
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
    topic: dataset.topic ?? "",
    subtopic: dataset.subtopic ?? "",
    description: dataset.description ?? "",

    // กรองและเติมค่าพื้นฐานให้ตัวแปร
    variable_sub: Array.isArray(dataset.variable_sub)
      ? dataset.variable_sub
          .filter((v) => v && v.key)
          .map((v) => ({
            ...v,
            // ถ้าไม่ได้กำหนด isFixed ให้เป็น false เสมอ
            isFixed: v.isFixed ?? false,
            // ส่งต่อ value ถ้ามี (เช่น 9.8) ถ้าไม่มีจะเป็น undefined
            value: v.value !== undefined ? v.value : undefined,
          }))
      : [],

    formula_sub: cleanedFormula,
  };
}

// --------------------------------------------
// 2. validate: ตรวจสอบตัวแปร (ข้ามพวก sqrt, pow)
function validateFormulaVariables(formula) {
  const declaredVars = new Set(formula.variable || []);
  
  // รายชื่อฟังก์ชันคณิตศาสตร์มาตรฐานที่ต้องข้าม
  const mathReserved = new Set(["sqrt", "pow", "abs", "sin", "cos", "tan", "Math"]);

  const calcVars = Object.values(formula.calculate || {})
    .flatMap((c) => {
      if (!c || typeof c.value !== "string") return [];
      // ดึงคำศัพท์ทั้งหมดที่ขึ้นต้นด้วยตัวอักษร
      return c.value.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    });

  // กรองเฉพาะตัวแปรที่มี "_" (คีย์เรา) และไม่ใช่คำสั่งคณิตศาสตร์
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
// 3. รวม glob → topic
function buildTopic(topicName, globResult) {
  const rawDatasets = Object.values(globResult).map((m) => m.default);

  const cleanedDatasets = rawDatasets
    .map(normalizeDataset)
    .filter((d) => d !== null);

  cleanedDatasets.forEach((dataset) => {
    // สร้าง variableIndex
    dataset.variable_sub.forEach((v) => {
      if (variableIndex[v.key]) {
        // ตามที่คุณตั้งใจไว้: ถ้ามีคีย์ซ้ำจะข้าม (ใช้ตัวแรกที่เจอเป็นหลัก)
        return;
      }
      variableIndex[v.key] = {
        ...v,
        topic: dataset.topic,
        subtopic: dataset.subtopic,
      };
    });

    // สร้าง formulaIndex
    dataset.formula_sub.forEach((formula) => {
      if (!validateFormulaVariables(formula)) return;

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