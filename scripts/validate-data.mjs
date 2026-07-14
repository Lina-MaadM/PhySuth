/**
 * Validate formula + variable JSON (split layout).
 * Usage: npm run data:validate
 */
import { readFileSync, readdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DATA = join(ROOT, "src", "data");
const FORMULAS_DIR = join(DATA, "formulas");
const VARIABLES_DIR = join(DATA, "variables");

const TOPIC_FOLDERS = {
  Mechanics: "mechanics",
  Electricity: "electricity",
  ModernPhysics: "modern-physics",
  Optics: "optics",
  Thermodynamics: "thermodynamics",
  Waves: "waves",
};

const VAR_FILE_SLUG = {
  Mechanics: "mechanics",
  Electricity: "electricity",
  ModernPhysics: "modern-physics",
  Optics: "optics",
  Thermodynamics: "thermodynamics",
  Waves: "waves",
};

const errors = [];
const warnings = [];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    errors.push(`${path}: invalid JSON — ${e.message}`);
    return null;
  }
}

const variableIndex = new Map();

for (const [systemTopic, slug] of Object.entries(VAR_FILE_SLUG)) {
  const path = join(VARIABLES_DIR, `v-${slug}.json`);
  if (!existsSync(path)) {
    errors.push(`Missing variable registry: v-${slug}.json`);
    continue;
  }

  const data = readJson(path);
  if (!data) continue;

  if (!Array.isArray(data.variables)) {
    errors.push(`${path}: must have "variables" array`);
    continue;
  }

  for (const v of data.variables) {
    if (!v?.key) {
      errors.push(`${path}: variable entry missing key`);
      continue;
    }
    if (variableIndex.has(v.key)) {
      errors.push(`Duplicate variable key: ${v.key}`);
      continue;
    }
    variableIndex.set(v.key, { ...v, systemTopic });
  }
}

const formulaIndex = new Map();

for (const [systemTopic, folder] of Object.entries(TOPIC_FOLDERS)) {
  const dir = join(FORMULAS_DIR, folder);

  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
    const path = join(dir, file);
    const data = readJson(path);
    if (!data) continue;

    if (data.variable_sub?.length) {
      errors.push(`${path}: legacy variable_sub found — move to variables/v-*.json`);
    }

    for (const f of data.formula_sub || []) {
      if (!f?.id) {
        errors.push(`${path}: formula missing id`);
        continue;
      }
      if (typeof f.formula !== "string") {
        errors.push(`${path}: [${f.id}] missing formula string`);
        continue;
      }

      if (formulaIndex.has(f.id)) {
        errors.push(`Duplicate formula id: ${f.id}`);
        continue;
      }
      formulaIndex.set(f.id, f);

      const declared = f.variable || [];
      const missingRefs = declared.filter((k) => !variableIndex.has(k));
      if (missingRefs.length) {
        errors.push(`[${f.id}] unknown variable keys: ${missingRefs.join(", ")}`);
      }

      if (!f.calculate) continue;

      const declaredSet = new Set(declared);
      const mathReserved = new Set([
        "sqrt", "pow", "abs", "sin", "cos", "tan", "asin", "acos", "atan",
        "cosd", "sind", "tand", "acosd", "asind", "atand", "PI", "Math",
      ]);
      const calcVars = Object.values(f.calculate)
        .flatMap((c) => c?.value?.match(/[a-zA-Z_][a-zA-Z0-9_]*/g) || [])
        .filter((v) => v.includes("_") && !mathReserved.has(v));

      const missingCalc = calcVars.filter((v) => !declaredSet.has(v));
      if (missingCalc.length) {
        errors.push(`[${f.id}] calculate references undeclared vars: ${missingCalc.join(", ")}`);
      }
    }
  }
}

console.log(`Variables: ${variableIndex.size}`);
console.log(`Formulas:  ${formulaIndex.size}`);

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  warnings.forEach((w) => console.log(`  ⚠ ${w}`));
}

if (errors.length) {
  console.log(`\nErrors (${errors.length}):`);
  errors.forEach((e) => console.log(`  ✗ ${e}`));
  process.exit(1);
}

console.log("\n✓ All data valid.");
