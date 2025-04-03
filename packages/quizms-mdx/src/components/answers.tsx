import type { ReactNode } from "react";
import { Children } from "react";
import { Rng } from "@olinfo/quizms/utils";

import {
  AnswerClient,
  AnswerGroupClient,
  type AnswerGroupProps,
  type AnswerProps,
  ExplanationClient,
  OpenAnswerClient,
  type OpenAnswerProps,
} from "./client/answers";
import { JsonArray, JsonField, JsonObject } from "./json";

export function AnswerGroup({ children }: AnswerGroupProps) {
  return <AnswerGroupClient>{children}</AnswerGroupClient>;
}

export function MultipleChoiceAnswer({ children }: { children: ReactNode }) {
  const childrenArray = Children.toArray(children);
  if (process.env.SHUFFLE_ANSWERS === "TRUE") {
    const rng = new Rng(process.env.QUIZMS_VARIANT_HASH!);
    rng.shuffle(childrenArray);
  }
  return (
    <>
      <JsonField field="type" value="text" />
      <JsonField field="options">
        <JsonArray>{childrenArray}</JsonArray>
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

export function Answer({ id, correct, children }: AnswerProps) {
  return (
    <JsonObject>
      <JsonField field="value" value={id} />
      <JsonField field="correct" value={!!correct} />
      <AnswerClient id={id} correct={process.env.QUIZMS_MODE === "contest" ? undefined : correct}>
        {children}
      </AnswerClient>
    </JsonObject>
  );
}

export function Explanation({ children }: { children: ReactNode }) {
  if (process.env.QUIZMS_MODE === "contest") return;
  return <ExplanationClient>{children}</ExplanationClient>;
}
