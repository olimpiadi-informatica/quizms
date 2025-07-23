import {
  type BinaryOperator,
  type Expression,
  type LogicalOperator,
  type Program,
  type UnaryOperator,
  type UpdateOperator,
  parse,
} from "acorn";
import { Order } from "blockly/javascript";
import { type ZodError, z } from "zod";

const blocklyTypeSchema = z.enum(["Number", "String", "Array", "Boolean"]);

const jsSchema = z
  .string()
  .trim()
  .transform((js) => js.replaceAll(/%(\d+)/g, (_, idx) => `_ARG${idx - 1}`));

const jsStatementSchema = jsSchema.superRefine((js, ctx) => {
  try {
    parse(js, {
      ecmaVersion: 5,
      sourceType: "script",
      preserveParens: true,
    });
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid JavaScript code: ${(err as Error).message}`,
    });
  }
});

const jsExpressionSchema = jsSchema.transform((js, ctx) => {
  let ast: Program;
  try {
    ast = parse(js, {
      ecmaVersion: 5,
      sourceType: "script",
      preserveParens: true,
    });
  } catch (err) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid JavaScript code: ${(err as Error).message}`,
    });
    return z.NEVER;
  }

  if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid JavaScript code: Must be a single expression.",
    });
    return z.NEVER;
  }

  const expression = ast.body[0].expression;
  return [js, order(expression)] as [string, number];
});

const inputArgSchema = z
  .object({
    type: z.literal("input_value"),
    check: z.enum([...blocklyTypeSchema.options, "Integer"]),
    min: jsExpressionSchema.optional(),
    max: jsExpressionSchema.optional(),
  })
  .strict();

const dropdownArgSchema = z
  .object({
    type: z.literal("field_dropdown"),
    options: z.tuple([z.string(), z.string()]).array(),
  })
  .strict();

const customBlockArgSchema = z
  .discriminatedUnion("type", [inputArgSchema, dropdownArgSchema])
  .transform((block) => {
    if (block.type === "input_value") {
      type InputArg = Omit<z.infer<typeof inputArgSchema>, "check"> & {
        check: z.infer<typeof blocklyTypeSchema>;
        integer?: boolean;
      };
      return (
        block.check === "Integer" ? { ...block, check: "Number", integer: true } : block
      ) as InputArg;
    }
    return block;
  })
  .transform((block, ctx) => ({ ...block, name: `_ARG${ctx.path.at(-1)}` }));

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
    // Whether to keep arguments on the same line
    inputsInline: z.boolean().default(true),
    // Color of the block (https://developers.google.com/blockly/guides/create-custom-blocks/block-colour)
    colour: z.union([z.number(), z.string()]),
    // Tooltip shown when hovering over the block
    tooltip: z.string(),
    // Page to open when clicking on the "help" button
    helpUrl: z.string().default(""),
    // Maximum number of instances of this block
    maxInstances: z.number().optional(),
  })
  .strict();

const statementBlockSchema = baseBlockSchema.extend({
  // Code generator for this block
  js: jsStatementSchema,
  // Set null if this block is the last block of a chain
  nextStatement: z.literal(null).optional(),
  // Set null if this block is the first block of a chain
  previousStatement: z.literal(null).optional(),
});

const expressionBlockSchema = baseBlockSchema.extend({
  // Code generator for this block
  js: jsExpressionSchema,
  // Type of the block's output
  output: blocklyTypeSchema,
});

export const customBlockSchema = z.record(z.any()).transform((blocks, ctx) => {
  let error: ZodError;
  if ("output" in blocks) {
    const expression = expressionBlockSchema.safeParse(blocks);
    if (expression.success) return expression.data;
    error = expression.error;
  } else {
    const statement = statementBlockSchema.safeParse(blocks);
    if (statement.success) return statement.data;
    error = statement.error;
  }

  for (const issue of error.issues) {
    ctx.addIssue(issue);
  }
  return z.NEVER;
});

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
    case "ArrowFunctionExpression":
    case "TemplateLiteral":
    case "TaggedTemplateExpression":
    case "ClassExpression":
    case "MetaProperty":
    case "AwaitExpression":
    case "ChainExpression":
    case "ImportExpression":
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
  }
}

function binaryOperatorOrder(operator: BinaryOperator | LogicalOperator): number {
  switch (operator) {
    case "&&":
      return Order.LOGICAL_AND;
    case "||":
    case "??":
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
  }
}
