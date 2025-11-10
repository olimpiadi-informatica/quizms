import type { PluginOption } from "vite";

export default function firebaseEntry(): PluginOption {
  return {
    name: "quizms:firebase-entry",
    api: {
      quizmsDevRoutes: [
        {
          pathname: /^\/firebase\/admin(\/\w+(\/schools)?)?$/,
          module: "@olinfo/quizms-firebase/entry",
        },
        {
          pathname: /^\/firebase\/teacher(\/\w+(\/students(\/\w+)?)?)?$/,
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
    },
    load(id) {
      if (id === "\0virtual:quizms-firebase-config") {
        return `export { default } from "~/firebase-config";`;
      }
    },
    config(config) {
      return {
        define: {
          "process.env.QUIZMS_FIREBASE_BASEPATH": JSON.stringify(
            config.mode === "development" ? "/firebase" : "/",
          ),
        },
      };
    },
  } satisfies PluginOption;
}
