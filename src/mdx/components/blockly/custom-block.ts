import { Program, parse as rawParse } from "acorn";
import { z } from "zod";

import order from "./custom-block-order";

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

const statementBlockSchema = baseBlockSchema
  .extend({
    // Set null if this block is the last block of a chain
    nextStatement: z.literal(null).optional(),
    // Set null if this block is the first block of a chain
    previousStatement: z.literal(null).optional(),
    // Code generator for this block
    js: z.string(),
  })
  .superRefine((block, ctx) => {
    if (import.meta.env.DEV) {
      try {
        parse(block.js);
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid JavaScript code for block \`${block.type}\`: ${(e as SyntaxError).message}`,
          path: ["js"],
        });
      }
    }
  });

const expressionBlockSchema = baseBlockSchema
  .extend({
    // Type of the block's output
    output: blocklyTypeSchema,
    // Code generator for this block
    js: z.tuple([z.string(), z.string().startsWith("ORDER_")]),
  })
  .superRefine((block, ctx) => {
    if (import.meta.env.DEV) {
      try {
        const ast = parse(block.js[0]);
        if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
          throw new Error("Must be a single expression");
        }

        const expression = ast.body[0].expression;
        const priority = order(expression);
        if (!priority) {
          throw new Error(`Unsupported expression: ${expression.type}`);
        }

        if (priority !== block.js[1]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid priority for block \`${block.type}\`: expected ${priority} but got ${block.js[1]}`,
            path: ["js", 1],
          });
        }
      } catch (e) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid JavaScript code for block \`${block.type}\`: ${(e as Error).message}`,
          path: ["js", 0],
        });
      }
    }
  });

function parse(js: string): Program {
  return rawParse(js.replaceAll(/%(\d+)/g, "0, $$$1"), {
    ecmaVersion: 5,
    sourceType: "script",
  });
}

export const customBlockSchema = z.union([statementBlockSchema, expressionBlockSchema]);

export type CustomBlock = z.infer<typeof customBlockSchema>;
