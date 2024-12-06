import { Children, type ReactNode, createContext, useContext, useEffect, useId } from "react";

import clsx from "clsx";
import { Trash2 } from "lucide-react";

import { useStudent } from "~/web/student/provider";

import { useContest } from "./contest";
import { useProblem } from "./problem";

type AnswerContextProps = {
  id: string;
};
const AnswerContext = createContext<AnswerContextProps>({
  id: "",
});
AnswerContext.displayName = "AnswerContext";

type AnswerGroupProps = {
  children: ReactNode;
};

export function AnswerGroup({ children }: AnswerGroupProps) {
  const answers = Children.toArray(children);

  return (
    <form
      className={clsx(
        "my-5 flex-wrap rounded-xl bg-base-200 p-3 prose-p:my-1",
        "print:flex print:border print:border-[var(--tw-prose-hr)] print:p-1",
      )}>
      {answers.map((answer, i) => (
        <AnswerContext.Provider key={i} value={{ id: String.fromCodePoint(65 + i) }}>
          {answer}
        </AnswerContext.Provider>
      ))}
    </form>
  );
}

type AnswerProps = {
  correct?: boolean;
  children: ReactNode;
};

export function Answer({ correct, children }: AnswerProps) {
  const { id } = useContext(AnswerContext);
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
      pointsCorrect: points[0],
      pointsBlank: points[1],
      pointsWrong: points[2],
      optionsCorrect: [id],
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

type OpenAnswerProps = {
  correct?: string;
  type: "number" | "text";
};

export function OpenAnswer({ correct, type }: OpenAnswerProps) {
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
      pointsCorrect: points[0],
      pointsBlank: points[1],
      pointsWrong: points[2],
      optionsCorrect: correct ? [correct] : undefined,
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

export function Explanation({ children }: { children: ReactNode }) {
  const { terminated } = useStudent();
  const { id } = useProblem();
  if (!import.meta.env.DEV && !terminated) return;
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
