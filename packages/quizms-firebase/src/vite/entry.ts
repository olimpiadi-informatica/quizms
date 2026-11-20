import { readFile } from "node:fs/promises";

import { variantsConfigSchema } from "@olinfo/quizms/models";
import { reactComponentCase } from "@olinfo/quizms/utils";
import { findHeaderTranslations, load } from "@olinfo/quizms/utils-node";
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
        // Each contest header with its translations (`header.<lang>.md`), shown in the
        // statement language chosen by the student.
        const headers = configs
          .filter((c) => c.header)
          .map((c) => {
            const name = `${reactComponentCase(c.id)}Header`;
            const { translations } = findHeaderTranslations(c.header!, c.languages, c.languages[0]);
            const imports = [
              `const ${name} = lazy(() => import(${JSON.stringify(`~/${c.header}`)}));`,
              ...Object.entries(translations).map(
                ([lang, file]) =>
                  `const ${name}$${lang} = lazy(() => import(${JSON.stringify(`~/${file}`)}));`,
              ),
            ];
            const entries = Object.keys(translations).map(
              (lang) => `${JSON.stringify(lang)}: ${name}$${lang}`,
            );
            const element = `<Localized base={${name}} translations={{ ${entries.join(", ")} }} />`;
            return { id: c.id, imports, element };
          });

        const header = `
import { lazy } from "react";
import { Localized } from "@olinfo/quizms/components";

${headers.flatMap((h) => h.imports).join("\n")}

export default function FirebaseHeader({ contestId }) {
  switch (contestId) {
  ${headers.map((h) => `case ${JSON.stringify(h.id)}: return ${h.element};`).join("\n")}
  }
  return null;
}`;

        return transformWithEsbuild(header, "virtual:quizms-firebase-header.jsx", {
          jsx: "automatic",
        });
      }
    },
  } satisfies PluginOption;
}
