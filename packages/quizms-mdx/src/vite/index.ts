import { fileURLToPath } from "node:url";

import type { PluginOption } from "vite";

import asymptote from "./asymptote";
import blocklyBlocks from "./blockly-blocks";
import blocklyMedia from "./blockly-media";
import mdx from "./mdx";
import python from "./python";
import resolveMdxComponents from "./resolve-mdx-components";

function config(): any {
  return {
    name: "quizms:quizms-mdx",
    config(config) {
      config.server?.fs?.allow?.push(
        fileURLToPath(new URL(/* @vite-ignore */ "..", import.meta.url)),
      );
    },
  } as PluginOption;
}

export default [
  asymptote(),
  blocklyBlocks(),
  blocklyMedia(),
  config(),
  mdx(),
  python(),
  resolveMdxComponents(),
];
