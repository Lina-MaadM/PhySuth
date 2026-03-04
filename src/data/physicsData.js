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
// normalize dataset ให้ตรงกับ schema ใหม่
function normalizeDataset(dataset) {
  if (!dataset || typeof dataset !== "object") return null;

  // ต้องมี formula_sub เป็น array
  if (!Array.isArray(dataset.formula_sub)) return null;

  // กรองเฉพาะสูตรที่ valid
  const cleanedFormula = dataset.formula_sub.filter(
    (f) =>
      f &&
      f.id &&
      typeof f.formula === "string"
  );

  if (cleanedFormula.length === 0) return null;

  return {
    topic: dataset.topic ?? "",
    subtopic: dataset.subtopic ?? "",
    description: dataset.description ?? "",

    // schema ใหม่
    variable_sub: Array.isArray(dataset.variable_sub)
      ? dataset.variable_sub
      : [],

    formula_sub: cleanedFormula,
  };
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