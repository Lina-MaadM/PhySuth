import { useState, useMemo, useEffect, useRef } from "react";
import { InlineMath } from "react-katex";
import "katex/dist/katex.min.css";

// ค่า fallback สำหรับ min/max ของตัวแปรที่ไม่ได้กำหนดขอบเขตไว้
const GLOBAL_MIN = -9999999;
const GLOBAL_MAX = 9999999;

// ─── LatexSelect ──────────────────────────────────────────────────────────────
// Dropdown แบบ custom ที่แสดงสัญลักษณ์ LaTeX แทน plain text
// ใช้เพื่อเลือก "ตัวแปรที่ต้องการหา (Solve for)"
// เหตุที่ไม่ใช้ <select> ธรรมดา → <option> ไม่รองรับ HTML/KaTeX render
function LatexSelect({ options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  // ปิด dropdown เมื่อคลิกนอก component
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* ปุ่มที่แสดงตัวเลือกปัจจุบัน — คลิกเพื่อ toggle dropdown */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3
          rounded-xl border-2 border-[#c9b9ae] bg-white
          hover:border-[#a1887f] focus:border-[#8d6e63] outline-none
          transition-all cursor-pointer"
      >
        <span className="flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <span className="text-lg font-bold text-[#5d4037] min-w-[28px] text-center">
                <InlineMath math={selected.symbol} />
              </span>
              <span className="text-sm text-[#7a5c50] truncate">{selected.label}</span>
            </>
          ) : (
            <span className="text-[#a1887f]">—</span>
          )}
        </span>
        {/* ลูกศรหมุนเมื่อ open */}
        <svg
          className={`w-4 h-4 flex-shrink-0 text-[#a1887f] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* รายการ dropdown — แสดงเฉพาะเมื่อ open === true */}
      {open && (
        <ul className="absolute left-0 right-0 top-[calc(100%+6px)] z-50
          bg-white border-2 border-[#c9b9ae] rounded-xl overflow-hidden shadow-lg">
          {options.map((opt) => {
            const isActive = opt.value === value;
            return (
              <li key={opt.value}>
                <button
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left
                    transition-colors hover:bg-[#faf5f0]
                    ${isActive ? "bg-[#f0e6de]" : ""}`}
                >
                  <span className={`text-base font-bold min-w-[28px] text-center
                    ${isActive ? "text-[#5d4037]" : "text-[#8d6e63]"}`}>
                    <InlineMath math={opt.symbol} />
                  </span>
                  <span className={`text-sm ${isActive ? "text-[#3e2723] font-semibold" : "text-[#7a5c50]"}`}>
                    {opt.label}
                  </span>
                  {/* checkmark สำหรับตัวเลือกที่ active */}
                  {isActive && (
                    <svg className="ml-auto w-3.5 h-3.5 text-[#8d6e63]" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── CalculatePanel ───────────────────────────────────────────────────────────
// Panel คำนวณสูตรฟิสิกส์ — รับสูตร 1 สูตร แล้วให้ผู้ใช้เลือกว่าจะหาตัวแปรไหน
//
// Props:
//   formula      — object สูตร (มี .variable[], .calculate{})
//   variables    — array ข้อมูลตัวแปร (ชื่อ, สัญลักษณ์, หน่วย, ขอบเขต, isFixed, value)
//   memory       — object ค่าที่จำไว้จากการคำนวณครั้งก่อน { [key]: number }
//   onSaveMemory — callback เมื่อคำนวณสำเร็จ → บันทึกค่าทุกตัวลง memory
export default function CalculatePanel({
  formula,
  variables = [],
  memory = {},
  onSaveMemory = () => {},
}) {
  const variableKeys = formula?.variable || [];

  // แปลง variables array → map { key: variableObject } เพื่อ lookup O(1)
  const variableMap = useMemo(() => {
    const map = {};
    variables.forEach((v) => (map[v.key] = v));
    return map;
  }, [variables]);

  // ตัวแปรที่ผู้ใช้เลือกได้ = ตัดตัวแปรค่าคงที่ (isFixed) ออก
  const editableKeys = useMemo(
    () => variableKeys.filter((key) => variableMap[key]?.isFixed !== true),
    [variableKeys, variableMap]
  );

  const [target, setTarget] = useState("");
  const [inputs, setInputs] = useState({});
  const [result, setResult] = useState(null);
  const [outputError, setOutputError] = useState(null); // error ที่เกิดจาก output (range, invalid calc)

  // fieldErrors: { [key]: string } — เก็บ error message แต่ละช่อง input แยกกัน
  // รองรับหลาย field พร้อมกัน (missing, out-of-range, invalid number)
  const [fieldErrors, setFieldErrors] = useState({});

  // ─── Effect: reset ทุกอย่างเมื่อ formula เปลี่ยน ──────────────────────────
  // ลำดับความสำคัญของ initial value: isFixed > memory > variable.value > ""
  useEffect(() => {
    const initialInputs = {};
    variableKeys.forEach((key) => {
      const v = variableMap[key];
      if (v?.isFixed) {
        // ค่าคงที่ฟิสิกส์ — ล็อกค่า ผู้ใช้แก้ไม่ได้
        initialInputs[key] = v.value;
      } else if (memory[key] !== undefined) {
        // ค่าที่จำมาจาก session — ใช้ก่อน
        initialInputs[key] = memory[key];
      } else if (v?.value !== undefined) {
        // ตัวแปรที่มี default value ใน JSON (เช่น g = 9.8) — pre-fill แต่แก้ได้
        initialInputs[key] = v.value;
      } else {
        initialInputs[key] = "";
      }
    });
    setInputs(initialInputs);
    setTarget(editableKeys[0] || "");
    setResult(null);
    setOutputError(null);
    setFieldErrors({});
  }, [formula]); // eslint-disable-line

  // ─── Effect: reset inputs เมื่อเปลี่ยน target ────────────────────────────
  // ล้างค่าเพื่อเริ่มชุดใหม่ แต่ยังคง default value จาก JSON ไว้
  useEffect(() => {
    if (!target) return;
    const newInputs = {};
    variableKeys.forEach((key) => {
      const v = variableMap[key];
      if (v?.isFixed) { newInputs[key] = v.value; return; }
      if (key === target) return; // target จะเป็น output — ไม่ต้อง set
      // ลำดับ: memory → default value จาก JSON → ""
      if (memory[key] !== undefined) newInputs[key] = memory[key];
      else if (v?.value !== undefined) newInputs[key] = v.value;
      else newInputs[key] = "";
    });
    setInputs(newInputs);
    setResult(null);
    setOutputError(null);
    setFieldErrors({});
  }, [target]); // eslint-disable-line

  // ตัวแปรที่ผู้ใช้ต้องกรอก = ทุกตัวในสูตร ยกเว้น target และ fixed
  const requiredVariables = useMemo(
    () => variableKeys.filter((key) => key !== target && variableMap[key]?.isFixed !== true),
    [variableKeys, target, variableMap]
  );

  // ─── Validation: รับเฉพาะตัวเลข (รวม negative และ decimal) ───────────────
  const isValidNumberInput = (val) => /^-?\d*\.?\d*$/.test(val);

  // ─── Handler: ผู้ใช้พิมพ์ค่าใน input ──────────────────────────────────────
  const handleChange = (key, value) => {
    if (!isValidNumberInput(value)) return;
    setInputs((prev) => ({ ...prev, [key]: value }));
    setResult(null);
    setOutputError(null);
    // ล้าง error ของ field นี้เมื่อผู้ใช้เริ่มแก้ไข
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // ─── หลัก: คำนวณผลลัพธ์ ──────────────────────────────────────────────────
  const handleCalculate = () => {
    // เริ่มต้น reset error ทุกประเภท
    const newFieldErrors = {};
    let hasFieldError = false;

    if (!formula?.calculate) {
      setOutputError("Invalid formula");
      return;
    }
    const calculation = formula.calculate[target];
    if (!calculation) {
      setOutputError("Invalid formula");
      return;
    }

    // ── ตรวจ input ทุกช่อง และสะสม error ไว้ใน newFieldErrors ──
    // ไม่ throw ทันที — วนครบแล้วค่อย render error ทุกช่องพร้อมกัน
    const values = {};
    for (const key of requiredVariables) {
      const v = variableMap[key];
      const raw = inputs[key];

      // กรณี: ช่องว่าง
      if (raw === "" || raw === undefined) {
        newFieldErrors[key] = "Missing input";
        hasFieldError = true;
        continue;
      }

      const val = Number(raw);

      // กรณี: ไม่ใช่ตัวเลขที่สมบูรณ์ (เช่น "-" หรือ ".")
      if (!isFinite(val)) {
        newFieldErrors[key] = "Invalid number";
        hasFieldError = true;
        continue;
      }

      // กรณี: ค่าอยู่นอก range ที่กำหนดใน JSON
      const min = v?.min ?? GLOBAL_MIN;
      const max = v?.max ?? GLOBAL_MAX;
      if (val < min || val > max) {
        newFieldErrors[key] = `Must be ${min} – ${max}`;
        hasFieldError = true;
        continue;
      }

      values[key] = val;
    }

    setFieldErrors(newFieldErrors);

    // หยุดถ้ามี field error — ไม่คำนวณต่อ
    if (hasFieldError) {
      setResult(null);
      setOutputError(null);
      return;
    }

    // ── คำนวณ expression ──
    try {
      let expression = calculation.value.includes("=")
        ? calculation.value.split("=")[1].trim()
        : calculation.value;

      // แทนค่า input variables (sort ยาวก่อนเพื่อป้องกัน "v" แทนใน "v0")
      Object.keys(values).sort((a, b) => b.length - a.length).forEach((key) => {
        expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), values[key]);
      });

      // แทนค่า fixed variables (ค่าคงที่ฟิสิกส์ เช่น g, c)
      variableKeys
        .filter((key) => variableMap[key]?.isFixed)
        .sort((a, b) => b.length - a.length)
        .forEach((key) => {
          expression = expression.replace(new RegExp(`\\b${key}\\b`, "g"), variableMap[key].value);
        });

      // ประเมิน expression ด้วย Function() พร้อม inject Math functions
      // ⚠️ expression มาจาก data ที่ developer เขียนเอง ไม่ใช่ user input
      let calculated;
      try {
        calculated = Function(
          "sqrt","pow","sin","cos","tan","asin","acos","atan","PI",
          `return ${expression}`
        )(Math.sqrt,Math.pow,Math.sin,Math.cos,Math.tan,Math.asin,Math.acos,Math.atan,Math.PI);
      } catch {
        setOutputError("Calculation failed");
        setResult(null);
        return;
      }

      // ตรวจผลลัพธ์: ต้องเป็นจำนวนจริง
      if (!isFinite(calculated)) {
        setOutputError("Result is undefined (e.g. division by zero)");
        setResult(null);
        return;
      }

      // ตรวจ range ของ output
      const minT = variableMap[target]?.min ?? GLOBAL_MIN;
      const maxT = variableMap[target]?.max ?? GLOBAL_MAX;
      if (calculated < minT || calculated > maxT) {
        setOutputError(`Result out of valid range (${minT} – ${maxT})`);
        setResult(null);
        return;
      }

      // toPrecision(6) → ไม่เกิน 6 หลักนัยสำคัญ, parseFloat ตัด trailing zero
      const formatted = parseFloat(calculated.toPrecision(6));
      setResult(formatted);
      setOutputError(null);

      // บันทึกค่าทุกตัว (input + output) ลง memory
      const memoryData = { ...memory };
      requiredVariables.forEach((key) => { memoryData[key] = values[key]; });
      memoryData[target] = formatted;
      onSaveMemory(memoryData);

    } catch (err) {
      setResult(null);
      setOutputError(err.message || "Unknown error");
    }
  };

  const currentVariable = variableMap[target];
  if (!formula) return null;

  const dropdownOptions = editableKeys.map((key) => ({
    value:  key,
    label:  variableMap[key]?.name   || key,
    symbol: variableMap[key]?.symbol || key,
  }));

  return (
    <div className="w-full p-7 rounded-[2rem] bg-white border-2 border-[#5d4037]">

      {/* Title */}
      <h3 className="text-lg font-black text-center mb-6 tracking-tight text-[#3e2723]">
        Physics Calculator
      </h3>

      {/* ── Solve for: เลือกตัวแปรที่ต้องการหา ── */}
      <div className="mb-6 p-4 bg-[#faf5f0] rounded-2xl border border-[#d7c8be]">
        <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-[#a1887f] mb-2 ml-1">
          Solve for variable
        </label>
        <LatexSelect options={dropdownOptions} value={target} onChange={setTarget} />
      </div>

      {/* ── Input fields: กรอกค่าตัวแปรที่รู้ ── */}
      <div className="flex flex-col gap-3">
        {variableKeys.map((key) => {
          const variable = variableMap[key];
          const fieldError = fieldErrors[key]; // error ของ field นี้ (string | undefined)
          const hasError = !!fieldError;

          if (key === target) return null; // ไม่แสดง input ของ target

          return (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center gap-3 px-1">

                {/* Symbol (LaTeX) */}
                <div className="w-12 flex-shrink-0 flex items-center justify-center
                  text-[#5d4037] font-bold text-xl">
                  {variable?.symbol ? <InlineMath math={variable.symbol} /> : key}
                </div>

                {/* Input box หรือ Fixed value display */}
                <div className="flex-1">
                  {variable?.isFixed ? (
                    // ค่าคงที่ — แสดงแบบ read-only ไม่มี error state
                    <div className="w-full px-4 py-3 rounded-xl
                      bg-[#f0e6de] border border-[#d7c8be]
                      text-right font-mono text-sm text-[#8d6e63] italic">
                      {variable.value}
                    </div>
                  ) : (
                    // input ปกติ — border แดงเมื่อมี error
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputs[key] ?? ""}
                      onChange={(e) => handleChange(key, e.target.value)}
                      placeholder="0.00"
                      className={`w-full px-4 py-3 rounded-xl text-right font-mono text-sm
                        transition-all outline-none border-2
                        ${hasError
                          ? "border-red-400 bg-red-50 text-red-700"
                          : "border-[#c9b9ae] focus:border-[#8d6e63] bg-white text-[#3e2723]"
                        }`}
                    />
                  )}
                </div>

                {/* Unit (LaTeX) */}
                <div className="w-16 flex-shrink-0 text-[11px] font-bold text-[#a1887f] tracking-tight text-left">
                  {variable?.unit ? <InlineMath math={variable.unit} /> : ""}
                </div>

              </div>

              {/* Error message ใต้ช่อง input — แสดงเฉพาะเมื่อมี error */}
              {hasError && (
                <div className="pl-[60px] pr-[76px]">
                  <p className="text-[14px] font-semibold text-red-600 leading-tight">
                    ⚠ {fieldError}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Result box: แสดงผลลัพธ์ / placeholder / output error ── */}
      <div className={`mt-7 min-h-[108px] flex flex-col items-center justify-center
        rounded-2xl border-2 px-6 py-5 transition-colors
        ${outputError
          ? "border-red-300 bg-red-50"           // output error → ขอบแดง
          : "border-[#d7c8be] bg-[#faf5f0]"      // ปกติ
        }`}>

        {/* กรณี: คำนวณสำเร็จ */}
        {result !== null && !outputError && (
          <div className="text-center animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]
              text-[#8d6e63] block mb-2 opacity-70">
              Solved Result
            </span>
            <div className="text-3xl font-black text-[#3e2723]">
              <InlineMath math={`${currentVariable?.symbol} = ${result}`} />
              <span className="ml-2 text-sm text-[#a1887f] lowercase font-medium">
                {currentVariable?.unit && <InlineMath math={currentVariable.unit} />}
              </span>
            </div>
          </div>
        )}

        {/* กรณี: ยังไม่ได้คำนวณ → placeholder จางๆ */}
        {result === null && !outputError && (
          <div className="text-center opacity-25">
            <div className="text-2xl font-bold text-[#8d6e63]">
              <InlineMath math={`${currentVariable?.symbol || "?"} = \\dots`} />
            </div>
          </div>
        )}

        {/* กรณี: output error — แสดงใน result box พร้อมข้อความใหญ่ขึ้น */}
        {outputError && (
          <div className="text-center animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-[13px] font-black text-red-700 tracking-wide">
              ⚠ {outputError}
            </p>
          </div>
        )}
      </div>

      {/* ── Calculate button ── */}
      <button
        onClick={handleCalculate}
        className="mt-6 w-full py-4 rounded-2xl bg-[#5d4037] hover:bg-[#3e2723]
          active:scale-[0.98] text-[#fdf8f4] font-black tracking-widest uppercase
          text-sm transition-all flex items-center justify-center gap-3 group"
      >
        <span>Process Calculation</span>
        <svg xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 group-hover:translate-x-1 transition-transform"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
        </svg>
      </button>

    </div>
  );
}