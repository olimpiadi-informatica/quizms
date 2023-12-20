import { basename, dirname, join } from "node:path";

import { Node as AcornNode } from "acorn";
import { is, traverse } from "estree-toolkit";
import { isString } from "lodash-es";
import MagicString from "magic-string";
import { PluginOption } from "vite";

export default function iframe(): PluginOption {
  let isBuild = false;
  const iframeIds: [string, string, string][] = [];

  return {
    name: "iframe",
    configResolved({ command }) {
      isBuild = command === "build";
    },
    resolveId(id) {
      const [path] = id.split("?");
      if (path === "virtual:iframe-entry") {
        return "\0" + id;
      }
    },
    load(id) {
      const [path, query] = id.split("?");
      if (path === "\0virtual:iframe-entry") {
        return `void import("${query}");`;
      }
    },
    async transform(this, code, id) {
      if (!code.includes(`"iframe"`)) return;

      const s = new MagicString(code);
      const ast = this.parse(code);

      traverse(ast, {
        CallExpression: (path) => {
          const node = path.node!;
          const [comp, props] = node.arguments;

          if (
            is.memberExpression(node.callee) &&
            is.identifier(node.callee.property) &&
            node.callee.property.name === "createElement" &&
            is.literal(comp) &&
            comp.value === "iframe" &&
            is.objectExpression(props)
          ) {
            for (const prop of props.properties) {
              if (!is.property(prop) || !is.identifier(prop.key)) {
                console.warn("cannot analyze iframe property:", prop);
                continue;
              }
              if (prop.key.name !== "src") continue;
              if (!is.importExpression(prop.value)) {
                console.warn("iframe src is not an import expression:", prop);
                continue;
              }
              if (!is.literal(prop.value.source) || !isString(prop.value.source.value)) {
                console.warn("iframe src is not a literal:", prop);
                continue;
              }

              const srcPath = join(dirname(id), prop.value.source.value);

              let srcValue: string;
              if (isBuild) {
                const srcId = this.emitFile({
                  type: "chunk",
                  name: "iframe",
                  id: `virtual:iframe-entry?${srcPath}`,
                });

                const iframeId = this.emitFile({
                  type: "asset",
                  fileName: `assets/iframe-${srcId}.html`,
                });
                iframeIds.push([srcPath, srcId, iframeId]);

                srcValue = `import.meta.ROLLUP_FILE_URL_${iframeId}`;
              } else {
                srcValue = `"/__iframe.html?src=${encodeURIComponent(srcPath)}"`;
              }

              s.update(
                (prop.value as unknown as AcornNode).start,
                (prop.value as unknown as AcornNode).end,
                srcValue,
              );
            }
          }
        },
      });

      return { code: s.toString(), map: /* TODO */ null };
    },
    generateBundle(this, options, bundle) {
      for (const [srcPath, srcId, iframeId] of iframeIds) {
        const name = basename(srcPath, ".js") + ".css";
        const css = Object.values(bundle).find((chunk) => chunk.name === name);

        this.setAssetSource(iframeId, iframeHtml(this.getFileName(srcId), css?.fileName));
      }
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        if (url.pathname === "/__iframe.html") {
          res.setHeader("Content-Type", "text/html");
          res.end(iframeHtml("@fs" + url.searchParams.get("src")!));
        } else {
          next();
        }
      });
    },
  };
}

function iframeHtml(src: string, css?: string) {
  return `\
<!DOCTYPE html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${css ? `<link rel="stylesheet" href="/${css}">` : ""}
    <title>iframe</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${src}"></script>
  </body>
</html>`;
}
