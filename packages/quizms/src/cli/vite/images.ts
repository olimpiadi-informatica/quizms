import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import type { PluginContext } from "rollup";
import type { PluginOption } from "vite";

import { type Image, type ImageOptions, imageToDataUri, transformImage } from "~/utils-node";

const imageExtensions = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".tiff",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

export default function images(): PluginOption {
  let isBuild = true;
  let rootDir: string;

  return {
    name: "quizms:images",
    configResolved({ command, root }) {
      isBuild = command === "build";
      rootDir = root;
    },
    resolveId(id) {
      const [pathname, query] = id.split("?");
      const ext = path.extname(pathname);
      if (imageExtensions.has(ext)) {
        const resolvedPathname = pathname.startsWith(rootDir)
          ? pathname
          : path.join(rootDir, pathname);
        return `${resolvedPathname}?${query}`;
      }
    },
    load: {
      order: "pre",
      handler(id) {
        const [pathname, query] = id.split("?");
        const params = new URLSearchParams(query);
        const ext = path.extname(pathname);
        if (imageExtensions.has(ext) && !params.has("url") && !params.has("raw")) {
          return readFile(pathname, "utf8");
        }
      },
    },
    async transform(code, id) {
      const [pathname, query] = id.split("?");
      const params = new URLSearchParams(query);
      const ext = path.extname(pathname);

      const options: ImageOptions = {
        scale: Number(params.get("s")),
        width: Number(params.get("w")),
        height: Number(params.get("h")),
      };

      if (imageExtensions.has(ext)) {
        const image = await transformImage(pathname, code, options);

        return {
          code: emitFile(this, pathname, image, isBuild),
          map: { mappings: "" },
        };
      }
    },
  };
}

function emitFile(ctx: PluginContext, fileName: string, image: Image, isBuild: boolean) {
  let src: string;
  if (isBuild && process.env.QUIZMS_MODE !== "contest") {
    const id = ctx.emitFile({
      type: "asset",
      name: path.basename(fileName, path.extname(fileName)) + image.format,
      source: image.data,
    });
    src = `import.meta.ROLLUP_FILE_URL_${id}`;
  } else {
    src = JSON.stringify(imageToDataUri(image));
  }

  return `\
export default {
  src: ${src},
  width: ${image.width},
  height: ${image.height},
};`;
}
