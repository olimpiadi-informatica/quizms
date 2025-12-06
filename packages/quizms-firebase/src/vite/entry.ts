import { variantsConfigSchema } from "@olinfo/quizms/models";
import { reactComponentCase } from "@olinfo/quizms/utils";
import { load } from "@olinfo/quizms/utils-node";
import { type PluginOption, transformWithEsbuild } from "vite";

export default function firebaseEntry(): PluginOption {
  return {
    name: "quizms:firebase-entry",
    api: {
      quizmsDevRoutes: [
        {
          pathname: /^\/firebase\/admin(\/[^/]+(\/schools)?)?$/,
          module: "@olinfo/quizms-firebase/entry",
        },
        {
          pathname: /^\/firebase\/teacher(\/[^/]+(\/students(\/[^/]+)?)?)?$/,
          module: "@olinfo/quizms-firebase/entry",
        },
        {
          pathname: "/firebase",
          module: "@olinfo/quizms-firebase/entry",
        },
      ],
    },
    resolveId(id) {
      if (id === "virtual:quizms-firebase-config") {
        return `\0${id}`;
      }
      if (id === "virtual:quizms-firebase-header") {
        return `\0${id}`;
      }
    },
    async load(id) {
      if (id === "\0virtual:quizms-firebase-config") {
        return `export { default } from "~/firebase-config";`;
      }
      if (id === "\0virtual:quizms-firebase-header") {
        const configs = await load("variants", variantsConfigSchema);
        const header = `
import { lazy } from "react";

${configs.map((c) => `const ${reactComponentCase(c.id)}Header = lazy(() => import("~/${c.header}"));`).join("\n")}

export default function FirebaseHeader({ contestId }) {
  switch (contestId) {
  ${configs.map((c) => `case "${c.id}": return <${reactComponentCase(c.id)}Header />;`).join("\n")}
  }
}`;

        return transformWithEsbuild(header, "virtual:quizms-firebase-header.jsx", {
          jsx: "automatic",
        });
      }
    },
  } satisfies PluginOption;
}
