import { reactComponentCase } from "@olinfo/quizms/utils";
import { loadContests } from "@olinfo/quizms/utils-node";
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

        const entry = `
import { createApp } from "@olinfo/quizms/entry";
import { TrainingProvider, TrainingStatement } from "@olinfo/quizms-training/entry";
import { Route, Switch } from "wouter";

${isDev ? `import ${reactComponentCase(contest.id)} from "/${contest.entry}";` : ""}
${contest.header ? `import ${reactComponentCase(contest.id)}Header from "/${contest.header}";` : ""}

export default function createTrainingEntry() {
  return createApp(
    <TrainingProvider contest={${JSON.stringify(contest)}}>
      ${contest.header ? `<${reactComponentCase(contest.id)}Header />` : ""}
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
