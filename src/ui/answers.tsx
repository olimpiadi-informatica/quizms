import React, { ReactNode, useId } from "react";
import classNames from "classnames";

import { useProblemAnswer } from "./problem";
import Spoiler from "./components/spoiler";
import { useAuthentication } from "~/src/auth/provider";

type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
  return (
    <div className="answer-group rounded-xl bg-zinc-200 dark:bg-slate-700 px-3 py-3 my-5">
      {children}
    </div>
  );
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
        "answer rounded-lg hover:bg-zinc-300 dark:hover:bg-slate-600 flex pl-2 pr-1 my-1",
        terminated && {
          "border-2": answer === id || correct === "true",
          "border-green-600": correct === "true",
          "border-red-600 dark:!border-red-500": answer === id && correct === "false",
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
              "!bg-red-600 dark:!bg-red-500": correct === "false",
            }
        )}
        onChange={(e) => setProblemAnswer(e.target.checked ? id : undefined)}
        type="radio"
        disabled={terminated}
      />
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
          "shadow-sm focus:ring-2 focus:ring-indigo-200",
          "dark:bg-slate-700 dark:text-slate-200 dark:placeholder:text-slate-400",
          "dark:border-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400",
          "w-72 max-w-full",
          terminated &&
            correct !== undefined && {
              "border-2 dark:border-3": true,
              "!border-green-600": correct === problemAnswer,
              "!border-red-600 dark:!border-red-500": correct !== problemAnswer,
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
    <div className="explanation rounded-xl bg-zinc-200 dark:bg-slate-700 px-5 py-3 my-5">
      <Spoiler title="Mostra soluzione">{children}</Spoiler>
    </div>
  );
}
