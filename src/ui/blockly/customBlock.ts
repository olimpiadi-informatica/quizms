type BlocklyType = "Number" | "String" | "Array" | "Boolean";

export type CustomBlockArg = {
  type: "input_value";
  name: string;
  check?: BlocklyType;
};

// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html
// https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks

export type CustomBlock = {
  // Block id
  type: string;
  // Text inside the block
  message0: string;
  // Block input fields
  args0?: CustomBlockArg[];
  // Type of the block's output
  output?: BlocklyType;
  // Set null if this block is the last block of a chain
  nextStatement?: null;
  // Set null if this block is the first block of a chain
  previousStatement?: null;
  // Color of the block (https://developers.google.com/blockly/guides/create-custom-blocks/block-colour)
  colour: number | string;
  // Tooltip shown when hovering over the block
  tooltip: string;
  // Page to open when clicking on the "help" button
  helpUrl: string;
  // Maximum number of instances of this block
  maxInstances?: number;
  // Code generator for this block
  js: [string, `ORDER_${string}`] | string;
};
