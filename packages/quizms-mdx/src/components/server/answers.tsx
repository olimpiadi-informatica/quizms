import type { ReactNode } from "react";

import { shuffleChildren } from "~/components/utils";

import {
  ClosedAnswer as ClosedAnswerClient,
  Explanation as ExplanationClient,
  MultipleChoiceAnswer as MultipleChoiceAnswerClient,
  MultipleResponseAnswer as MultipleResponseAnswerClient,
  OpenAnswer as OpenAnswerClient,
} from "../client/answers";

export function ClosedAnswer({ children, problemId }: { children: ReactNode; problemId: string }) {
  const [childrenNodes] = shuffleChildren(children, "answers", problemId);
  return <ClosedAnswerClient>{childrenNodes}</ClosedAnswerClient>;
}
ClosedAnswer.displayName = "ClosedAnswer";

export function OpenAnswer({ correct }: { correct: string }) {
  const type = Number.isFinite(Number(correct)) ? "number" : "text";
  return <OpenAnswerClient type={type} />;
}
OpenAnswer.displayName = "OpenAnswer";

export function MultipleChoiceAnswer({ children }: { children: ReactNode }) {
  return <MultipleChoiceAnswerClient>{children}</MultipleChoiceAnswerClient>;
}
MultipleChoiceAnswer.displayName = "MultipleChoiceAnswer";

export function MultipleResponseAnswer({ children }: { children: ReactNode }) {
  return <MultipleResponseAnswerClient>{children}</MultipleResponseAnswerClient>;
}
MultipleResponseAnswer.displayName = "MultipleResponseAnswer";

export function Explanation({ children }: { children: ReactNode }) {
  if (!process.env.QUIZMS_SHOW_SOLUTIONS) return;
  return <ExplanationClient>{children}</ExplanationClient>;
}
Explanation.displayName = "Explanation";
