import {
  AnswerGroup,
  Blockly,
  Code,
  Contest,
  Equation,
  Image,
  Problem,
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
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
  OpenAnswer,
  Problem,
  Section,
  SubProblem,
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
    MultipleChoiceAnswer,
    MultipleResponseAnswer,
    OpenAnswer,
    Problem,
    Section,
    SubProblem,
  };
}
