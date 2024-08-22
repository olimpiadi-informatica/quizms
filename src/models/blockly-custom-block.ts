import { type Expression, type LogicalOperator, type UnaryOperator, parse } from "acorn";
import { Order } from "blockly/javascript";
import type { BinaryOperator, UpdateOperator } from "estree";
import { z } from "zod";

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

function order(expression: Expression): number {
  switch (expression.type) {
    case "ArrayExpression":
      return Order.ATOMIC;
    case "AssignmentExpression":
      return Order.ASSIGNMENT;
    case "BinaryExpression":
      return binaryOperatorOrder(expression.operator);
    case "CallExpression":
      return Order.FUNCTION_CALL;
    case "ConditionalExpression":
      return Order.CONDITIONAL;
    case "FunctionExpression":
      return Order.ATOMIC;
    case "Identifier":
      return Order.ATOMIC;
    case "Literal":
      return Order.ATOMIC;
    case "LogicalExpression":
      return binaryOperatorOrder(expression.operator);
    case "MemberExpression":
      return Order.MEMBER;
    case "NewExpression":
      return Order.NEW;
    case "ObjectExpression":
      return Order.ATOMIC;
    case "ParenthesizedExpression":
      throw new Error("Expression must not be wrapper in parentheses");
    case "SequenceExpression":
      return Order.COMMA;
    case "ThisExpression":
      return Order.ATOMIC;
    case "UnaryExpression":
      return unaryOperatorOrder(expression.operator);
    case "UpdateExpression":
      return unaryOperatorOrder(expression.operator);
    case "YieldExpression":
      return Order.YIELD;
    default:
      throw new Error(`Unsupported expression: ${expression.type}`);
  }
}

function unaryOperatorOrder(operator: UnaryOperator | UpdateOperator): number {
  switch (operator) {
    case "delete":
      return Order.DELETE;
    case "void":
      return Order.VOID;
    case "typeof":
      return Order.TYPEOF;
    case "+":
      return Order.UNARY_PLUS;
    case "-":
      return Order.UNARY_NEGATION;
    case "~":
      return Order.BITWISE_NOT;
    case "!":
      return Order.LOGICAL_NOT;
    case "++":
      return Order.INCREMENT;
    case "--":
      return Order.DECREMENT;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function binaryOperatorOrder(operator: BinaryOperator | LogicalOperator): number {
  switch (operator) {
    case "&&":
      return Order.LOGICAL_AND;
    case "||":
      return Order.LOGICAL_OR;
    case "==":
    case "!=":
    case "===":
    case "!==":
      return Order.EQUALITY;
    case "<":
    case "<=":
    case ">":
    case ">=":
      return Order.RELATIONAL;
    case "<<":
    case ">>":
    case ">>>":
      return Order.BITWISE_SHIFT;
    case "+":
      return Order.ADDITION;
    case "-":
      return Order.SUBTRACTION;
    case "*":
      return Order.MULTIPLICATION;
    case "/":
      return Order.DIVISION;
    case "%":
      return Order.MODULUS;
    case "**":
      return Order.EXPONENTIATION;
    case "|":
      return Order.BITWISE_OR;
    case "^":
      return Order.BITWISE_XOR;
    case "&":
      return Order.BITWISE_AND;
    case "in":
      return Order.IN;
    case "instanceof":
      return Order.INSTANCEOF;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
