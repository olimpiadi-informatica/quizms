import { type ReactNode, useCallback, useMemo, useState } from "react";

import { Link, Route, Switch } from "wouter";

import type { Answer, Contest, Student, Venue } from "~/models";
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
    variantId: "0",
  });

  const mockVenue: Venue = useMemo(
    () => ({
      id: "",
      schoolId: "",
      contestId: contest.id,
      name: "",
      participationWindow: student.participationWindow,
      pdfVariants: [],
      finalized: false,
      disabled: false,
    }),
    [contest.id, student.participationWindow],
  );

  const setAnswer = useCallback((problemId: string, answer: Answer) => {
    setStudent((student) => ({
      ...student,
      answers: { ...student.answers, [problemId]: answer },
    }));
  }, []);

  const submit = useCallback(() => {}, []);

  return (
    <StudentProvider
      contest={contest}
      venue={mockVenue}
      student={student}
      setAnswer={setAnswer}
      submit={submit}
      enforceFullscreen={false}>
      {children}
    </StudentProvider>
  );
}
DevProvider.displayName = "DevProvider";
