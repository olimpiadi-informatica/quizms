import path from "node:path";

import glob from "fast-glob";
import { camelCase, upperFirst } from "lodash-es";
import { PluginOption } from "vite";

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
    },
    async load(id) {
      const [pathname, query] = id.split("?");
      if (pathname === "\0virtual:quizms-mdx-components") {
        const importer = new URLSearchParams(query).get("importer");

        let questions: [string, string][] = [];
        if (importer) {
          const dir = path.dirname(importer);
          const files = await glob("*/question.(md|mdx)", { cwd: dir });
          questions = files.map((file) => [
            path.join(dir, file),
            upperFirst(camelCase(path.dirname(file))),
          ]);
        }
        if (questions.length === 0) {
          return 'export { useMDXComponents } from "@olinfo/quizms/internal/mdx-components";';
        }

        return `\
import { useMDXComponents as quizmsComponents } from "@olinfo/quizms/internal/mdx-components";

${questions.map(([file, name]) => `import ${name} from "${file}";`).join("\n")}

export function useMDXComponents() {
  return {
    ...quizmsComponents(),
    ${questions.map(([, name]) => name).join(",\n    ")},
  };
}`;
      }
    },
  };
}
