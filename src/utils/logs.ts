import { exit, stdin, stdout } from "node:process";
import readline from "node:readline/promises";

import pc from "picocolors";

const rl = readline.createInterface({ input: stdin, output: stdout });

rl.on("SIGINT", () => fatal("Command cancelled."));

export async function confirm(question: string, terminate = true) {
  const ans = await rl.question(`${pc.bold(pc.yellow("?"))} ${question} (y/N) `);
  const yes = ans.toLowerCase() === "y";
  if (!yes && terminate) {
    exit(0);
  }
  return yes;
}

export function fatal(msg: string): never {
  error(msg);
  exit(1);
}

export function error(msg: string) {
  console.error(`${clearLine}${pc.red("✗")} ${msg}`);
}

export function warning(msg: string) {
  console.warn(`${clearLine}${pc.yellow("⚠")} ${msg}`);
}

export function info(msg: string) {
  console.info(`${clearLine}${pc.blue("𝓲")} ${msg}`);
}

export function success(msg: string) {
  console.info(`${clearLine}${pc.green("✓")} ${msg}`);
}

const clearLine = "\u001B[2K\u001B[0G";
