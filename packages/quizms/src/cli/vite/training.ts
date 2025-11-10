import type { PluginOption } from "vite";

export default function training(): PluginOption {
  const trainingEnvName = "training";

  return {
    name: "quizms:training-preset",
    apply: "build",
    config() {
      return {
        environments: {
          [trainingEnvName]: {
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
      if (this.environment.name === trainingEnvName) {
        process.env.QUIZMS_MODE = "training";
        throw new Error("training output is not implemented yet");
      }
    },
  };
}
