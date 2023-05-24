import React, { ReactNode, useEffect, useId } from "react";
import classNames from "classnames";

import Spoiler from "./components/spoiler";
import { useAnswer, useAuthentication } from "~/src/auth/provider";
import { useProblem } from "~/src/ui/problem";

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
  const { id: problemId, setCorrect } = useProblem();
  const [answer, setAnswer] = useAnswer(problemId!);
  const { terminated } = useAuthentication();
  const answerId = useId();

  useEffect(() => {
    if (correct === "true") {
      setCorrect(id);
    }
  }, [correct, setCorrect]);

  return (
    <div
      className={classNames(
        "answer rounded-lg hover:bg-zinc-300 dark:hover:bg-slate-600 flex pl-2 pr-1 my-1",
        terminated &&
          correct !== undefined && {
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
        onChange={(e) => setAnswer(e.target.checked ? id : undefined)}
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
  const { id: problemId, setCorrect } = useProblem();
  const [answer, setAnswer] = useAnswer(problemId!);
  const { terminated } = useAuthentication();

  useEffect(() => {
    if (correct !== undefined) {
      setCorrect(correct);
    }
  }, [correct, setCorrect]);

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
              "!border-green-600": correct === answer,
              "!border-red-600 dark:!border-red-500": correct !== answer,
            }
        )}
        onChange={(e) => setAnswer(e.target.value || undefined)}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Inserisci la risposta"
        type="number"
        value={answer ?? ""}
        disabled={terminated}
      />
    </div>
  );
}

export function Explanation({ children }: { children: ReactNode }) {
  const { terminated } = useAuthentication();
  if (!terminated) return null;
  return (
    <div className="explanation print:hidden rounded-xl bg-zinc-200 dark:bg-slate-700 px-5 py-3 my-5">
      <Spoiler title="Mostra soluzione">{children}</Spoiler>
    </div>
  );
}
