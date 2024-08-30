import {
  type Block,
  VERSION as BlocklyVersion,
  type Workspace,
  type WorkspaceSvg,
  defineBlocksWithJsonArray,
} from "blockly/core";
import { type JavascriptGenerator, Order, javascriptGenerator } from "blockly/javascript";

import type { CustomBlock, CustomBlockArg } from "~/models/blockly-custom-block";

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.INFINITE_LOOP_TRAP = 'if(--loopTrap === 0) exit(false, "Ciclo infinito");\n';
javascriptGenerator.addReservedWords("exit,highlightBlock,loopTrap,state");
console.info("Blockly version:", BlocklyVersion);

function replaceArgs(
  block: Block,
  generator: JavascriptGenerator,
  js: string,
  args?: CustomBlockArg[],
) {
  return js.replaceAll(/_ARG\d+/g, (name): string => {
    const arg = args?.find((b) => b.name === name);
    if (!arg) throw new Error(`Missing argument ${name} for block ${block.type}`);

    switch (arg.type) {
      case "input_value": {
        const code = generator.valueToCode(block, arg.name, Order.NONE);
        if (!code) return 'exit(false, "il blocco ha bisogno di un parametro")';
        return code;
      }
      case "field_dropdown": {
        return block.getFieldValue(arg.name);
      }
    }
  });
}

export function initGenerator(workspace: Workspace, customBlocks: CustomBlock[]) {
  if (javascriptGenerator.isInitialized) {
    for (const customBlock of customBlocks) {
      if (!(customBlock.type in javascriptGenerator.forBlock)) {
        throw new Error(
          "javascriptGenerator was initialized multiple times with different custom blocks",
        );
      }
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
      return Array.isArray(customBlock.js)
        ? [replaceArgs(block, generator, customBlock.js[0], customBlock.args0), customBlock.js[1]]
        : replaceArgs(block, generator, customBlock.js, customBlock.args0);
    };
  }
}

export function toJS(workspace?: WorkspaceSvg) {
  if (!workspace) return "";

  const js = javascriptGenerator.workspaceToCode(workspace);
  return `${js}\nexit(false, "L'esecuzione è terminata prima di finire il livello");`;
}
