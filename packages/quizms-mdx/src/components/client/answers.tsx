"use client";

import { Children, createContext, type ReactNode, use, useCallback, useId, useMemo } from "react";

import type { AnswerValue, Schema } from "@olinfo/quizms/models";
import { useStudent } from "@olinfo/quizms/student";
import clsx from "clsx";
import { Trash2 } from "lucide-react";

import { useProblem } from "./problem";

export function AnswerGroup({ children }: { children: ReactNode }) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
      className={clsx(
        "my-5 flex-wrap rounded-xl bg-base-200 p-3 prose-p:my-1 break-inside-avoid",
        "print:flex print:border print:border-[var(--tw-prose-hr)] print:p-1",
      )}>
      {children}
    </form>
  );
}
AnswerGroup.displayName = "AnswerGroup";

type AnswerContextProps = {
  id: string;
};

const AnswerContext = createContext<AnswerContextProps>({
  id: "",
});
AnswerContext.displayName = "AnswerContext";

function useAnswer() {
  return use(AnswerContext);
}

export function ClosedAnswer({ children }: { children: ReactNode }) {
  return Children.toArray(children).map((child, i) => (
    <AnswerContext.Provider key={i} value={{ id: String.fromCharCode(65 + i) }}>
      {child}
    </AnswerContext.Provider>
  ));
}
ClosedAnswer.displayName = "ClosedAnswer";

export function MultipleResponseAnswer({ children }: { children: ReactNode }) {
  const { id } = useAnswer();
  const { id: problemId } = useProblem();
  const { student, setAnswer, terminated, schema } = useStudent();

  const problemSchema = schema?.[problemId!];
  const correct = isCorrectAnswer(problemSchema, id);

  const answerValue = (student.answers?.[problemId!]?.value ??
    []) as AnswerValue<"multipleResponse">;
  const currentlyChecked = useMemo(() => answerValue.includes(id), [answerValue, id]);

  const submitAnswer = useCallback(
    async (checked: boolean) => {
      const value = checked ? [...answerValue, id] : answerValue.filter((v) => v !== id);
      await setAnswer(problemId!, {
        type: "multipleResponse",
        value: value.length === 0 ? null : value,
      });
    },
    [answerValue, id, problemId, setAnswer],
  );

  const answerId = useId();

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct,
          "border-2 border-error": currentlyChecked && correct === false,
        },
      )}>
      <input
        id={answerId}
        checked={currentlyChecked}
        className={clsx(
          "checkbox checkbox-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            currentlyChecked && {
              "checkbox-success": correct === true,
              "checkbox-error": correct === false,
            },
        )}
        onChange={(e) => submitAnswer(e.target.checked)}
        type="checkbox"
        disabled={terminated}
      />
      <div className="my-auto w-6 screen:hidden">{id})</div>
      <label htmlFor={answerId} className="grow [&_pre]:!p-3">
        {children}
      </label>
    </div>
  );
}
MultipleResponseAnswer.displayName = "MultipleResponseAnswer";

export function MultipleChoiceAnswer({ children }: { children: ReactNode }) {
  const { id } = useAnswer();
  const { id: problemId } = useProblem();
  const { student, setAnswer, terminated, schema } = useStudent();
  const problemSchema = schema?.[problemId!];
  const correct = isCorrectAnswer(problemSchema, id);

  const answerValue = student.answers?.[problemId!]?.value as AnswerValue<"multipleChoice"> | null;
  const submitAnswer = async (value: string | null) => {
    await setAnswer(problemId!, {
      type: "multipleChoice",
      value: value,
    });
  };

  const answerId = useId();

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct === true,
          "border-2 border-error": answerValue === id && correct === false,
        },
      )}>
      <input
        id={answerId}
        checked={answerValue === id}
        className={clsx(
          "radio radio-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            answerValue === id && {
              "radio-success": correct === true,
              "radio-error": correct === false,
            },
        )}
        onChange={(e) => submitAnswer(e.target.checked ? id : null)}
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
            (answerValue !== id || terminated) && "hidden",
          )}
          type="button"
          onClick={() => submitAnswer(null)}
          aria-label="Cancella risposta">
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
MultipleChoiceAnswer.displayName = "MultipleChoiceAnswer";

export type OpenAnswerProps = {
  type?: "openNumber" | "openText";
};

export function OpenAnswer({ type = "openText" }: OpenAnswerProps) {
  const { id: problemId } = useProblem();
  const { student, setAnswer, terminated, schema } = useStudent();
  const problemSchema = schema?.[problemId!];

  const answerValue = student.answers?.[problemId!]?.value as
    | AnswerValue<"openNumber" | "openText">
    | undefined;
  const correct = isCorrectAnswer(problemSchema, answerValue);
  const submitAnswer = async (value: string) => {
    if (type === "openNumber") {
      await setAnswer(problemId!, { type, value: value ? Number(value) : null });
    } else {
      await setAnswer(problemId!, { type, value: value || null });
    }
  };

  return (
    <div className="px-2">
      <input
        id={`answer-${problemId}`}
        className={clsx(
          "input input-bordered w-72 max-w-full border-2 print:placeholder:text-transparent",
          terminated && {
            "disabled:input-success": correct === true,
            "disabled:input-error": correct === false,
          },
        )}
        onChange={(e) => submitAnswer(e.target.value.trim())}
        onWheel={(e) => e.currentTarget.blur()}
        placeholder="Inserisci la risposta"
        maxLength={100}
        type={type}
        value={answerValue ?? ""}
        disabled={terminated}
        aria-label="Risposta"
      />
    </div>
  );
}
OpenAnswer.displayName = "OpenAnswer";

export function Explanation({ children }: { children: ReactNode }) {
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
Explanation.displayName = "Explanation";

function isCorrectAnswer(problem?: Schema[string], answer?: string | number): boolean | undefined {
  if (problem == null || answer == null || answer === "") return;

  switch (problem.type) {
    case "openNumber":
      return problem.correct.includes(answer as number);
    case "openText":
      return problem.correct.includes(answer as string);
    case "multipleChoice":
    case "multipleResponse":
      return problem.options
        .filter((option) => option.correct)
        .map((option) => option.id)
        .includes(answer as string);
  }
}
