import child_process from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import colors from "colors";
import _ from "lodash";
import svgToMiniDataURI from "mini-svg-data-uri";
import { LoaderContext } from "webpack";

const execFile = promisify(child_process.execFile);

function tmpfile(ext: string) {
  return path.format({ dir: tmpdir(), name: randomUUID(), ext });
}

export default function loader(this: LoaderContext<Record<string, never>>, content: string) {
  async function run(context: LoaderContext<Record<string, never>>) {
    const asyPath = context.resourcePath;

    colors.enable();
    const relativePath = path.relative(path.resolve(), asyPath);
    console.log(`${"info".cyan}  - compiling ${relativePath}...`);

    const matches = content.matchAll(/^(?:access|from|import|include)\s+("[^"]+"|\S+)/gm);
    for (const match of matches) {
      const file = path.format({
        dir: path.dirname(asyPath),
        name: path.basename(match[1], ".asy"),
        ext: ".asy",
      });

      const exists = await fs.access(file).then(_.stubTrue, _.stubFalse);
      if (exists) {
        context.addDependency(file);
      }
    }

    const pdfFile = tmpfile("pdf");
    await execFile("asy", [asyPath, "-f", "pdf", "-o", pdfFile]);

    const svgFile = tmpfile("svg");
    await execFile("pdf2svg", [pdfFile, svgFile]);
    const svgData = await fs.readFile(svgFile, { encoding: "utf8" });

    await fs.unlink(pdfFile);
    await fs.unlink(svgFile);

    return `export default "${svgToMiniDataURI(svgData)}";`;
  }

  const callback = this.async();
  run(this).then((res) => callback(null, res), callback);
}
