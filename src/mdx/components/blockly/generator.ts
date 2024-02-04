import BlocklyCore, { Block, CodeGenerator, Workspace, WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";

import { CustomBlock, CustomBlockArg } from "./custom-block";

type Generator = CodeGenerator & Record<`ORDER_${string}`, number>;

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.INFINITE_LOOP_TRAP =
  'if(--loopTrap === 0) throw new Error("Ciclo infinito");\n';
javascriptGenerator.addReservedWords("exit,highlightBlock,loopTrap,input,output");
console.log("Blockly version:", BlocklyCore.VERSION);

function replaceArgs(block: Block, generator: Generator, js: string, args?: CustomBlockArg[]) {
  return js.replaceAll(/%(\d+)/g, (_, n) => {
    const arg = args?.[Number(n)];
    if (!arg) throw new Error(`Missing argument ${n} for block ${block.type}`);
    return generator.valueToCode(block, arg.name, generator.ORDER_NONE);
  });
}

export function initGenerator(workspace: Workspace, customBlocks?: CustomBlock[]) {
  javascriptGenerator.init(workspace);
  if (customBlocks) {
    BlocklyCore.defineBlocksWithJsonArray(customBlocks);

    for (const customBlock of customBlocks) {
      javascriptGenerator.forBlock[customBlock.type] = (block: Block, generator: Generator) => {
        return Array.isArray(customBlock.js)
          ? [
              replaceArgs(block, generator, customBlock.js[0], customBlock.args0),
              generator[customBlock.js[1]],
            ]
          : replaceArgs(block, generator, customBlock.js, customBlock.args0);
      };
    }
  }
}

export default function toJS(workspace?: WorkspaceSvg) {
  if (!workspace) return "";
  return javascriptGenerator.workspaceToCode(workspace);
}
