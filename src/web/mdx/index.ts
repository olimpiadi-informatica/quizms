import { Code } from "@olinfo/react-components";

import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import { Blockly } from "./blockly/workspace";
import { Contest } from "./contest";
import { Equation } from "./equation";
import { Image } from "./image";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export function useMDXComponents() {
  return {
    Answer,
    AnswerGroup,
    Blockly,
    Code,
    Contest,
    Equation,
    Explanation,
    Image,
    OpenAnswer,
    Problem,
    Section,
    SubProblem,
  };
}
