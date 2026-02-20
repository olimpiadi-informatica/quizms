import { Rng, shuffle } from "./rng";

export { Rng, shuffle };

export function randomId() {
  return crypto.randomUUID();
}

export async function randomToken(): Promise<string> {
  const { default: wordlist } = await import("./wordlist.txt?raw");
  const words = wordlist.split("\n");

  const rng = new Rng();
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    tokens.push(rng.choice(words));
  }
  return tokens.join("-");
}
