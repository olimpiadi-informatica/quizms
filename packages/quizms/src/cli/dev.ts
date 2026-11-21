import path from "node:path";
import { cwd } from "node:process";

import { isString, noop } from "lodash-es";
import {
  createServer,
  type HtmlTagDescriptor,
  type InlineConfig,
  mergeConfig,
  type PluginOption,
  transformWithEsbuild,
} from "vite";

import type { Contest } from "~/models";
import type { VariantsConfig } from "~/models/variants-config";
import { reactComponentCase } from "~/utils";
import {
  findHeaderTranslations,
  headerEntry,
  loadContests,
  setContestLanguages,
} from "~/utils-node";

import configs from "./vite/configs";
import { generateHtml } from "./vite/html";
import { getDevImportMap } from "./vite/statement-externals";

export type DevOptions = {
  port: number;
};

export default async function devServer(options: DevOptions) {
  const contests = await loadContests();
  setContestLanguages(contests);

  const config = mergeConfig(configs("development"), {
    publicDir: path.join(cwd(), "public"),
    plugins: [devEntry(contests)],
  } as InlineConfig);
  const server = await createServer(config);
  await server.listen(options.port);

  server.printUrls();

  await new Promise(noop);
}

function devEntry(contestConfigs: (Contest & VariantsConfig)[]): PluginOption {
  const pages = ["", ...contestConfigs.map((contest) => contest.id)];

  return {
    name: "quizms:dev-entry",
    api: {
      quizmsDevRoutes: pages.map((page) => ({
        pathname: `/${page}`,
        module: "virtual:quizms-dev-entry",
      })),
    },
    resolveId(id) {
      if (id === "virtual:quizms-dev-entry") {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-dev-entry") {
        // Missing header translations fall back to the default header, like problems in dev.
        const headers = new Map(
          contestConfigs
            .filter((contest) => contest.header)
            .map((contest) => {
              const { translations } = findHeaderTranslations(
                contest.header!,
                contest.languages,
                contest.languages[0],
              );
              return [contest.id, headerEntry(contest.id, contest.header!, translations)];
            }),
        );

        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { Localized } from "@olinfo/quizms/components";
import { DevProvider, DevRoutes } from "@olinfo/quizms/dev";
import { Route } from "wouter";

${contestConfigs
  .flatMap((contest) => [
    `import ${reactComponentCase(contest.id)} from "/${contest.entry}";`,
    ...(headers.get(contest.id)?.imports ?? []),
  ])
  .join("\n")}

export default function createDevEntry() {
  return createApp(
    <DevRoutes contests={${JSON.stringify(contestConfigs)}}>
      ${contestConfigs
        .map((contest) => {
          return `
            <Route path="/${contest.id}">
              <DevProvider contest={${JSON.stringify(contest)}}>
                ${headers.get(contest.id)?.element ?? ""}
                <${reactComponentCase(contest.id)} />
              </DevProvider>
            </Route>`;
        })
        .join("\n")}
    </DevRoutes>
  );
}`;
        return transformWithEsbuild(entry, "virtual-quizms-dev-entry.jsx", { jsx: "automatic" });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) {
          next();
          return;
        }

        const routes: { pathname: string | RegExp; module: string }[] =
          server.config.plugins.flatMap((plugin) => plugin.api?.quizmsDevRoutes ?? []);

        // Match on the path only, so that query parameters (e.g. `?lang=en`) are allowed.
        const pathname = req.url.split("?")[0];
        for (const route of routes) {
          const match = isString(route.pathname)
            ? route.pathname === pathname
            : route.pathname.test(pathname);
          if (match) {
            const tags: HtmlTagDescriptor[] = [
              {
                tag: "script",
                attrs: { type: "importmap" },
                children: JSON.stringify(getDevImportMap()),
                injectTo: "head",
              },
              {
                tag: "script",
                children: "globalThis.__webpack_require__ = {};",
                injectTo: "head",
              },
              {
                tag: "script",
                attrs: { type: "module" },
                children: `import "virtual:quizms-entry?id=${encodeURIComponent(route.module)}";`,
                injectTo: "body",
              },
            ];
            const html = await generateHtml(...tags);
            const finalHtml = await server.transformIndexHtml(req.url, html);

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
