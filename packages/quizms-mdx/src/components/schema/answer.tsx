import type { ReactNode } from "react";

import { shuffleChildren } from "~/components/utils";

export function ClosedAnswer({
  type,
  children,
  problemId,
}: {
  type: "multipleChoice" | "multipleResponse";
  children: ReactNode;
  problemId: string;
}) {
  const [childrenNodes, ids] = shuffleChildren(children, "answers", problemId);

  return [
    `"type": ${JSON.stringify(type)}, `,
    `"options": [`,
    childrenNodes.map((child, i) => [
      "{ ",
      `"id": ${JSON.stringify(String.fromCharCode(65 + i))}, `,
      `"originalId": ${JSON.stringify(String.fromCharCode(65 + ids[i]))}, `,
      child,
      "}, ",
    ]),
    "]",
  ];
}

export function OpenAnswer({ correct }: { correct: string }) {
  const type = Number.isFinite(Number(correct)) ? "openNumber" : "openText";
  return [
    `"type": ${JSON.stringify(type)}, `,
    `"correct": ${type === "openNumber" ? correct : JSON.stringify(correct)}, `,
  ];
}

export function MultipleChoiceAnswer({ correct }: { correct: boolean }) {
  return `"correct": ${correct}, `;
}

export function MultipleResponseAnswer({ correct }: { correct: boolean }) {
  return `"correct": ${correct}, `;
}
