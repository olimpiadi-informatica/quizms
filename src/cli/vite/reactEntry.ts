import { access } from "node:fs/promises";
import { extname, join } from "node:path";

import { stubFalse, stubTrue } from "lodash-es";
import { OutputChunk } from "rollup";
import { PluginOption } from "vite";

import htmlTemplate from "./htmlTemplate";

export default function reactEntry(): PluginOption {
  let isBuild = false;
  let root = "";
  const pages: Record<string, string> = {};

  return {
    name: "entry",
    configResolved(config) {
      isBuild = config.command === "build";
      root = config.root;
    },
    resolveId(id) {
      const [path] = id.split("?");
      if (path === "virtual:react-entry") {
        return "\0" + id;
      }
    },
    load(this, id) {
      const [path, query] = id.split("?");
      if (path === "\0virtual:react-entry") {
        const params = new URLSearchParams(query);
        const page = params.get("src")!;
        if (isBuild) {
          const pageId = this.emitFile({
            type: "asset",
            fileName: page.replace(/\.jsx$/, ".html"),
          });
          pages[pageId] = id;
        }

        const entry = join(root, page);
        return `\
import { createElement, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App, title } from "${entry}";

document.title = title;

createRoot(document.getElementById("app")).render(
  createElement(StrictMode, null, createElement(App))
);`;
      }
    },
    generateBundle(this, _, bundle) {
      for (const [pageId, entryId] of Object.entries(pages)) {
        const entry = Object.values(bundle).find(
          (chunk) => "facadeModuleId" in chunk && chunk.facadeModuleId === entryId,
        ) as OutputChunk;

        const modules = new Set<string>();
        const queue = [entry];

        while (queue.length) {
          const chunk = queue.pop()!;
          for (const dep of chunk.imports) {
            if (modules.has(dep)) continue;
            modules.add(dep);
            queue.push(bundle[dep] as OutputChunk);
          }
          for (const css of chunk.viteMetadata?.importedCss ?? []) {
            modules.add(css);
          }
        }

        const head = [...modules]
          .map((fileName) => {
            const rel = fileName.endsWith(".css") ? "stylesheet" : "modulepreload";
            return `<link rel="${rel}" href="/${fileName}">`;
          })
          .join("\n    ");
        const body = `<script type="module" src="/${entry.fileName}"></script>`;

        const html = htmlTemplate(body, head);

        this.setAssetSource(pageId, html);
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        const ext = extname(url.pathname);

        if (ext === "" || ext === ".html") {
          const entry = `.${url.pathname.replace(/([^/])$/, "$1/")}index.jsx`;

          const exists = await access(join(root, entry)).then(stubTrue, stubFalse);
          if (exists) {
            const body = `\
    <script type="module">
      import "virtual:react-entry?src=${encodeURIComponent(entry)}";
    </script>`;
            const html = htmlTemplate(body);
            const finalHtml = await server.transformIndexHtml(req.url!, html);

            res.setHeader("Content-Type", "text/html");
            res.end(finalHtml);
            return;
          }
        }

        next();
      });
    },
  };
}
