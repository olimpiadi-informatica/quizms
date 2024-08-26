export { Rng } from "./rng";
export { randomToken } from "./token";

export function randomId() {
  return crypto.randomUUID();
}
