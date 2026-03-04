import { camelCase, upperFirst } from "lodash-es";

export function reactComponentCase(name: string) {
  return upperFirst(camelCase(name));
}

export function titleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (s) => s.toUpperCase());
}

export function strip(str: string) {
  return str.replace(/\r/g, "").trim();
}

export function normalizeName(str: string) {
  const singleSpaced = str.replace(/\s+/g, " ");
  return titleCase(singleSpaced);
}
