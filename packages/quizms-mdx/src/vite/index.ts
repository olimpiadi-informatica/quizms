import asymptote from "./asymptote";
import blocklyBlocks from "./blockly-blocks";
import blocklyEditor from "./blockly-editor";
import blocklyMedia from "./blockly-media";
import mdx from "./mdx";
import python from "./python";
import resolveMdxComponents from "./resolve-mdx-components";

export default [
  asymptote(),
  blocklyBlocks(),
  blocklyEditor(),
  blocklyMedia(),
  mdx(),
  python(),
  resolveMdxComponents(),
] as any;
