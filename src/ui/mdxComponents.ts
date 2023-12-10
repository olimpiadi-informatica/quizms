import { ComponentType, memo } from "react";

import { Answer, AnswerGroup, Explanation, OpenAnswer } from "./answers";
import Blockly from "./blockly/workspaceWrapper";
import Code from "./components/code";
import Image from "./components/image";
import MathExpr from "./components/math";
import { Contest } from "./contest";
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
