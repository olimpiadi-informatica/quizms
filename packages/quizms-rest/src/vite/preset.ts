import { defaultClientConditions, defaultClientMainFields, type PluginOption } from "vite";

export default function restPreset(): PluginOption {
  return {
    name: "quizms:rest-preset",
    apply: "build",
    config() {
      return {
        environments: {
          rest: {
            resolve: {
              conditions: [...defaultClientConditions],
              mainFields: [...defaultClientMainFields],
              noExternal: true,
            },
            build: {
              rollupOptions: {
                input: {
                  index: "virtual:quizms-entry?id=@olinfo/quizms-rest/entry",
                },
              },
            },
          },
        },
      };
    },
  } satisfies PluginOption;
}
