import { readFile } from "node:fs/promises";

import { variantsConfigSchema } from "@olinfo/quizms/models";
import { reactComponentCase } from "@olinfo/quizms/utils";
import { load } from "@olinfo/quizms/utils-node";
import { type PluginOption, transformWithEsbuild } from "vite";

async function getFirebaseRewrite() {
  let firebaseConfig: any;
  try {
    firebaseConfig = JSON.parse(await readFile("firebase.json", "utf8"));
  } catch (err: any) {
    throw new Error(`Failed to read \`firebase-config.json\`: ${err.message}`, { cause: err });
  }

  const rewrites = firebaseConfig.hosting?.rewrites;
  if (!rewrites) {
    throw new Error("Failed to find API rewrite");
  }
  return rewrites as {
    source: string;
    function?: {
      functionId: string;
      region: string;
    };
  }[];
}

async function getProjectId() {
  try {
    const data = JSON.parse(await readFile(".firebaserc", "utf-8"));
    return Object.values(data.projects)[0] as string;
  } catch (err: any) {
    throw new Error(`Failed to read \`.firebaserc\`: ${err.message}`, { cause: err });
  }
}

export default async function firebaseEntry(): Promise<PluginOption> {
  const rewrite = await getFirebaseRewrite();
  const projectId = await getProjectId();

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
    config() {
      return {
        server: {
          proxy: Object.fromEntries(
            rewrite
              .filter((rewrite) => rewrite.function)
              .map((rewrite) => [
                rewrite.source,
                {
                  target: `https://${rewrite.function!.region}-${projectId}.cloudfunctions.net/${rewrite.function!.functionId}`,
                  changeOrigin: true,
                },
              ]),
          ),
        },
      };
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
