import {
  type Block,
  VERSION as BlocklyVersion,
  defineBlocksWithJsonArray,
  type Workspace,
  type WorkspaceSvg,
} from "blockly/core";
import { type JavascriptGenerator, javascriptGenerator, Order } from "blockly/javascript";

import type { CustomBlockArg, CustomBlockProcessed } from "~/blockly-types";

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.INFINITE_LOOP_TRAP = 'if(--loopTrap === 0) error("Ciclo infinito");\n';
javascriptGenerator.addReservedWords("error,highlightBlock,loopTrap");
console.info("Blockly version:", BlocklyVersion);

function replaceArgs(block: Block, generator: JavascriptGenerator, args: CustomBlockArg[]) {
  const generatedArgs = args.map((arg): string => {
    switch (arg.type) {
      case "input_value":
        return (
          generator.valueToCode(block, arg.name, Order.NONE) ||
          'error("Il blocco ha bisogno di un parametro")'
        );

      case "field_dropdown":
        return block.getFieldValue(arg.name);
    }
  });
  return `${block.type}([${generatedArgs.join(", ")}])`;
}

export function initGenerator(workspace: Workspace, customBlocks: CustomBlockProcessed[]) {
  if (javascriptGenerator.isInitialized) {
    for (const customBlock of customBlocks) {
      if (!(customBlock.type in javascriptGenerator.forBlock)) {
        throw new Error(
          "javascriptGenerator was initialized multiple times with different custom blocks",
        );
      }
      javascriptGenerator.addReservedWords(customBlock.type);
    }
    return;
  }

  javascriptGenerator.init(workspace);
  defineBlocksWithJsonArray(customBlocks);

  for (const customBlock of customBlocks) {
    javascriptGenerator.forBlock[customBlock.type] = (
      block: Block,
      generator: JavascriptGenerator,
    ) => {
      return "output" in customBlock
        ? [replaceArgs(block, generator, customBlock.args0), Order.FUNCTION_CALL]
        : `${replaceArgs(block, generator, customBlock.args0)};\n`;
    };
  }
}

export function toJS(workspace?: WorkspaceSvg) {
  if (!workspace) return "";

  return javascriptGenerator.workspaceToCode(workspace);
}
