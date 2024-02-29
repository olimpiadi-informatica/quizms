import React, {
  ReactNode,
  Ref,
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { noop, sumBy } from "lodash-es";

import { Button, Buttons, Modal } from "~/components";
import { Schema, problemScore, score } from "~/models";
import { randomId } from "~/utils/random";
import { useStudent } from "~/web/student/provider";

type ContestContextProps = {
  registerProblem: (id: string, schema: Schema[string]) => void;
};

const ContestContext = createContext<ContestContextProps>({
  registerProblem: noop,
});
ContestContext.displayName = "ContestContext";

export function Contest({ children }: { children: ReactNode }) {
  const { student, setStudent, terminated } = useStudent();
  const [schema, setSchema] = useState<Schema>({});

  const registerProblem = useCallback((id: string, problem: Schema[string]) => {
    setSchema((schema) => ({
      ...schema,
      [id]: problem,
    }));
  }, []);

  const [resultShown, setResultShown] = useState(false);
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (terminated !== resultShown) {
      setResultShown(terminated);
      if (!resultShown) ref.current?.showModal();
    }
  }, [terminated, resultShown]);

  if (import.meta.env.QUIZMS_MODE === "training" && !student.startedAt) {
    const start = () => {
      void setStudent({
        ...student,
        startedAt: new Date(),
        variant: import.meta.env.PROD ? randomId() : "",
      });
    };

    return (
      <div className="flex h-[50vh] flex-col justify-center">
        <Buttons>
          <Button className="btn-success btn-lg" onClick={start}>
            Inizia
          </Button>
        </Buttons>
      </div>
    );
  }

  return (
    <ContestContext.Provider value={{ registerProblem }}>
      <div className="break-before-page">
        <main className="gap-x-10 [column-rule:solid_1px_var(--tw-prose-hr)] print:columns-2">
          {children}
        </main>
      </div>
      <CompletedModal ref={ref} schema={schema} />
    </ContestContext.Provider>
  );
}

const CompletedModal = forwardRef(function CompletedModal(
  { schema }: { schema: Schema },
  ref: Ref<HTMLDialogElement>,
) {
  const { student } = useStudent();

  const problems = Object.keys(schema);
  problems.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const points = useMemo(() => {
    const variant = {
      id: student.variant!,
      contestId: student.contestId!,
      schema,
    };
    return score(student, { [variant.id]: variant });
  }, [schema, student]);

  const maxPoints = sumBy(Object.values(schema), "pointsCorrect");

  return (
    <Modal ref={ref} title="Prova terminata">
      <p>La prova è terminata.</p>
      {points !== undefined && (
        <>
          <p>
            Hai ottenuto un punteggio di <b>{points}</b> su <b>{maxPoints}</b>.
          </p>
          <div className="w-full">
            <table className="table-fixed prose-td:truncate">
              <thead>
                <tr>
                  <th scope="col">Domanda</th>
                  <th scope="col">Risposta</th>
                  <th scope="col">Soluzione</th>
                  <th scope="col">Punteggio</th>
                </tr>
              </thead>
              <tbody>
                {problems.map((problem) => {
                  const answer = student.answers?.[problem]?.toString()?.trim();
                  const problemSchema = schema[problem];
                  return (
                    <tr key={problem}>
                      <td>{problem}</td>
                      <td>{answer ?? "-"}</td>
                      <td>{problemSchema.optionsCorrect?.join(", ")}</td>
                      <td>{problemScore(problemSchema, answer)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Modal>
  );
});

export function useContest() {
  return useContext(ContestContext);
}
