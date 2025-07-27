import { Rng } from "./rng";

export { Rng };

export function randomId() {
  return crypto.randomUUID();
}

export async function randomToken(locale: string): Promise<string> {
  const { default: wordlist } = await import(`./wordlist-${locale}.txt?raw`);
  const words = wordlist.split("\n");

  const rng = new Rng(randomId());
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    tokens.push(rng.choice(words));
  }
  return tokens.join("-");
}
