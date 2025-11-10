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

import { type Contest, contestSchema } from "~/models";
import { type VariantsConfig, variantsConfigSchema } from "~/models/variants-config";
import { reactComponentCase } from "~/utils";
import { fatal, load } from "~/utils-node";

import configs from "./vite/configs";
import { generateHtml } from "./vite/html";

export type DevOptions = {
  port: number;
};

export default async function devServer(options: DevOptions) {
  const contests = await load("contests", contestSchema);
  const variantConfigs = await load("variants", variantsConfigSchema);

  process.env.QUIZMS_MODE = "development";

  const config = mergeConfig(configs("development"), {
    publicDir: path.join(cwd(), "public"),
    plugins: [devEntry(contests, variantConfigs)],
  } as InlineConfig);
  const server = await createServer(config);
  await server.listen(options.port);

  server.printUrls();

  await new Promise(noop);
}

function devEntry(contests: Contest[], variantConfigs: VariantsConfig[]): PluginOption {
  const contestConfigs = contests.map((contest) => {
    const config = variantConfigs.find((c) => c.id === contest.id);
    if (!config) {
      fatal(`Missing variants configuration for contest ${contest.id}.`);
    }
    return { ...contest, ...config };
  });

  const pages = ["", ...contests.map((contest) => contest.id)];

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
        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { DevProvider, DevRoutes } from "@olinfo/quizms/dev";
import { Route } from "wouter";

${contestConfigs
  .flatMap((contest) => {
    const imports = [`import ${reactComponentCase(contest.id)} from "/${contest.entry}";`];
    if (contest.header) {
      imports.push(`import ${reactComponentCase(contest.id)}Header from "/${contest.header}";`);
    }
    return imports;
  })
  .join("\n")}

export default function createDevEntry() {
  return createApp(
    <DevRoutes contests={${JSON.stringify(contests)}}>
      ${contestConfigs
        .map((contest) => {
          return `
            <Route path="/${contest.id}">
              <DevProvider contest={${JSON.stringify(contest)}}>
                ${contest.header && `<${reactComponentCase(contest.id)}Header />`}
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

        for (const route of routes) {
          const match = isString(route.pathname)
            ? route.pathname === req.url
            : route.pathname.test(req.url);
          if (match) {
            const tags: HtmlTagDescriptor[] = [
              {
                tag: "script",
                children: "globalThis.__webpack_require__ = {};",
                injectTo: "head",
              },
              {
                tag: "script",
                attrs: { type: "module" },
                children: `import "virtual:quizms-entry?${route.module}";`,
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
