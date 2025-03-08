"use client";

import { type ReactNode, useEffect, useId } from "react";

import { useStudent } from "@olinfo/quizms/student";
import clsx from "clsx";
import { Trash2 } from "lucide-react";

import { useContest } from "./contest";
import { useProblem } from "./problem";

export type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroupClient({ children }: AnswerGroupProps) {
  return (
    <form
      className={clsx(
        "my-5 flex-wrap rounded-xl bg-base-200 p-3 prose-p:my-1 break-inside-avoid",
        "print:flex print:border print:border-[var(--tw-prose-hr)] print:p-1",
      )}>
      {children}
    </form>
  );
}

export type AnswerProps = {
  id: string;
  correct?: boolean;
  children: ReactNode;
};

export function AnswerClient({ id, correct, children }: AnswerProps) {
  const { registerProblem } = useContest();
  const { id: problemId, points } = useProblem();
  const { student, setStudent, terminated } = useStudent();

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | null) => {
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: value } });
  };

  const answerId = useId();

  useEffect(() => {
    if (!correct) return;
    registerProblem(`${problemId}`, {
      type: "text",
      allowEmpty: true,
      maxPoints: points[0],
      options: [
        { value: id, points: points[0] },
        { value: null, points: points[1] },
      ],
    });
  }, [registerProblem, id, problemId, correct, points]);

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct === true,
          "border-2 border-error": answer === id && correct === false,
        },
      )}>
      <input
        id={answerId}
        checked={answer === id}
        className={clsx(
          "radio radio-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            answer === id && {
              "radio-success": correct === true,
              "radio-error": correct === false,
            },
        )}
        onChange={(e) => setAnswer(e.target.checked ? id : null)}
        type="radio"
        disabled={terminated}
      />
      <div className="my-auto w-6 screen:hidden">{id})</div>
      <label htmlFor={answerId} className="grow [&_pre]:!p-3">
        {children}
      </label>
      <div className="absolute right-0 top-0 mr-1 flex h-full justify-center print:hidden">
        <button
          className={clsx(
            "btn btn-square btn-ghost btn-sm my-auto",
            (answer !== id || terminated) && "hidden",
          )}
          type="button"
          onClick={() => setAnswer(null)}
          aria-label="Cancella risposta">
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}

export type OpenAnswerProps = {
  correct?: string;
  type: "number" | "text";
};

export function OpenAnswerClient({ correct, type }: OpenAnswerProps) {
  const { registerProblem } = useContest();
  const { id: problemId, points } = useProblem();
  const { student, setStudent, terminated } = useStudent();

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | null) => {
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: value } });
  };

  useEffect(() => {
    registerProblem(`${problemId}`, {
      type: "text",
      allowEmpty: true,
      maxPoints: points[0],
      options: [
        { value: correct ?? null, points: points[0] },
        { value: null, points: points[1] },
      ],
    });
  }, [registerProblem, problemId, correct, points]);

  return (
    <div className="px-2">
      <input
        id={`answer-${problemId}`}
        className={clsx(
          "input input-bordered w-72 max-w-full border-2 print:placeholder:text-transparent",
          terminated &&
            correct !== undefined && {
              "disabled:input-success": correct === answer,
              "disabled:input-error": correct !== answer,
            },
        )}
        onChange={(e) => setAnswer(e.target.value || null)}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Inserisci la risposta"
        maxLength={100}
        type={type}
        value={answer ?? ""}
        disabled={terminated}
        aria-label="Risposta"
      />
    </div>
  );
}

export function ExplanationClient({ children }: { children: ReactNode }) {
  const { terminated } = useStudent();
  const { id } = useProblem();
  if (process.env.NODE_ENV === "production" && !terminated) return;
  return (
    <div className="my-5 rounded-xl bg-base-200 print:hidden">
      <div className="collapse">
        <input type="checkbox" name={`show-solution-${id}`} />
        <div className="collapse-title text-xl font-medium">Mostra soluzione</div>
        <div className="collapse-content">{children}</div>
      </div>
    </div>
  );
}
