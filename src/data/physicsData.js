// --------------------------------------------
// Data layout:
//   variables/v-*.json  — variable registry per topic
//   formulas/*/*.json   — subtopic metadata + formula_sub only
// --------------------------------------------

const variableFiles = import.meta.glob("./variables/v-*.json", { eager: true });

const mechanics = import.meta.glob("./formulas/mechanics/*.json", { eager: true });
const electricity = import.meta.glob("./formulas/electricity/*.json", { eager: true });
const modernPhysics = import.meta.glob("./formulas/modern-physics/*.json", { eager: true });
const optics = import.meta.glob("./formulas/optics/*.json", { eager: true });
const thermodynamics = import.meta.glob("./formulas/thermodynamics/*.json", { eager: true });
const waves = import.meta.glob("./formulas/waves/*.json", { eager: true });

const TOPIC_GLOBS = {
  Mechanics: mechanics,
  Electricity: electricity,
  ModernPhysics: modernPhysics,
  Optics: optics,
  Thermodynamics: thermodynamics,
  Waves: waves,
};

const TOPIC_FROM_VAR_FILE = {
  mechanics: "Mechanics",
  electricity: "Electricity",
  "modern-physics": "ModernPhysics",
  optics: "Optics",
  thermodynamics: "Thermodynamics",
  waves: "Waves",
};

export const formulaIndex = {};
export const variableIndex = {};

function registerVariable(v, systemTopic, displayTopic) {
  if (!v?.key) return;
  if (variableIndex[v.key]) {
    console.warn("Duplicate variable skipped:", v.key);
    return;
  }

  variableIndex[v.key] = {
    ...v,
    isFixed: v.isFixed ?? false,
    value: v.value !== undefined ? v.value : undefined,
    topic: displayTopic,
    systemTopic,
    subtopic: "",
  };
}

function loadVariableRegistries() {
  Object.entries(variableFiles).forEach(([path, mod]) => {
    const slug = path.match(/v-([^.]+)\.json$/)?.[1];
    const systemTopic = TOPIC_FROM_VAR_FILE[slug];
    if (!systemTopic) {
      console.warn("Unknown variable file:", path);
      return;
    }

    const data = mod.default;
    const displayTopic = data?.topic || systemTopic;
    const variables = Array.isArray(data?.variables) ? data.variables : [];

    variables.forEach((v) => registerVariable(v, systemTopic, displayTopic));
  });
}

function normalizeDataset(dataset) {
  if (!dataset || typeof dataset !== "object") return null;
  if (!Array.isArray(dataset.formula_sub)) return null;

  const cleanedFormula = dataset.formula_sub.filter((f) => {
    if (!f || !f.id || typeof f.formula !== "string") {
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
    formula_sub: cleanedFormula,
  };
}

function validateFormulaVariables(formula) {
  const declaredVars = formula.variable || [];
  const missingRefs = declaredVars.filter((key) => !variableIndex[key]);

  if (missingRefs.length > 0) {
    console.warn(
      `Formula [${formula.id}] error: Unknown variable keys ->`,
      missingRefs
    );
    return false;
  }

  if (!formula.calculate) return true;

  const declaredSet = new Set(declaredVars);
  const mathReserved = new Set([
    "sqrt", "pow", "abs", "sin", "cos", "tan", "asin", "acos", "atan",
    "cosd", "sind", "tand", "acosd", "asind", "atand", "PI", "Math",
  ]);

  const calcVars = Object.values(formula.calculate)
    .flatMap((c) => {
      if (!c || typeof c.value !== "string") return [];
      return c.value.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [];
    });

  const usedVars = calcVars.filter(
    (v) => v.includes("_") && !mathReserved.has(v)
  );

  const missing = usedVars.filter((v) => !declaredSet.has(v));

  if (missing.length > 0) {
    console.warn(
      `Formula [${formula.id}] error: Missing variable definitions for ->`,
      missing
    );
    return false;
  }

  return true;
}

function buildTopic(systemTopic, globResult) {
  const cleanedDatasets = Object.values(globResult)
    .map((m) => normalizeDataset(m.default))
    .filter((d) => d !== null);

  cleanedDatasets.forEach((dataset) => {
    const displayTopic = dataset.topic || systemTopic;

    dataset.topic = displayTopic;
    dataset.systemTopic = systemTopic;

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
    topic: cleanedDatasets[0]?.topic || systemTopic,
    systemTopic,
    datasets: cleanedDatasets,
  };
}

loadVariableRegistries();

export const physicsTopics = Object.entries(TOPIC_GLOBS).map(([systemTopic, glob]) =>
  buildTopic(systemTopic, glob)
);
