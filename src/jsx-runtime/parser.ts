import { Expression, Property } from "estree";
import { builders as b } from "estree-toolkit";
import { toJs } from "estree-util-to-js";

import { hash } from "~/utils/random";

import { shuffleAnswers, shuffleProblems } from "./variants";

type ParseOptions = {
  functionArguments: any[];
};

export class ExpressionWrapper {
  constructor(public expr: (options: ParseOptions) => Expression) {}
}

export function parseFunction(...args: any[]) {
  try {
    return new ExpressionWrapper((options) =>
      b.callExpression(
        b.memberExpression(b.identifier("React"), b.identifier("createElement")),
        args.map((arg) => parseValue(arg, options)),
      ),
    );
  } catch (e) {
    throw new Error(`Failed to parse code: ${e});`);
  }
}

export function parseValue(value: any, options: ParseOptions): Expression {
  if (value instanceof ExpressionWrapper) {
    return value.expr(options);
  }
  if (typeof value === "function") {
    return b.arrowFunctionExpression([], parseValue(value(...options.functionArguments), options));
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
        parseValue(value.description, options),
      ]);
    }
    throw new TypeError(`Only global symbols are supported, got: ${String(value)}`);
  }
  if (Array.isArray(value)) {
    const elements: (Expression | null)[] = [];
    for (let i = 0; i < value.length; i += 1) {
      elements.push(i in value ? parseValue(value[i], options) : null);
    }
    return b.arrayExpression(elements);
  }
  if (value instanceof Boolean || value instanceof Number || value instanceof String) {
    return b.newExpression(b.identifier(value.constructor.name), [
      parseValue(value.valueOf(), options),
    ]);
  }
  if (value instanceof RegExp) {
    return {
      type: "Literal",
      value,
      regex: { pattern: value.source, flags: value.flags },
    };
  }
  if (value instanceof Date) {
    return b.newExpression(b.identifier("Date"), [parseValue(value.getTime(), options)]);
  }
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return b.callExpression(b.memberExpression(b.identifier("Buffer"), b.identifier("from")), [
      parseValue([...value], options),
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
    return b.newExpression(b.identifier(value.constructor.name), [parseValue([...value], options)]);
  }
  if (value instanceof URL || value instanceof URLSearchParams) {
    return b.newExpression(b.identifier(value.constructor.name), [
      parseValue(String(value), options),
    ]);
  }
  if (typeof value === "object") {
    const properties: Property[] = Reflect.ownKeys(value).map((key) =>
      b.property(
        "init",
        parseValue(key, options),
        parseValue((value as Record<string | symbol, unknown>)[key], options),
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

export function parseContest(entry: () => ExpressionWrapper, variant: string): string {
  const options = {
    functionArguments: [
      {
        variant: (problemId: number) => hash(`b#problem#${variant}#${problemId}`),
      },
    ],
  };

  const tree = entry() as ExpressionWrapper;
  const program = b.program([
    b.exportDefaultDeclaration(
      b.functionDeclaration(
        b.identifier("Contest"),
        [b.identifier("React"), b.identifier("quizms")],
        b.blockStatement([b.returnStatement(tree.expr(options))]),
      ),
    ),
  ]);

  shuffleProblems(program, variant);
  shuffleAnswers(program, variant);

  return toJs(program).value;
}
