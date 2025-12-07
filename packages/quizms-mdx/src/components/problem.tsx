import {
  ProblemClient,
  type ProblemProps,
  SubProblemClient,
  type SubProblemProps,
} from "./client/problem";
import { JsonArray, JsonField, JsonObject } from "./json";

export function Problem({ points, children }: ProblemProps) {
  return (
    <>
      <JsonField field="pointsCorrect" value={points[0]} />
      <JsonField field="pointsBlank" value={points[1]} />
      <JsonField field="pointsWrong" value={points[2]} />
      <JsonField field="subProblems">
        <JsonArray>
          <ProblemClient points={points}>{children}</ProblemClient>
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
