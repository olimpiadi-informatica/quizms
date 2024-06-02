import { Expression, LogicalOperator, UnaryOperator } from "acorn";
import { Order } from "blockly/javascript";
import { BinaryOperator, UpdateOperator } from "estree";

export default function order(expression: Expression): number {
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
