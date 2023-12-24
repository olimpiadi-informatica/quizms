import { ComponentType, memo } from "react";

import Blockly from "../blockly/workspace";
import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import Code from "./code";
import { Contest } from "./contest";
import Image from "./image";
import MathExpr from "./math";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export const components: Record<string, ComponentType<any>> = {
  Answer,
  AnswerGroup,
  Blockly,
  Code: memo(Code),
  Contest,
  Explanation,
  Image: memo(Image),
  MathExpr: memo(MathExpr),
  OpenAnswer,
  Problem,
  Section,
  SubProblem,
};
