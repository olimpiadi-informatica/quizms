import React, {
  Children,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
} from "react";

import classNames from "classnames";
import { Trash2 } from "lucide-react";

import { useStudent } from "~/core/student/provider";
import { Rng } from "~/utils/random";

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
  const { student } = useStudent();
  const { id } = useProblem();

  const answers = useMemo(() => {
    const answers = Children.toArray(children);
    if (import.meta.env.PROD && student.variant) {
      const variant =
        student.variant == "11" ? "1" : student.variant == "12" ? "2" : student.variant;
      const rng = new Rng(`r#answers#${variant}#${id}`);
      rng.shuffle(answers);
    }
    return answers;
  }, [student.variant, id, children]);

  return (
    <form
      className={classNames(
        "answer-group my-5 flex-wrap rounded-xl bg-base-200 p-3",
        "prose-p:my-1 print:flex print:border print:border-[var(--tw-prose-hr)] print:p-1",
      )}>
      {answers.map((answer, i) => (
        <AnswerContext.Provider key={i} value={{ id: String.fromCharCode(65 + i) }}>
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
  const { id: problemId, setCorrect } = useProblem();
  const { student, setStudent, terminated } = useStudent();

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | undefined) => {
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: value } });
  };

  const answerId = useId();

  useEffect(() => {
    if (correct === true) {
      setCorrect(id);
    }
  }, [correct, setCorrect, id]);

  return (
    <div
      className={classNames(
        "answer relative my-1 flex rounded-lg pl-2 pr-1 hover:bg-base-300 print:mr-4",
        terminated && {
          "border-2 border-success": correct === true,
          "border-2 border-error": answer === id && correct === false,
        },
      )}>
      <input
        id={answerId}
        checked={answer === id}
        className={classNames(
          "radio radio-sm my-auto mr-4 bg-base-100 disabled:opacity-90 print:mr-2",
          terminated &&
            answer === id && {
              "radio-success": correct === true,
              "radio-error": correct === false,
            },
        )}
        onChange={(e) => setAnswer(e.target.checked ? id : undefined)}
        type="radio"
        disabled={terminated}
      />
      <div className="my-auto w-6 screen:hidden">{id})</div>
      <label htmlFor={answerId} className="grow">
        {children}
      </label>
      <div className="absolute right-0 top-0 mr-1 flex h-full justify-center">
        <button
          className={classNames(
            "btn btn-square btn-ghost btn-sm my-auto",
            (answer !== id || terminated) && "hidden",
          )}
          type="button"
          onClick={() => setAnswer(undefined)}>
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
  const { id: problemId, setCorrect } = useProblem();
  const { student, setStudent, terminated } = useStudent();

  const answer = student.answers?.[problemId!];
  const setAnswer = async (value: string | undefined) => {
    await setStudent({ ...student, answers: { ...student.answers, [problemId!]: value } });
  };

  useEffect(() => {
    if (correct !== undefined) {
      setCorrect(correct);
    }
  }, [correct, setCorrect]);

  return (
    <div className="open-answer px-2">
      <input
        className={classNames(
          "input input-bordered w-72 max-w-full border-2 print:placeholder:text-transparent",
          terminated &&
            correct !== undefined && {
              "disabled:input-success": correct === answer,
              "disabled:input-error": correct !== answer,
            },
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
  const { terminated } = useStudent();
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