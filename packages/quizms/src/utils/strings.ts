import { camelCase, upperFirst } from "lodash-es";

export function reactComponentCase(name: string) {
  return upperFirst(camelCase(name));
}
