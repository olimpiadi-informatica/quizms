import type { PluginOption } from "vite";

export default function firebasePreset(): PluginOption {
  return {
    name: "quizms:firebase-preset",
    apply: "build",
    config() {
      return {
        environments: {
          firebase: {
            ssr: false,
            resolve: {
              conditions: ["module", "browser", "import", "production"],
              noExternal: true,
            },
            build: {
              rollupOptions: {
                input: {
                  index: "virtual:quizms-entry?@olinfo/quizms-firebase/entry",
                },
              },
            },
          },
        },
      };
    },
  } satisfies PluginOption;
}
