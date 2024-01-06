import child_process from "node:child_process";
import { existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { promisify } from "node:util";

import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

export default function python(): PluginOption {
  return {
    name: "quizms:python",
    async load(rawPath) {
      const [path] = rawPath.split("?");
      const ext = extname(path);

      if (ext === ".py") {
        return `const module = ${JSON.stringify(await executePython(path))};
export default module;`;
      }
    },
  };
}

export async function executePython(file: string): Promise<any> {
  const fileRelative = join(basename(dirname(file)), basename(file));
  if (!existsSync(file)) {
    throw new Error(`Cannot import \`${fileRelative}\`: file does not exist.`);
  }
  const { stdout } = await execFile("python3", [file]);
  try {
    return JSON.parse(stdout);
  } catch (e: any) {
    throw new Error(
      `Cannot import \`${fileRelative}\`: output must be a valid JSON: ${e.message}.`,
    );
  }
}
