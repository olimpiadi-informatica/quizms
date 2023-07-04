import React, { ReactNode, useEffect, useId } from "react";

import classNames from "classnames";

import { useAnswer, useAuthentication } from "@/auth/provider";
import { useProblem } from "@/ui/problem";

import Spoiler from "./components/spoiler";

type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
  return (
    <div className="answer-group my-5 rounded-xl bg-zinc-200 px-3 py-3 dark:bg-slate-700">
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
  }, [correct, setCorrect, id]);

  return (
    <div
      className={classNames(
        "answer my-1 flex rounded-lg pl-2 pr-1 hover:bg-zinc-300 dark:hover:bg-slate-600",
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
          "my-auto mr-4",
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
          "w-72 max-w-full rounded-md border-zinc-400 shadow-sm focus:border-indigo-300 focus:ring-2",
          "focus:ring-indigo-200 dark:border-slate-400 dark:bg-slate-700 dark:text-slate-200",
          "dark:placeholder:text-slate-400 dark:focus:border-slate-400 dark:focus:ring-slate-400",
          terminated &&
            correct !== undefined && {
              "dark:border-3 border-2": true,
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
    <div className="explanation my-5 rounded-xl bg-zinc-200 px-5 py-3 dark:bg-slate-700 print:hidden">
      <Spoiler title="Mostra soluzione">{children}</Spoiler>
    </div>
  );
}
