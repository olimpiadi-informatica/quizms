"use client";

import { Children, createContext, type ReactNode, use, useCallback, useId, useMemo } from "react";

import type { Answer } from "@olinfo/quizms/models";
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
  const correct = schema?.[problemId!].correct as Answer<"multipleResponse"> | undefined;

  const answer = student.answers?.[problemId!] as Answer<"multipleResponse"> | undefined;
  const currentlyChecked = useMemo(() => answer?.includes(id), [answer, id]);

  const submitAnswer = useCallback(
    async (checked: boolean) => {
      if (checked) {
        await setAnswer(problemId!, [...(answer ?? []), id]);
      } else if (!checked) {
        await setAnswer(problemId!, answer?.filter((v) => v !== id) ?? []);
      }
    },
    [answer, id, problemId, setAnswer],
  );

  const answerId = useId();

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct?.includes(id),
          "border-2 border-error":
            currentlyChecked && correct && correct.length > 0 && !correct.includes(id),
        },
      )}>
      <input
        id={answerId}
        checked={currentlyChecked}
        className={clsx(
          "checkbox checkbox-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            currentlyChecked && {
              "checkbox-success": correct?.includes(id),
              "checkbox-error": correct && correct.length > 0 && !correct.includes(id),
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
  const correct = schema?.[problemId!].correct;

  const answer = student.answers?.[problemId!] as Answer<"multipleChoice"> | undefined;
  const submitAnswer = async (value: string | undefined) => {
    await setAnswer(problemId!, value);
  };

  const answerId = useId();

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct === id,
          "border-2 border-error": answer === id && correct != null && correct !== id,
        },
      )}>
      <input
        id={answerId}
        checked={answer === id}
        className={clsx(
          "radio radio-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            answer === id && {
              "radio-success": correct === id,
              "radio-error": correct != null && correct !== id,
            },
        )}
        onChange={(e) => submitAnswer(e.target.checked ? id : undefined)}
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
          onClick={() => submitAnswer(undefined)}
          aria-label="Cancella risposta">
          <Trash2 size={20} />
        </button>
      </div>
    </div>
  );
}
MultipleChoiceAnswer.displayName = "MultipleChoiceAnswer";

export type OpenAnswerProps = {
  type: "number" | "text";
};

export function OpenAnswer({ type }: OpenAnswerProps) {
  const { id: problemId } = useProblem();
  const { student, setAnswer, terminated, schema } = useStudent();
  const correct = schema?.[problemId!].correct;

  const answer = student.answers?.[problemId!] as Answer<"openNumber" | "openText"> | undefined;
  const submitAnswer = async (value: string | undefined) => {
    const parsedValue = type === "number" ? value && Number(value) : value;
    await setAnswer(problemId!, parsedValue);
  };

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
        onChange={(e) => submitAnswer(e.target.value || undefined)}
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
