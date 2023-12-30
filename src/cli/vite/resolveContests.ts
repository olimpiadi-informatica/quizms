import { PluginOption } from "vite";

export default function resolveContests(): PluginOption {
  const api = {
    contests: null,
  };

  return {
    name: "quizms:resolve-contest",
    resolveId(id) {
      if (id === "virtual:quizms-contests") {
        return "\0" + id;
      }
    },
    load(id) {
      if (id === "\0virtual:quizms-contests") {
        if (api.contests === null) {
          return `\
export default function() {
  throw new Error("\`PrintAuth\` can be used only with print command.");
}`;
        } else {
          return `\
export default function() {
  return ${JSON.stringify(api.contests)};
}`;
        }
      }
    },
    api,
  };
}
