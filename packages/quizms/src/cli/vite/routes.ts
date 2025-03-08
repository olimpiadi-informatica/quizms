import { existsSync } from "node:fs";
import path from "node:path";

import { sortBy } from "lodash-es";
import type { OutputChunk } from "rollup";
import { glob } from "tinyglobby";
import { type HtmlTagDescriptor, type PluginOption, transformWithEsbuild } from "vite";

import { error } from "~/utils/logs";

import { generateHtml, generateHtmlFromBundle } from "./html";

export default function routes(): PluginOption {
  let isLib = false;
  let root = "";

  return {
    name: "quizms:routes",
    enforce: "pre",
    configResolved(config) {
      isLib = !!config.build.lib;
      root = config.root;
    },
    resolveId(id) {
      const [pathname] = id.split("?");
      if (pathname === "virtual:quizms-routes") {
        return `\0${id}`;
      }
      if (pathname === "react-dom/server") {
        return `\0${id}`;
      }
    },
    async load(this, id) {
      if (id === "\0virtual:quizms-routes") {
        const pages = await glob("**/page.{js,jsx,ts,tsx}", { cwd: root });

        if (!existsSync(path.join(root, "global.css"))) {
          error("Missing global.css file");
        }

        const imports = pages.map(
          (page, i) => `const Page${i} = lazy(() => wrapPage(import("~/${page}")));`,
        );
        const routes = pages.map(
          (page, i) =>
            `<Route path="/${path.dirname(page).replace(/^\.$/, "")}" nest><Page${i} /></Route>`,
        );

        const entry = `\
import { lazy, StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { wrapPage, BaseLayout } from "@olinfo/quizms/components";
import { Route } from "wouter";

import "@olinfo/quizms/css";
import "~/global.css";

${imports.join("\n")}

createRoot(document.getElementById("app")).render(
  <StrictMode>
    <BaseLayout>
      ${sortBy(routes, "length").reverse().join("\n      ")}
    </BaseLayout>
  </StrictMode>
);`;

        return transformWithEsbuild(entry, "virtual-quizms-routes.jsx", { jsx: "automatic" });
      }
      if (id === "\0react-dom/server") {
        return `\
export function renderToStaticMarkup() { throw new Error("react-dom/server is not available in the browser"); }`;
      }
    },
    async generateBundle(this, _, bundle) {
      if (isLib) return;

      const entry = Object.values(bundle).find(
        (chunk) => "facadeModuleId" in chunk && chunk.facadeModuleId === "\0virtual:quizms-routes",
      ) as OutputChunk;

      this.emitFile({
        type: "asset",
        fileName: "index.html",
        source: await generateHtmlFromBundle(entry, bundle),
      });
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url!, `http://${req.headers.host}`);
        if (url.pathname.endsWith("/")) {
          const tag: HtmlTagDescriptor = {
            tag: "script",
            attrs: { type: "module" },
            children: `import "virtual:quizms-routes";`,
            injectTo: "body",
          };
          const html = await generateHtml(tag);
          const finalHtml = await server.transformIndexHtml(url.pathname, html);

          res.setHeader("Content-Type", "text/html");
          res.end(finalHtml);
          return;
        }

        next();
      });
    },
  };
}
