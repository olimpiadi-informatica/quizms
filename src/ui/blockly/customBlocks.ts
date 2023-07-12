import { default as BlocklyCore } from "blockly/core";
import { Block } from "blockly/core/block";
import { javascriptGenerator } from "blockly/javascript";

import customBlocks from "./customBlocks.json";

BlocklyCore.defineBlocksWithJsonArray(customBlocks);

javascriptGenerator.addReservedWords("input,output");

javascriptGenerator.forBlock["read_int"] = () => {
  return ["input.readInt()", javascriptGenerator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock["read_array_int"] = () => {
  return ["input.readArrayInt()", javascriptGenerator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock["write_any"] = (block: Block) => {
  const num = javascriptGenerator.valueToCode(
    block,
    "VAL",
    javascriptGenerator.ORDER_FUNCTION_CALL
  );
  return `output.writeAny(${num});`;
};
