import type { ReactNode } from "react";

import { ClosedAnswer, MultipleChoiceAnswer, MultipleResponseAnswer, OpenAnswer } from "./answer";
import { Blockly } from "./blockly";
import { Contest } from "./contest";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

function Empty() {
  return;
}

function Passthrough({ children }: { children: ReactNode }) {
  return children;
}

export function useMDXComponents() {
  return {
    h1: Empty,
    h2: Empty,
    h3: Empty,
    h4: Empty,
    h5: Empty,
    h6: Empty,
    hr: Empty,
    ol: Empty,
    p: Empty,
    table: Empty,
    ul: Empty,
    AnswerGroup: Passthrough,
    Asymptote: Empty,
    Blockly,
    ClosedAnswer,
    Code: Empty,
    Contest,
    Equation: Empty,
    Explanation: Empty,
    Image: Empty,
    MultipleChoiceAnswer,
    MultipleResponseAnswer,
    OpenAnswer,
    Problem,
    Section,
    SubProblem,
  };
}
