import { validate } from "@olinfo/quizms/utils";
import { z } from "zod";

export function createAsymptoteInject(variables: object | null) {
  if (variables === null) return null;
  const injectVariables = validate(variantSchema, variables);
  return Object.entries(injectVariables).map(jsToAsy).join("\n");
}

type VariantVariable = number | boolean | string | VariantVariable[];

const variantVariableSchema: z.ZodType<VariantVariable> = z.union([
  z.number().finite(),
  z.boolean(),
  z.string(),
  z.lazy(() => variantVariableSchema.array().nonempty()),
]);

const variantSchema = z.record(variantVariableSchema);

function jsToAsy([name, val]: [string, VariantVariable]): string {
  return `${getAsyTypeName(val)} ${name} = ${getAsyValue(val)};`;
}

function getAsyTypeName(val: VariantVariable): string {
  if (typeof val === "number") {
    return Number.isInteger(val) ? "int" : "real";
  }
  if (typeof val === "boolean") {
    return "bool";
  }
  if (typeof val === "string") {
    return "string";
  }
  return `${getAsyTypeName(val[0])}[]`;
}

function getAsyValue(val: VariantVariable): string {
  if (Array.isArray(val)) {
    return `{ ${val.map((v) => getAsyValue(v)).join(", ")} }`;
  }

  return JSON.stringify(val);
}
