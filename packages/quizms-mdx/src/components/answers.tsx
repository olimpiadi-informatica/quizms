import { Children, type ReactNode } from "react";

import { Rng } from "@olinfo/quizms/utils";

import {
  AllCorrectAnswerClient,
  AnswerGroupClient,
  type AnswerGroupProps,
  type AnswerProps,
  AnyCorrectAnswerClient,
  ExplanationClient,
  MultipleChoiceAnswerClient,
  OpenAnswerClient,
  type OpenAnswerProps,
} from "./client/answers";
import { JsonArray, JsonField, JsonObject } from "./json";

export function AnswerGroup({ children }: AnswerGroupProps) {
  return <AnswerGroupClient>{children}</AnswerGroupClient>;
}
AnswerGroup.displayName = "AnswerGroup";

export function MultipleChoiceAnswer({
  children,
  kind,
  answerIds,
  groupHash,
}: {
  children: ReactNode;
  kind: "allCorrect" | "anyCorrect";
  answerIds: string[];
  groupHash: string;
}) {
  const rng = new Rng(`${process.env.QUIZMS_VARIANT_HASH}-${groupHash}`); // TODO: seed
  const childrenArray = Children.toArray(children);
  rng.shuffle(childrenArray);
  return (
    <>
      <JsonField field="type" value="text" />
      <JsonField field="options">
        <JsonArray>
          <MultipleChoiceAnswerClient answerIds={answerIds} kind={kind}>
            {childrenArray.map((child, i) => {
              return (
                <JsonObject key={i}>
                  <JsonField field="value" value={answerIds[i]} />
                  {child}
                </JsonObject>
              );
            })}
          </MultipleChoiceAnswerClient>
        </JsonArray>
      </JsonField>
    </>
  );
}
MultipleChoiceAnswer.displayName = "MultipleChoiceAnswer";

export function OpenAnswer({ correct }: OpenAnswerProps) {
  const type = Number.isFinite(Number(correct)) ? "number" : "text";
  return (
    <>
      <JsonField field="type" value={type} />
      <JsonField field="options">
        <JsonArray>
          <JsonObject>
            <JsonField
              field="value"
              value={type === "number" ? Number(correct) : (correct ?? null)}
            />
            <JsonField field="correct" value={true} />
          </JsonObject>
        </JsonArray>
      </JsonField>
      <OpenAnswerClient correct={correct} type={type} />
    </>
  );
}
OpenAnswer.displayName = "OpenAnswer";

export function AnyCorrectAnswer({ correct, children }: AnswerProps) {
  return (
    <>
      <JsonField field="correct" value={!!correct} />
      <AnyCorrectAnswerClient correct={process.env.QUIZMS_MODE === "contest" ? undefined : correct}>
        {children}
      </AnyCorrectAnswerClient>
    </>
  );
}
AnyCorrectAnswer.displayName = "AnyCorrectAnswer";

export function AllCorrectAnswer({ correct, children }: AnswerProps) {
  return (
    <>
      <JsonField field="correct" value={!!correct} />
      <AllCorrectAnswerClient correct={process.env.QUIZMS_MODE === "contest" ? undefined : correct}>
        {children}
      </AllCorrectAnswerClient>
    </>
  );
}
AllCorrectAnswer.displayName = "AllCorrectAnswer";

export function Explanation({ children }: { children: ReactNode }) {
  if (process.env.QUIZMS_MODE === "contest") return;
  return <ExplanationClient>{children}</ExplanationClient>;
}
Explanation.displayName = "Explanation";
