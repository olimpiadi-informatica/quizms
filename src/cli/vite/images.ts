import child_process from "node:child_process";
import fs from "node:fs/promises";
import { platform } from "node:os";
import { basename, dirname, extname, format as formatPath, join as joinPath } from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import _ from "lodash";
import svgToMiniDataURI from "mini-svg-data-uri";
import { PluginContext } from "rollup";
import sharp, { ResizeOptions } from "sharp";
import { CustomPlugin as SvgoPlugin, optimize } from "svgo";
import { temporaryFile } from "tempy";
import { PluginOption } from "vite";

const execFile = promisify(child_process.execFile);

const imageExtensions = [".png", ".jpg", ".jpeg", ".tiff", ".gif", ".webp", ".avif"];

type ImageOptions = ResizeOptions;

type SvgImage = {
  format: ".svg";
  data: string;
};

type WebpImage = {
  format: ".webp";
  data: Buffer;
};

type Image = (SvgImage | WebpImage) & { width: number; height: number };

export default function images(): PluginOption {
  let isBuild = true;

  return {
    name: "optimize-image",
    enforce: "pre",
    configResolved({ command }) {
      isBuild = command === "build";
    },
    async load(rawPath) {
      const [path, query] = rawPath.split("?");
      const params = new URLSearchParams(query);
      const ext = extname(path);

      if (params.has("url") || params.has("raw")) return;

      const width = params.has("w") ? Number(params.get("w")) : undefined;
      const height = params.has("h") ? Number(params.get("h")) : undefined;
      const options: ImageOptions = { width, height };

      if (ext === ".asy") {
        const imports = await findAsymptoteDependencies(path);
        const header = imports.map((f) => `import "${f}?url";`).join("\n");

        const image = await transformAsymptote(path, options);
        return emitFile(this, path, image, isBuild, header);
      }

      if (ext === ".svg") {
        const image = await transformSvg(path, options);
        return emitFile(this, path, image, isBuild);
      }

      if (imageExtensions.includes(ext)) {
        const image = await transformImage(path, options);
        return emitFile(this, path, image, isBuild);
      }
    },
  };
}

async function transformAsymptote(path: string, options: ImageOptions): Promise<Image> {
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

  const image = await transformSvg(svgFile, options);
  await fs.unlink(svgFile);

  return image;
}

async function transformSvg(path: string, options: ImageOptions): Promise<Image> {
  const content = await fs.readFile(path, { encoding: "utf-8" });

  const originalSize: { width?: number; height?: number } = {};

  const { data } = optimize(content, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: { removeViewBox: false }, // https://github.com/svg/svgo/issues/1128
        },
      },
      sizePlugin(originalSize),
    ],
    path,
  });

  if (!originalSize.width || !originalSize.height) {
    throw new Error(`Unable to determine size of SVG image: ${path}`);
  }

  let width: number, height: number;
  if (options.width || options.height) {
    width = options.width || (options.height! * originalSize.width) / originalSize.height;
    height = options.height || (options.width! * originalSize.height) / originalSize.width;
  } else {
    width = originalSize.width;
    height = originalSize.height;
  }

  return { format: ".svg", data, width, height };
}

async function transformImage(path: string, options: ImageOptions): Promise<Image> {
  let process = sharp(path).toFormat("webp");
  if (options.width || options.height) {
    process = process.resize(options);
  }

  const { data, info } = await process.toBuffer({ resolveWithObject: true });
  return {
    format: ".webp",
    data,
    width: info.width,
    height: info.height,
  };
}

function emitFile(
  ctx: PluginContext,
  path: string,
  image: Image,
  isBuild: boolean,
  header?: string,
) {
  let src: string;
  if (isBuild && process.env.QUIZMS_MODE !== "contest") {
    const id = ctx.emitFile({
      type: "asset",
      name: basename(path, extname(path)) + image.format,
      source: image.data,
    });
    src = `import.meta.ROLLUP_FILE_URL_${id}`;
  } else if (image.format === ".svg") {
    src = `"${svgToMiniDataURI(image.data)}"`;
  } else {
    src = `"data:image/webp;base64,${image.data.toString("base64")}"`;
  }

  return `${header ?? ""}
const image = {
  src: ${src},
  width: "${image.width}",
  height: "${image.height}",
};
export default image;`;
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

function sizePlugin(out: { width?: number; height?: number }): SvgoPlugin {
  return {
    name: "size",
    fn: () => ({
      element: {
        enter: (node) => {
          if (node.name === "svg") {
            out.width = convertUnit(node.attributes.width);
            out.height = convertUnit(node.attributes.height);
          }
        },
      },
    }),
  };
}

function convertUnit(length: string) {
  const match = length.match(/^(\d+(?:\.\d+)?)(in|cm|mm|pt|pc|px)?$/);

  if (!match) throw new Error(`Invalid length: ${length}`);

  const PPI = 96;
  const conversion = {
    in: PPI,
    cm: PPI / 2.54,
    mm: PPI / 25.4,
    pt: PPI / 72,
    pc: PPI / 6,
    px: 1,
  };

  return Number(match[1]) * conversion[(match[2] as keyof typeof conversion) ?? "px"];
}