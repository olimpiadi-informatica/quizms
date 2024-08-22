import type { PluginOption } from "vite";

export default function resolveContests(): PluginOption {
  const api = {
    contests: undefined,
  };

  return {
    name: "quizms:resolve-contest",
    config: () => ({
      optimizeDeps: {
        exclude: ["virtual:quizms-contests"],
      },
    }),
    resolveId(id) {
      if (id === "virtual:quizms-contests") {
        return `\0${id}`;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-contests") {
        return api.contests === undefined
          ? `\
export default function() {
  throw new Error("\`PrintAuth\` can be used only with print command.");
}`
          : `\
export default function() {
  return ${JSON.stringify(api.contests)};
}`;
      }
    },
    api,
  };
}
