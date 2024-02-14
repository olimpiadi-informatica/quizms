import { z } from "zod";

const blocklyTypeSchema = z.enum(["Number", "String", "Array", "Boolean"]);

const customBlockArgSchema = z.object({
  type: z.literal("input_value"),
  name: z.string(),
  check: blocklyTypeSchema,
});

export type CustomBlockArg = z.infer<typeof customBlockArgSchema>;

// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html
// https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks

const baseBlockSchema = z.object({
  // Block id
  type: z.string(),
  // Text inside the block
  message0: z.string(),
  // Block input fields
  args0: z.array(customBlockArgSchema).optional(),
  // Color of the block (https://developers.google.com/blockly/guides/create-custom-blocks/block-colour)
  colour: z.union([z.number(), z.string()]),
  // Tooltip shown when hovering over the block
  tooltip: z.string(),
  // Page to open when clicking on the "help" button
  helpUrl: z.string(),
  // Maximum number of instances of this block
  maxInstances: z.number().optional(),
});

const statementBlockSchema = baseBlockSchema.extend({
  // Set null if this block is the last block of a chain
  nextStatement: z.literal(null).optional(),
  // Set null if this block is the first block of a chain
  previousStatement: z.literal(null).optional(),
  // Code generator for this block
  js: z.string(),
});

const expressionBlockSchema = baseBlockSchema.extend({
  // Type of the block's output
  output: blocklyTypeSchema,
  // Code generator for this block
  js: z.tuple([z.string(), z.string().startsWith("ORDER_")]),
});

export const customBlockSchema = z.union([statementBlockSchema, expressionBlockSchema]);

export type CustomBlock = z.infer<typeof customBlockSchema>;
