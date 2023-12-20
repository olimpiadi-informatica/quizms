import BlocklyCore, { Block, CodeGenerator, WorkspaceSvg } from "blockly";
import { javascriptGenerator } from "blockly/javascript";

import { CustomBlockArg } from "./customBlock";
import { ioBlocks } from "./ioBlocks";

console.log("Blockly version:", BlocklyCore.VERSION);

javascriptGenerator.STATEMENT_PREFIX = "highlightBlock(%1);\n";
javascriptGenerator.INFINITE_LOOP_TRAP =
  'if(--loopTrap === 0) throw new Error("Ciclo infinito");\n';
javascriptGenerator.addReservedWords("exit,highlightBlock,loopTrap,input,output");

BlocklyCore.defineBlocksWithJsonArray(ioBlocks);

type Generator = CodeGenerator & Record<`ORDER_${string}`, number>;

function replaceArgs(block: Block, generator: Generator, js: string, args?: CustomBlockArg[]) {
  return js.replace(/%(\d+)/g, (_, n) => {
    const arg = args?.[Number(n)];
    if (!arg) throw new Error(`Missing argument ${n} for block ${block.type}`);
    return generator.valueToCode(block, arg.name, generator.ORDER_NONE);
  });
}

for (const customBlock of ioBlocks) {
  javascriptGenerator.forBlock[customBlock.type] = (block: Block, generator: Generator) => {
    if (Array.isArray(customBlock.js)) {
      return [
        replaceArgs(block, generator, customBlock.js[0], customBlock.args0),
        generator[customBlock.js[1]],
      ];
    } else {
      return replaceArgs(block, generator, customBlock.js, customBlock.args0);
    }
  };
}

export default function toJS(workspace?: WorkspaceSvg) {
  if (!workspace) return "";
  return javascriptGenerator.workspaceToCode(workspace);
}
