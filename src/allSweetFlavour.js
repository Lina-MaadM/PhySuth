// allSweetFlavour.js - ศูนย์รวมสีสันของแต่ละ Topic
export const allSweetFlavour = {
  // Mechanics (รส Mint - เขียวเหนี่ยวทรัพย์) : เลือกโทนเขียวมรกต/มิ้นต์ เพราะให้ความรู้สึกมั่นคงและชัดเจน
  mechanics: {
    deep: "text-emerald-700",
    border: "border-emerald-200",
    light: "bg-emerald-100",
    soft: "bg-emerald-50",
    accent: "bg-emerald-500" // สำหรับใช้เป็นจุดเด่นเล็กๆ
  },

  // Electricity (รส Lemon/Honey - เหลืองทอง) : สีเหลืองที่ติดโทนอุ่น ไม่ใช่เหลืองนีออนจนแสบตา
  electricity: {
    deep: "text-amber-700",
    border: "border-amber-200",
    light: "bg-amber-100",
    soft: "bg-amber-50",
    accent: "bg-amber-500"
  },

  // Waves (รส Blueberry/Lavender - ม่วงอ่อน) : สีม่วงลาเวนเดอร์ให้ความรู้สึกถึงการสั่นสะเทือนและคลื่น
  waves: {
    deep: "text-purple-700",
    border: "border-purple-200",
    light: "bg-purple-100",
    soft: "bg-purple-50",
    accent: "bg-purple-500"
  },

  // Thermodynamics (รส Matcha/Olive - เขียวขี้ม้า/เขียวมะกอก) : เลี่ยงสีแดง/ส้มที่ซ้ำกับ Warning
  thermodynamics: {
    deep: "text-lime-800",
    border: "border-lime-200",
    light: "bg-lime-100",
    soft: "bg-lime-50",
    accent: "bg-lime-500"
  },

  // Optics (รส Grapefruit/Peach - ชมพูอมส้ม) : สีที่แตกต่างจากสีชมพู Revisited เดิม
  optics: {
    deep: "text-rose-700",
    border: "border-rose-200",
    light: "bg-rose-100",
    soft: "bg-rose-50",
    accent: "bg-rose-500"
  },

  // Modern Physics (รส Galaxy/Teal - เขียวน้ำทะเล) : ให้ความรู้สึกลึกลับและล้ำสมัย
  "modern-physics": {
    deep: "text-teal-700",
    border: "border-teal-200",
    light: "bg-teal-100",
    soft: "bg-teal-50",
    accent: "bg-teal-500"
  },

  // กรณีหาไม่เจอ (รส Vanilla)
  default: {
    deep: "text-stone-600",
    border: "border-stone-200",
    light: "bg-stone-50",
    soft: "bg-[#FFF8F0]",
    accent: "bg-stone-400"
  }
};