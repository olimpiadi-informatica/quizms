import { readFile } from "node:fs/promises";
import path from "node:path";
import { json } from "node:stream/consumers";

import { parseImageOptions } from "@olinfo/quizms/utils-node";
import type { PluginOption } from "vite";

import { type AsySrc, findAsymptoteDependencies, transformAsymptote } from "~/asymptote";

export default function asymptote(): PluginOption {
  let rootDir: string;

  return {
    name: "quizms:asymptote",
    configResolved({ root }) {
      rootDir = root;
    },
    enforce: "pre",
    resolveId(id, importer) {
      const [pathname, query] = id.split("?");
      const ext = path.extname(pathname);
      if (ext === ".asy") {
        const resolvedPathname = pathname.startsWith(rootDir)
          ? pathname
          : path.join(importer ? path.dirname(importer) : rootDir, pathname);
        return `${resolvedPathname}?${query ?? ""}&importer=${encodeURIComponent(importer ?? "")}`;
      }
    },
    load(id) {
      const [pathname, query] = id.split("?");
      const params = new URLSearchParams(query);
      const ext = path.extname(pathname);
      if (ext === ".asy" && !params.has("url") && !params.has("raw")) {
        return readFile(pathname, "utf8");
      }
    },
    async transform(_code, id) {
      const [pathname, query] = id.split("?");
      if (path.extname(pathname) !== ".asy") return;

      const hash = await findAsymptoteDependencies(this, pathname);

      const params = new URLSearchParams(query);
      const options = parseImageOptions(params);

      const importer = params.get("importer");
      const importedFromMdx = importer?.endsWith(".md") || importer?.endsWith(".mdx");
      if (!importedFromMdx) {
        const svg = await transformAsymptote({
          fileName: pathname,
          hash,
          inject: null,
          options,
        });
        return {
          code: `export default ${JSON.stringify({ ...svg, _hash: hash })};`,
          map: { mappings: "" },
        };
      }

      return {
        code: `\
export default function img(variant) {
  return {
    fileName: ${JSON.stringify(pathname)},
    hash: ${JSON.stringify(hash)},
    inject: variant,
    options: ${JSON.stringify(options)},
  };
};`,
        map: { mappings: "" },
      };
    },
    configureServer(this, server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === "/asy") {
          res.setHeader("Content-Type", "application/json");

          const body = (await json(req)) as AsySrc;
          let svg: { src: string; width: number; height: number };

          try {
            svg = await transformAsymptote(body);
          } catch (err: any) {
            server.ws.send({
              type: "error",
              err: {
                plugin: "quizms:asymptote",
                message: err.message,
                stack: "",
                id: body?.fileName,
              },
            });
            res.statusCode = 500;
            res.end();
            return;
          }

          res.end(JSON.stringify(svg));
          return;
        }

        next();
      });
    },
  };
}
