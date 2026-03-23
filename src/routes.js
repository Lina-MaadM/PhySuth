export const ROUTE_PATH = {
  HOME: "/",
  VARIABLES: "/variables",
  VARIABLE_DETAIL: "/variable/:key",
  FORMULA_DETAIL: "/formula/:id",
};

export const routeBuilder = {
  formula: (id) => `/formula/${id}`,
  variable: (key) => `/variable/${key}`,
};