import { Code } from "../client/code";
import { Equation } from "../client/equation";
import { Image } from "../client/image";
import {
  AllCorrectAnswer,
  AnswerGroup,
  AnyCorrectAnswer,
  Explanation,
  MultipleChoiceAnswer,
  OpenAnswer,
} from "./answers";
import { Asymptote } from "./asymptote";
import { Blockly } from "./blockly";
import { Contest } from "./contest";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export {
  AllCorrectAnswer,
  AnswerGroup,
  AnyCorrectAnswer,
  Asymptote,
  Blockly,
  Code,
  Contest,
  Equation,
  Explanation,
  Image,
  MultipleChoiceAnswer,
  OpenAnswer,
  Problem,
  Section,
  SubProblem,
};

export function useMDXComponents() {
  return {
    AllCorrectAnswer,
    AnswerGroup,
    AnyCorrectAnswer,
    Asymptote,
    Blockly,
    Code,
    Contest,
    Equation,
    Explanation,
    Image,
    MultipleChoiceAnswer,
    OpenAnswer,
    Problem,
    Section,
    SubProblem,
  };
}
