import {
  AllCorrectAnswer,
  AnswerGroup,
  AnyCorrectAnswer,
  Explanation,
  MultipleChoiceAnswer,
  OpenAnswer,
} from "./answers";
import { Blockly } from "./blockly";
import { Code } from "./client/code";
import { Equation } from "./client/equation";
import { Contest } from "./contest";
import { Image } from "./image";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export {
  AnyCorrectAnswer,
  AllCorrectAnswer,
  AnswerGroup,
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
    AnyCorrectAnswer,
    AllCorrectAnswer,
    AnswerGroup,
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
