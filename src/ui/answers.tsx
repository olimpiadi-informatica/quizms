import React, { ReactNode, useId } from "react";
import classNames from "classnames";

import { useProblemAnswer } from "./problem";
import Spoiler from "./components/spoiler";
import { useAuthentication } from "~/src/auth/provider";

type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
  return <div className="answer-group rounded-xl bg-zinc-200 px-3 py-3 my-5">{children}</div>;
}

type AnswerProps = {
  id: string;
  correct?: "true" | "false";
  children: ReactNode;
};

export function Answer({ id, correct, children }: AnswerProps) {
  const [answer, setProblemAnswer] = useProblemAnswer();
  const { terminated } = useAuthentication();
  const answerId = useId();

  return (
    <div
      className={classNames(
        "answer rounded-lg hover:bg-zinc-300 flex px-2 my-1",
        terminated && {
          "border-2": answer === id || correct === "true",
          "border-green-600": correct === "true",
          "border-red-600": answer === id && correct === "false",
        }
      )}>
      <input
        id={answerId}
        checked={answer === id}
        className={classNames(
          "mr-4 my-auto",
          { "cursor-pointer": !terminated },
          terminated &&
            answer === id && {
              "!bg-green-600": correct === "true",
              "!bg-red-600": correct === "false",
            }
        )}
        onChange={(e) => setProblemAnswer(e.target.checked ? id : undefined)}
        type="radio"
        disabled={terminated}
      />
      <div>{children}</div>
      <label htmlFor={answerId} className="grow">
        {children}
      </label>
    </div>
  );
}

export function OpenAnswer({ correct }: { correct?: string }) {
  const [problemAnswer, setProblemAnswer] = useProblemAnswer();
  const { terminated } = useAuthentication();
  return (
    <div className="open-answer px-2">
      <input
        className={classNames(
          "rounded-md border-zinc-400 focus:border-indigo-300",
          "shadow-sm focus:ring focus:ring-indigo-200 focus:ring-opacity-50p",
          "w-72 max-w-full",
          terminated &&
            correct !== undefined && {
              "border-2": true,
              "!border-green-600": correct === problemAnswer,
              "!border-red-600": correct !== problemAnswer,
            }
        )}
        onChange={(e) => setProblemAnswer(e.target.value || undefined)}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Inserisci la risposta"
        type="number"
        value={problemAnswer ?? ""}
        disabled={terminated}
      />
    </div>
  );
}

export function Explanation({ children }: { children: ReactNode }) {
  const { terminated } = useAuthentication();
  if (!terminated) return null;
  return (
    <div className="explanation rounded-xl bg-zinc-200 px-5 py-3 my-5">
      <Spoiler title="Mostra soluzione">{children}</Spoiler>
    </div>
  );
}
