export const ROUTE_PATH = {
  HOME: "/",           // FormulaMap (หน้าแรกใหม่)
  CATALOG: "/formula", // FormulaCatalog (ย้ายมาที่นี่)
  VARIABLES: "/variables",
  VARIABLE_DETAIL: "/variable/:key",
  FORMULA_DETAIL: "/formula/:id",
};

export const routeBuilder = {
  formula: (id) => `/formula/${id}`,
  variable: (key) => `/variable/${key}`,
};