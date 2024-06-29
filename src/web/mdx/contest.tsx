import { ReactNode, createContext, useCallback, useContext } from "react";

import { Button } from "@olinfo/react-components";
import { addMinutes } from "date-fns";
import { noop } from "lodash-es";

import { Schema } from "~/models";
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
  const { student, setStudent, contest, registerSchema } = useStudent();
  const registerProblem = useCallback(
    (id: string, problem: Schema[string]) => {
      registerSchema((schema) => ({
        ...schema,
        [id]: problem,
      }));
    },
    [registerSchema],
  );

  if (import.meta.env.QUIZMS_MODE === "training" && !student.startedAt) {
    const start = async () => {
      const now = new Date();
      await setStudent({
        ...student,
        startedAt: now,
        finishedAt: addMinutes(now, contest.duration ?? 0),
        variant: import.meta.env.PROD ? randomId() : "",
      });
    };

    return (
      <div className="flex h-[50vh] flex-col items-center justify-center">
        <Button className="btn-success btn-lg" onClick={start}>
          Inizia
        </Button>
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
    </ContestContext.Provider>
  );
}

export function useContest() {
  return useContext(ContestContext);
}
