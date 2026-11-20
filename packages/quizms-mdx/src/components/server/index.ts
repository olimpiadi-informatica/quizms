import {
  AnswerGroup,
  Blockly,
  Code,
  Contest,
  Equation,
  Image,
  Problem,
  StatementLanguageProvider,
  SubProblem,
} from "../client";
import {
  ClosedAnswer,
  Explanation,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  OpenAnswer,
} from "./answers";
import { Asymptote } from "./asymptote";
import { Locale, useStatementLanguage } from "./language";
import { Section } from "./section";

export {
  AnswerGroup,
  Asymptote,
  Blockly,
  ClosedAnswer,
  Code,
  Contest,
  Equation,
  Explanation,
  Image,
  Locale,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  OpenAnswer,
  Problem,
  Section,
  StatementLanguageProvider,
  SubProblem,
  useStatementLanguage,
};

export function useMDXComponents() {
  return {
    AnswerGroup,
    Asymptote,
    Blockly,
    ClosedAnswer,
    Code,
    Contest,
    Equation,
    Explanation,
    Image,
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
