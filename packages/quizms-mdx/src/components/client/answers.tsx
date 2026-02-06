"use client";

import { Children, createContext, type ReactNode, use, useCallback, useId, useMemo } from "react";

import { decodeAllCorrectAnswer, encodeAllCorrectAnswer } from "@olinfo/quizms/models";
import { useStudent } from "@olinfo/quizms/student";
import clsx from "clsx";
import { maxBy } from "lodash-es";
import { Trash2 } from "lucide-react";

import { useProblem } from "./problem";

export type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
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

export type MultipleChoiceAnswerProps = {
  children: ReactNode;
  answerIds: string[];
};

type AnswerContextProps = {
  id: string;
};

const AnswerContext = createContext<AnswerContextProps>({
  id: "",
});

function useAnswer() {
  return use(AnswerContext);
}

export function MultipleChoiceAnswer({ answerIds, children }: MultipleChoiceAnswerProps) {
  return Children.toArray(children).map((child, i) => (
    <AnswerContext.Provider key={i} value={{ id: answerIds[i] }}>
      {child}
    </AnswerContext.Provider>
  ));
}

export type AnswerProps = {
  children: ReactNode;
  originalId?: string;
};

export function AllCorrectAnswer({ children }: AnswerProps) {
  const { id } = useAnswer();
  const { id: problemId } = useProblem();
  const { student, setStudent, terminated, schema } = useStudent();
  const correct = decodeAllCorrectAnswer(
    maxBy(schema?.[problemId!].options, (o) => o.points)?.value,
  );

  const answer = student.answers?.[problemId!];
  const parsedAnswer = useMemo<string[]>(() => decodeAllCorrectAnswer(answer), [answer]);
  const currentlyChecked = useMemo(() => parsedAnswer.indexOf(id) !== -1, [parsedAnswer, id]);
  const setAnswer = useCallback(
    async (value: string, checked: boolean) => {
      const newAnswer = parsedAnswer;
      const index = parsedAnswer.indexOf(value);
      if (checked && index === -1) {
        newAnswer.push(value);
      } else if (!checked && index !== -1) {
        newAnswer.splice(index, 1);
      }
      await setStudent({
        ...student,
        answers: { ...student.answers, [problemId!]: encodeAllCorrectAnswer(newAnswer) },
      });
    },
    [parsedAnswer, student, problemId, setStudent],
  );

  const answerId = useId();

  return (
    <div
      className={clsx(
        "relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct.includes(id),
          "border-2 border-error": currentlyChecked && correct.length > 0 && !correct.includes(id),
        },
      )}>
      <input
        id={answerId}
        checked={currentlyChecked}
        className={clsx(
          "checkbox checkbox-sm my-auto mr-4 bg-base-100 [print-color-adjust:exact] disabled:opacity-90 print:mr-2",
          terminated &&
            currentlyChecked && {
              "checkbox-success": correct.includes(id),
              "checkbox-error": correct.length > 0 && !correct.includes(id),
            },
        )}
        onChange={(e) => setAnswer(id, e.target.checked)}
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

export function AnyCorrectAnswer({ children }: AnswerProps) {
  const { id } = useAnswer();
  const { id: problemId } = useProblem();
  const { student, setStudent, terminated, schema } = useStudent();
  const correct = maxBy(schema?.[problemId!].options, (o) => o.points)?.value;

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | null) => {
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: value } });
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
  type: "number" | "text";
};

export function OpenAnswer({ type }: OpenAnswerProps) {
  const { id: problemId } = useProblem();
  const { student, setStudent, terminated, schema } = useStudent();
  const correct = maxBy(schema?.[problemId!].options, (o) => o.points)?.value;

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | null) => {
    const parsedValue = type === "number" ? value && Number.parseInt(value, 10) : value;
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: parsedValue } });
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
