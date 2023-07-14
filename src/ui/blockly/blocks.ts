import { Block, default as BlocklyCore } from "blockly";
import { javascriptGenerator } from "blockly/javascript";

import customBlocks from "./blocks.json";

BlocklyCore.defineBlocksWithJsonArray(customBlocks);

javascriptGenerator.addReservedWords("input,output,exit");

javascriptGenerator.forBlock["read_int"] = () => {
  return ["input.readInt()", javascriptGenerator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock["read_array_int"] = (block: Block) => {
  const length = javascriptGenerator.valueToCode(
    block,
    "LENGTH",
    javascriptGenerator.ORDER_FUNCTION_CALL
  );
  return [`input.readArrayInt(${length})`, javascriptGenerator.ORDER_FUNCTION_CALL];
};

javascriptGenerator.forBlock["write_any"] = (block: Block) => {
  const num = javascriptGenerator.valueToCode(
    block,
    "VAL",
    javascriptGenerator.ORDER_FUNCTION_CALL
  );
  return `output.writeAny(${num});\n`;
};

javascriptGenerator.forBlock["start"] = () => {
  return "";
};

javascriptGenerator.forBlock["exit"] = () => {
  return "exit();\n";
};
