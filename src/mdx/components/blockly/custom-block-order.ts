import { Expression, LogicalOperator, UnaryOperator } from "acorn";
import { BinaryOperator, UpdateOperator } from "estree";

export default function order(expression: Expression): `ORDER_${string}` | undefined {
  switch (expression.type) {
    case "ArrayExpression":
      return "ORDER_ATOMIC";
    case "AssignmentExpression":
      return "ORDER_ASSIGNMENT";
    case "BinaryExpression":
      return binaryOperatorOrder(expression.operator);
    case "CallExpression":
      return "ORDER_FUNCTION_CALL";
    case "ConditionalExpression":
      return "ORDER_CONDITIONAL";
    case "FunctionExpression":
      return "ORDER_ATOMIC";
    case "Identifier":
      return "ORDER_ATOMIC";
    case "Literal":
      return "ORDER_ATOMIC";
    case "LogicalExpression":
      return binaryOperatorOrder(expression.operator);
    case "MemberExpression":
      return "ORDER_MEMBER";
    case "NewExpression":
      return "ORDER_NEW";
    case "ObjectExpression":
      return "ORDER_ATOMIC";
    case "ParenthesizedExpression":
      return "ORDER_ATOMIC";
    case "SequenceExpression":
      return "ORDER_COMMA";
    case "ThisExpression":
      return "ORDER_ATOMIC";
    case "UnaryExpression":
      return unaryOperatorOrder(expression.operator);
    case "UpdateExpression":
      return unaryOperatorOrder(expression.operator);
    case "YieldExpression":
      return "ORDER_YIELD";
  }
}

function unaryOperatorOrder(
  operator: UnaryOperator | UpdateOperator,
): `ORDER_${string}` | undefined {
  switch (operator) {
    case "delete":
      return "ORDER_DELETE";
    case "void":
      return "ORDER_VOID";
    case "typeof":
      return "ORDER_TYPEOF";
    case "+":
      return "ORDER_UNARY_PLUS";
    case "-":
      return "ORDER_UNARY_NEGATION";
    case "~":
      return "ORDER_BITWISE_NOT";
    case "!":
      return "ORDER_LOGICAL_NOT";
    case "++":
      return "ORDER_INCREMENT";
    case "--":
      return "ORDER_DECREMENT";
  }
}

function binaryOperatorOrder(
  operator: BinaryOperator | LogicalOperator,
): `ORDER_${string}` | undefined {
  switch (operator) {
    case "&&":
      return "ORDER_LOGICAL_AND";
    case "||":
      return "ORDER_LOGICAL_OR";
    case "==":
    case "!=":
    case "===":
    case "!==":
      return "ORDER_EQUALITY";
    case "<":
    case "<=":
    case ">":
    case ">=":
      return "ORDER_RELATIONAL";
    case "<<":
    case ">>":
    case ">>>":
      return "ORDER_BITWISE_SHIFT";
    case "+":
      return "ORDER_ADDITION";
    case "-":
      return "ORDER_SUBTRACTION";
    case "*":
      return "ORDER_MULTIPLICATION";
    case "/":
      return "ORDER_DIVISION";
    case "%":
      return "ORDER_MODULUS";
    case "**":
      return "ORDER_EXPONENTIATION";
    case "|":
      return "ORDER_BITWISE_OR";
    case "^":
      return "ORDER_BITWISE_XOR";
    case "&":
      return "ORDER_BITWISE_AND";
    case "in":
      return "ORDER_IN";
    case "instanceof":
      return "ORDER_INSTANCEOF";
  }
}
