const INPUT_PATTERN = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;

export function isValidNumberInput(raw) {
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return true;
  return /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d*)?$/.test(raw);
}

export function parseNumberInput(raw) {
  if (raw === "" || raw === undefined) {
    return { ok: false, reason: "Missing input" };
  }

  if (!isValidNumberInput(raw)) {
    return { ok: false, reason: "Invalid number" };
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return { ok: false, reason: "Invalid number" };
  }

  return { ok: true, value };
}

export function formatNumberOutput(num) {
  if (!Number.isFinite(num)) return String(num);

  const abs = Math.abs(num);
  if (num !== 0 && (abs >= 1e6 || abs < 0.001)) {
    return num.toExponential(2).replace(/(\.\d*?[1-9])0+e/i, "$1e").replace(/\.0+e/i, "e");
  }

  return parseFloat(num.toPrecision(3));
}
