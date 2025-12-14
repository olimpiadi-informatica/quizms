import type { PluginOption } from "vite";

export default function blocklyVm(): PluginOption {
  return {
    name: "quizms:blockly-vm",
    resolveId: {
      order: "pre",
      handler(id, importer) {
        if (id === "vm" && importer?.endsWith("js-interpreter.js")) {
          return "\0virtual:quizms-vm";
        }
      },
    },
    load(id) {
      if (id === "\0virtual:quizms-vm") {
        return "export default null;";
      }
    },
  };
}
