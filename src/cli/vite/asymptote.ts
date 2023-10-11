export function jsToAsy(name: string, val: any): string {
  if (
    typeof val === "number" ||
    typeof val === "boolean" ||
    typeof val === "string" ||
    Array.isArray(val)
  ) {
    return `${getAsyTypeName(val)} ${name} = ${getAsyValue(val)};`;
  }

  throw new TypeError("Unknown type");
}

function getAsyTypeName(val: any): string {
  if (typeof val === "number") {
    return Number.isInteger(val) ? "int" : "real";
  }
  if (typeof val === "boolean") {
    return "bool";
  }
  if (typeof val === "string") {
    return "string";
  }
  if (Array.isArray(val)) {
    return getAsyTypeName(val[0]) + "[]";
  }

  throw new TypeError("Unknown type");
}

function getAsyValue(val: any): string {
  if (Array.isArray(val)) {
    return `{ ${val.map((v) => getAsyValue(v)).join(", ")} }`;
  }

  return JSON.stringify(val);
}
