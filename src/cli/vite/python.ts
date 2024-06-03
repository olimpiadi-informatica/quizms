import child_process from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

export default function python(): PluginOption {
  return {
    name: "quizms:python",
    async load(rawPath) {
      const [pathname] = rawPath.split("?");
      const ext = path.extname(pathname);

      if (ext === ".py") {
        const output = await executePython(pathname);
        return `export default JSON.parse(${JSON.stringify(JSON.stringify(output))});`;
      }
    },
  };
}

export async function executePython(file: string): Promise<any> {
  const fileRelative = path.join(path.basename(path.dirname(file)), path.basename(file));
  if (!existsSync(file)) {
    throw new Error(`Cannot import \`${fileRelative}\`: file does not exist.`);
  }
  const { stdout } = await execFile("python3", [file]);
  try {
    return JSON.parse(stdout);
  } catch (err) {
    throw new Error(
      `Cannot import \`${fileRelative}\`: output must be a valid JSON: ${(err as Error).message}.`,
    );
  }
}
