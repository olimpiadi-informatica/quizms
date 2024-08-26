import { randomId } from "./index";
import { Rng } from "./rng";

export async function randomToken(): Promise<string> {
  const { default: wordlist } = await import("./wordlist.txt");
  const words = wordlist.split("\n");

  const rng = new Rng(randomId());
  const tokens = [];
  for (let i = 0; i < 3; i++) {
    tokens.push(rng.choice(words));
  }
  return tokens.join("-");
}
