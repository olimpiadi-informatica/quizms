import { ReactNode } from "react";

import { builders as b } from "estree-toolkit";

import { ExpressionWrapper, FunctionWrapper, parseFunction } from "./parser";

export function jsx<Props>(type: string, props: Props & { children: ReactNode }) {
  const { children, ...rest } = props;
  return parseFunction(type, rest, children);
}

export function jsxs<Props>(type: string, props: Props & { children: ReactNode[] }) {
  const { children, ...rest } = props;
  return parseFunction(type, rest, ...children);
}

export const Fragment = new FunctionWrapper(() => {
  return b.memberExpression(b.identifier("React"), b.identifier("Fragment"));
});

export function useMDXComponents() {
  const components = [
    "Answer",
    "AnswerGroup",
    "Blockly",
    "Code",
    "Contest",
    "Explanation",
    "MathExpr",
    "OpenAnswer",
    "Problem",
    "Section",
    "SubProblem",
  ];

  return Object.fromEntries(
    components.map((name) => [
      name,
      new ExpressionWrapper(b.memberExpression(b.identifier("quizms"), b.identifier(name))),
    ]),
  );
}
