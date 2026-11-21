import { reactComponentCase } from "@olinfo/quizms/utils";
import { findHeaderTranslations, headerEntry, loadContests } from "@olinfo/quizms/utils-node";
import { type PluginOption, transformWithEsbuild } from "vite";

export default async function trainingEntry(): Promise<PluginOption> {
  const contests = await loadContests();

  return {
    name: "quizms:training-entry",
    resolveId(id) {
      const [pathname] = id.split("?");
      if (pathname === "virtual:quizms-training-entry") {
        return `\0${id}`;
      }
    },
    load(id) {
      const [pathname, query] = id.split("?");
      if (pathname === "\0virtual:quizms-training-entry") {
        const params = new URLSearchParams(query);
        const contestId = params.get("id");
        const contest = contests.find((c) => c.id === contestId)!;
        const isDev = params.has("dev");
        // The header in the statement language, with its translations (`header.<lang>.md`).
        const header =
          contest.header &&
          headerEntry(
            contest.id,
            contest.header,
            findHeaderTranslations(contest.header, contest.languages, contest.languages[0])
              .translations,
          );

        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { Localized } from "@olinfo/quizms/components";
import { TrainingProvider, TrainingStatement } from "@olinfo/quizms-training/entry";
import { Route, Switch } from "wouter";

${isDev ? `import ${reactComponentCase(contest.id)} from "/${contest.entry}";` : ""}
${header ? header.imports.join("\n") : ""}

export default function createTrainingEntry() {
  return createApp(
    <TrainingProvider contest={${JSON.stringify(contest)}}>
      ${header ? header.element : ""}
      ${isDev ? `<${reactComponentCase(contest.id)} />` : "<TrainingStatement />"}
    </TrainingProvider>
  );
}
`;
        return transformWithEsbuild(entry, "virtual-quizms-training-entry.jsx", {
          jsx: "automatic",
        });
      }
    },
  };
}
