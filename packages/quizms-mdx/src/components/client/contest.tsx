"use client";

import { createContext, type ReactNode, use, useCallback } from "react";

import type { Schema } from "@olinfo/quizms/models";
import { useStudent } from "@olinfo/quizms/student";
import { Button } from "@olinfo/react-components";
import { addMinutes } from "date-fns";

type ContestContextProps = {
  registerProblem: (id: string, schema: Schema[string]) => void;
};

const ContestContext = createContext<ContestContextProps>({
  registerProblem: () => {},
});
ContestContext.displayName = "ContestContext";

export function ContestClient({ children }: { children: ReactNode }) {
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

  if (process.env.QUIZMS_MODE === "training" && !student.startedAt) {
    const start = async () => {
      const now = new Date();
      await setStudent({
        ...student,
        startedAt: now,
        finishedAt: addMinutes(now, contest.hasOnline ? contest.duration : 0),
        variant: "",
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
  return use(ContestContext);
}
