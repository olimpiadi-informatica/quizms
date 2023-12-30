import { exit, stdin, stdout } from "node:process";
import readline from "node:readline/promises";

import pc from "picocolors";

const rl = readline.createInterface({ input: stdin, output: stdout });

rl.on("SIGINT", () => fatal(`Command cancelled.`));

export function cleanup() {
  rl.close();
}

export async function confirm(question: string) {
  const ans = await rl.question(`${pc.blue("𝓲")} ${question} (y/N) `);
  if (ans.toLowerCase() !== "y") {
    exit(0);
  }
}

export function fatal(msg: string): never {
  error(msg);
  exit(1);
}

export function error(msg: string) {
  console.error(`${pc.red("✗")} ${msg}`);
}

export function warning(msg: string) {
  console.warn(`${pc.yellow("⚠")} ${msg}`);
}

export function info(msg: string) {
  console.info(`${pc.blue("𝓲")} ${msg}`);
}

export function success(msg: string) {
  console.info(`${pc.green("✓")} ${msg}`);
}
