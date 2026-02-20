import { Blockly } from "../blockly/workspace";
import {
  AnswerGroup,
  ClosedAnswer,
  Explanation,
  MultipleChoiceAnswer,
  MultipleResponseAnswer,
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
