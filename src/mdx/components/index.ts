import { ComponentType, memo } from "react";

import { Code } from "@olinfo/react-components";

import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import Blockly from "./blockly/workspace";
import { Contest } from "./contest";
import Image from "./image";
import MathExpr from "./math";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export const components: Record<string, ComponentType<any>> = {
  Answer,
  AnswerGroup,
  Blockly,
  Code,
  Contest,
  Explanation,
  Image,
  MathExpr: memo(MathExpr),
  OpenAnswer,
  Problem,
  Section,
  SubProblem,
};
