import blocklyVm from "~/vite/blockly-vm";

import asymptote from "./asymptote";
import blocklyBlocks from "./blockly-blocks";
import blocklyEditor from "./blockly-editor";
import blocklyMedia from "./blockly-media";
import mdx from "./mdx";
import python from "./python";
import resolveMdxComponents from "./resolve-mdx-components";

/**
 * Registers the UI messages of this package in the app entries, so they load with the others:
 * the statement components that use them are loaded only later.
 */
const i18n = {
  name: "quizms-mdx:i18n",
  api: { quizmsEntryImports: ["@olinfo/quizms-mdx/i18n"] },
};

export default [
  i18n,
  asymptote(),
  blocklyBlocks(),
  blocklyEditor(),
  blocklyMedia(),
  blocklyVm(),
  mdx(),
  python(),
  resolveMdxComponents(),
] as any;
