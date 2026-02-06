import { loadContests } from "@olinfo/quizms/utils-node";
import { defaultClientConditions, defaultClientMainFields, type PluginOption } from "vite";

export default async function trainingPreset(): Promise<PluginOption> {
  const contests = await loadContests();

  return {
    name: "quizms:training-preset",
    apply: "build",
    config() {
      return {
        environments: {
          training: {
            resolve: {
              conditions: [...defaultClientConditions],
              mainFields: [...defaultClientMainFields],
              noExternal: true,
            },
            build: {
              rollupOptions: {
                input: Object.fromEntries(
                  contests.map((contest) => [
                    contest.id,
                    `virtual:quizms-entry?id=${encodeURIComponent(`virtual:quizms-training-entry?id=${contest.id}`)}`,
                  ]),
                ),
              },
              sourcemap: true,
            },
          },
        },
      };
    },
    buildStart() {
      if (this.environment.name === "training") {
        this.emitFile({
          type: "asset",
          fileName: "contests.json",
          source: JSON.stringify(contests),
        });
      }
    },
  };
}
