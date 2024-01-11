import { dirname, join } from "node:path";

import { Node as AcornNode } from "acorn";
import { is, traverse } from "estree-toolkit";
import { isString } from "lodash-es";
import MagicString from "magic-string";
import { OutputChunk } from "rollup";
import { HtmlTagDescriptor, PluginOption } from "vite";

import { warning } from "~/utils/logs";

import { generateHtml, generateHtmlFromBundle } from "./html";

export default function iframe(): PluginOption {
  let isBuild = false;
  const iframeIds: [string, string][] = [];

  return {
    name: "quizms:iframe",
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
                warning(`cannot analyze iframe property: ${prop.type}`);
                continue;
              }
              if (prop.key.name !== "src") continue;
              if (!is.importExpression(prop.value)) {
                warning(`iframe src is not an import expression: ${prop.type}`);
                continue;
              }
              if (!is.literal(prop.value.source) || !isString(prop.value.source.value)) {
                warning(`iframe src is not a literal: ${prop.type}`);
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
                iframeIds.push([srcId, iframeId]);

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

      return {
        code: s.toString(),
        map: s.generateMap({ hires: true }),
      };
    },
    async generateBundle(this, options, bundle) {
      for (const [srcId, iframeId] of iframeIds) {
        const entry = bundle[this.getFileName(srcId)] as OutputChunk;

        const html = await generateHtmlFromBundle(entry, bundle, { includeDynamicImports: true });
        this.setAssetSource(iframeId, html);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        if (url.pathname === "/__iframe.html") {
          const tag: HtmlTagDescriptor = {
            tag: "script",
            attrs: { type: "module", src: `/@fs${url.searchParams.get("src")}` },
            injectTo: "body",
          };
          const html = await generateHtml(tag);
          const finalHtml = await server.transformIndexHtml(req.url!, html);

          res.setHeader("Content-Type", "text/html");
          res.end(finalHtml);
        } else {
          next();
        }
      });
    },
  };
}
