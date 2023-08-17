import { ComponentType } from "react";

import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import Blockly from "./blockly/workspaceWrapper";
import MathExpr from "./components/math";
import { Contest } from "./contest";
import { Problem, SubProblem } from "./problem";
import { Section } from "./section";

export const components: Record<string, ComponentType<any>> = {
  Answer,
  AnswerGroup,
  Blockly,
  Contest,
  Explanation,
  MathExpr,
  OpenAnswer,
  Problem,
  Section,
  SubProblem,
};
