import {
  ProblemClient,
  type ProblemProps,
  SubProblemClient,
  type SubProblemProps,
} from "./client/problem";
import { JsonArray, JsonField, JsonObject } from "./json";

export function Problem({ id, points, children }: ProblemProps) {
  return (
    <JsonObject>
      <JsonField field="id" value={id.toString()} />
      <JsonField field="pointsCorrect" value={points[0]} />
      <JsonField field="pointsBlank" value={points[1]} />
      <JsonField field="pointsWrong" value={points[2]} />
      <JsonField field="subProblems">
        <JsonArray>
          <ProblemClient id={id} points={points}>
            {children}
          </ProblemClient>
        </JsonArray>
      </JsonField>
    </JsonObject>
  );
}

export function SubProblem({ subId, children }: SubProblemProps) {
  return (
    <JsonObject>
      {subId && <JsonField field="id" value={subId.toString()} />}
      <SubProblemClient subId={subId}>{children}</SubProblemClient>
    </JsonObject>
  );
}
