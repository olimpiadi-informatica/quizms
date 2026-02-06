import { type ReactNode, useCallback, useState } from "react";

import { Link, Route, Switch } from "wouter";

import type { Contest, Participation, Student } from "~/models";
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

  const mockParticipation: Participation = {
    id: "",
    schoolId: "",
    contestId: contest.id,
    name: "",
    startingTime: student.startedAt,
    finalized: false,
    disabled: false,
  };

  const reset = useCallback(() => {
    setStudent(
      (student): Student => ({
        ...student,
        answers: {},
        extraData: {},
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
      setStudent={setStudent}
      reset={reset}
      enforceFullscreen={false}>
      {children}
    </StudentProvider>
  );
}
DevProvider.displayName = "DevProvider";
