import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import sizeOf from "image-size";
import svgToMiniDataURI from "mini-svg-data-uri";
import type { PluginContext } from "rollup";
import sharp, { type ResizeOptions } from "sharp";
import { optimize } from "svgo";
import type { PluginOption } from "vite";

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".tiff", ".gif", ".webp", ".avif"]);

type ImageOptions = ResizeOptions & { scale?: number };

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
    name: "quizms:images",
    configResolved({ command }) {
      isBuild = command === "build";
    },
    load: {
      order: "pre",
      handler(id) {
        const [pathname, query] = id.split("?");
        const params = new URLSearchParams(query);
        const ext = path.extname(pathname);
        if (
          (imageExtensions.has(ext) || ext === ".svg" || ext === ".asy") &&
          !params.has("url") &&
          !params.has("raw")
        ) {
          return readFile(pathname, "utf8");
        }
      },
    },
    async transform(code, id) {
      const [pathname, query] = id.split("?");
      const params = new URLSearchParams(query);
      const ext = path.extname(pathname);

      if (params.has("url") || params.has("raw") || params.has("v")) return;

      const options: ImageOptions = {
        scale: Number(params.get("s")),
        width: Number(params.get("w")),
        height: Number(params.get("h")),
      };

      let image: Image | undefined;

      if (ext === ".svg" || ext === ".asy") {
        image = transformSvg(pathname, code, options);
      }
      if (imageExtensions.has(ext)) {
        image = await transformImage(pathname, options);
      }

      if (image) {
        return {
          code: emitFile(this, pathname, image, isBuild),
          map: { mappings: "" },
        };
      }
    },
  };
}

function transformSvg(id: string, content: string, options: ImageOptions): Image {
  const { data } = optimize(content, {
    multipass: true,
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeViewBox: false, // https://github.com/svg/svgo/issues/1128
            cleanupIds: {
              minify: false,
              remove: false,
            },
            inlineStyles: false,
          },
        },
      },
    ],
    path: id,
  });

  let { width, height } = sizeOf(Buffer.from(data, "utf8"));
  if (!width || !height) {
    throw new Error("Unable to determine size of SVG image");
  }

  if (options.scale) {
    width *= options.scale;
    height *= options.scale;
  } else if (options.width || options.height) {
    const aspectRatio = width / height;
    width = options.width || options.height! * aspectRatio;
    height = options.height || options.width! / aspectRatio;
  }

  return { format: ".svg", data, width, height };
}

async function transformImage(fileName: string, options: ImageOptions): Promise<Image> {
  let process = sharp(fileName).webp();

  if (options.scale) {
    const size = sizeOf(fileName);
    options.width = Math.round(size.width! * options.scale);
    options.height = Math.round(size.height! * options.scale);
  }

  if (options.width || options.height) {
    options.width ||= undefined;
    options.height ||= undefined;
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

function emitFile(ctx: PluginContext, fileName: string, image: Image, isBuild: boolean) {
  let src: string;
  if (isBuild && process.env.QUIZMS_MODE !== "contest" && process.env.QUIZMS_MODE !== "pdf") {
    const id = ctx.emitFile({
      type: "asset",
      name: path.basename(fileName, path.extname(fileName)) + image.format,
      source: image.data,
    });
    src = `import.meta.ROLLUP_FILE_URL_${id}`;
  } else if (image.format === ".svg") {
    src = `"${svgToMiniDataURI(image.data)}"`;
  } else {
    src = `"data:image/webp;base64,${image.data.toString("base64")}"`;
  }

  return `\
export default {
  src: ${src},
  width: ${image.width},
  height: ${image.height},
};`;
}
