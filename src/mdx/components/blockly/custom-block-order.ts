import { Expression, LogicalOperator, UnaryOperator } from "acorn";
import blocklyJavascript from "blockly/javascript.js";
import { BinaryOperator, UpdateOperator } from "estree";

const gen = blocklyJavascript.javascriptGenerator;

export default function order(expression: Expression): number {
  switch (expression.type) {
    case "ArrayExpression":
      return gen.ORDER_ATOMIC;
    case "AssignmentExpression":
      return gen.ORDER_ASSIGNMENT;
    case "BinaryExpression":
      return binaryOperatorOrder(expression.operator);
    case "CallExpression":
      return gen.ORDER_FUNCTION_CALL;
    case "ConditionalExpression":
      return gen.ORDER_CONDITIONAL;
    case "FunctionExpression":
      return gen.ORDER_ATOMIC;
    case "Identifier":
      return gen.ORDER_ATOMIC;
    case "Literal":
      return gen.ORDER_ATOMIC;
    case "LogicalExpression":
      return binaryOperatorOrder(expression.operator);
    case "MemberExpression":
      return gen.ORDER_MEMBER;
    case "NewExpression":
      return gen.ORDER_NEW;
    case "ObjectExpression":
      return gen.ORDER_ATOMIC;
    case "ParenthesizedExpression":
      throw new Error("Expression must not be wrapper in parentheses");
    case "SequenceExpression":
      return gen.ORDER_COMMA;
    case "ThisExpression":
      return gen.ORDER_ATOMIC;
    case "UnaryExpression":
      return unaryOperatorOrder(expression.operator);
    case "UpdateExpression":
      return unaryOperatorOrder(expression.operator);
    case "YieldExpression":
      return gen.ORDER_YIELD;
    default:
      throw new Error(`Unsupported expression: ${expression.type}`);
  }
}

function unaryOperatorOrder(operator: UnaryOperator | UpdateOperator): number {
  switch (operator) {
    case "delete":
      return gen.ORDER_DELETE;
    case "void":
      return gen.ORDER_VOID;
    case "typeof":
      return gen.ORDER_TYPEOF;
    case "+":
      return gen.ORDER_UNARY_PLUS;
    case "-":
      return gen.ORDER_UNARY_NEGATION;
    case "~":
      return gen.ORDER_BITWISE_NOT;
    case "!":
      return gen.ORDER_LOGICAL_NOT;
    case "++":
      return gen.ORDER_INCREMENT;
    case "--":
      return gen.ORDER_DECREMENT;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}

function binaryOperatorOrder(operator: BinaryOperator | LogicalOperator): number {
  switch (operator) {
    case "&&":
      return gen.ORDER_LOGICAL_AND;
    case "||":
      return gen.ORDER_LOGICAL_OR;
    case "==":
    case "!=":
    case "===":
    case "!==":
      return gen.ORDER_EQUALITY;
    case "<":
    case "<=":
    case ">":
    case ">=":
      return gen.ORDER_RELATIONAL;
    case "<<":
    case ">>":
    case ">>>":
      return gen.ORDER_BITWISE_SHIFT;
    case "+":
      return gen.ORDER_ADDITION;
    case "-":
      return gen.ORDER_SUBTRACTION;
    case "*":
      return gen.ORDER_MULTIPLICATION;
    case "/":
      return gen.ORDER_DIVISION;
    case "%":
      return gen.ORDER_MODULUS;
    case "**":
      return gen.ORDER_EXPONENTIATION;
    case "|":
      return gen.ORDER_BITWISE_OR;
    case "^":
      return gen.ORDER_BITWISE_XOR;
    case "&":
      return gen.ORDER_BITWISE_AND;
    case "in":
      return gen.ORDER_IN;
    case "instanceof":
      return gen.ORDER_INSTANCEOF;
    default:
      throw new Error(`Unsupported operator: ${operator}`);
  }
}
