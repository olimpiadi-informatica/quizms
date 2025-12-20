import { exit, stderr } from "node:process";
import { styleText } from "node:util";

export function fatal(msg: string): never {
  error(msg);
  exit(1);
}

export function error(msg: string) {
  console.error(`${clearLine}${styleText("red", "✗", { stream: stderr })} ${msg}`);
}

export function warning(msg: string) {
  console.warn(`${clearLine}${styleText("yellow", "⚠", { stream: stderr })} ${msg}`);
}

export function info(msg: string) {
  console.info(`${clearLine}${styleText("blue", "𝓲")} ${msg}`);
}

export function success(msg: string) {
  console.info(`${clearLine}${styleText("green", "✓")} ${msg}`);
}

const clearLine = "\u001B[2K\u001B[0G";
