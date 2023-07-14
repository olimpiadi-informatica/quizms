import React, { ReactNode, useEffect, useId } from "react";

import classNames from "classnames";

import { useAnswer, useAuthentication } from "@/auth/provider";
import { useProblem } from "@/ui/problem";

type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
  return (
    <form className="answer-group my-5 break-before-avoid break-inside-avoid rounded-xl bg-base-200 px-3 py-3 prose-p:my-1">
      {children}
    </form>
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
        "answer my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300",
        terminated && {
          "border-2 border-success": correct === "true",
          "border-2 border-error": answer === id && correct === "false",
        }
      )}>
      <input
        id={answerId}
        checked={answer === id}
        className={classNames(
          "radio radio-sm my-auto mr-4 bg-base-100 disabled:opacity-90",
          terminated &&
            answer === id && {
              "radio-success": correct === "true",
              "radio-error": correct === "false",
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

type OpenAnswerProps = {
  correct?: string;
  type: "number" | "text";
};

export function OpenAnswer({ correct, type }: OpenAnswerProps) {
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
          "input-bordered input w-72 max-w-full border-2 print:placeholder:text-transparent",
          terminated &&
            correct !== undefined && {
              "disabled:input-success": correct === answer,
              "disabled:input-error": correct !== answer,
            }
        )}
        onChange={(e) => setAnswer(e.target.value || undefined)}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Inserisci la risposta"
        type={type}
        value={answer ?? ""}
        disabled={terminated}
        aria-label="Risposta"
      />
    </div>
  );
}

export function Explanation({ children }: { children: ReactNode }) {
  const { terminated } = useAuthentication();
  if (!terminated) return null;
  return (
    <div className="explanation my-5 rounded-xl bg-base-200 print:hidden">
      <div className="collapse">
        <input type="checkbox" />
        <div className="collapse-title text-xl font-medium">Mostra soluzione</div>
        <div className="collapse-content">{children}</div>
      </div>
    </div>
  );
}
