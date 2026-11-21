import { compileCatalog } from "./blockly-po.mjs";

/**
 * Compiles `import messages from "…/locales/blockly/<locale>.po?blockly"` into the messages of
 * Blockly's `setLocale` (see `scripts/blockly-po.mjs`).
 *
 * @param {{ failOnMissing?: boolean }} options `failOnMissing`: fail on untranslated messages.
 */
export default function blocklyPo({ failOnMissing = false } = {}) {
  return {
    name: "quizms:blockly-po",
    enforce: "pre",
    load(id) {
      const [file, query] = id.split("?");
      if (query !== "blockly" || !file.endsWith(".po")) return;

      this.addWatchFile(file);
      const { messages, missing } = compileCatalog(file);
      if (failOnMissing && missing.length > 0) {
        this.error(
          `${file}: ${missing.length} untranslated or fuzzy Blockly messages: ${missing.join(", ")}`,
        );
      }
      return `export default ${JSON.stringify(messages)};`;
    },
  };
}
