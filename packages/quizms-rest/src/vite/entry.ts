import { variantsConfigSchema } from "@olinfo/quizms/models";
import { reactComponentCase } from "@olinfo/quizms/utils";
import { load } from "@olinfo/quizms/utils-node";
import { type PluginOption, transformWithEsbuild } from "vite";

export default function restEntry(): PluginOption {
  return {
    name: "quizms:rest-entry",
    api: {
      quizmsDevRoutes: [
        {
          pathname: /^\/rest\/admin(\/[^/]+(\/schools)?)?$/,
          module: "@olinfo/quizms-rest/entry",
        },
        {
          pathname: /^\/rest\/teacher(\/[^/]+(\/students(\/[^/]+)?)?)?$/,
          module: "@olinfo/quizms-rest/entry",
        },
        {
          pathname: "/rest",
          module: "@olinfo/quizms-rest/entry",
        },
      ],
    },
    config() {
      return {
        server: {
          proxy: {
            "/api": {
              target: "http://0.0.0.0:3000",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
        },
      };
    },
    resolveId(id) {
      if (id === "virtual:quizms-rest-header") {
        return `\0${id}`;
      }
    },
    async load(id) {
      if (id === "\0virtual:quizms-rest-header") {
        const configs = await load("variants", variantsConfigSchema);
        const header = `
import { lazy } from "react";

${configs.map((c) => `const ${reactComponentCase(c.id)}Header = lazy(() => import("~/${c.header}"));`).join("\n")}

export default function RestHeader({ contestId }) {
  switch (contestId) {
  ${configs.map((c) => `case "${c.id}": return <${reactComponentCase(c.id)}Header />;`).join("\n")}
  }
}`;

        return transformWithEsbuild(header, "virtual:quizms-rest-header.jsx", {
          jsx: "automatic",
        });
      }
    },
  } satisfies PluginOption;
}
