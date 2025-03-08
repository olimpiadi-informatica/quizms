import { exit } from "node:process";

import pc from "picocolors";

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
