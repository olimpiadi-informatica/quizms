import type { TransformPluginContext } from "rollup";
import * as ts from "typescript";
import type { PluginOption } from "vite";

export default function blocklyBlocks(): PluginOption {
  return {
    name: "quizms:blockly-blocks",
    enforce: "pre",
    transform(code, id) {
      const [pathname] = id.split("?");
      if (!pathname.endsWith(".blocks.ts")) return;

      const sourceFile = ts.createSourceFile(id, code, ts.ScriptTarget.ESNext, true);

      const res = ts.transform(sourceFile, [
        () => (sourceFile: ts.SourceFile) => visitSourceFile(this, sourceFile),
      ]);
      return ts.createPrinter().printFile(res.transformed[0]);
    },
  };
}

function visitSourceFile(ctx: TransformPluginContext, sf: ts.SourceFile) {
  return ts.factory.updateSourceFile(
    sf,
    sf.statements.map((s) => visitDefaultExport(ctx, sf, s)),
  );
}

function visitDefaultExport(ctx: TransformPluginContext, sf: ts.SourceFile, node: ts.Statement) {
  if (!ts.isExportAssignment(node)) return node;

  const satisfies = node.expression;
  if (!ts.isSatisfiesExpression(satisfies)) {
    return ctx.error("Expected satisfies expression", node.getEnd() - 1);
  }
  return ts.factory.createExportAssignment(
    node.modifiers,
    node.isExportEquals,
    visitSatisfies(ctx, sf, satisfies),
  );
}

function visitSatisfies(
  ctx: TransformPluginContext,
  sf: ts.SourceFile,
  node: ts.SatisfiesExpression,
) {
  const array = node.expression;
  if (!ts.isArrayLiteralExpression(array)) {
    return ctx.error("Expected array expression", array.getStart(sf));
  }
  return ts.factory.createArrayLiteralExpression(
    array.elements.map((block) => visitBlock(ctx, sf, block)),
  );
}

function visitBlock(ctx: TransformPluginContext, sf: ts.SourceFile, node: ts.Expression) {
  if (!ts.isObjectLiteralExpression(node)) {
    return ctx.error("Expected object literal expression", node.getStart(sf));
  }

  const properties = [...node.properties];

  const fn = getProperty(ctx, node, "fn");
  if (!ts.isArrowFunction(fn)) {
    return ctx.error("Expected arrow function", fn.getStart(sf));
  }

  if (fn.type) {
    if (ts.isTypeReferenceNode(fn.type) && fn.type.typeName.getText(sf) === "Promise") {
      const arg = fn.type.typeArguments?.[0];
      if (!arg) {
        return ctx.error("Expected type argument for Promise", fn.type.getEnd());
      }
      properties.push(createStringProperty("output", toBlocklyType(ctx, sf, arg)));
    } else {
      properties.push(createStringProperty("output", toBlocklyType(ctx, sf, fn.type)));
    }
  }

  const args: ts.Expression[] = [];
  for (const p of fn.parameters.slice(2)) {
    const ty = p.type;
    if (!ty) {
      return ctx.error("Expected type for function parameter", p.getStart(sf));
    }
    if (ts.isUnionTypeNode(ty)) {
      args.push(
        ts.factory.createObjectLiteralExpression([
          createStringProperty("type", "field_dropdown"),
          createStringProperty("name", `ARG${args.length}`),
          ts.factory.createPropertyAssignment(
            "options",
            ts.factory.createArrayLiteralExpression(
              ty.types.map((opt) => {
                if (!ts.isLiteralTypeNode(opt) || !ts.isStringLiteral(opt.literal)) {
                  return ctx.error("Expected string literal in union type", opt.getStart(sf));
                }
                const text = opt.literal.text;
                return ts.factory.createArrayLiteralExpression([
                  ts.factory.createStringLiteral(text),
                  ts.factory.createStringLiteral(JSON.stringify(text)),
                ]);
              }),
            ),
          ),
        ]),
      );
    } else {
      args.push(
        ts.factory.createObjectLiteralExpression([
          createStringProperty("type", "input_value"),
          createStringProperty("check", toBlocklyType(ctx, sf, ty)),
          createStringProperty("name", `ARG${args.length}`),
        ]),
      );
    }
  }

  properties.push(
    ts.factory.createPropertyAssignment("args0", ts.factory.createArrayLiteralExpression(args)),
  );

  properties.push(createStringProperty("helpUrl", ""));
  properties.push(ts.factory.createPropertyAssignment("inputsInline", ts.factory.createTrue()));

  return ts.factory.createObjectLiteralExpression(properties);
}

function getProperty(
  ctx: TransformPluginContext,
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.Expression {
  const param = object.properties
    .filter((p) => ts.isPropertyAssignment(p))
    .find((p) => ts.isIdentifier(p.name) && p.name.escapedText === name);
  if (!param) {
    return ctx.error(`Expected '${name}' property`, object.getStart());
  }
  return param.initializer;
}

function createStringProperty(name: string, value: string) {
  return ts.factory.createPropertyAssignment(
    ts.factory.createIdentifier(name),
    ts.factory.createStringLiteral(value),
  );
}

function toBlocklyType(ctx: TransformPluginContext, sf: ts.SourceFile, ty: ts.TypeNode): string {
  switch (ty.kind) {
    case ts.SyntaxKind.StringKeyword:
      return "String";
    case ts.SyntaxKind.NumberKeyword:
      return "Number";
    case ts.SyntaxKind.BooleanKeyword:
      return "Boolean";
    default:
      return ctx.error(`Unsupported type '${ts.SyntaxKind[ty.kind]}'`, ty.getStart(sf));
  }
}
