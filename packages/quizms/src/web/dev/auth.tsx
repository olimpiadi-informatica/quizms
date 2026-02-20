import { type ReactNode, useCallback, useMemo, useState } from "react";

import { omit } from "lodash-es";
import { Link, Route, Switch } from "wouter";

import type { Answer, Contest, Participation, Student } from "~/models";
import { StudentProvider } from "~/web/student/provider";

export function DevRoutes({ contests, children }: { contests: Contest[]; children: ReactNode }) {
  return (
    <Switch>
      <Route path="/">
        <ContestList contests={contests} />
      </Route>
      {children}
    </Switch>
  );
}
DevRoutes.displayName = "DevRoutes";

function ContestList({ contests }: { contests: Contest[] }) {
  return (
    <div className="h-dvh overflow-auto">
      <div className="prose mx-auto p-4 lg:max-w-4xl">
        <ul>
          {contests.map((c) => (
            <li key={c.id}>
              <Link href={`/${c.id}`}>{c.name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
ContestList.displayName = "ContestList";

export function DevProvider({ contest, children }: { contest: Contest; children: ReactNode }) {
  const [student, setStudent] = useState<Student>({
    id: "",
    userData: {
      name: "Utente",
      surname: "anonimo",
    },
    answers: {},
    contestId: contest.id,
    variant: "0",
  });

  const mockParticipation: Participation = useMemo(
    () => ({
      id: "",
      schoolId: "",
      contestId: contest.id,
      name: "",
      startingTime: student.startedAt,
      finalized: false,
      disabled: false,
    }),
    [contest.id, student.startedAt],
  );

  const setAnswer = useCallback((problemId: string, answer: Answer | undefined) => {
    setStudent((student) => ({
      ...student,
      answers:
        answer == null
          ? omit(student.answers, problemId)
          : { ...student.answers, [problemId]: answer },
    }));
  }, []);

  const submit = useCallback(() => {
    setStudent((student) => ({ ...student, finishedAt: new Date() }));
  }, []);

  const reset = useCallback(() => {
    setStudent(
      (student): Student => ({
        ...student,
        answers: {},
        startedAt: undefined,
        finishedAt: undefined,
      }),
    );
  }, []);

  return (
    <StudentProvider
      contest={contest}
      participation={mockParticipation}
      student={student}
      setAnswer={setAnswer}
      submit={submit}
      reset={reset}
      enforceFullscreen={false}>
      {children}
    </StudentProvider>
  );
}
DevProvider.displayName = "DevProvider";
