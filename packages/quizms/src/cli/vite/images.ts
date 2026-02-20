import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PluginOption } from "vite";

import { imageToDataUri, parseImageOptions, transformImage } from "~/utils-node";

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
  return {
    name: "quizms:images",
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

      if (imageExtensions.has(ext)) {
        const image = await transformImage(pathname, code, parseImageOptions(params));
        const src = {
          src: imageToDataUri(image),
          width: image.width,
          height: image.height,
        };

        return {
          code: `export default JSON.parse(${JSON.stringify(JSON.stringify(src))});`,
          map: { mappings: "" },
        };
      }
    },
  };
}
