import child_process from "node:child_process";
import fs from "node:fs/promises";
import { platform } from "node:os";
import { basename, dirname, extname, format as formatPath, join as joinPath } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import _ from "lodash";
import svgToMiniDataURI from "mini-svg-data-uri";
import { PluginContext } from "rollup";
import sharp from "sharp";
import { optimize } from "svgo";
import { temporaryFile } from "tempy";
import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

const imageExtensions = [".png", ".jpg", ".jpeg", "tiff", "gif", "webp", "avif"];

export default function images(): PluginOption {
  let isBuild = true;

  return {
    name: "optimize-image",
    enforce: "pre",
    configResolved({ command }) {
      isBuild = command === "build";
    },
    async load(path) {
      if (extname(path) === ".asy") {
        const imports = await findAsymptoteDependencies(path);
        const header = imports.map((f) => `import "${f}?url";\n`).join("");

        const content = await transformAsymptote(path);
        return emitFile(this, path, ".svg", content, isBuild, header);
      }

      if (extname(path) === ".svg") {
        const content = await transformSvg(path);
        return emitFile(this, path, ".svg", content, isBuild);
      }

      if (imageExtensions.includes(extname(path))) {
        const content = await transformImage(path);
        return emitFile(this, path, ".webp", content, isBuild);
      }
    },
  };
}

async function transformAsymptote(path: string): Promise<string> {
  const svgFile = temporaryFile({ extension: "svg" });

  if (platform() === "darwin") {
    const pdfFile = temporaryFile({ extension: "pdf" });
    await execFile("asy", [path, "-f", "pdf", "-o", pdfFile], {
      cwd: dirname(path),
    });

    await execFile("pdf2svg", [pdfFile, svgFile]);
    await fs.unlink(pdfFile);
  } else {
    await execFile("asy", [path, "-f", "svg", "-o", svgFile], {
      cwd: dirname(path),
    });
  }

  const svgData = await fs.readFile(svgFile, { encoding: "utf-8" });
  const svgOptimized = transformSvg(svgFile, svgData);
  await fs.unlink(svgFile);

  return svgOptimized;
}

async function transformSvg(path: string, content?: string): Promise<string> {
  content ??= await fs.readFile(path, { encoding: "utf-8" });

  const output = optimize(content, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false, // https://github.com/svg/svgo/issues/1128
          },
        },
      },
    ],
    path,
  });

  return output.data;
}

async function transformImage(path: string): Promise<Buffer> {
  return sharp(path).toFormat("webp").toBuffer();
}

function emitFile(
  ctx: PluginContext,
  path: string,
  ext: ".svg" | ".webp",
  source: string | Buffer,
  isBuild: boolean,
  header?: string,
) {
  if (isBuild && process.env.QUIZMS_MODE !== "contest") {
    const id = ctx.emitFile({
      type: "asset",
      name: basename(path, extname(path)) + ext,
      source,
    });
    return `export default import.meta.ROLLUP_FILE_URL_${id};`;
  } else if (ext === ".svg") {
    return (header ?? "") + `export default "${svgToMiniDataURI(source as string)}";`;
  } else {
    return (
      (header ?? "") +
      `export default "data:image/webp;base64,${(source as Buffer).toString("base64")}";`
    );
  }
}

async function findAsymptoteDependencies(asyPath: string) {
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
      const matchFile = formatPath({
        dir: joinPath(dirname(file), dirname(matchPath)),
        name: basename(matchPath, ".asy"),
        ext: ".asy",
      });

      const exists = await fs.access(matchFile).then(_.stubTrue, _.stubFalse);
      if (exists) newImports.push(matchFile);
    }
  }

  imports.delete(asyPath);
  return Array.from(imports);
}
