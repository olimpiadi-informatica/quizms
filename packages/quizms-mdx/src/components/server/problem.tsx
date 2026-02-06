import type { ReactNode } from "react";

import {
  Problem as ProblemClient,
  SubProblem as SubProblemClient,
  type SubProblemProps,
} from "../client/problem";
import { JsonArray, JsonField, JsonObject } from "./json";

export type ProblemProps = {
  points: [number, number, number];
  children: ReactNode;
  originalId?: string;
};

export function Problem({ points, children, originalId }: ProblemProps) {
  return (
    <>
      <JsonField field="pointsCorrect" value={points[0]} />
      <JsonField field="pointsBlank" value={points[1]} />
      <JsonField field="pointsWrong" value={points[2]} />
      {originalId !== undefined && <JsonField field="originalId" value={originalId} />}
      <JsonField field="subProblems">
        <JsonArray>
          <ProblemClient>{children}</ProblemClient>
        </JsonArray>
      </JsonField>
    </>
  );
}
Problem.displayName = "Problem";

export function SubProblem({ subId, children }: SubProblemProps) {
  return (
    <JsonObject>
      {subId && <JsonField field="id" value={subId.toString()} />}
      <SubProblemClient subId={subId}>{children}</SubProblemClient>
    </JsonObject>
  );
}
SubProblem.displayName = "SubProblem";
