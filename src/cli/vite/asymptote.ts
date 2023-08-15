import child_process from "node:child_process";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import { platform, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import _ from "lodash";
import svgToMiniDataURI from "mini-svg-data-uri";
import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

function tmpfile(ext: string) {
  return path.format({ dir: tmpdir(), name: randomUUID(), ext });
}

export default function asymptote(): PluginOption {
  return {
    name: "asymptote",
    async transform(value, asyPath) {
      if (path.extname(asyPath) !== ".asy") return;

      const matches = value.matchAll(/^(?:access|from|import|include)\s+("[^"]+"|\S+)/gm);
      for (const match of matches) {
        const file = path.format({
          dir: path.dirname(asyPath),
          name: path.basename(match[1], ".asy"),
          ext: ".asy",
        });

        const exists = await fs.access(file).then(_.stubTrue, _.stubFalse);
        if (exists) {
          this.addWatchFile(file);
        }
      }

      let svgData: string;
      if (platform() === "darwin") {
        const pdfFile = tmpfile("pdf");
        await execFile("asy", [asyPath, "-f", "pdf", "-o", pdfFile], {
          cwd: path.dirname(asyPath),
        });

        const svgFile = tmpfile("svg");
        await execFile("pdf2svg", [pdfFile, svgFile]);
        svgData = await fs.readFile(svgFile, { encoding: "utf8" });

        await fs.unlink(pdfFile);
        await fs.unlink(svgFile);
      } else {
        const svgFile = tmpfile("svg");
        await execFile("asy", [asyPath, "-f", "svg", "-o", svgFile], {
          cwd: path.dirname(asyPath),
        });
        svgData = await fs.readFile(svgFile, { encoding: "utf8" });

        await fs.unlink(svgFile);
      }

      return {
        code: `export default "${svgToMiniDataURI(svgData)}";`,
        map: {
          mappings: "",
        },
      };
    },
  };
}
