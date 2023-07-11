import { default as BlocklyCore } from "blockly/core";
import { Block } from "blockly/core/block";
import { javascriptGenerator } from "blockly/javascript";

import customBlocks from "./customBlocks.json";

BlocklyCore.defineBlocksWithJsonArray(customBlocks);

javascriptGenerator.addReservedWords("input,output");

javascriptGenerator.forBlock["read_int"] = () => {
  return ["input.readIntSync()", javascriptGenerator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock["write_int"] = (block: Block) => {
  const num = javascriptGenerator.valueToCode(
    block,
    "NUM",
    javascriptGenerator.ORDER_FUNCTION_CALL
  );
  return `output.writeIntSync(${num});`;
};
