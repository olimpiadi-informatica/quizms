import type { ReactNode } from "react";

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

export function MultipleChoiceAnswer({
  children,
  kind,
}: {
  children: ReactNode;
  kind: "allCorrect" | "anyCorrect";
}) {
  return (
    <>
      <JsonField field="type" value="text" />
      <JsonField field="options">
        <JsonArray>
          <MultipleChoiceAnswerClient kind={kind}>{children}</MultipleChoiceAnswerClient>
        </JsonArray>
      </JsonField>
    </>
  );
}

export function OpenAnswer({ correct }: OpenAnswerProps) {
  const type = Number.isFinite(Number(correct)) ? "number" : "text";
  return (
    <>
      <JsonField field="type" value={type} />
      <JsonField field="options">
        <JsonArray>
          <JsonObject>
            <JsonField field="value" value={correct ?? null} />
            <JsonField field="correct" value={true} />
          </JsonObject>
        </JsonArray>
      </JsonField>
      <OpenAnswerClient correct={correct} type={type} />
    </>
  );
}

export function AnyCorrectAnswer({ id, correct, children }: AnswerProps) {
  return (
    <JsonObject>
      <JsonField field="value" value={id} />
      <JsonField field="correct" value={!!correct} />
      <AnyCorrectAnswerClient
        id={id}
        correct={process.env.QUIZMS_MODE === "contest" ? undefined : correct}>
        {children}
      </AnyCorrectAnswerClient>
    </JsonObject>
  );
}

export function AllCorrectAnswer({ id, correct, children }: AnswerProps) {
  return (
    <JsonObject>
      <JsonField field="value" value={id} />
      <JsonField field="correct" value={!!correct} />
      <AllCorrectAnswerClient
        id={id}
        correct={process.env.QUIZMS_MODE === "contest" ? undefined : correct}>
        {children}
      </AllCorrectAnswerClient>
    </JsonObject>
  );
}

export function Explanation({ children }: { children: ReactNode }) {
  if (process.env.QUIZMS_MODE === "contest") return;
  return <ExplanationClient>{children}</ExplanationClient>;
}
