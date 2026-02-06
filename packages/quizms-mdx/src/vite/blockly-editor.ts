import type { PluginOption } from "vite";

export default function blocklyEditor(): PluginOption {
  return {
    name: "quizms:blockly-entry",
    api: {
      quizmsDevRoutes: [
        { pathname: "/__blockly_iframe", module: "@olinfo/quizms-mdx/blockly-editor" },
      ],
    },
    config(config) {
      if (config.build?.lib) return;
      return {
        build: {
          rollupOptions: {
            input: {
              __blockly_iframe: "virtual:quizms-entry?id=@olinfo/quizms-mdx/blockly-editor",
            },
          },
        },
      };
    },
  };
}
