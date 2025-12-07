import { defaultClientConditions, defaultClientMainFields, type PluginOption } from "vite";

export default function training(): PluginOption {
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
                input: { index: "virtual:quizms-entry" },
              },
              sourcemap: true,
            },
          },
        },
      };
    },
    buildStart() {
      if (this.environment.name === "training") {
        process.env.QUIZMS_MODE = "training";
        throw new Error("training output is not implemented yet");
      }
    },
  };
}
