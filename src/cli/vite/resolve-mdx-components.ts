import path from "node:path";

import process from "node:process";
import { camelCase, upperFirst } from "lodash-es";
import { glob } from "tinyglobby";
import type { PluginOption } from "vite";

const components = [
  "Answer",
  "AnswerGroup",
  "Blockly",
  "Code",
  "Contest",
  "Equation",
  "Explanation",
  "Image",
  "OpenAnswer",
  "Problem",
  "Section",
  "SubProblem",
];

export default function resolveMdxComponents(): PluginOption {
  return {
    name: "quizms:resolve-mdx-components",
    config: () => ({
      optimizeDeps: {
        exclude: ["virtual:quizms-mdx-components"],
      },
    }),
    resolveId(id, importer) {
      if (id === "virtual:quizms-mdx-components") {
        return `\0${id}?importer=${encodeURIComponent(importer ?? "")}`;
      }
      if (id === "virtual:quizms-mdx-components-client") {
        return {
          id: "../_virtual_quizms-mdx-components-client.js",
          external: true,
        };
      }
    },
    buildStart() {
      if (process.env.QUIZMS_MODE === "contest") {
        this.emitFile({
          type: "prebuilt-chunk",
          fileName: "_virtual_quizms-mdx-components-client.js",
          code: `"use client";\nexport { ${components} } from "@olinfo/quizms/internal/mdx-components";`,
          exports: components,
        });
      }
    },
    async load(id) {
      const [pathname, query] = id.split("?");
      if (pathname === "\0virtual:quizms-mdx-components") {
        const importer = new URLSearchParams(query).get("importer");

        let questions: [string, string][] = [];
        if (importer) {
          const dir = path.dirname(importer);
          const files = await glob("*/question.{md,mdx}", { cwd: dir });
          questions = files.map((file) => [
            path.join(dir, file),
            upperFirst(camelCase(path.dirname(file))),
          ]);
        }

        const componentSource =
          process.env.QUIZMS_MODE === "contest"
            ? "virtual:quizms-mdx-components-client"
            : "@olinfo/quizms/internal/mdx-components";

        return `\
import { ${components} } from "${componentSource}";

${questions.map(([file, name]) => `import ${name} from "${file}";`).join("\n")}

export function useMDXComponents() {
  return {
    ${components},
    ${questions.map(([, name]) => name)}
  };
}`;
      }
    },
  };
}
