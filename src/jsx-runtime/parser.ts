import { Expression, Property } from "estree";
import { builders as b } from "estree-toolkit";
import { toJs } from "estree-util-to-js";

export class ExpressionWrapper {
  constructor(public expr: Expression) {}
}

export class FunctionWrapper {
  constructor(public fn: (...args: any[]) => any) {}
}

export function parseFunction(...args: any[]) {
  try {
    return new ExpressionWrapper(
      b.callExpression(
        b.memberExpression(b.identifier("React"), b.identifier("createElement")),
        args.map((arg) => parseValue(arg)),
      ),
    );
  } catch (e) {
    throw new Error(`Failed to parse code: ${e});`);
  }
}

export function parseValue(value: any): Expression {
  if (value instanceof ExpressionWrapper) {
    return value.expr;
  }
  if (value instanceof FunctionWrapper) {
    return value.fn();
  }
  if (typeof value === "function") {
    return b.arrowFunctionExpression([], parseValue(value()));
  }
  if (value === undefined || value === Number.POSITIVE_INFINITY || Number.isNaN(value)) {
    return b.identifier(String(value));
  }
  if (value == null || typeof value === "string" || typeof value === "boolean") {
    return b.literal(value);
  }
  if (typeof value === "bigint") {
    return value >= 0
      ? b.literal(String(value))
      : b.unaryExpression("-", b.literal(String(-value)), true);
  }
  if (typeof value === "number") {
    return value >= 0 && !Object.is(value, -0)
      ? b.literal(value)
      : b.unaryExpression("-", b.literal(-value), true);
  }
  if (typeof value === "symbol") {
    if (value.description && value === Symbol.for(value.description)) {
      return b.callExpression(b.memberExpression(b.identifier("Symbol"), b.identifier("for")), [
        parseValue(value.description),
      ]);
    }
    throw new TypeError(`Only global symbols are supported, got: ${String(value)}`);
  }
  if (Array.isArray(value)) {
    const elements: (Expression | null)[] = [];
    for (let i = 0; i < value.length; i += 1) {
      elements.push(i in value ? parseValue(value[i]) : null);
    }
    return b.arrayExpression(elements);
  }
  if (value instanceof Boolean || value instanceof Number || value instanceof String) {
    return b.newExpression(b.identifier(value.constructor.name), [parseValue(value.valueOf())]);
  }
  if (value instanceof RegExp) {
    return {
      type: "Literal",
      value,
      regex: { pattern: value.source, flags: value.flags },
    };
  }
  if (value instanceof Date) {
    return b.newExpression(b.identifier("Date"), [parseValue(value.getTime())]);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return b.callExpression(b.memberExpression(b.identifier("Buffer"), b.identifier("from")), [
      parseValue([...value]),
    ]);
  }
  if (
    value instanceof BigInt64Array ||
    value instanceof BigUint64Array ||
    value instanceof Float32Array ||
    value instanceof Float64Array ||
    value instanceof Int8Array ||
    value instanceof Int16Array ||
    value instanceof Int32Array ||
    value instanceof Map ||
    value instanceof Set ||
    value instanceof Uint8Array ||
    value instanceof Uint8ClampedArray ||
    value instanceof Uint16Array ||
    value instanceof Uint32Array
  ) {
    return b.newExpression(b.identifier(value.constructor.name), [parseValue([...value])]);
  }
  if (value instanceof URL || value instanceof URLSearchParams) {
    return b.newExpression(b.identifier(value.constructor.name), [parseValue(String(value))]);
  }
  if (typeof value === "object") {
    const properties: Property[] = Reflect.ownKeys(value).map((key) =>
      b.property(
        "init",
        parseValue(key),
        parseValue((value as Record<string | symbol, unknown>)[key]),
        typeof key !== "string",
      ),
    );

    if (Object.getPrototypeOf(value) == null) {
      properties.unshift(b.property("init", b.identifier("__proto__"), b.literal(null)));
    }
    return b.objectExpression(properties);
  }

  throw new TypeError(`Unsupported value: ${String(value)}`);
}

export function parseContest(entry: () => ExpressionWrapper): string {
  const tree = entry() as ExpressionWrapper;
  const program = b.program([
    b.exportDefaultDeclaration(
      b.functionDeclaration(
        null,
        [b.identifier("React"), b.identifier("quizms")],
        b.blockStatement([b.returnStatement(tree.expr)]),
      ),
    ),
  ]);

  return toJs(program).value;
}
