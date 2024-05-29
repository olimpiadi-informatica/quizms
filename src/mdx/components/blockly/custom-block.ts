import { parse } from "acorn";
import { z } from "zod";

import order from "./custom-block-order";

const blocklyTypeSchema = z.enum(["Number", "String", "Array", "Boolean"]);

const customBlockArgSchema = z
  .object({
    type: z.literal("input_value"),
    check: blocklyTypeSchema,
  })
  .transform((block, ctx) => ({ ...block, name: `_ARG${ctx.path.at(-1)}` }));

const jsSchema = z
  .string()
  .trim()
  .transform((js) => js.replaceAll(/%(\d+)/g, (_, idx) => `_ARG${idx}`));

export type CustomBlockArg = z.infer<typeof customBlockArgSchema>;

// https://blockly-demo.appspot.com/static/demos/blockfactory/index.html
// https://developers.google.com/blockly/guides/create-custom-blocks/define-blocks

const baseBlockSchema = z
  .object({
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
    // Code generator for this block
    js: jsSchema,
  })
  .strict();

const statementBlockSchema = baseBlockSchema
  .extend({
    // Set null if this block is the last block of a chain
    nextStatement: z.literal(null).optional(),
    // Set null if this block is the first block of a chain
    previousStatement: z.literal(null).optional(),
  })
  .superRefine(({ js, ...block }, ctx) => {
    try {
      parse(js, {
        ecmaVersion: 5,
        sourceType: "script",
        preserveParens: true,
      });
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid JavaScript code for block \`${block.type}\`: ${(err as Error).message}`,
        path: ["js"],
      });
      return z.NEVER;
    }
  });

const expressionBlockSchema = baseBlockSchema
  .extend({
    // Type of the block's output
    output: blocklyTypeSchema,
  })
  .transform(({ js, ...block }, ctx) => {
    try {
      const ast = parse(js, {
        ecmaVersion: 5,
        sourceType: "script",
        preserveParens: true,
      });

      if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
        throw "Must be a single expression.";
      }

      const expression = ast.body[0].expression;
      const priority = order(expression);
      if (!priority) {
        throw `Unsupported expression: ${expression.type}.`;
      }

      return { ...block, js: [js, priority] as [string, number] };
    } catch (err) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid JavaScript code for block \`${block.type}\`: ${(err as Error).message}`,
        path: ["js"],
      });
      return z.NEVER;
    }
  });

export const customBlockSchema = z.union([expressionBlockSchema, statementBlockSchema]);

export type CustomBlock = z.infer<typeof customBlockSchema>;
