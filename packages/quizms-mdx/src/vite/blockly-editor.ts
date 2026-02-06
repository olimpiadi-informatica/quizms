import type { PluginOption } from "vite";

export default function blocklyEditor(): PluginOption {
  return {
    name: "quizms:blockly-entry",
    api: {
      quizmsDevRoutes: [
        { pathname: "/__blockly_iframe.html", module: "@olinfo/quizms-mdx/blockly-editor" },
      ],
    },
    config(config) {
      const input = config.build?.rollupOptions?.input;
      if (input) {
        (input as Record<string, string>).__blockly_iframe =
          "virtual:quizms-entry?id=@olinfo/quizms-mdx/blockly-editor";
      }
    },
  };
}
