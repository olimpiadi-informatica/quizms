import child_process from "node:child_process";
import { extname } from "node:path";
import { promisify } from "node:util";

import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

export default function python(): PluginOption {
  return {
    name: "python",
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
  const { stdout } = await execFile("python3", [file]);
  return JSON.parse(stdout);
}
