import { Blockly } from "../blockly/workspace";
import {
  AllCorrectAnswer,
  AnswerGroup,
  AnyCorrectAnswer,
  Explanation,
  MultipleChoiceAnswer,
  OpenAnswer,
} from "./answers";
import { Asymptote } from "./asymptote";
import { Code } from "./code";
import { Contest } from "./contest";
import { Equation } from "./equation";
import { Image } from "./image";
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
