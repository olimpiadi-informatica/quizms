import child_process from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

export default function python(): PluginOption {
  return {
    name: "quizms:python",
    async transform(_code, id) {
      const [pathname] = id.split("?");
      const ext = path.extname(pathname);

      if (ext === ".py") {
        const output = await executePython(pathname);
        return {
          code: `export default JSON.parse(${JSON.stringify(JSON.stringify(output))});`,
          map: { mappings: "" },
        };
      }
    },
  };
}

export async function executePython(file: string): Promise<any> {
  let output;
  try {
    const child = await execFile("python3", [file]);
    output = child.stdout;
  } catch (err: any) {
    throw new Error(`Failed to import python file:\n${err.stderr}`);
  }
  try {
    return JSON.parse(output);
  } catch {
    throw new Error("Failed to import python file: Output must be a valid JSON.");
  }
}
