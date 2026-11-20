import type { ReactNode } from "react";

import { ClosedAnswer, MultipleChoiceAnswer, MultipleResponseAnswer, OpenAnswer } from "./answer";
import { Blockly } from "./blockly";
import { Contest } from "./contest";
import { Locale, StatementLanguageProvider, useStatementLanguage } from "./language";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export { StatementLanguageProvider, useStatementLanguage };

function Empty() {
  return;
}

function Passthrough({ children }: { children: ReactNode }) {
  return children;
}

export function useMDXComponents() {
  return {
    AnswerGroup: Passthrough,
    Asymptote: Empty,
    Blockly,
    ClosedAnswer,
    Code: Empty,
    Contest,
    Equation: Empty,
    Explanation: Empty,
    Image: Empty,
    Locale,
    MultipleChoiceAnswer,
    MultipleResponseAnswer,
    OpenAnswer,
    Problem,
    Section,
    StatementLanguageProvider,
    SubProblem,
  };
}
