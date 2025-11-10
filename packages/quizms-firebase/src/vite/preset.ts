import type { PluginOption } from "vite";

export default function firebasePreset(): PluginOption {
  return {
    name: "quizms:firebase-preset",
    apply: "build",
    config() {
      return {
        environments: { firebase: {} },
      };
    },
  } satisfies PluginOption;
}
