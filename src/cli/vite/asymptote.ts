import child_process from "node:child_process";
import fs from "node:fs/promises";
import { platform } from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import _ from "lodash";
import svgToMiniDataURI from "mini-svg-data-uri";
import { temporaryFile } from "tempy";
import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

async function findDependencies(asyPath: string) {
  const imports = new Set<string>();
  const newImports: string[] = [asyPath];

  while (newImports.length > 0) {
    const file = newImports.pop()!;
    if (imports.has(file)) continue;
    imports.add(file);

    const content = await fs.readFile(file, { encoding: "utf8" });

    const matches = content.matchAll(
      /^(?:access|from|import|include)\s+(?:"([^\n"]+)"|([^\s"]+);)/gm,
    );
    for (const match of matches) {
      const matchPath = match[1] ?? match[2];
      const matchFile = path.format({
        dir: path.join(path.dirname(file), path.dirname(matchPath)),
        name: path.basename(matchPath, ".asy"),
        ext: ".asy",
      });

      const exists = await fs.access(matchFile).then(_.stubTrue, _.stubFalse);
      if (exists) newImports.push(matchFile);
    }
  }

  imports.delete(asyPath);
  return Array.from(imports);
}

export default function asymptote(): PluginOption {
  let isBuild: boolean = false;

  return {
    name: "asymptote",
    configResolved({ command }) {
      isBuild = command === "build";
    },
    async load(asyPath) {
      if (path.extname(asyPath) !== ".asy") return;

      const svgFile = temporaryFile({ extension: "svg" });

      if (platform() === "darwin") {
        const pdfFile = temporaryFile({ extension: "pdf" });
        await execFile("asy", [asyPath, "-f", "pdf", "-o", pdfFile], {
          cwd: path.dirname(asyPath),
        });

        await execFile("pdf2svg", [pdfFile, svgFile]);
        await fs.unlink(pdfFile);
      } else {
        await execFile("asy", [asyPath, "-f", "svg", "-o", svgFile], {
          cwd: path.dirname(asyPath),
        });
      }

      const svgData = await fs.readFile(svgFile, { encoding: "utf-8" });
      await fs.unlink(svgFile);

      if (isBuild && process.env.QUIZMS_MODE !== "contest") {
        const id = this.emitFile({
          type: "asset",
          name: path.basename(asyPath, ".asy") + ".svg",
          source: svgData,
          needsCodeReference: true,
        });

        return `export default import.meta.ROLLUP_FILE_URL_${id};`;
      } else {
        const imports = await findDependencies(asyPath);

        return (
          imports.map((f) => `import "${f}?url";\n`).join("") +
          `export default "${svgToMiniDataURI(svgData)}";`
        );
      }
    },
  };
}
