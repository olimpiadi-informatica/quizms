import { access } from "node:fs/promises";
import { extname, join } from "node:path";

import { is, traverse } from "estree-toolkit";
import { isString, stubFalse, stubTrue } from "lodash-es";
import { OutputChunk, PluginContext } from "rollup";
import { HtmlTagDescriptor, PluginOption } from "vite";

import { error, warning } from "~/utils/logs";

import { generateHtml, generateHtmlFromBundle } from "./html";

export default function reactEntry(): PluginOption {
  let isBuild = false;
  let root = "";
  const pages: Record<string, string> = {};
  const options: Record<string, Record<string, string | undefined>> = {};

  return {
    name: "quizms:entry",
    enforce: "pre",
    configResolved(config) {
      isBuild = config.command === "build";
      root = config.root;
    },
    resolveId(id) {
      const [path] = id.split("?");
      if (path === "virtual:react-entry") {
        return "\0" + id;
      }
      if (path === "react-dom/server") {
        return "\0" + id;
      }
    },
    async load(this, id) {
      const [path, query] = id.split("?");
      if (path === "\0virtual:react-entry") {
        const params = new URLSearchParams(query);
        const page = params.get("src")!;

        const isVirtual = page.startsWith("virtual:");
        const entry = isVirtual ? page : join(root, page);

        if (isBuild) {
          const pageId = this.emitFile({
            type: "asset",
            fileName: isVirtual
              ? page.replace(/^virtual:/, "") + ".html"
              : page.replace(/\.jsx$/, ".html"),
          });
          pages[pageId] = id;

          if (!isVirtual) {
            options[pageId] = await extractMeta(this, entry, page);
          }
        }

        return `\
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App, title } from "${entry}";

document.title = title;

createRoot(document.getElementById("app")).render(
  createElement(StrictMode, null, createElement(App))
);`;
      }
      if (path === "\0react-dom/server") {
        return `\
export function renderToStaticMarkup() { throw new Error("react-dom/server is not available in the browser"); }`;
      }
    },
    async generateBundle(this, _, bundle) {
      for (const [pageId, entryId] of Object.entries(pages)) {
        const entry = Object.values(bundle).find(
          (chunk) => "facadeModuleId" in chunk && chunk.facadeModuleId === entryId,
        ) as OutputChunk;

        const html = await generateHtmlFromBundle(entry, bundle, options[pageId]);
        this.setAssetSource(pageId, html);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const ext = extname(url.pathname);

        if (ext === "" || ext === ".html") {
          const path = url.pathname.replace(/(\.html|\/)$/, "");
          const entry = join(".", path, "index.jsx");

          const exists = await access(join(root, entry)).then(stubTrue, stubFalse);
          if (exists) {
            if (url.pathname.endsWith("/")) {
              const tag: HtmlTagDescriptor = {
                tag: "script",
                attrs: { type: "module" },
                children: `import "virtual:react-entry?src=${encodeURIComponent(entry)}";`,
                injectTo: "body",
              };
              const html = await generateHtml(tag);
              const finalHtml = await server.transformIndexHtml(req.url!, html);

              res.setHeader("Content-Type", "text/html");
              res.end(finalHtml);
            } else {
              res.writeHead(307, {
                Location: path + "/",
              });
              res.end();
            }
            return;
          }
        }

        next();
      });
    },
  };
}

async function extractMeta(ctx: PluginContext, id: string, file: string) {
  const module = await ctx.load({ id });
  const ast = ctx.parse(module.code!);

  const meta: Record<string, string | undefined> = {};
  traverse(ast, {
    ExportNamedDeclaration(path) {
      const node = path.node!;
      if (!is.variableDeclaration(node.declaration)) return;
      for (const declarator of node.declaration.declarations) {
        if (!is.identifier(declarator.id)) continue;

        for (const name of ["title", "description"]) {
          if (name !== declarator.id.name) continue;
          if (!is.literal(declarator.init) || !isString(declarator.init.value)) {
            error(`\`${name}\` export of ${file} must be a string literal.`);
            meta[name] = undefined;
          } else {
            meta[name] = declarator.init.value;
          }
        }
      }
    },
  });

  if (!("title" in meta)) {
    error(`\`${file}\` must export a title.`);
  } else if (!("description" in meta)) {
    warning(`\`${file}\` should export a description.`);
  }

  return meta;
}
