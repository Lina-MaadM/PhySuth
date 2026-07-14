import { create, all } from "mathjs";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

const math = create(all, {});

math.import(
  {
    cosd: (x) => math.cos(x * DEG),
    sind: (x) => math.sin(x * DEG),
    tand: (x) => math.tan(x * DEG),
    acosd: (x) => math.acos(x) * RAD,
    asind: (x) => math.asin(x) * RAD,
    atand: (x) => math.atan(x) * RAD,
  },
  { override: true }
);

function stripLhs(expression) {
  return expression.includes("=")
    ? expression.split("=")[1].trim()
    : expression;
}

export function evaluateExpression(expression, scope = {}) {
  const expr = stripLhs(expression);

  try {
    const value = math.evaluate(expr, scope);
    const num = typeof value === "number" ? value : Number(value);

    if (!Number.isFinite(num)) {
      return {
        ok: false,
        error: "Result is undefined (e.g. division by zero)",
      };
    }

    return { ok: true, value: num };
  } catch {
    return { ok: false, error: "Calculation failed" };
  }
}
